import { useState, useRef, useEffect } from "react";
import {
  MessageCircle,
  X,
  Send,
  Bot,
  User,
  Loader2,
  Sparkles,
  Scissors,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "./ui/card";
import { toast } from "sonner";
import { User as UserType, Appointment } from "../App";
import {
  projectId,
  publicAnonKey,
} from "../utils/supabase/info.tsx";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface AIChatbotProps {
  currentUser: UserType | null;
  appointments?: Appointment[];
}

export function AIChatbot({ currentUser, appointments }: AIChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();

      // Add welcome message if first time opening
      if (messages.length === 0) {
        const welcomeMessage: Message = {
          id: Date.now().toString(),
          role: "assistant",
          content: getWelcomeMessage(),
          timestamp: new Date(),
        };
        setMessages([welcomeMessage]);
      }
    }
  }, [isOpen]);

  const getWelcomeMessage = () => {
    const userName = currentUser?.name || "there";
    const userRole = currentUser?.role || "guest";

    if (userRole === "customer") {
      return `Hi ${userName}! 👋 Welcome to Supremo Barber's AI Assistant! I can help you with:

• 📅 Booking appointments
• ✂️ Service information and pricing
• ⏰ Available time slots
• 💇 Barber recommendations
• 💰 Payment and pricing questions
• 📍 Location and hours

What can I help you with today?`;
    } else if (userRole === "barber") {
      return `Hello ${userName}! 👋 I'm here to assist you with:

• 📊 Your earnings and statistics
• 📅 Today's schedule
• 👥 Customer information
• ✂️ Service management tips
• 📈 Performance insights

How can I help you today?`;
    } else if (userRole === "admin") {
      return `Welcome back ${userName}! 👑 As an admin, I can help with:

• 📊 Business analytics and insights
• 👥 User management questions
• 💰 Revenue reports
•  System settings
• 📈 Performance metrics
• 🔧 Troubleshooting

What would you like to know?`;
    } else {
      return `Hi there! 👋 Welcome to Supremo Barber! I'm your AI assistant.

I can help you with:
• ✂️ Our services and pricing
• 📅 Booking information
• ⏰ Operating hours
• 📍 Location details

How can I assist you today?`;
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputMessage.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);
    setIsTyping(true);

    try {
      // Prepare user context data for AI
      const userContext: any = {
        userId: currentUser?.id,
        userName: currentUser?.name,
        userEmail: currentUser?.email,
        userRole: currentUser?.role || "guest",
      };

      // Add appointments data if available
      if (appointments && appointments.length > 0) {
        // Filter appointments for current user based on role
        let userAppointments = appointments;
        
        if (currentUser?.role === 'customer') {
          userAppointments = appointments.filter(apt => 
            apt.userId === currentUser.id || apt.customerId === currentUser.id || apt.customer_id === currentUser.id
          );
        } else if (currentUser?.role === 'barber') {
          userAppointments = appointments.filter(apt => 
            apt.barberId === currentUser.id || apt.barber_id === currentUser.id
          );
        }

        // Format appointments for AI context (only include relevant fields)
        userContext.appointments = userAppointments.map(apt => ({
          id: apt.id,
          service: apt.service || apt.service_name,
          barber: apt.barber || apt.barber_name,
          customer: apt.customerName || apt.customer_name || apt.customer,
          date: apt.date || apt.appointment_date,
          time: apt.time || apt.appointment_time,
          status: apt.status,
          price: apt.price || apt.total_amount,
          paymentStatus: apt.paymentStatus || apt.payment_status,
        }));
      }

      // Call AI backend endpoint using full Supabase Functions URL
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-70e1fc66/api/ai-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            message: inputMessage.trim(),
            userContext: userContext,
            conversationHistory: messages.slice(-10), // Last 10 messages for context
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          "❌ AI API Error:",
          response.status,
          errorText,
        );
        throw new Error(
          `Failed to get AI response: ${response.status}`,
        );
      }

      const data = await response.json();
      console.log("✅ AI Response received:", data);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("❌ AI Chat error:", error);

      // Fallback to rule-based responses if AI fails
      const fallbackResponse = generateFallbackResponse(
        inputMessage,
        currentUser?.role,
      );

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: fallbackResponse,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: Date.now().toString(),
        role: "assistant",
        content: getWelcomeMessage(),
        timestamp: new Date(),
      },
    ]);
    toast.success("Chat cleared");
  };

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <div
          className="fixed bottom-6 right-6"
          style={{
            position: "fixed",
            bottom: "1.5rem",
            right: "1.5rem",
            left: "auto",
            zIndex: 40, // Changed from 9999 to 40 to avoid overlay
          }}
        >
          <Button
            onClick={() => setIsOpen(true)}
            className="h-14 w-14 rounded-full bg-[#DB9D47] hover:bg-[#C88D3F] text-white shadow-lg hover:shadow-xl transition-all duration-300 group relative"
            aria-label="Open AI Chat"
          >
            <MessageCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />
            {/* Green notification badge with CSS animation */}
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse" />
          </Button>
        </div>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          className="
                fixed bottom-4 right-4
                w-[90vw] sm:w-[400px] md:w-[420px] lg:w-[450px]
                h-[85vh] sm:h-[600px]
                max-h-[90vh]
                shadow-2xl
                animate-in slide-in-from-bottom-5 duration-300
            "
          style={{
            zIndex: 40,
          }}
        >
          <Card className="border-2 border-[#DB9D47] bg-white overflow-hidden h-full flex flex-col">
            {/* Header */}
            <CardHeader className="bg-[#DB9D47] text-white p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="relative w-10 h-10">
                      {/* Avatar */}
                      <div className="w-full h-full bg-white rounded-full flex items-center justify-center overflow-hidden">
                        <img
                          src="https://pub-86f4b5249e5c4021bb05d46908eeb094.r2.dev/supremo-barber/supremoWebLogo.png"
                          alt="Bot Logo"
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Status Badge */}
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                    </div>
                  </div>
                  <div>
                    <CardTitle className="text-white text-base font-bold flex items-center gap-2">
                      AI Assistant
                    </CardTitle>
                    <p className="text-xs text-white/90">
                      Supremo Barber Support
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="text-white hover:bg-white/20 h-8 w-8 p-0"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>

            {/* Messages Area */}
            <CardContent className="p-0 flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 bg-white space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-2 ${
                      message.role === "user"
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    {/* Bot Avatar - Only show for assistant */}
                    {message.role === "assistant" && (
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-md overflow-hidden bg-[white]">
                        <img
                          src="https://pub-86f4b5249e5c4021bb05d46908eeb094.r2.dev/supremo-barber/supremoWebLogo.png"
                          alt="Bot Logo"
                          className="w-8 h-8 object-cover"
                        />
                      </div>
                    )}

                    {/* Message Bubble */}
                    <div
                      className={`max-w-[75%] rounded-2xl p-3 shadow-sm ${
                        message.role === "user"
                          ? "bg-[#5C4A3A] text-white"
                          : "bg-[#FFF8E7] border-2 border-[#DB9D47] text-[#2D2D2D]"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap font-medium">
                        {message.content}
                      </p>
                      <p
                        className={`text-xs mt-1 font-normal ${
                          message.role === "user"
                            ? "text-white/80"
                            : "text-[#666666]"
                        }`}
                      >
                        {message.timestamp.toLocaleTimeString(
                          [],
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </p>
                    </div>

                   
                  </div>
                ))}

                {/* Typing Indicator */}
                {isTyping && (
                  <div className="flex gap-2 justify-start">
                    <div className="w-8 h-8 rounded-full bg-[#ffffff] flex items-center justify-center shadow-md">
                      <img
                        src="https://pub-86f4b5249e5c4021bb05d46908eeb094.r2.dev/supremo-barber/supremoWebLogo.png"
                        alt="Bot Logo"
                        className="w-8 h-8 object-cover"
                      />
                    </div>
                    <div className="max-w-[75%] bg-[#FFF8E7] border-2 border-[#DB9D47] rounded-2xl p-3 shadow-sm flex items-center gap-1">
                      <div
                        className="w-2 h-2 bg-[#DB9D47] rounded-full animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      />
                      <div
                        className="w-2 h-2 bg-[#DB9D47] rounded-full animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      />
                      <div
                        className="w-2 h-2 bg-[#DB9D47] rounded-full animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick Actions */}
              <div className="px-4 py-2 bg-white border-t border-[#E8DCC8]">
                <div className="flex gap-2 overflow-x-auto pb-2">
                  <QuickActionButton
                    onClick={() =>
                      setInputMessage(
                        "What are your available time slots?",
                      )
                    }
                    label=" Time Slots"
                  />
                  <QuickActionButton
                    onClick={() =>
                      setInputMessage(
                        "What services do you offer?",
                      )
                    }
                    label="✂️ Services"
                  />
                  <QuickActionButton
                    onClick={() =>
                      setInputMessage(
                        "How much does a haircut cost?",
                      )
                    }
                    label="💰 Pricing"
                  />
                  <QuickActionButton
                    onClick={clearChat}
                    label="🔄 Clear"
                  />
                </div>
              </div>

              {/* Input Area */}
              <div className="p-4 bg-white border-t border-[#E8DCC8]">
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    value={inputMessage}
                    onChange={(e) =>
                      setInputMessage(e.target.value)
                    }
                    onKeyDown={handleKeyPress}
                    placeholder="Ask me anything..."
                    disabled={isLoading}
                    className="flex-1 border-[#E8DCC8] focus:border-[#DB9D47]"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || isLoading}
                    className="bg-[#DB9D47] hover:bg-[#C88D3F] text-white px-4"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-[#87765E] mt-2 text-center">
                  Powered by AI • May occasionally make mistakes
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}

// Quick Action Button Component
function QuickActionButton({
  onClick,
  label,
}: {
  onClick: () => void;
  label: string;
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className="text-xs whitespace-nowrap border-[#E8DCC8] text-[#5C4A3A] hover:bg-[#FBF7EF] hover:border-[#DB9D47]"
    >
      {label}
    </Button>
  );
}

// Fallback responses when AI service is unavailable
function generateFallbackResponse(
  message: string,
  userRole?: string,
): string {
  const lowerMessage = message.toLowerCase();

  // Booking related
  if (
    lowerMessage.includes("book") ||
    lowerMessage.includes("appointment")
  ) {
    return "To book an appointment, please go to the 'Book Appointment' section. You can choose your preferred service, barber, date, and time slot. Our system will guide you through the booking process and payment requirements.";
  }

  // Services
  if (
    lowerMessage.includes("service") ||
    lowerMessage.includes("haircut")
  ) {
    return "We offer various services including:\n\n• Regular Haircut - ₱150\n• Premium Haircut - ₱250\n• Beard Trim - ₱100\n• Hair Coloring - ₱500\n• Shave - ₱120\n\nAll services include a consultation with our expert barbers!";
  }

  // Pricing
  if (
    lowerMessage.includes("price") ||
    lowerMessage.includes("cost") ||
    lowerMessage.includes("how much")
  ) {
    return "Our pricing varies by service:\n\n• Basic services: ₱100-150\n• Premium services: ₱250-500\n• Combo packages available\n\nAll bookings require a 50% down payment to confirm your appointment.";
  }

  // Hours
  if (
    lowerMessage.includes("hour") ||
    lowerMessage.includes("open") ||
    lowerMessage.includes("time")
  ) {
    return "Supremo Barber is open:\n\n• Monday - Saturday: 9:00 AM - 8:00 PM\n• Sunday: 10:00 AM - 6:00 PM\n\nYou can book appointments online anytime!";
  }

  // Payment
  if (
    lowerMessage.includes("payment") ||
    lowerMessage.includes("pay")
  ) {
    return "Payment Information:\n\n• 50% down payment required when booking\n• Remaining 50% due at appointment\n• Accepted methods: GCash, PayMaya, Bank Transfer\n• Upload payment proof after booking\n\nYour payment will be verified by our team within 24 hours.";
  }

  // Cancel
  if (
    lowerMessage.includes("cancel") ||
    lowerMessage.includes("reschedule")
  ) {
    return "Cancellation & Rescheduling:\n\n• Cancel/reschedule at least 24 hours before your appointment\n• Go to 'My Bookings' section\n• One reschedule allowed per booking\n• Cancellations get automatic refund\n\nPlease contact us if you need assistance!";
  }

  // Admin specific
  if (
    userRole === "admin" &&
    (lowerMessage.includes("report") ||
      lowerMessage.includes("analytics"))
  ) {
    return "As an admin, you can access:\n\n• Revenue reports in the Analytics section\n• User management in Admin Tools\n• Appointment statistics on the Dashboard\n• Export reports to CSV/PDF\n\nAll data is updated in real-time!";
  }

  // Barber specific
  if (
    userRole === "barber" &&
    (lowerMessage.includes("earning") ||
      lowerMessage.includes("schedule"))
  ) {
    return "As a barber, you can:\n\n• View your earnings history\n• Check today's appointments\n Manage your schedule\n• See customer reviews\n• Track your performance metrics\n\nAll information is available on your dashboard!";
  }

  // Default response
  return "I'm here to help! I can assist with:\n\n• 📅 Booking appointments\n• ✂️ Service information\n• 💰 Pricing and payments\n• ⏰ Operating hours\n• 📍 Location details\n• 🔄 Cancellation policies\n\nWhat specific information would you like to know?";
}