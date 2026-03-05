import { ArrowLeft, Shield, Lock, Eye, Database, Users, Heart, Check, Cookie, Mail, AlertCircle, Trash2, Download, FileText, Globe, Clock, Server, UserX } from "lucide-react";
import { Button } from "./ui/button";
import { ContactForm } from "./ContactForm";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";

interface PrivacyPolicyProps {
  onBack: () => void;
}

export function PrivacyPolicy({ onBack }: PrivacyPolicyProps) {
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
              <Shield className="w-5 h-5 text-[#FFC976]" />
              <h1 className="text-xl font-bold text-[#FFC976]">
                Privacy Policy
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
            Privacy Policy - Supremo Barber
          </h2>
          <p className="text-[#5C4A3A] leading-relaxed mb-3">
            At Supremo Barber, we take your privacy seriously. This Privacy Policy explains how we collect, 
            use, store, and protect your personal information when you use our online booking system. 
            We believe in transparency, so we've written this in clear, straightforward language.
          </p>
          <div className="p-3 bg-blue-50 rounded-md">
            <p className="text-sm text-blue-900">
              <strong>In Short:</strong> We collect only what we need to provide you with excellent service, 
              we never sell your data, and we protect it with industry-standard security measures.
            </p>
          </div>
          <p className="text-sm text-[#7A6854] mt-3">
            <strong>Effective Date:</strong> March 1, 2026<br />
            <strong>Last Updated:</strong> March 1, 2026
          </p>
        </div>

        {/* Main Content */}
        <Accordion type="single" collapsible className="space-y-3">
          {/* Section 1: Information We Collect */}
          <AccordionItem value="collect" className="bg-white rounded-lg shadow-md border-none overflow-hidden">
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-[#F5EDD8]/50">
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5 text-[#DB9D47]" />
                <span className="text-lg font-semibold text-[#6E5A48]">
                  Information We Collect
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6 pt-2">
              <div className="space-y-4">
                <p className="text-[#5C4A3A] text-sm">
                  We collect different types of information to provide and improve our service. Here's exactly what we collect and why:
                </p>

                <div>
                  <h4 className="font-semibold text-[#6E5A48] mb-2">1. Information You Provide Directly</h4>
                  
                  <div className="space-y-3">
                    <div className="p-3 bg-[#F5EDD8] rounded-md">
                      <p className="font-semibold text-[#6E5A48] mb-2 text-sm">Account Registration Information</p>
                      <div className="space-y-1 text-sm text-[#5C4A3A]">
                        <p>• <strong>Full Name:</strong> To identify you and personalize your experience</p>
                        <p>• <strong>Email Address:</strong> For account verification, booking confirmations, and important updates</p>
                        <p>• <strong>Phone Number:</strong> For appointment reminders and urgent communications</p>
                        <p>• <strong>Password:</strong> Encrypted for account security (we cannot see your actual password)</p>
                        <p>• <strong>Profile Photo (optional):</strong> To personalize your account</p>
                      </div>
                    </div>

                    <div className="p-3 bg-[#F5EDD8] rounded-md">
                      <p className="font-semibold text-[#6E5A48] mb-2 text-sm">Booking & Service Information</p>
                      <div className="space-y-1 text-sm text-[#5C4A3A]">
                        <p>• <strong>Service Selections:</strong> Which services you choose (haircut, shave, styling, etc.)</p>
                        <p>• <strong>Barber Preferences:</strong> Your preferred barbers or "any available"</p>
                        <p>• <strong>Date & Time:</strong> Your appointment schedules</p>
                        <p>• <strong>Special Requests:</strong> Any notes or instructions for your barber</p>
                        <p>• <strong>Appointment History:</strong> Record of past and upcoming appointments</p>
                      </div>
                    </div>

                    <div className="p-3 bg-[#F5EDD8] rounded-md">
                      <p className="font-semibold text-[#6E5A48] mb-2 text-sm">Payment Information</p>
                      <div className="space-y-1 text-sm text-[#5C4A3A]">
                        <p>• <strong>GCash Receipt Screenshots:</strong> For payment verification</p>
                        <p>• <strong>Transaction Reference Numbers:</strong> To track and confirm payments</p>
                        <p>• <strong>Payment Amounts:</strong> For accurate record-keeping</p>
                      </div>
                      <p className="text-sm text-green-700 font-medium mt-2">
                        ✓ We NEVER collect or store your GCash login credentials, passwords, or full account numbers
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-[#6E5A48] mb-2">2. Information Automatically Collected</h4>
                  <div className="p-3 bg-[#F5EDD8] rounded-md">
                    <div className="space-y-1 text-sm text-[#5C4A3A]">
                      <p>• <strong>Device Information:</strong> Type of device, operating system, browser type (helps us optimize the site)</p>
                      <p>• <strong>IP Address:</strong> For security and fraud prevention</p>
                      <p>• <strong>Usage Data:</strong> Which pages you visit, how long you stay, features you use</p>
                      <p>• <strong>Login Times:</strong> When you access your account</p>
                      <p>• <strong>Cookies:</strong> Small files that remember your preferences and keep you logged in (see Cookies section)</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-[#6E5A48] mb-2">3. Information We Don't Collect</h4>
                  <div className="space-y-2 text-sm text-[#5C4A3A]">
                    <div className="flex items-start gap-2">
                      <UserX className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <p>We do NOT collect sensitive information such as: government IDs, social security numbers, financial account details, medical records, religious or political beliefs, or biometric data.</p>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-blue-50 rounded-md border-l-4 border-blue-400">
                  <p className="text-sm text-blue-900">
                    <strong>Voluntary Information:</strong> We only collect information you voluntarily provide. 
                    You can use our website to browse services without creating an account, though booking requires registration.
                  </p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Section 2: How We Use Your Information */}
          <AccordionItem value="use" className="bg-white rounded-lg shadow-md border-none overflow-hidden">
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-[#F5EDD8]/50">
              <div className="flex items-center gap-3">
                <Eye className="w-5 h-5 text-[#DB9D47]" />
                <span className="text-lg font-semibold text-[#6E5A48]">
                  How We Use Your Information
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6 pt-2">
              <div className="space-y-4">
                <p className="text-[#5C4A3A] text-sm">
                  We use your information for specific, legitimate purposes to provide you with the best service:
                </p>

                <div className="space-y-3">
                  <div className="p-3 bg-[#F5EDD8] rounded-md">
                    <div className="flex items-start gap-2 mb-1">
                      <Check className="w-4 h-4 text-[#DB9D47] flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-[#5C4A3A]">
                        <p className="font-semibold mb-1">Provide Our Services</p>
                        <ul className="ml-4 space-y-1">
                          <li>• Create and manage your account</li>
                          <li>• Process and confirm your bookings</li>
                          <li>• Assign barbers and manage scheduling</li>
                          <li>• Verify payments and process transactions</li>
                          <li>• Allow you to view and manage your appointment history</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-[#F5EDD8] rounded-md">
                    <div className="flex items-start gap-2 mb-1">
                      <Check className="w-4 h-4 text-[#DB9D47] flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-[#5C4A3A]">
                        <p className="font-semibold mb-1">Communicate With You</p>
                        <ul className="ml-4 space-y-1">
                          <li>• Send booking confirmations and updates</li>
                          <li>• Send appointment reminders (24 hours before)</li>
                          <li>• Notify you of cancellations or rescheduling</li>
                          <li>• Respond to your inquiries and provide customer support</li>
                          <li>• Send important updates about our services or policies</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-[#F5EDD8] rounded-md">
                    <div className="flex items-start gap-2 mb-1">
                      <Check className="w-4 h-4 text-[#DB9D47] flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-[#5C4A3A]">
                        <p className="font-semibold mb-1">Improve Our Services</p>
                        <ul className="ml-4 space-y-1">
                          <li>• Analyze usage patterns to enhance user experience</li>
                          <li>• Identify and fix technical issues</li>
                          <li>• Understand which services are most popular</li>
                          <li>• Optimize our website performance and features</li>
                          <li>• Gather feedback to improve service quality</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-[#F5EDD8] rounded-md">
                    <div className="flex items-start gap-2 mb-1">
                      <Check className="w-4 h-4 text-[#DB9D47] flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-[#5C4A3A]">
                        <p className="font-semibold mb-1">Security & Fraud Prevention</p>
                        <ul className="ml-4 space-y-1">
                          <li>• Detect and prevent fraudulent bookings or payments</li>
                          <li>• Monitor for suspicious account activity</li>
                          <li>• Protect against security threats and abuse</li>
                          <li>• Verify identity for account recovery</li>
                          <li>• Enforce our Terms and Conditions</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-[#F5EDD8] rounded-md">
                    <div className="flex items-start gap-2 mb-1">
                      <Check className="w-4 h-4 text-[#DB9D47] flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-[#5C4A3A]">
                        <p className="font-semibold mb-1">Marketing (With Your Consent)</p>
                        <ul className="ml-4 space-y-1">
                          <li>• Send promotional offers and special deals</li>
                          <li>• Share news about new services or features</li>
                          <li>• Send birthday or loyalty rewards</li>
                        </ul>
                        <p className="mt-2 text-xs text-green-700">
                          ✓ You can opt out of marketing emails at any time by clicking "Unsubscribe" or updating your preferences
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-[#F5EDD8] rounded-md">
                    <div className="flex items-start gap-2 mb-1">
                      <Check className="w-4 h-4 text-[#DB9D47] flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-[#5C4A3A]">
                        <p className="font-semibold mb-1">Legal Compliance</p>
                        <ul className="ml-4 space-y-1">
                          <li>• Comply with legal obligations and regulations</li>
                          <li>• Respond to lawful requests from authorities</li>
                          <li>• Resolve disputes and enforce agreements</li>
                          <li>• Maintain records for tax and accounting purposes</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-amber-50 rounded-md border-l-4 border-amber-400">
                  <p className="text-sm text-amber-900">
                    <strong>Purpose Limitation:</strong> We only use your information for the purposes described in this policy. 
                    We will not use your information for unrelated purposes without your explicit consent.
                  </p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Section 3: How We Share Your Information */}
          <AccordionItem value="sharing" className="bg-white rounded-lg shadow-md border-none overflow-hidden">
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-[#F5EDD8]/50">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-[#DB9D47]" />
                <span className="text-lg font-semibold text-[#6E5A48]">
                  How We Share Your Information
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6 pt-2">
              <div className="space-y-4">
                <p className="text-[#5C4A3A] text-sm font-semibold">
                  We do NOT sell, rent, or trade your personal information to third parties for their marketing purposes.
                </p>

                <p className="text-[#5C4A3A] text-sm">
                  We only share your information in these limited circumstances:
                </p>

                <div className="space-y-3">
                  <div className="p-3 bg-[#F5EDD8] rounded-md">
                    <p className="font-semibold text-[#6E5A48] mb-2 text-sm">With Our Team</p>
                    <p className="text-sm text-[#5C4A3A]">
                      Your information is shared with our barbers and administrative staff who need it to provide services 
                      (e.g., your barber sees your name, appointment details, and special requests). All staff are bound by 
                      confidentiality obligations.
                    </p>
                  </div>

                  <div className="p-3 bg-[#F5EDD8] rounded-md">
                    <p className="font-semibold text-[#6E5A48] mb-2 text-sm">Service Providers</p>
                    <p className="text-sm text-[#5C4A3A] mb-2">
                      We work with trusted third-party service providers who help us operate our business:
                    </p>
                    <ul className="text-sm text-[#5C4A3A] ml-4 space-y-1">
                      <li>• <strong>Supabase:</strong> Database and authentication services (data hosting)</li>
                      <li>• <strong>Cloudflare R2:</strong> Secure storage for payment receipt images</li>
                      <li>• <strong>Gmail SMTP:</strong> Email delivery service for confirmations and reminders</li>
                      <li>• <strong>SMS Gateway:</strong> Text message delivery for appointment reminders</li>
                    </ul>
                    <p className="text-xs text-[#5C4A3A] mt-2">
                      These providers only access information necessary to perform their functions and are contractually 
                      obligated to keep it confidential.
                    </p>
                  </div>

                  <div className="p-3 bg-[#F5EDD8] rounded-md">
                    <p className="font-semibold text-[#6E5A48] mb-2 text-sm">Legal Requirements</p>
                    <p className="text-sm text-[#5C4A3A] mb-2">
                      We may disclose your information if required by law or in good faith belief that such action is necessary to:
                    </p>
                    <ul className="text-sm text-[#5C4A3A] ml-4 space-y-1">
                      <li>• Comply with legal obligations or court orders</li>
                      <li>• Respond to lawful requests from government authorities</li>
                      <li>• Protect our rights, property, or safety, or that of our users</li>
                      <li>• Investigate fraud or security issues</li>
                      <li>• Enforce our Terms and Conditions</li>
                    </ul>
                  </div>

                  <div className="p-3 bg-[#F5EDD8] rounded-md">
                    <p className="font-semibold text-[#6E5A48] mb-2 text-sm">Business Transfers</p>
                    <p className="text-sm text-[#5C4A3A]">
                      If Supremo Barber is involved in a merger, acquisition, or sale of assets, your information may be 
                      transferred as part of that transaction. We will notify you via email and/or prominent notice on our 
                      website before your information is transferred and becomes subject to a different privacy policy.
                    </p>
                  </div>

                  <div className="p-3 bg-[#F5EDD8] rounded-md">
                    <p className="font-semibold text-[#6E5A48] mb-2 text-sm">With Your Consent</p>
                    <p className="text-sm text-[#5C4A3A]">
                      We may share your information with third parties when you explicitly consent to such sharing 
                      (e.g., if you authorize us to share information with a partner promotion).
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-green-50 rounded-md border-l-4 border-green-400">
                  <p className="text-sm text-green-900">
                    <strong>No Selling:</strong> We will never sell your personal information to data brokers, 
                    advertisers, or other third parties. Your trust is more valuable to us than any profit from selling data.
                  </p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Section 4: Data Security */}
          <AccordionItem value="security" className="bg-white rounded-lg shadow-md border-none overflow-hidden">
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-[#F5EDD8]/50">
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-[#DB9D47]" />
                <span className="text-lg font-semibold text-[#6E5A48]">
                  How We Protect Your Data
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6 pt-2">
              <div className="space-y-4">
                <p className="text-[#5C4A3A] text-sm">
                  We implement multiple layers of security to protect your personal information from unauthorized access, 
                  disclosure, alteration, or destruction:
                </p>

                <div className="space-y-3">
                  <div className="p-3 bg-[#F5EDD8] rounded-md">
                    <div className="flex items-start gap-2 mb-1">
                      <Shield className="w-5 h-5 text-[#DB9D47] flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-[#5C4A3A]">
                        <p className="font-semibold mb-1">Encryption</p>
                        <ul className="ml-4 space-y-1">
                          <li>• <strong>SSL/TLS Encryption:</strong> All data transmitted between your browser and our servers is encrypted using industry-standard SSL/TLS protocols</li>
                          <li>• <strong>Password Hashing:</strong> Your password is hashed using bcrypt, making it unreadable even to our own staff</li>
                          <li>• <strong>Data at Rest:</strong> Sensitive data is encrypted in our database</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-[#F5EDD8] rounded-md">
                    <div className="flex items-start gap-2 mb-1">
                      <Server className="w-5 h-5 text-[#DB9D47] flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-[#5C4A3A]">
                        <p className="font-semibold mb-1">Secure Infrastructure</p>
                        <ul className="ml-4 space-y-1">
                          <li>• Enterprise-grade hosting with Supabase (SOC 2 Type II certified)</li>
                          <li>• Regular security updates and patches</li>
                          <li>• Automated backups to prevent data loss</li>
                          <li>• Firewalls and intrusion detection systems</li>
                          <li>• DDoS protection and rate limiting</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-[#F5EDD8] rounded-md">
                    <div className="flex items-start gap-2 mb-1">
                      <Eye className="w-5 h-5 text-[#DB9D47] flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-[#5C4A3A]">
                        <p className="font-semibold mb-1">Access Controls</p>
                        <ul className="ml-4 space-y-1">
                          <li>• Role-based access control (staff only see what they need)</li>
                          <li>• Multi-factor authentication for admin accounts</li>
                          <li>• Activity logging and monitoring</li>
                          <li>• Regular access audits</li>
                          <li>• Immediate access revocation when staff leave</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-[#F5EDD8] rounded-md">
                    <div className="flex items-start gap-2 mb-1">
                      <FileText className="w-5 h-5 text-[#DB9D47] flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-[#5C4A3A]">
                        <p className="font-semibold mb-1">Operational Security</p>
                        <ul className="ml-4 space-y-1">
                          <li>• Staff training on data protection best practices</li>
                          <li>• Confidentiality agreements for all employees</li>
                          <li>• Incident response plan for potential breaches</li>
                          <li>• Regular security assessments</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-amber-50 rounded-md border-l-4 border-amber-400">
                  <p className="text-sm text-amber-900">
                    <strong>Your Responsibility:</strong> While we implement strong security measures, you also play a role. 
                    Use a strong, unique password, don't share your login credentials, and log out from shared devices. 
                    Report any suspicious activity immediately.
                  </p>
                </div>

                <div className="p-3 bg-red-50 rounded-md border-l-4 border-red-400">
                  <p className="text-sm text-red-900">
                    <strong>Data Breach Notification:</strong> In the unlikely event of a data breach affecting your 
                    personal information, we will notify you within 72 hours via email and provide details about what 
                    happened and what steps we're taking.
                  </p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Section 5: Data Retention */}
          <AccordionItem value="retention" className="bg-white rounded-lg shadow-md border-none overflow-hidden">
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-[#F5EDD8]/50">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-[#DB9D47]" />
                <span className="text-lg font-semibold text-[#6E5A48]">
                  How Long We Keep Your Data
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6 pt-2">
              <div className="space-y-4">
                <p className="text-[#5C4A3A] text-sm">
                  We retain your personal information only as long as necessary to fulfill the purposes outlined in this policy:
                </p>

                <div className="space-y-3">
                  <div className="p-3 bg-[#F5EDD8] rounded-md">
                    <p className="font-semibold text-[#6E5A48] mb-2 text-sm">Active Account Data</p>
                    <p className="text-sm text-[#5C4A3A]">
                      <strong>Retention:</strong> As long as your account is active<br />
                      <strong>Includes:</strong> Profile information, appointment history, preferences<br />
                      <strong>Purpose:</strong> To provide ongoing service and maintain your booking records
                    </p>
                  </div>

                  <div className="p-3 bg-[#F5EDD8] rounded-md">
                    <p className="font-semibold text-[#6E5A48] mb-2 text-sm">Payment Records</p>
                    <p className="text-sm text-[#5C4A3A]">
                      <strong>Retention:</strong> 7 years after transaction date<br />
                      <strong>Includes:</strong> Payment receipts, transaction history<br />
                      <strong>Purpose:</strong> Tax compliance, accounting, and dispute resolution<br />
                      <strong>Legal Requirement:</strong> Required by Philippine tax and accounting laws
                    </p>
                  </div>

                  <div className="p-3 bg-[#F5EDD8] rounded-md">
                    <p className="font-semibold text-[#6E5A48] mb-2 text-sm">Marketing Data</p>
                    <p className="text-sm text-[#5C4A3A]">
                      <strong>Retention:</strong> Until you opt out or close your account<br />
                      <strong>Includes:</strong> Email preferences, promotional history<br />
                      <strong>Purpose:</strong> Send relevant offers and communications<br />
                      <strong>Note:</strong> Deleted immediately when you unsubscribe
                    </p>
                  </div>

                  <div className="p-3 bg-[#F5EDD8] rounded-md">
                    <p className="font-semibold text-[#6E5A48] mb-2 text-sm">Deleted Account Data</p>
                    <p className="text-sm text-[#5C4A3A]">
                      <strong>Retention:</strong> 30 days after account deletion request<br />
                      <strong>Grace Period:</strong> Allows account recovery if you change your mind<br />
                      <strong>After 30 days:</strong> Personal data is permanently deleted (except records we're legally required to keep)<br />
                      <strong>Exception:</strong> Payment records retained for 7 years (anonymized where possible)
                    </p>
                  </div>

                  <div className="p-3 bg-[#F5EDD8] rounded-md">
                    <p className="font-semibold text-[#6E5A48] mb-2 text-sm">Inactive Accounts</p>
                    <p className="text-sm text-[#5C4A3A]">
                      <strong>Definition:</strong> No login for 3 years<br />
                      <strong>Action:</strong> We'll send email warnings at 2.5 and 2.75 years<br />
                      <strong>After 3 years:</strong> Account automatically closed and data deleted (except legally required records)<br />
                      <strong>Reactivation:</strong> Contact us before the 3-year mark to keep your account
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-blue-50 rounded-md border-l-4 border-blue-400">
                  <p className="text-sm text-blue-900">
                    <strong>Data Minimization:</strong> We regularly review and delete data that's no longer needed. 
                    Anonymized aggregate data (e.g., "100 haircuts in January") may be kept indefinitely for business analytics.
                  </p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Section 6: Your Privacy Rights */}
          <AccordionItem value="rights" className="bg-white rounded-lg shadow-md border-none overflow-hidden">
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-[#F5EDD8]/50">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-[#DB9D47]" />
                <span className="text-lg font-semibold text-[#6E5A48]">
                  Your Privacy Rights
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6 pt-2">
              <div className="space-y-4">
                <p className="text-[#5C4A3A] text-sm">
                  You have significant control over your personal information. Here are your rights and how to exercise them:
                </p>

                <div className="space-y-3">
                  <div className="p-3 bg-[#F5EDD8] rounded-md">
                    <div className="flex items-start gap-2 mb-1">
                      <Eye className="w-5 h-5 text-[#DB9D47] flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-[#5C4A3A]">
                        <p className="font-semibold mb-1">Right to Access</p>
                        <p className="mb-1"><strong>What it means:</strong> Request a copy of all personal data we hold about you</p>
                        <p className="mb-1"><strong>What you'll get:</strong> A downloadable file with your account info, booking history, payment records</p>
                        <p><strong>How to request:</strong> Email info@supremobarber.com with subject "Data Access Request"</p>
                        <p className="text-xs mt-1 text-green-700">✓ Free once per year; ₱100 fee for additional requests</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-[#F5EDD8] rounded-md">
                    <div className="flex items-start gap-2 mb-1">
                      <FileText className="w-5 h-5 text-[#DB9D47] flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-[#5C4A3A]">
                        <p className="font-semibold mb-1">Right to Correction</p>
                        <p className="mb-1"><strong>What it means:</strong> Update or correct inaccurate personal information</p>
                        <p className="mb-1"><strong>What you can do:</strong> Log into your account and update most information yourself</p>
                        <p><strong>For locked fields:</strong> Email us and we'll update within 24 hours</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-[#F5EDD8] rounded-md">
                    <div className="flex items-start gap-2 mb-1">
                      <Trash2 className="w-5 h-5 text-[#DB9D47] flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-[#5C4A3A]">
                        <p className="font-semibold mb-1">Right to Deletion ("Right to be Forgotten")</p>
                        <p className="mb-1"><strong>What it means:</strong> Request deletion of your personal data</p>
                        <p className="mb-1"><strong>Process:</strong> Log in → Account Settings → "Delete Account" or email us</p>
                        <p className="mb-1"><strong>Timeline:</strong> Deleted within 30 days</p>
                        <p className="text-xs"><strong>Exception:</strong> We must retain some data for legal/tax compliance (anonymized where possible)</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-[#F5EDD8] rounded-md">
                    <div className="flex items-start gap-2 mb-1">
                      <Download className="w-5 h-5 text-[#DB9D47] flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-[#5C4A3A]">
                        <p className="font-semibold mb-1">Right to Data Portability</p>
                        <p className="mb-1"><strong>What it means:</strong> Receive your data in a machine-readable format</p>
                        <p className="mb-1"><strong>Format:</strong> JSON or CSV file you can use with other services</p>
                        <p><strong>How to request:</strong> Email info@supremobarber.com with subject "Data Portability Request"</p>
                        <p className="text-xs mt-1 text-green-700">✓ Delivered within 48 hours</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-[#F5EDD8] rounded-md">
                    <div className="flex items-start gap-2 mb-1">
                      <AlertCircle className="w-5 h-5 text-[#DB9D47] flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-[#5C4A3A]">
                        <p className="font-semibold mb-1">Right to Object</p>
                        <p className="mb-1"><strong>What it means:</strong> Object to certain uses of your data</p>
                        <p className="mb-1"><strong>Marketing:</strong> Opt out anytime by clicking "Unsubscribe" in emails or updating preferences</p>
                        <p className="mb-1"><strong>Profiling:</strong> We don't do automated decision-making, but you can opt out if we ever do</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-[#F5EDD8] rounded-md">
                    <div className="flex items-start gap-2 mb-1">
                      <Lock className="w-5 h-5 text-[#DB9D47] flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-[#5C4A3A]">
                        <p className="font-semibold mb-1">Right to Restrict Processing</p>
                        <p className="mb-1"><strong>What it means:</strong> Ask us to limit how we use your data while we resolve a dispute or verify accuracy</p>
                        <p className="mb-1"><strong>How to request:</strong> Email info@supremobarber.com explaining why</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-[#F5EDD8] rounded-md">
                    <div className="flex items-start gap-2 mb-1">
                      <Shield className="w-5 h-5 text-[#DB9D47] flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-[#5C4A3A]">
                        <p className="font-semibold mb-1">Right to Withdraw Consent</p>
                        <p className="mb-1"><strong>What it means:</strong> Withdraw permission for data uses that required your consent</p>
                        <p className="mb-1"><strong>Note:</strong> Doesn't affect processing that already happened or legally required processing</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 rounded-md border-l-4 border-blue-400">
                  <p className="text-sm text-blue-900 mb-2">
                    <strong>How to Exercise Your Rights:</strong>
                  </p>
                  <ul className="text-sm text-blue-900 ml-4 space-y-1">
                    <li>• Email: info@supremobarber.com</li>
                    <li>• Subject line: Clearly state your request (e.g., "Data Deletion Request")</li>
                    <li>• Include: Your full name and email address associated with your account</li>
                    <li>• Verification: We may ask for ID to verify your identity (for your protection)</li>
                    <li>• Response time: We'll respond within 48 hours and fulfill requests within 30 days</li>
                    <li>• No fee: Exercising your rights is free (except additional access requests)</li>
                  </ul>
                </div>

                <div className="p-3 bg-amber-50 rounded-md border-l-4 border-amber-400">
                  <p className="text-sm text-amber-900">
                    <strong>Right to Complain:</strong> If you believe we've mishandled your data, you have the right to 
                    file a complaint with the Philippine National Privacy Commission (NPC) at complaints@privacy.gov.ph or visit their website at privacy.gov.ph
                  </p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Section 7: Cookies */}
          <AccordionItem value="cookies" className="bg-white rounded-lg shadow-md border-none overflow-hidden">
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-[#F5EDD8]/50">
              <div className="flex items-center gap-3">
                <Cookie className="w-5 h-5 text-[#DB9D47]" />
                <span className="text-lg font-semibold text-[#6E5A48]">
                  Cookies & Similar Technologies
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6 pt-2">
              <div className="space-y-4">
                <p className="text-[#5C4A3A] text-sm">
                  Cookies are small text files stored on your device that help us provide a better experience. 
                  Here's what we use and why:
                </p>

                <div className="space-y-3">
                  <div className="p-3 bg-green-50 rounded-md border-l-4 border-green-400">
                    <p className="font-semibold text-green-900 mb-1 text-sm">Essential Cookies (Required)</p>
                    <p className="text-sm text-green-800 mb-2">
                      <strong>Purpose:</strong> Make the website work properly - you can't opt out
                    </p>
                    <ul className="text-sm text-green-800 ml-4 space-y-1">
                      <li>• <strong>Authentication:</strong> Keep you logged in as you navigate</li>
                      <li>• <strong>Security:</strong> Protect against fraud and attacks</li>
                      <li>• <strong>Session:</strong> Remember your booking progress</li>
                      <li>• <strong>Load Balancing:</strong> Distribute traffic evenly</li>
                    </ul>
                    <p className="text-xs text-green-700 mt-2">
                      ✓ These cookies expire when you close your browser or after 7 days
                    </p>
                  </div>

                  <div className="p-3 bg-blue-50 rounded-md border-l-4 border-blue-400">
                    <p className="font-semibold text-blue-900 mb-1 text-sm">Preference Cookies (Optional)</p>
                    <p className="text-sm text-blue-800 mb-2">
                      <strong>Purpose:</strong> Remember your settings and preferences
                    </p>
                    <ul className="text-sm text-blue-800 ml-4 space-y-1">
                      <li>• Language preference</li>
                      <li>• Display settings (e.g., text size)</li>
                      <li>• "Remember me" login option</li>
                    </ul>
                    <p className="text-xs text-blue-700 mt-2">
                      ✓ These cookies last up to 1 year
                    </p>
                  </div>

                  <div className="p-3 bg-amber-50 rounded-md border-l-4 border-amber-400">
                    <p className="font-semibold text-amber-900 mb-1 text-sm">Analytics Cookies (Optional)</p>
                    <p className="text-sm text-amber-800 mb-2">
                      <strong>Purpose:</strong> Understand how you use our website to improve it
                    </p>
                    <ul className="text-sm text-amber-800 ml-4 space-y-1">
                      <li>• Which pages are most popular</li>
                      <li>• How long people spend on each page</li>
                      <li>• Where visitors come from</li>
                      <li>• Error tracking to fix bugs</li>
                    </ul>
                    <p className="text-xs text-amber-700 mt-2">
                      ✓ We use anonymized analytics - no personal identification
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-[#6E5A48] mb-2 text-sm">Managing Cookies</h4>
                  <p className="text-sm text-[#5C4A3A] mb-2">
                    You have control over cookies:
                  </p>
                  <ul className="text-sm text-[#5C4A3A] ml-4 space-y-1">
                    <li>• <strong>Browser Settings:</strong> Block or delete cookies in your browser settings</li>
                    <li>• <strong>Our Settings:</strong> Manage optional cookies in your Account Preferences</li>
                    <li>• <strong>Third-Party Opt-Out:</strong> Visit aboutads.info or youronlinechoices.eu</li>
                  </ul>
                  <p className="text-sm text-[#5C4A3A] mt-2">
                    <strong>Note:</strong> Blocking essential cookies may prevent you from using certain features (like booking).
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-[#6E5A48] mb-2 text-sm">Other Tracking Technologies</h4>
                  <div className="space-y-2 text-sm text-[#5C4A3A]">
                    <p>• <strong>Local Storage:</strong> Similar to cookies but stores more data (e.g., draft bookings)</p>
                    <p>• <strong>Session Storage:</strong> Temporary storage cleared when you close the browser</p>
                    <p>• <strong>Web Beacons:</strong> Tiny images in emails to see if you opened them (opt out of marketing emails to avoid)</p>
                  </div>
                </div>

                <div className="p-3 bg-blue-50 rounded-md border-l-4 border-blue-400">
                  <p className="text-sm text-blue-900">
                    <strong>Do Not Track:</strong> We respect browser "Do Not Track" signals and will not track users who enable it.
                  </p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Section 8: International Users & Children */}
          <AccordionItem value="other" className="bg-white rounded-lg shadow-md border-none overflow-hidden">
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-[#F5EDD8]/50">
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-[#DB9D47]" />
                <span className="text-lg font-semibold text-[#6E5A48]">
                  International Users & Children's Privacy
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6 pt-2">
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-[#6E5A48] mb-2">International Data Transfers</h4>
                  <p className="text-sm text-[#5C4A3A] mb-2">
                    Our services are primarily for customers in the Philippines, but your data may be processed internationally:
                  </p>
                  <div className="p-3 bg-[#F5EDD8] rounded-md">
                    <p className="text-sm text-[#5C4A3A] mb-2">
                      <strong>Where Your Data Goes:</strong>
                    </p>
                    <ul className="text-sm text-[#5C4A3A] ml-4 space-y-1">
                      <li>• <strong>Supabase:</strong> Servers in Singapore and United States (AWS data centers)</li>
                      <li>• <strong>Cloudflare R2:</strong> Global content delivery network</li>
                      <li>• <strong>Email Providers:</strong> Gmail/Google servers worldwide</li>
                    </ul>
                    <p className="text-sm text-[#5C4A3A] mt-2">
                      All service providers comply with data protection standards equivalent to Philippine laws and are bound 
                      by data processing agreements ensuring your information remains protected.
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-[#6E5A48] mb-2">Children's Privacy</h4>
                  <div className="p-3 bg-amber-50 rounded-md border-l-4 border-amber-400">
                    <p className="text-sm text-amber-900 mb-2">
                      <strong>Age Requirement:</strong> You must be at least 13 years old to create an account.
                    </p>
                    <p className="text-sm text-amber-900 mb-2">
                      <strong>For Users 13-17:</strong> You may create an account, but we recommend parental consent for bookings. 
                      Parents/guardians can accompany minors to appointments.
                    </p>
                    <p className="text-sm text-amber-900">
                      <strong>Under 13:</strong> We do not knowingly collect personal information from children under 13. 
                      If we discover we've collected such data, we'll delete it immediately. Parents who believe we have 
                      information about a child under 13 should contact us at info@supremobarber.com
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-[#6E5A48] mb-2">Updates to This Policy</h4>
                  <p className="text-sm text-[#5C4A3A] mb-2">
                    We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements:
                  </p>
                  <ul className="text-sm text-[#5C4A3A] ml-4 space-y-1">
                    <li>• <strong>Minor Changes:</strong> We'll update the "Last Updated" date and post the new policy</li>
                    <li>• <strong>Major Changes:</strong> We'll email you and may require re-acceptance</li>
                    <li>• <strong>Notification Period:</strong> Changes take effect 30 days after notification</li>
                    <li>• <strong>Review:</strong> Check this page periodically for updates</li>
                  </ul>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Contact Section */}
        <ContactForm
          title="Questions About Privacy?"
          description="If you have questions about this Privacy Policy, want to exercise your privacy rights, or have concerns, send us a message below and we'll respond within 48 hours."
          inquiryType="Privacy Policy Inquiry"
          primaryEmail="supremobarbershops@gmail.com"
          secondaryContact="File a Complaint: Philippine National Privacy Commission - complaints@privacy.gov.ph"
          onBack={onBack}
          footerNote="By using Supremo Barber's services, you acknowledge that you have read and understood this Privacy Policy and agree to the collection, use, and disclosure of your information as described herein."
        />
      </div>
    </div>
  );
}