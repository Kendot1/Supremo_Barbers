import { useState } from "react";
import { Mail, CheckCircle2, XCircle, Clock, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { projectId, publicAnonKey } from "../utils/supabase/info";

interface ContactFormProps {
  title: string;
  description: string;
  inquiryType: string;
  primaryEmail: string;
  secondaryContact?: string;
  onBack: () => void;
  footerNote?: string;
}

export function ContactForm({
  title,
  description,
  inquiryType,
  primaryEmail,
  secondaryContact,
  onBack,
  footerNote
}: ContactFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error" | "rate-limited">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [remainingMinutes, setRemainingMinutes] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus("idle");
    setErrorMessage("");
    setRemainingMinutes(null);

    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-70e1fc66/api/send-inquiry`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          ...formData,
          type: inquiryType
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSubmitStatus("success");
        setFormData({ name: "", email: "", subject: "", message: "" });
      } else if (response.status === 429 && data.rateLimited) {
        // Rate limited
        setSubmitStatus("rate-limited");
        setRemainingMinutes(data.remainingMinutes || 15);
        setErrorMessage(data.error || "You've submitted too many inquiries. Please wait before trying again.");
      } else {
        // Other errors
        console.error('Failed to send inquiry:', data);
        setSubmitStatus("error");
        setErrorMessage(data.error || "Failed to send message. Please try again or contact us directly.");
      }
    } catch (error) {
      console.error('Error submitting contact form:', error);
      setSubmitStatus("error");
      setErrorMessage("Network error. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-8 bg-white rounded-lg shadow-md p-6 sm:p-8">
      <div className="space-y-5">
        <div className="text-center">
          <div className="w-12 h-12 bg-[#DB9D47] rounded-full flex items-center justify-center mx-auto mb-3">
            <Mail className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-xl font-bold text-[#6E5A48] mb-2">
            {title}
          </h3>
          <p className="text-[#5C4A3A] text-sm max-w-2xl mx-auto mb-4">
            {description}
          </p>



        </div>

        {/* Contact Form */}
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-[#6E5A48] mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <Input
                id="name"
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Your name"
                className="w-full"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#6E5A48] mb-1">
                Email Address <span className="text-red-500">*</span>
              </label>
              <Input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="your.email@example.com"
                className="w-full"
              />
            </div>
          </div>

          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-[#6E5A48] mb-1">
              Subject
            </label>
            <Input
              id="subject"
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="What is this about?"
              className="w-full"
            />
          </div>

          <div>
            <label htmlFor="message" className="block text-sm font-medium text-[#6E5A48] mb-1">
              Message <span className="text-red-500">*</span>
            </label>
            <Textarea
              id="message"
              required
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Please describe your question or concern in detail..."
              rows={5}
              className="w-full resize-none"
            />
          </div>

          {submitStatus === "success" && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-green-900 mb-1">
                    Message Sent Successfully!
                  </p>
                  <p className="text-xs text-green-800">
                    We've received your inquiry and will respond within 24-48 hours. A confirmation has been sent to your email.
                  </p>
                </div>
              </div>
            </div>
          )}

          {submitStatus === "error" && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-900 mb-1">
                    Failed to Send Message
                  </p>
                  <p className="text-xs text-red-800">
                    {errorMessage || `Unable to send your message. Please try again or email us directly at ${primaryEmail}`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {submitStatus === "rate-limited" && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-900 mb-1">
                    Please Wait Before Sending Another Message
                  </p>
                  <p className="text-xs text-amber-800 mb-2">
                    {errorMessage}
                  </p>
                  {remainingMinutes !== null && (
                    <div className="flex items-center gap-2 mt-2 p-2 bg-amber-100 rounded">
                      <AlertTriangle className="w-4 h-4 text-amber-700" />
                      <span className="text-xs font-medium text-amber-900">
                        Try again in {remainingMinutes} minute{remainingMinutes !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                  <p className="text-xs text-amber-700 mt-2">
                    Need immediate assistance? Email us at <a href={`mailto:${primaryEmail}`} className="underline font-medium">{primaryEmail}</a>
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              type="submit"
              disabled={isSubmitting || submitStatus === "success"}
              className="flex-1 bg-[#DB9D47] hover:bg-[#C88D3F] text-white disabled:opacity-60 disabled:cursor-not-allowed transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : submitStatus === "success" ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Sent!
                </>
              ) : (
                "Send Message"
              )}
            </Button>
            <Button
              type="button"
              onClick={onBack}
              variant="outline"
              className="flex-1 border-[#DB9D47] text-[#DB9D47] hover:bg-[#DB9D47] hover:text-white transition-all"
            >
              Back to Home
            </Button>
          </div>
        </form>

        <div className="pt-4 border-t border-[#E8DCC8]">
          <p className="text-xs text-center text-[#7A6854] mb-2">
            Or reach us directly:
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm mb-2">
            <a href={`mailto:${primaryEmail}`} className="text-[#DB9D47] hover:underline">
              {primaryEmail}
            </a>
            <span className="text-[#7A6854]">•</span>
            <span className="text-[#5C4A3A]">+63 912 345 6789</span>
          </div>
          {secondaryContact && (
            <p className="text-xs text-center text-[#7A6854]">
              {secondaryContact}
            </p>
          )}
        </div>

        {footerNote && (
          <p className="text-xs text-center text-[#7A6854] pt-3 border-t border-[#E8DCC8]">
            {footerNote}
          </p>
        )}
      </div>
    </div>
  );
}