import { useState, useEffect, useRef } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "./ui/card";
import {
  MessageCircle,
  Send,
  X,
  Loader2,
  User,
  ImagePlus,
  Trash2,
  Calendar,
  Clock,
  Scissors,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { User as UserType, Appointment } from "../App";
import {
  projectId,
  publicAnonKey,
} from "../utils/supabase/info.tsx";
import { ChatBooking } from "./ChatBooking";

interface InteractiveOption {
  label: string;
  value: string;
  description?: string;
  price?: number;
  duration?: number;
}

interface InteractiveMessage {
  type: "service-selection" | "barber-selection" | "date-selection" | "time-selection" | "booking-summary";
  options?: InteractiveOption[];
  data?: any;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  imageUrl?: string;
  interactive?: InteractiveMessage;
}

interface BookingState {
  service?: { name: string; price: number; duration: number; id: string };
  barber?: { name: string; id: string };
  date?: string;
  time?: string;
  customer?: { name: string; id: string }; // For admin booking for others
  paymentProof?: string;
}

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  description?: string;
}

interface Barber {
  id: string;
  name: string;
  phone?: string;
}

interface Customer {
  id: string;
  name: string;
  email: string;
}

type BookingStep = "customer" | "service" | "barber" | "datetime" | "payment" | "complete";

interface AIChatbotProps {
  currentUser: UserType | null;
  appointments?: Appointment[];
  onAddAppointment?: (appointment: any) => Promise<any>;
}

export function AIChatbot({
  currentUser,
  appointments,
  onAddAppointment,
}: AIChatbotProps) {


  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isBookingMode, setIsBookingMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

  // ===== OFF-TOPIC GUARDRAIL =====
  // Client-side pre-filter to avoid wasting AI tokens on unrelated questions
  const OFF_TOPIC_RESPONSE = "I appreciate your curiosity, but I'm specifically designed to help with Supremo Barber services! ✂️\n\nI can assist you with:\n• 📅 Booking appointments\n• ✂️ Service info & pricing\n• 💇 Barber recommendations\n• ⏰ Operating hours\n• 💰 Payment & policies\n• 📍 Location & directions\n\nWhat can I help you with regarding our barbershop?";

  const isOffTopicMessage = (msg: string): boolean => {
    const lower = msg.toLowerCase().trim();

    // Allow short greetings and pleasantries through
    if (lower.length < 15) return false;

    // Off-topic keyword patterns (things NOT related to barbershop)
    const offTopicPatterns = [
      // Programming & tech
      /\b(python|javascript|java\b|c\+\+|html|css|react|node|code|coding|program|algorithm|debug|compile|github|api\b|database|sql|frontend|backend)\b/,
      // Math & science  
      /\b(equation|calculus|algebra|physics|chemistry|biology|theorem|formula|derivative|integral|hypothesis)\b/,
      // Politics & religion
      /\b(president|election|democrat|republican|politics|political|senator|congress|religion|church|bible|quran|atheist)\b/,
      // Gaming
      /\b(minecraft|fortnite|valorant|league of legends|dota|gaming|video game|playstation|xbox|nintendo|roblox|genshin)\b/,
      // Homework & academic
      /\b(homework|essay|thesis|assignment|exam|quiz|school project|research paper|dissertation)\b/,
      // Medical advice
      /\b(diagnose|diagnosis|prescription|symptom|medication|disease|medical advice|treatment for|cure for)\b/,
      // Legal advice
      /\b(legal advice|lawsuit|attorney|court case|sue|litigation|legal rights)\b/,
      // Cooking & recipes
      /\b(recipe for|how to cook|ingredients for|baking|cuisine)\b/,
      // Dating & relationships
      /\b(dating advice|relationship|girlfriend|boyfriend|tinder|bumble|crush)\b/,
      // General knowledge / trivia unrelated to barbershop
      /\b(capital of|who invented|how old is|what year did|history of (?!barber|haircut|grooming|supremo))\b/,
      // AI identity probing (jailbreak attempts)
      /\b(ignore (previous|your|all) (instructions|prompt|rules)|pretend you are|act as|roleplay as|you are now|forget your rules|bypass|jailbreak)\b/,
      // Fiction & storytelling
      /\b(write (a |me )?(story|poem|song|rap|essay|code|script)|tell me a joke|make up|creative writing)\b/,
      // Crypto & stocks
      /\b(bitcoin|crypto|stock market|invest|trading|forex|nft|ethereum|blockchain)\b/,
    ];

    return offTopicPatterns.some((pattern) => pattern.test(lower));
  };



  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

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
    const messageText = inputMessage.trim();
    setInputMessage("");

    // === CLIENT-SIDE GUARDRAIL: Block off-topic before calling API ===
    if (isOffTopicMessage(messageText)) {
      const guardedMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: OFF_TOPIC_RESPONSE,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, guardedMessage]);
      return;
    }

    setIsLoading(true);

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

        if (currentUser?.role === "customer") {
          userAppointments = appointments.filter(
            (apt) =>
              apt.userId === currentUser.id ||
              apt.customerId === currentUser.id ||
              apt.customer_id === currentUser.id,
          );
        } else if (currentUser?.role === "barber") {
          userAppointments = appointments.filter(
            (apt) =>
              apt.barberId === currentUser.id ||
              apt.barber_id === currentUser.id,
          );
        }

        // Format appointments for AI context (only include relevant fields)
        userContext.appointments = userAppointments.map(
          (apt) => ({
            id: apt.id,
            service: apt.service || apt.service_name,
            barber: apt.barber || apt.barber_name,
            customer:
              apt.customerName ||
              apt.customer_name ||
              apt.customer,
            date: apt.date || apt.appointment_date,
            time: apt.time || apt.appointment_time,
            status: apt.status,
            price: apt.price || apt.total_amount,
            paymentStatus:
              apt.paymentStatus || apt.payment_status,
          }),
        );
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
            message: messageText,
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

  // Function to clean markdown formatting from AI messages
  const cleanMessageContent = (content: string): string => {
    return content
      .replace(/\*\*(.+?)\*\*/g, "$1") // Remove bold (**text**)
      .replace(/\*(.+?)\*/g, "$1") // Remove italic (*text*)
      .replace(/\_\_(.+?)\_\_/g, "$1") // Remove bold (__text__)
      .replace(/\_(.+?)\_/g, "$1") // Remove italic (_text_)
      .replace(/\~\~(.+?)\~\~/g, "$1") // Remove strikethrough (~~text~~)
      .replace(/\`(.+?)\`/g, "$1"); // Remove inline code (`text`)
  };

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error("File size exceeds 5MB limit.");
        return;
      }
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        toast.error("Unsupported file type. Please upload an image.");
        return;
      }
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle image send
  const handleSendImage = async () => {
    if (!selectedImage || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: "Image uploaded",
      timestamp: new Date(),
      imageUrl: imagePreview || "",
    };

    setMessages((prev) => [...prev, userMessage]);
    setSelectedImage(null);
    setImagePreview(null);
    setIsLoading(true);

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

        if (currentUser?.role === "customer") {
          userAppointments = appointments.filter(
            (apt) =>
              apt.userId === currentUser.id ||
              apt.customerId === currentUser.id ||
              apt.customer_id === currentUser.id,
          );
        } else if (currentUser?.role === "barber") {
          userAppointments = appointments.filter(
            (apt) =>
              apt.barberId === currentUser.id ||
              apt.barber_id === currentUser.id,
          );
        }

        // Format appointments for AI context (only include relevant fields)
        userContext.appointments = userAppointments.map(
          (apt) => ({
            id: apt.id,
            service: apt.service || apt.service_name,
            barber: apt.barber || apt.barber_name,
            customer:
              apt.customerName ||
              apt.customer_name ||
              apt.customer,
            date: apt.date || apt.appointment_date,
            time: apt.time || apt.appointment_time,
            status: apt.status,
            price: apt.price || apt.total_amount,
            paymentStatus:
              apt.paymentStatus || apt.payment_status,
          }),
        );
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
            message: "Image uploaded",
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
        "Image uploaded",
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
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50">
          <Button
            onClick={() => setIsOpen(true)}
            className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-[#DB9D47] hover:bg-[#C88D3F] text-white shadow-lg hover:shadow-xl transition-all duration-300 group relative"
            aria-label="Open AI Chat"
          >
            <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 group-hover:scale-110 transition-transform" />
            {/* Green notification badge with CSS animation */}
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse" />
          </Button>
        </div>
      )}

      {/* Chat Window */}
      {isOpen && (
        <>
          {/* Backdrop/Overlay for mobile */}
          <div
            className="fixed inset-0 bg-black/50 z-40 sm:hidden"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Chat Container */}
          <div
            className="fixed bottom-4 right-4
                      w-[90%] max-w-[400px] sm:w-[400px] md:w-[420px] lg:w-[450px]
                      h-[500px] sm:h-[600px] sm:max-h-[calc(100vh-2rem)]
                      
                      animate-in slide-in-from-bottom-5 duration-300
                      z-50"
          >
            <Card
              className="
              border-2 border-[#DB9D47]
              bg-white
              h-full flex flex-col
              rounded-2xl
              overflow-hidden
            "
            >
              {/* Header */}
              <CardHeader className="bg-[#DB9D47] text-white p-3 sm:p-4 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="relative">
                      <div className="relative w-9 h-9 sm:w-10 sm:h-10">
                        {/* Avatar */}
                        <div className="w-full h-full bg-white rounded-full flex items-center justify-center overflow-hidden">
                          <img
                            src="https://pub-86f4b5249e5c4021bb05d46908eeb094.r2.dev/supremo-barber/supremoWebLogo.png"
                            alt="Bot Logo"
                            className="w-full h-full object-cover"
                          />
                        </div>

                        {/* Status Badge */}
                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 rounded-full border-2 border-white" />
                      </div>
                    </div>
                    <div>
                      <CardTitle className="text-white text-sm sm:text-base font-bold flex items-center gap-2">
                        AI Assistant
                      </CardTitle>
                      <p className="text-[10px] sm:text-xs text-white/90">
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
                    <X className="w-4 h-4 sm:w-5 sm:h-5" />
                  </Button>
                </div>
              </CardHeader>

              {/* Messages Area */}
              <CardContent className="p-0 flex-1 flex flex-col overflow-hidden">


                {/* Messages Container - scrollable area with max height */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-4 bg-white space-y-3 sm:space-y-4 min-h-0">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex items-start gap-2 w-full min-w-0  ${message.role === "user"
                          ? "justify-end"
                          : "justify-start"
                        }`}
                    >
                      {/* Bot Avatar - Only show for assistant */}
                      {message.role === "assistant" && (
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-md overflow-hidden bg-white border-2 border-[#DB9D47]">
                          <img
                            src="https://pub-86f4b5249e5c4021bb05d46908eeb094.r2.dev/supremo-barber/supremoWebLogo.png"
                            alt="Bot Logo"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      {/* Message Bubble */}
                      <div
                        className={`
                          max-w-[75%] sm:max-w-[70%]
                          w-fit min-w-0
                          px-3 py-2 sm:px-4 sm:py-2.5
                          rounded-2xl shadow-md
                          break-words whitespace-pre-wrap

                          ${message.role === "user"
                            ? "bg-[#DB9D47] text-white self-end"
                            : "bg-white border border-[#E8DCC8] text-[#2D2D2D] self-start"
                          }
                        `}
                      >
                        {message.imageUrl && (
                          <img
                            src={message.imageUrl}
                            alt="Uploaded"
                            className="mb-2 rounded-lg max-w-full h-auto"
                          />
                        )}
                        <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words">
                          {cleanMessageContent(message.content)}
                        </p>
                        <p
                          className={`text-[10px] sm:text-[12px] mt-1.5 sm:mt-2 ${message.role === "user"
                              ? "text-white/70"
                              : "text-[#87765E]"
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
                  {isLoading && (
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

                  {/* Interactive Booking Widget */}
                  {isBookingMode && (
                    <div className="w-full">
                      <ChatBooking
                        currentUser={currentUser}
                        onAddAppointment={onAddAppointment}
                        onComplete={(bookingData) => {
                          setIsBookingMode(false);
                          const successMsg: Message = {
                            id: Date.now().toString(),
                            role: "assistant",
                            content: "🎉 Booking successful! Your appointment has been saved to the database and sent to Payment Verification. Admin will review your payment proof and approve your booking shortly. You can track your booking status in the 'My Bookings' section. Thank you for choosing Supremo Barber!",
                            timestamp: new Date(),
                          };
                          setMessages((prev) => [...prev, successMsg]);
                          toast.success("Booking saved to database!");
                        }}
                        onCancel={() => {
                          setIsBookingMode(false);
                          const cancelMsg: Message = {
                            id: Date.now().toString(),
                            role: "assistant",
                            content: "Booking cancelled. Is there anything else I can help you with?",
                            timestamp: new Date(),
                          };
                          setMessages((prev) => [...prev, cancelMsg]);
                        }}
                      />
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Actions - Fixed at bottom */}
                <div className="flex-shrink-0 px-4 py-2 bg-white border-t border-[#E8DCC8]">
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    <QuickActionButton
                      onClick={() => {
                        // Start interactive booking
                        const userMsg: Message = {
                          id: Date.now().toString(),
                          role: "user",
                          content: "I want to book an appointment",
                          timestamp: new Date(),
                        };

                        const botMsg: Message = {
                          id: (Date.now() + 1).toString(),
                          role: "assistant",
                          content: "Great! Let me help you book an appointment. First, please choose a service:",
                          timestamp: new Date(),
                        };

                        setMessages((prev) => [...prev, userMsg, botMsg]);
                        setIsBookingMode(true);
                        toast.success("Booking started! Follow the steps below.");
                      }}
                      label="📅 Book Now"
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

                {/* Input Area - Fixed at bottom */}
                <div className="flex-shrink-0 p-4 bg-white border-t border-[#E8DCC8]">
                  {/* Image Preview */}
                  {imagePreview && (
                    <div className="mb-3 relative inline-block">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="max-w-full h-32 rounded-lg border-2 border-[#DB9D47] object-cover"
                      />
                      <Button
                        onClick={() => {
                          setSelectedImage(null);
                          setImagePreview(null);
                          if (fileInputRef.current) {
                            fileInputRef.current.value = "";
                          }
                        }}
                        size="sm"
                        variant="destructive"
                        className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    {imagePreview ? (
                      <Button
                        onClick={handleSendImage}
                        disabled={isLoading}
                        className="flex-1 bg-[#DB9D47] hover:bg-[#C88D3F] text-white"
                      >
                        {isLoading ? (
                          <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        ) : (
                          <Send className="w-5 h-5 mr-2" />
                        )}
                        Send Image
                      </Button>
                    ) : (
                      <>
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
                          disabled={
                            !inputMessage.trim() || isLoading
                          }
                          className="bg-[#DB9D47] hover:bg-[#C88D3F] text-white px-4"
                        >
                          {isLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <Send className="w-5 h-5" />
                          )}
                        </Button>
                        <Button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isLoading}
                          className="bg-[#DB9D47] hover:bg-[#C88D3F] text-white px-4"
                        >
                          <ImagePlus className="w-5 h-5" />
                        </Button>
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </>
                    )}
                  </div>
                  <p className="text-xs text-[#87765E] mt-2 text-center">
                    Powered by AI • May occasionally make
                    mistakes
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
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