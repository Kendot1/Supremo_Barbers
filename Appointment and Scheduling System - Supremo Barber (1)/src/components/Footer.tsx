import {
  MapPin,
  Phone,
  Mail,
  Clock,
  Facebook,
  Instagram,
  Twitter,
  Scissors,
  FileText,
  Shield,
} from "lucide-react";

interface FooterProps {
  onNavigateToTerms?: () => void;
  onNavigateToPrivacy?: () => void;
}

export function Footer({ onNavigateToTerms, onNavigateToPrivacy }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      id="contact"
      className="bg-gradient-to-r from-[#6E5A48] via-[#7A6854] to-[#6E5A48] text-[#F5EDD8] mt-auto shadow-2xl"
    >
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* About Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-12 h-8 sm:w-12 sm:h-10 rounded-full flex items-center justify-center">
                <img
                  src="https://pub-86f4b5249e5c4021bb05d46908eeb094.r2.dev/supremo-barber/supremoWebLogo.png"
                  alt="Supremo Barber Logo"
                  className="h-10 w-10 sm:h-12 sm:w-12"
                />
              </div>
              <h3 className="text-lg sm:text-xl text-[#FFC976]">
                Supremo Barber
              </h3>
            </div>
            <p className="text-sm sm:text-base text-[#E8DCC8] leading-relaxed">
              Your premium destination for classic grooming and
              modern style. Experience the art of barbering at
              its finest.
            </p>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h4 className="text-base sm:text-lg text-[#FFC976]">
              Contact Us
            </h4>
            <div className="space-y-3">
              <a
                href="https://maps.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 text-sm sm:text-base text-[#E8DCC8] hover:text-[#FFC976] transition-colors group"
              >
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5 mt-0.5 flex-shrink-0 group-hover:text-[#FFC976]" />
                <span>
                  Blk 1, Lot 5 Quirino Hwy, Novaliches, Quezon City, 1118 Metro Manila
                </span>
              </a>
              <a
                href="tel:+639338615024"
                className="flex items-center gap-3 text-sm sm:text-base text-[#E8DCC8] hover:text-[#FFC976] transition-colors group"
              >
                <Phone className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 group-hover:text-[#FFC976]" />
                <span>+63 933 861 5024</span>
              </a>
              <a
                href="mailto:suremobarbershops@gmail.com"
                className="flex items-center gap-3 text-sm sm:text-base text-[#E8DCC8] hover:text-[#FFC976] transition-colors group"
              >
                <Mail className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 group-hover:text-[#FFC976]" />
                <span>suremobarbershops@gmail.com</span>
              </a>
            </div>
          </div>

          {/* Business Hours */}
          <div className="space-y-4">
            <h4 className="text-base sm:text-lg text-[#FFC976]">
              Business Hours
            </h4>
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 mt-0.5 flex-shrink-0 text-[#FFC976]" />
                <div className="text-sm sm:text-base text-[#E8DCC8] space-y-1">
                  <p>Monday - Saturday</p>
                  <p className="text-xs sm:text-sm text-[#D4C5B0]">
                    9:00 AM - 8:00 PM
                  </p>
                  <p className="mt-2">Sunday</p>
                  <p className="text-xs sm:text-sm text-[#FF9999]">
                    Closed
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Social Media & Quick Links */}
          <div className="space-y-4">
            <h4 className="text-base sm:text-lg text-[#FFC976]">
              Follow Us
            </h4>
            <div className="flex gap-3">
              <a
                href="https://www.facebook.com/SupremoBarber"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-[#5C4A3A] rounded-full flex items-center justify-center hover:bg-[#DB9D47] transition-colors group shadow-lg"
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5 text-[#E8DCC8] group-hover:text-white" />
              </a>
              <a
                href="https://www.instagram.com/supremobarbers/?hl=en"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-[#5C4A3A] rounded-full flex items-center justify-center hover:bg-[#DB9D47] transition-colors group shadow-lg"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5 text-[#E8DCC8] group-hover:text-white" />
              </a>

            </div>
            <div className="mt-6 space-y-2">
              <h5 className="text-sm text-[#FFC976]">
                Payment Method
              </h5>
              <p className="text-sm text-[#E8DCC8]">
                GCash Only
              </p>
              <p className="text-xs text-[#D4C5B0]">
                50% down payment required
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-[#5C4A3A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-xs sm:text-sm text-[#D4C5B0] text-center sm:text-left">
              © {currentYear} Supremo Barber. All rights
              reserved.
            </p>
            <div className="flex flex-wrap justify-center sm:justify-end gap-4 sm:gap-6">
              {onNavigateToTerms && (
                <button
                  onClick={onNavigateToTerms}
                  className="flex items-center gap-2 text-xs sm:text-sm text-[#E8DCC8] hover:text-[#FFC976] transition-colors group"
                >
                  <FileText className="w-4 h-4 group-hover:text-[#FFC976]" />
                  <span>Terms & Conditions</span>
                </button>
              )}
              {onNavigateToPrivacy && (
                <button
                  onClick={onNavigateToPrivacy}
                  className="flex items-center gap-2 text-xs sm:text-sm text-[#E8DCC8] hover:text-[#FFC976] transition-colors group"
                >
                  <Shield className="w-4 h-4 group-hover:text-[#FFC976]" />
                  <span>Privacy Policy</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}