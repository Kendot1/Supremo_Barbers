import {
  Clock,
  Facebook,
  FileText,
  Instagram,
  Mail,
  MapPin,
  Phone,
  Shield,
} from "lucide-react";

interface FooterProps {
  onNavigateToTerms?: () => void;
  onNavigateToPrivacy?: () => void;
  showLandingLinks?: boolean;
}

const MAP_URL = "https://maps.app.goo.gl/U1UiG8f3kZAzCYhP9";

export function Footer({
  onNavigateToTerms,
  onNavigateToPrivacy,
  showLandingLinks = false,
}: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer id="contact" className="mt-auto bg-brand-ink text-brand-sand">
      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-5">
            <a
              href="#home"
              className="group inline-flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-brand-ink"
            >
              <img
                src="https://pub-86f4b5249e5c4021bb05d46908eeb094.r2.dev/supremo-barber/supremoWebLogo.png"
                alt="Supremo Barber"
                width="48"
                height="48"
                loading="lazy"
                decoding="async"
                className="h-11 w-11 object-contain transition duration-300 group-hover:scale-105"
              />
              <span className="font-display text-2xl text-brand-cream">
                Supremo <span className="text-brand-gold">Barber</span>
              </span>
            </a>
            <p className="max-w-xs text-sm leading-7 text-brand-sand/70">
              Thoughtful cuts, clean finishes, and a welcoming place to find your next signature look.
            </p>
          </div>

          {showLandingLinks && (
            <nav aria-label="Footer navigation" className="space-y-5">
              <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-brand-gold">Explore</h2>
              <div className="flex flex-col items-start gap-3 text-sm text-brand-sand/70">
                {[
                  ["Home", "#home"],
                  ["Services", "#services"],
                  ["About", "#about"],
                  ["Reviews", "#reviews"],
                ].map(([label, href]) => (
                  <a key={href} href={href} className="rounded-md transition hover:text-brand-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-brand-ink">
                    {label}
                  </a>
                ))}
              </div>
            </nav>
          )}

          <div className="space-y-5">
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-brand-gold">Contact</h2>
            <div className="space-y-3 text-sm leading-6 text-brand-sand/70">
              <a href={MAP_URL} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 transition hover:text-brand-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-brand-ink">
                <MapPin className="mt-1 h-4 w-4 shrink-0 text-brand-gold" aria-hidden="true" />
                <span>Blk 1, Lot 5 Quirino Hwy, Novaliches, Quezon City, 1118 Metro Manila</span>
              </a>
              <a href="tel:+639338615024" className="flex items-center gap-3 transition hover:text-brand-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-brand-ink">
                <Phone className="h-4 w-4 shrink-0 text-brand-gold" aria-hidden="true" />
                +63 933 861 5024
              </a>
              <a href="mailto:suremobarbershops@gmail.com" className="flex items-center gap-3 break-all transition hover:text-brand-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-brand-ink">
                <Mail className="h-4 w-4 shrink-0 text-brand-gold" aria-hidden="true" />
                suremobarbershops@gmail.com
              </a>
            </div>
          </div>

          <div className="space-y-5">
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-brand-gold">Visit & follow</h2>
            <div className="flex items-start gap-3 text-sm leading-6 text-brand-sand/70">
              <Clock className="mt-1 h-4 w-4 shrink-0 text-brand-gold" aria-hidden="true" />
              <span>Monday–Saturday<br />9:00 AM–8:00 PM<br /><span className="text-brand-sand/50">Sunday · Closed</span></span>
            </div>
            <div className="flex gap-3">
              <a href="https://www.facebook.com/SupremoBarber" target="_blank" rel="noopener noreferrer" aria-label="Supremo Barber on Facebook" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-brand-sand transition hover:border-brand-gold hover:bg-brand-gold hover:text-brand-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-brand-ink">
                <Facebook className="h-5 w-5" aria-hidden="true" />
              </a>
              <a href="https://www.instagram.com/supremobarbers/?hl=en" target="_blank" rel="noopener noreferrer" aria-label="Supremo Barber on Instagram" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-brand-sand transition hover:border-brand-gold hover:bg-brand-gold hover:text-brand-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-brand-ink">
                <Instagram className="h-5 w-5" aria-hidden="true" />
              </a>
            </div>
            <p className="text-xs leading-5 text-brand-sand/55">GCash accepted for the required 50% booking deposit.</p>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 py-5 text-center sm:flex-row sm:px-8 sm:text-left">
          <p className="text-xs text-brand-sand/55">© {currentYear} Supremo Barber. All rights reserved.</p>
          <div className="flex flex-wrap justify-center gap-4 sm:justify-end">
            {onNavigateToTerms && (
              <button type="button" onClick={onNavigateToTerms} className="inline-flex items-center gap-2 rounded-md text-xs text-brand-sand/70 transition hover:text-brand-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-brand-ink">
                <FileText className="h-4 w-4" aria-hidden="true" />
                Terms & Conditions
              </button>
            )}
            {onNavigateToPrivacy && (
              <button type="button" onClick={onNavigateToPrivacy} className="inline-flex items-center gap-2 rounded-md text-xs text-brand-sand/70 transition hover:text-brand-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-brand-ink">
                <Shield className="h-4 w-4" aria-hidden="true" />
                Privacy Policy
              </button>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
