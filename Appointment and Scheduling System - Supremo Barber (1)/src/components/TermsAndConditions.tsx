import { ArrowLeft, Scissors, Check, Calendar, CreditCard, RefreshCw, Shield, Users, AlertCircle, Clock, FileText, Scale, Phone } from "lucide-react";
import { Button } from "./ui/button";
import { ContactForm } from "./ContactForm";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";

interface TermsAndConditionsProps {
  onBack: () => void;
}

export function TermsAndConditions({ onBack }: TermsAndConditionsProps) {
  return (
    <div className="min-h-screen bg-[#F5EDD8]">
      {/* Header */}
      <div className="bg-[#6E5A48] text-[#F5EDD8] shadow-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="text-[#F5EDD8] hover:bg-[#5C4A3A] hover:text-[#FFC976]"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Scissors className="w-5 h-5 text-[#FFC976]" />
              <h1 className="text-xl font-bold text-[#FFC976]">
                Terms & Conditions
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Intro */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-bold text-[#6E5A48] mb-3">
            Terms of Service - Supremo Barber
          </h2>
          <p className="text-[#5C4A3A] leading-relaxed mb-3">
            Welcome to Supremo Barber's online booking system. By creating an account and  booking appointments through our platform, you agree to these terms and conditions. 
            Please read them carefully to understand your rights and responsibilities.
          </p>
          <p className="text-sm text-[#7A6854]">
            <strong>Effective Date:</strong> March 1, 2026<br />
            <strong>Last Updated:</strong> March 1, 2026
          </p>
        </div>

        {/* Main Content */}
        <Accordion type="single" collapsible className="space-y-3">
          {/* Section 1: Account Registration */}
          <AccordionItem value="account" className="bg-white rounded-lg shadow-md border-none overflow-hidden">
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-[#F5EDD8]/50">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-[#DB9D47]" />
                <span className="text-lg font-semibold text-[#6E5A48]">
                  Account Registration & Use
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6 pt-2">
              <div className="space-y-4 text-[#5C4A3A]">
                <div>
                  <h4 className="font-semibold text-[#6E5A48] mb-2">Creating Your Account</h4>
                  <p className="text-sm mb-2">
                    To use our booking system, you must create an account by providing:
                  </p>
                  <ul className="text-sm space-y-1 ml-4">
                    <li>• A valid email address</li>
                    <li>• Your full name (as it appears on official documents)</li>
                    <li>• A working phone number for appointment reminders</li>
                    <li>• A secure password (minimum 8 characters)</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-[#6E5A48] mb-2">Your Responsibilities</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[#DB9D47] flex-shrink-0 mt-0.5" />
                      <p><strong>Account Security:</strong> You are responsible for maintaining the confidentiality of your password. Do not share your login credentials with anyone.</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[#DB9D47] flex-shrink-0 mt-0.5" />
                      <p><strong>Accurate Information:</strong> All information provided must be truthful and up-to-date. Update your contact details immediately if they change.</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[#DB9D47] flex-shrink-0 mt-0.5" />
                      <p><strong>Account Activity:</strong> You are responsible for all activities that occur under your account, including bookings made by others using your credentials.</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[#DB9D47] flex-shrink-0 mt-0.5" />
                      <p><strong>Age Requirement:</strong> You must be at least 13 years old to create an account. Users under 18 require parental consent for bookings.</p>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-red-50 rounded-md border-l-4 border-red-400">
                  <p className="text-sm text-red-900">
                    <strong>Suspicious Activity:</strong> If you suspect unauthorized access to your account, change your password immediately and contact us at info@supremobarber.com
                  </p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Section 2: Booking Process */}
          <AccordionItem value="booking" className="bg-white rounded-lg shadow-md border-none overflow-hidden">
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-[#F5EDD8]/50">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-[#DB9D47]" />
                <span className="text-lg font-semibold text-[#6E5A48]">
                  Booking Appointments
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6 pt-2">
              <div className="space-y-4 text-[#5C4A3A]">
                <div>
                  <h4 className="font-semibold text-[#6E5A48] mb-2">How to Book</h4>
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <span className="font-bold text-[#DB9D47] flex-shrink-0">Step 1:</span>
                      <div className="text-sm">
                        <p className="font-semibold mb-1">Select Service & Barber</p>
                        <p>Choose from our available services (haircut, shave, styling, etc.). You can select a specific barber or choose "Any Available Barber" for the next available slot. Each service has a set duration and price displayed during selection.</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-3">
                      <span className="font-bold text-[#DB9D47] flex-shrink-0">Step 2:</span>
                      <div className="text-sm">
                        <p className="font-semibold mb-1">Choose Date & Time</p>
                        <p>Our calendar shows real-time availability. Select your preferred date and time slot. Grayed-out slots are already booked or outside business hours (Monday-Saturday, 9:00 AM - 7:00 PM).</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-3">
                      <span className="font-bold text-[#DB9D47] flex-shrink-0">Step 3:</span>
                      <div className="text-sm">
                        <p className="font-semibold mb-1">Add Special Requests (Optional)</p>
                        <p>Include any special instructions or preferences for your barber. This helps us provide personalized service.</p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <span className="font-bold text-[#DB9D47] flex-shrink-0">Step 4:</span>
                      <div className="text-sm">
                        <p className="font-semibold mb-1">Pay Down Payment</p>
                        <p>Complete the booking by paying a 50% down payment via GCash. Upload a clear screenshot of your payment receipt. Your booking is not confirmed until payment is verified.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-[#6E5A48] mb-2">Booking Confirmation</h4>
                  <div className="space-y-2 text-sm">
                    <p>After uploading your payment proof:</p>
                    <ul className="ml-4 space-y-1">
                      <li>• Your booking status will show as "Pending" until verified</li>
                      <li>• Our team verifies payments within 1-24 hours (usually within 2-4 hours during business hours)</li>
                      <li>• You'll receive an email and SMS confirmation once verified</li>
                      <li>• A reminder will be sent 24 hours before your appointment</li>
                    </ul>
                  </div>
                </div>

                <div className="p-3 bg-blue-50 rounded-md border-l-4 border-blue-400">
                  <p className="text-sm text-blue-900">
                    <strong>Peak Hours:</strong> Weekend slots (Friday afternoon through Sunday) fill up quickly. We recommend booking at least 3-5 days in advance for weekend appointments.
                  </p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Section 3: Payment Terms */}
          <AccordionItem value="payment" className="bg-white rounded-lg shadow-md border-none overflow-hidden">
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-[#F5EDD8]/50">
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-[#DB9D47]" />
                <span className="text-lg font-semibold text-[#6E5A48]">
                  Payment Terms & Conditions
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6 pt-2">
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-[#6E5A48] mb-2">Payment Structure</h4>
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div className="p-4 bg-[#F5EDD8] rounded-md text-center">
                      <p className="text-sm text-[#7A6854] mb-1">Down Payment (Online)</p>
                      <p className="text-2xl font-bold text-[#DB9D47]">50%</p>
                      <p className="text-xs text-[#7A6854] mt-1">Required to secure booking</p>
                    </div>
                    <div className="p-4 bg-[#F5EDD8] rounded-md text-center">
                      <p className="text-sm text-[#7A6854] mb-1">Balance (At Shop)</p>
                      <p className="text-2xl font-bold text-[#DB9D47]">50%</p>
                      <p className="text-xs text-[#7A6854] mt-1">Paid after service</p>
                    </div>
                  </div>
                  <p className="text-sm text-[#5C4A3A]">
                    <strong>Example:</strong> If your chosen service costs ₱400, you pay ₱200 down payment online 
                    and the remaining ₱200 at the shop after your service is completed.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-[#6E5A48] mb-2">Accepted Payment Methods</h4>
                  <div className="space-y-3 text-sm text-[#5C4A3A]">
                    <div>
                      <p className="font-semibold mb-1">Down Payment (Online):</p>
                      <ul className="ml-4 space-y-1">
                        <li>• <strong>GCash only</strong> - Send to our official GCash number displayed during checkout</li>
                        <li>• Upload a clear, unedited screenshot showing the reference number, amount, and timestamp</li>
                        <li>• Altered or unclear receipts will be rejected and may delay your booking confirmation</li>
                      </ul>
                    </div>
                    <div>
                      <p className="font-semibold mb-1">Final Payment (At Shop):</p>
                      <ul className="ml-4 space-y-1">
                        <li>• Cash</li>
                        <li>• GCash (same official number)</li>
                        <li>• Payment is due immediately after service completion</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-[#6E5A48] mb-2">Important Payment Notes</h4>
                  <div className="space-y-2 text-sm text-[#5C4A3A]">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <p><strong>Non-Refundable:</strong> Down payments are non-refundable for late cancellations (less than 24 hours) or no-shows.</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <p><strong>Verification Time:</strong> Do not assume your booking is confirmed until you receive our official email/SMS confirmation.</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <p><strong>Wrong Amount:</strong> If you accidentally send the wrong amount, contact us immediately. Overpayments will be refunded; underpayments must be corrected before confirmation.</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <p><strong>Service Prices:</strong> All prices are in Philippine Pesos (₱). Prices may change without prior notice but confirmed bookings honor the original price.</p>
                    </div>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Section 4: Cancellation & Rescheduling */}
          <AccordionItem value="cancellation" className="bg-white rounded-lg shadow-md border-none overflow-hidden">
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-[#F5EDD8]/50">
              <div className="flex items-center gap-3">
                <RefreshCw className="w-5 h-5 text-[#DB9D47]" />
                <span className="text-lg font-semibold text-[#6E5A48]">
                  Cancellation & Rescheduling Policy
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6 pt-2">
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-[#6E5A48] mb-2">Cancellation Policy</h4>
                  <div className="space-y-3">
                    <div className="p-4 bg-green-50 rounded-md border-l-4 border-green-500">
                      <div className="flex items-start gap-2 mb-2">
                        <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <p className="font-semibold text-green-900">Early Cancellation (24+ Hours Before)</p>
                      </div>
                      <ul className="text-sm text-green-800 ml-7 space-y-1">
                        <li>• Your down payment is <strong>fully credited</strong> to your account</li>
                        <li>• Credit can be used for any future booking within 90 days</li>
                        <li>• No cancellation fee or penalty</li>
                        <li>• Cancel directly through your account dashboard or contact us</li>
                      </ul>
                    </div>

                    <div className="p-4 bg-red-50 rounded-md border-l-4 border-red-500">
                      <div className="flex items-start gap-2 mb-2">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="font-semibold text-red-900">Late Cancellation (Less than 24 Hours)</p>
                      </div>
                      <ul className="text-sm text-red-800 ml-7 space-y-1">
                        <li>• Your down payment is <strong>forfeited</strong></li>
                        <li>• No credit or refund will be issued</li>
                        <li>• This helps us compensate for the blocked time slot</li>
                        <li>• Exceptions may be made for genuine emergencies (see below)</li>
                      </ul>
                    </div>

                    <div className="p-4 bg-red-50 rounded-md border-l-4 border-red-500">
                      <div className="flex items-start gap-2 mb-2">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="font-semibold text-red-900">No-Show</p>
                      </div>
                      <ul className="text-sm text-red-800 ml-7 space-y-1">
                        <li>• If you don't arrive within 15 minutes of your appointment time</li>
                        <li>• Your down payment is forfeited with no credit</li>
                        <li>• Your booking is automatically marked as completed</li>
                        <li>• Repeated no-shows may result in booking restrictions</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-[#6E5A48] mb-2">Rescheduling Policy</h4>
                  <div className="space-y-2 text-sm text-[#5C4A3A]">
                    <div className="p-3 bg-blue-50 rounded-md">
                      <p className="font-semibold mb-1">Free Rescheduling (Once)</p>
                      <p>You can reschedule your appointment <strong>one time for free</strong> if you:</p>
                      <ul className="ml-4 mt-2 space-y-1">
                        <li>• Request at least 24 hours before your original appointment</li>
                        <li>• Select a new date within 30 days</li>
                        <li>• Keep the same service and duration</li>
                      </ul>
                    </div>

                    <div className="p-3 bg-amber-50 rounded-md">
                      <p className="font-semibold mb-1">Additional Rescheduling</p>
                      <p>If you need to reschedule again:</p>
                      <ul className="ml-4 mt-2 space-y-1">
                        <li>• A ₱50 rescheduling fee applies</li>
                        <li>• Must still provide 24+ hours notice</li>
                        <li>• Fee is deducted from your original down payment</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-[#6E5A48] mb-2">Emergency Exceptions</h4>
                  <p className="text-sm text-[#5C4A3A] mb-2">
                    We understand that genuine emergencies happen. We may waive cancellation fees for:
                  </p>
                  <ul className="text-sm text-[#5C4A3A] ml-4 space-y-1">
                    <li>• Medical emergencies (documentation required)</li>
                    <li>• Family emergencies (death, serious illness)</li>
                    <li>• Natural disasters or extreme weather</li>
                    <li>• Government-imposed restrictions (lockdowns, travel bans)</li>
                  </ul>
                  <p className="text-sm text-[#5C4A3A] mt-2">
                    Contact us as soon as possible with details. Each case is reviewed individually.
                  </p>
                </div>

                <div className="p-3 bg-blue-50 rounded-md border-l-4 border-blue-400">
                  <p className="text-sm text-blue-900">
                    <strong>How to Cancel/Reschedule:</strong> Log into your account, go to "My Appointments," 
                    and select the appropriate option. For assistance, email info@supremobarber.com or call us at +63 912 345 6789.
                  </p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Section 5: Service & Shop Rules */}
          <AccordionItem value="service" className="bg-white rounded-lg shadow-md border-none overflow-hidden">
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-[#F5EDD8]/50">
              <div className="flex items-center gap-3">
                <Scissors className="w-5 h-5 text-[#DB9D47]" />
                <span className="text-lg font-semibold text-[#6E5A48]">
                  Service Terms & Shop Rules
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6 pt-2">
              <div className="space-y-4 text-[#5C4A3A]">
                <div>
                  <h4 className="font-semibold text-[#6E5A48] mb-2">Arriving for Your Appointment</h4>
                  <div className="space-y-2 text-sm">
                    <p><strong>On-Time Arrival:</strong> Please arrive 5-10 minutes before your scheduled time. This allows us to start promptly.</p>
                    <p><strong>Late Arrival:</strong> If you arrive more than 15 minutes late:</p>
                    <ul className="ml-4 space-y-1">
                      <li>• Your service time will be shortened to fit the remaining slot</li>
                      <li>• You may need to reschedule if insufficient time remains</li>
                      <li>• Full payment is still required</li>
                      <li>• Arriving late is treated as a no-show if more than 15 minutes</li>
                    </ul>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-[#6E5A48] mb-2">Service Expectations</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[#DB9D47] flex-shrink-0 mt-0.5" />
                      <p><strong>Communication:</strong> Clearly communicate your desired style. Bring reference photos if helpful. We'll consult with you before starting.</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[#DB9D47] flex-shrink-0 mt-0.5" />
                      <p><strong>Professional Service:</strong> Our barbers are licensed professionals. We reserve the right to refuse service requests that may damage your hair or scalp.</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[#DB9D47] flex-shrink-0 mt-0.5" />
                      <p><strong>Satisfaction:</strong> If you're unsatisfied with the result, inform us immediately. We'll make reasonable adjustments at no extra charge during your visit.</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[#DB9D47] flex-shrink-0 mt-0.5" />
                      <p><strong>Service Time:</strong> Appointments may take longer for complex styles. We prioritize quality over speed.</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-[#6E5A48] mb-2">Shop Conduct & Safety</h4>
                  <div className="space-y-2 text-sm">
                    <p className="mb-2">To maintain a safe, welcoming environment:</p>
                    <div className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[#DB9D47] flex-shrink-0 mt-0.5" />
                      <p>Treat all staff and customers with respect and courtesy</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[#DB9D47] flex-shrink-0 mt-0.5" />
                      <p>Follow health and safety guidelines (wear mask if required, inform us of allergies)</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[#DB9D47] flex-shrink-0 mt-0.5" />
                      <p>Keep personal belongings secure - we are not liable for lost items</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[#DB9D47] flex-shrink-0 mt-0.5" />
                      <p>Children under 12 must be accompanied by a parent/guardian</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <p>No smoking, drinking alcohol, or use of illegal substances on premises</p>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-red-50 rounded-md border-l-4 border-red-400">
                  <p className="text-sm text-red-900">
                    <strong>Zero Tolerance Policy:</strong> We maintain zero tolerance for harassment, discrimination, 
                    threatening behavior, or abuse toward staff or customers. Violators will be asked to leave immediately, 
                    forfeit all payments, and may be banned from future bookings. Police will be contacted if necessary.
                  </p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Section 6: Liability & Disputes */}
          <AccordionItem value="liability" className="bg-white rounded-lg shadow-md border-none overflow-hidden">
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-[#F5EDD8]/50">
              <div className="flex items-center gap-3">
                <Scale className="w-5 h-5 text-[#DB9D47]" />
                <span className="text-lg font-semibold text-[#6E5A48]">
                  Liability & Dispute Resolution
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6 pt-2">
              <div className="space-y-4 text-[#5C4A3A]">
                <div>
                  <h4 className="font-semibold text-[#6E5A48] mb-2">Our Liability</h4>
                  <div className="space-y-2 text-sm">
                    <p><strong>Professional Service:</strong> We provide services with reasonable care and skill using quality products.</p>
                    <p><strong>Not Liable For:</strong></p>
                    <ul className="ml-4 space-y-1">
                      <li>• Results that don't match your expectations if you didn't clearly communicate your desired style</li>
                      <li>• Hair or skin conditions you didn't disclose prior to service</li>
                      <li>• Allergic reactions to products if you didn't inform us of allergies</li>
                      <li>• Lost, stolen, or damaged personal belongings on premises</li>
                      <li>• Injuries resulting from your failure to follow post-service care instructions</li>
                    </ul>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-[#6E5A48] mb-2">Your Liability</h4>
                  <div className="space-y-2 text-sm">
                    <p>You are responsible for:</p>
                    <ul className="ml-4 space-y-1">
                      <li>• Providing accurate information about your hair condition, previous treatments, and allergies</li>
                      <li>• Following pre-service instructions (e.g., clean hair for certain treatments)</li>
                      <li>• Payment for services rendered, even if unsatisfied due to miscommunication</li>
                      <li>• Any damage to shop property caused by you or your accompanying guests</li>
                    </ul>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-[#6E5A48] mb-2">Dispute Resolution</h4>
                  <div className="space-y-2 text-sm">
                    <p className="mb-2">If you have a complaint or dispute:</p>
                    <div className="p-3 bg-[#F5EDD8] rounded-md space-y-2">
                      <p><strong>Step 1:</strong> Speak with your barber or shop manager immediately</p>
                      <p><strong>Step 2:</strong> If unresolved, email info@supremobarber.com within 48 hours with details</p>
                      <p><strong>Step 3:</strong> We'll investigate and respond within 3-5 business days</p>
                      <p><strong>Step 4:</strong> If still unresolved, we'll offer mediation or arbitration before legal action</p>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-blue-50 rounded-md border-l-4 border-blue-400">
                  <p className="text-sm text-blue-900">
                    <strong>Good Faith:</strong> We're committed to resolving issues fairly. Most disputes are resolved 
                    through friendly communication. We value your satisfaction and will work with you to find a reasonable solution.
                  </p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Section 7: Changes & Termination */}
          <AccordionItem value="changes" className="bg-white rounded-lg shadow-md border-none overflow-hidden">
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-[#F5EDD8]/50">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-[#DB9D47]" />
                <span className="text-lg font-semibold text-[#6E5A48]">
                  Changes to Terms & Account Termination
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6 pt-2">
              <div className="space-y-4 text-[#5C4A3A]">
                <div>
                  <h4 className="font-semibold text-[#6E5A48] mb-2">Changes to These Terms</h4>
                  <div className="space-y-2 text-sm">
                    <p>We may update these terms from time to time. When we do:</p>
                    <ul className="ml-4 space-y-1">
                      <li>• We'll update the "Last Updated" date at the top</li>
                      <li>• For significant changes, we'll notify you via email</li>
                      <li>• Continued use of our service after changes means you accept the new terms</li>
                      <li>• You can review the latest version anytime on our website</li>
                    </ul>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-[#6E5A48] mb-2">Account Termination by You</h4>
                  <div className="space-y-2 text-sm">
                    <p>You may close your account at any time by:</p>
                    <ul className="ml-4 space-y-1">
                      <li>• Emailing info@supremobarber.com with your request</li>
                      <li>• Ensuring all pending appointments are canceled or completed</li>
                      <li>• Understanding that unused credits will be forfeited unless used within their validity period</li>
                    </ul>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-[#6E5A48] mb-2">Account Termination by Us</h4>
                  <div className="space-y-2 text-sm">
                    <p>We reserve the right to suspend or terminate your account if:</p>
                    <ul className="ml-4 space-y-1">
                      <li>• You violate these terms and conditions</li>
                      <li>• You have multiple no-shows or late cancellations</li>
                      <li>• You engage in abusive or threatening behavior</li>
                      <li>• You provide fraudulent payment information</li>
                      <li>• Your account shows suspicious or fraudulent activity</li>
                    </ul>
                    <p className="mt-2">
                      In case of termination, you'll be notified via email with the reason. Pending bookings may be canceled with refunds at our discretion.
                    </p>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Contact Section */}
        <ContactForm
          title="Questions or Concerns?"
          description="If you have any questions about these terms or need clarification, send us a message below and we'll get back to you within 24 hours."
          inquiryType="Terms & Conditions Inquiry"
          primaryEmail="supremobarbershops@gmail.com"
          onBack={onBack}
          footerNote="By using Supremo Barber's booking system, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions."
        />
      </div>
    </div>
  );
}