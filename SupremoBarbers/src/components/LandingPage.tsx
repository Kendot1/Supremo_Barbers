import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  Clock3,
  Mail,
  MapPin,
  Menu,
  Phone,
  Scissors,
  ShieldCheck,
  Star,
} from "lucide-react";

import API from "../services/api.service";
import { ImageWithFallback } from "./fallback/ImageWithFallback";
import { Footer } from "./Footer";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import { normalizeR2Url } from "../utils/avatarUrl";

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
  onServiceClick?: (serviceId: string) => void;
  onNavigateToTerms?: () => void;
  onNavigateToPrivacy?: () => void;
}

interface Service {
  _id?: string;
  id?: string;
  name: string;
  price?: number | string;
  duration?: number | string;
  description?: string;
  imageUrl?: string;
  isActive?: boolean;
}

interface Review {
  _id?: string;
  id?: string;
  customerName?: string;
  customerAvatar?: string;
  comment: string;
  rating?: number | string;
  showOnLanding?: boolean;
}

const LOGO_URL =
  "https://pub-86f4b5249e5c4021bb05d46908eeb094.r2.dev/supremo-barber/supremoWebLogo.png";
const HERO_IMAGE_URL =
  "https://pub-86f4b5249e5c4021bb05d46908eeb094.r2.dev/supremo-barber/home.jpg";
const MAP_URL = "https://maps.app.goo.gl/U1UiG8f3kZAzCYhP9";

const NAV_ITEMS = [
  { label: "Home", id: "home" },
  { label: "Services", id: "services" },
  { label: "About", id: "about" },
  { label: "Reviews", id: "reviews" },
] as const;

const CONTACT = {
  address: "Blk 1, Lot 5 Quirino Hwy, Novaliches, Quezon City, 1118 Metro Manila",
  phone: "+63 933 861 5024",
  email: "suremobarbershops@gmail.com",
  hours: "Monday–Saturday · 9:00 AM–8:00 PM",
};

function getServiceId(service: Service): string {
  return service.id || service._id || service.name;
}

function getReviewId(review: Review, index: number): string {
  return review.id || review._id || `review-${index}`;
}

function getNumber(value: number | string | undefined): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatPrice(price: number | string | undefined): string | null {
  const value = getNumber(price);
  return value === null ? null : `₱${value.toLocaleString("en-PH")}`;
}

function getRating(rating: number | string | undefined): number {
  const value = getNumber(rating);
  return value === null ? 0 : Math.max(0, Math.min(5, Math.round(value)));
}

function SectionIntro({
  eyebrow,
  title,
  description,
  dark = false,
  centered = false,
}: {
  eyebrow: string;
  title: ReactNode;
  description: string;
  dark?: boolean;
  centered?: boolean;
}) {
  return (
    <div className={`${centered ? "mx-auto text-center" : ""} max-w-2xl`}>
      <p
        className={`mb-4 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.24em] ${
          centered ? "justify-center" : ""
        } ${dark ? "text-brand-gold" : "text-brand-rust"}`}
      >
        <span className="h-px w-8 bg-current" aria-hidden="true" />
        {eyebrow}
      </p>
      <h2
        className={`font-display text-4xl leading-[0.98] tracking-[-0.04em] sm:text-5xl lg:text-6xl ${
          dark ? "text-brand-cream" : "text-brand-ink"
        }`}
      >
        {title}
      </h2>
      <p
        className={`mt-6 max-w-xl text-base leading-8 sm:text-lg ${
          centered ? "mx-auto" : ""
        } ${dark ? "text-brand-sand/75" : "text-brand-muted"}`}
      >
        {description}
      </p>
    </div>
  );
}

function ServiceCard({
  service,
  onSelect,
}: {
  service: Service;
  onSelect: (serviceId: string) => void;
}) {
  const serviceId = getServiceId(service);
  const price = formatPrice(service.price);
  const duration = getNumber(service.duration);
  const imageUrl = service.imageUrl ? normalizeR2Url(service.imageUrl) : null;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-brand-line bg-white shadow-[0_16px_50px_rgb(39_31_24/6%)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_60px_rgb(39_31_24/12%)]">
      <div className="relative h-52 overflow-hidden bg-brand-ink sm:h-60">
        {imageUrl ? (
          <ImageWithFallback
            src={imageUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover opacity-90 transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_30%_20%,rgb(217_151_69/30%),transparent_36%),linear-gradient(135deg,#211d19,#5b4030)]">
            <Scissors className="h-12 w-12 text-brand-gold/80" aria-hidden="true" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-brand-ink/85 via-brand-ink/10 to-transparent" />
        {price && (
          <span className="absolute right-4 top-4 rounded-full bg-brand-cream/95 px-3 py-1.5 text-sm font-bold text-brand-ink shadow-lg">
            {price}
          </span>
        )}
        <h3 className="absolute bottom-5 left-5 right-5 font-display text-2xl leading-none text-white sm:text-3xl">
          {service.name}
        </h3>
      </div>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <p className="line-clamp-3 min-h-[4.5rem] text-sm leading-7 text-brand-muted">
          {service.description || "A considered grooming service tailored to your style."}
        </p>
        <div className="mt-5 flex items-center justify-between border-t border-brand-line pt-4">
          {duration !== null ? (
            <span className="inline-flex items-center gap-2 text-sm font-medium text-brand-muted">
              <Clock3 className="h-4 w-4 text-brand-rust" aria-hidden="true" />
              {duration} min
            </span>
          ) : (
            <span className="text-sm text-brand-muted">Details at booking</span>
          )}
          <button
            type="button"
            onClick={() => onSelect(serviceId)}
            className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-bold text-brand-rust transition hover:bg-brand-gold/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2"
            aria-label={`Book ${service.name}`}
          >
            Book
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
}

function ReviewCard({
  review,
  index,
  onSelect,
}: {
  review: Review;
  index: number;
  onSelect: (review: Review) => void;
}) {
  const rating = getRating(review.rating);
  const name = review.customerName || "Anonymous customer";
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <button
      type="button"
      onClick={() => onSelect(review)}
      className="flex min-h-[17rem] w-full flex-col rounded-[1.5rem] border border-brand-line bg-brand-cream p-6 text-left shadow-[0_14px_45px_rgb(39_31_24/5%)] transition duration-300 hover:-translate-y-1 hover:border-brand-gold/60 hover:shadow-[0_22px_55px_rgb(39_31_24/10%)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-4 sm:p-7"
      aria-label={`Read review from ${name}`}
    >
      <div className="flex items-start justify-between gap-4">
        {review.customerAvatar ? (
          <ImageWithFallback
            src={normalizeR2Url(review.customerAvatar)}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-12 w-12 rounded-full object-cover ring-2 ring-brand-gold/30"
          />
        ) : (
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-ink font-display text-lg text-brand-gold ring-2 ring-brand-gold/30">
            {initials || "SB"}
          </span>
        )}
        <span className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
          {Array.from({ length: 5 }, (_, starIndex) => (
            <Star
              key={`${getReviewId(review, index)}-star-${starIndex}`}
              className={`h-4 w-4 ${
                starIndex < rating
                  ? "fill-brand-gold text-brand-gold"
                  : "text-brand-line"
              }`}
              aria-hidden="true"
            />
          ))}
        </span>
      </div>
      <p className="mt-6 line-clamp-4 flex-1 font-display text-xl leading-8 text-brand-ink">
        “{review.comment}”
      </p>
      <span className="mt-5 border-t border-brand-line pt-4 text-sm font-bold uppercase tracking-[0.14em] text-brand-muted">
        {name}
      </span>
    </button>
  );
}

export function LandingPage({
  onGetStarted,
  onLogin,
  onServiceClick,
  onNavigateToTerms,
  onNavigateToPrivacy,
}: LandingPageProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("home");
  const [services, setServices] = useState<Service[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [isLoadingContent, setIsLoadingContent] = useState(true);
  const [contentError, setContentError] = useState({ services: false, reviews: false });
  const prefersReducedMotion = usePrefersReducedMotion();

  const scrollTo = useCallback(
    (sectionId: string) => {
      document
        .getElementById(sectionId)
        ?.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth" });
      setMobileMenuOpen(false);
    },
    [prefersReducedMotion],
  );

  const loadContent = useCallback(async () => {
    setIsLoadingContent(true);
    setContentError({ services: false, reviews: false });

    const [serviceResult, reviewResult] = await Promise.allSettled([
      API.services.getAll(),
      API.reviews.getAll(),
    ]);

    if (serviceResult.status === "fulfilled") {
      setServices(
        (serviceResult.value as Service[]).filter(
          (service) => service.isActive !== false,
        ),
      );
    } else {
      setServices([]);
      setContentError((current) => ({ ...current, services: true }));
    }

    if (reviewResult.status === "fulfilled") {
      setReviews(
        (reviewResult.value as Review[]).filter(
          (review) => review.showOnLanding === true && Boolean(review.comment),
        ),
      );
    } else {
      setReviews([]);
      setContentError((current) => ({ ...current, reviews: true }));
    }

    if (serviceResult.status === "rejected" && import.meta.env.DEV) {
      console.warn("Landing services could not be loaded", serviceResult.reason);
    }
    if (reviewResult.status === "rejected" && import.meta.env.DEV) {
      console.warn("Landing reviews could not be loaded", reviewResult.reason);
    }

    setIsLoadingContent(false);
  }, []);

  useEffect(() => {
    void loadContent();
  }, [loadContent]);

  useEffect(() => {
    const sections = NAV_ITEMS.map(({ id }) => document.getElementById(id)).filter(
      (section): section is HTMLElement => Boolean(section),
    );
    if (!sections.length || !("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiveSection(visible.target.id);
      },
      { rootMargin: "-20% 0px -65% 0px", threshold: [0.1, 0.25, 0.5] },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  const handleServiceSelect = (serviceId: string) => {
    if (onServiceClick) {
      onServiceClick(serviceId);
    } else {
      onGetStarted();
    }
  };

  return (
    <div className="min-h-screen overflow-x-clip bg-brand-cream text-brand-ink">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>

      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-brand-ink/90 text-brand-cream shadow-lg shadow-brand-ink/10 backdrop-blur-xl">
        <nav aria-label="Primary navigation" className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="flex h-[4.75rem] items-center justify-between">
            <a
              href="#home"
              className="group inline-flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-brand-ink"
              onClick={() => setMobileMenuOpen(false)}
            >
              <img
                src={LOGO_URL}
                alt="Supremo Barber"
                width="48"
                height="48"
                decoding="async"
                className="h-11 w-11 object-contain transition duration-300 group-hover:scale-105"
              />
              <span className="hidden sm:block">
                <span className="block font-display text-xl leading-none tracking-tight text-brand-cream">
                  Supremo <span className="text-brand-gold">Barber</span>
                </span>
                <span className="mt-1 block text-[0.65rem] font-bold uppercase tracking-[0.2em] text-brand-sand/65">
                  Novaliches · Quezon City
                </span>
              </span>
            </a>

            <div className="hidden items-center gap-8 lg:flex">
              {NAV_ITEMS.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  aria-current={activeSection === item.id ? "location" : undefined}
                  className={`relative py-3 text-sm font-semibold transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-px after:origin-left after:bg-brand-gold after:transition-transform ${
                    activeSection === item.id
                      ? "text-brand-gold after:scale-x-100"
                      : "text-brand-sand/75 after:scale-x-0 hover:text-brand-cream hover:after:scale-x-100"
                  }`}
                >
                  {item.label}
                </a>
              ))}
            </div>

            <div className="hidden items-center gap-3 lg:flex">
              <Button
                type="button"
                variant="ghost"
                onClick={onLogin}
                className="text-brand-sand hover:bg-white/10 hover:text-brand-cream"
              >
                Sign in
              </Button>
              <Button
                type="button"
                onClick={onGetStarted}
                className="rounded-full bg-brand-gold px-5 font-bold text-brand-ink shadow-lg shadow-brand-gold/20 hover:bg-brand-gold/90"
              >
                Book appointment
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>

            <div className="lg:hidden">
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <button
                    type="button"
                    aria-label="Open navigation menu"
                    aria-expanded={mobileMenuOpen}
                    className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-brand-cream transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
                  >
                    <Menu className="h-6 w-6" aria-hidden="true" />
                  </button>
                </SheetTrigger>
                <SheetContent
                  side="right"
                  className="w-[min(88vw,22rem)] border-brand-line bg-brand-cream text-brand-ink"
                >
                  <SheetHeader className="text-left">
                    <SheetTitle className="font-display text-2xl text-brand-ink">
                      Supremo <span className="text-brand-rust">Barber</span>
                    </SheetTitle>
                    <SheetDescription className="text-brand-muted">
                      Find your next signature look.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="mt-8 flex flex-col gap-2">
                    {NAV_ITEMS.map((item) => (
                      <a
                        key={item.id}
                        href={`#${item.id}`}
                        onClick={() => setMobileMenuOpen(false)}
                        className="rounded-xl px-4 py-3 text-lg font-semibold text-brand-ink transition hover:bg-brand-gold/15 hover:text-brand-rust focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
                      >
                        {item.label}
                      </a>
                    ))}
                    <div className="mt-5 border-t border-brand-line pt-5">
                      <Button
                        type="button"
                        onClick={onGetStarted}
                        className="h-12 w-full rounded-full bg-brand-gold font-bold text-brand-ink hover:bg-brand-gold/90"
                      >
                        Book appointment
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={onLogin}
                        className="mt-3 h-12 w-full rounded-full border-brand-line text-brand-ink hover:bg-brand-ink hover:text-brand-cream"
                      >
                        Sign in
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </nav>
      </header>

      <main id="main-content">
        <section
          id="home"
          aria-labelledby="hero-heading"
          className="relative isolate overflow-hidden bg-brand-ink pt-[4.75rem] text-brand-cream"
        >
          <div className="absolute inset-0 -z-10 opacity-40" aria-hidden="true">
            <div className="absolute -left-40 top-20 h-96 w-96 rounded-full bg-brand-rust/30 blur-3xl" />
            <div className="absolute -right-40 bottom-0 h-[32rem] w-[32rem] rounded-full bg-brand-gold/20 blur-3xl" />
          </div>
          <div className="mx-auto grid min-h-[calc(100svh-4.75rem)] max-w-7xl items-center gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16 lg:py-24">
            <div className="max-w-2xl motion-safe:animate-fade-in-up">
              <p className="mb-6 inline-flex items-center gap-3 rounded-full border border-brand-gold/30 bg-brand-gold/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-brand-gold">
                <Scissors className="h-4 w-4" aria-hidden="true" />
                Classic craft · modern finish
              </p>
              <h1 id="hero-heading" className="font-display text-6xl leading-[0.88] tracking-[-0.06em] sm:text-7xl lg:text-[7.4rem]">
                Stay sharp.
                <span className="mt-3 block text-brand-gold">Look supreme.</span>
              </h1>
              <p className="mt-8 max-w-xl text-lg leading-8 text-brand-sand/80 sm:text-xl">
                Thoughtful cuts, clean finishes, and a barbershop experience made for your everyday confidence.
              </p>
              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <Button
                  type="button"
                  size="lg"
                  onClick={onGetStarted}
                  className="h-14 rounded-full bg-brand-gold px-7 text-base font-bold text-brand-ink shadow-xl shadow-brand-gold/20 hover:bg-brand-gold/90"
                >
                  Book an appointment
                  <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  onClick={() => scrollTo("services")}
                  className="h-14 rounded-full border-white/25 bg-white/5 px-7 text-base font-semibold text-brand-cream hover:bg-white/10 hover:text-brand-cream"
                >
                  Explore services
                </Button>
              </div>
              <div className="mt-12 grid max-w-xl gap-5 border-t border-white/15 pt-6 text-sm sm:grid-cols-2">
                <a
                  href={MAP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-start gap-3 text-brand-sand/75 hover:text-brand-cream"
                >
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-gold" aria-hidden="true" />
                  <span>
                    <span className="block font-bold text-brand-cream">Visit the shop</span>
                    <span className="mt-1 block leading-6">Novaliches, Quezon City</span>
                  </span>
                  <ArrowUpRight className="mt-0.5 h-4 w-4 opacity-0 transition group-hover:opacity-100" aria-hidden="true" />
                </a>
                <div className="inline-flex items-start gap-3 text-brand-sand/75">
                  <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-brand-gold" aria-hidden="true" />
                  <span>
                    <span className="block font-bold text-brand-cream">Open Monday–Saturday</span>
                    <span className="mt-1 block leading-6">9:00 AM–8:00 PM · Sunday closed</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-xl motion-safe:animate-fade-in-up lg:justify-self-end">
              <div className="absolute -inset-4 rounded-[2rem] border border-brand-gold/25" aria-hidden="true" />
              <figure className="relative overflow-hidden rounded-[1.75rem] border border-white/15 bg-brand-ink shadow-2xl shadow-black/30">
                <img
                  src={HERO_IMAGE_URL}
                  alt=""
                  width="1200"
                  height="1500"
                  fetchPriority="high"
                  decoding="async"
                  className="aspect-[4/5] w-full object-cover opacity-90"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-ink via-transparent to-brand-ink/10" aria-hidden="true" />
                <figcaption className="absolute bottom-6 left-6 right-6 flex items-end justify-between gap-6">
                  <span className="max-w-[13rem] font-display text-2xl leading-tight text-brand-cream sm:text-3xl">
                    Your look, considered from every angle.
                  </span>
                  <span className="hidden rounded-full border border-brand-gold/50 bg-brand-ink/60 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-brand-gold sm:block">
                    Supremo standard
                  </span>
                </figcaption>
              </figure>
            </div>
          </div>
        </section>

        <section aria-label="Booking benefits" className="border-b border-brand-line bg-brand-cream">
          <div className="mx-auto grid max-w-7xl gap-px bg-brand-line px-5 sm:grid-cols-3 sm:px-8">
            {[
              { icon: Scissors, label: "Services for your style", detail: "Browse the current menu" },
              { icon: CalendarDays, label: "Choose your moment", detail: "Select an available time" },
              { icon: ShieldCheck, label: "Simple online booking", detail: "50% GCash deposit at checkout" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-4 bg-brand-cream px-1 py-6 sm:px-6">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-gold/15 text-brand-rust">
                  <item.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-sm font-bold text-brand-ink">{item.label}</span>
                  <span className="mt-1 block text-xs text-brand-muted">{item.detail}</span>
                </span>
              </div>
            ))}
          </div>
        </section>

        <section id="services" aria-labelledby="services-heading" className="bg-brand-cream px-5 py-20 sm:px-8 sm:py-28 lg:py-36">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
              <SectionIntro
                eyebrow="The menu"
                title={<span id="services-heading">Made for the chair, built around you.</span>}
                description="Explore the current Supremo Barber services, with pricing and timing shown when available."
              />
              <button
                type="button"
                onClick={onGetStarted}
                className="inline-flex min-h-11 items-center gap-2 self-start rounded-full border border-brand-line px-5 text-sm font-bold text-brand-rust transition hover:border-brand-gold hover:bg-brand-gold/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 lg:self-end"
              >
                Book from the full menu
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-12">
              {isLoadingContent ? (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-live="polite">
                  {Array.from({ length: 6 }, (_, index) => (
                    <div key={index} className="h-[25rem] animate-pulse rounded-[1.5rem] bg-brand-line/50" />
                  ))}
                  <span className="sr-only">Loading services</span>
                </div>
              ) : contentError.services ? (
                <div className="rounded-[1.5rem] border border-brand-rust/30 bg-brand-rust/5 px-6 py-10 text-center">
                  <p className="font-display text-2xl text-brand-ink">The service menu is taking a moment.</p>
                  <p className="mt-2 text-brand-muted">Please try again or start a booking to see the live menu.</p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void loadContent()}
                    className="mt-5 rounded-full border-brand-rust text-brand-rust hover:bg-brand-rust hover:text-white"
                  >
                    Try again
                  </Button>
                </div>
              ) : services.length === 0 ? (
                <div className="rounded-[1.5rem] border border-brand-line bg-white px-6 py-10 text-center">
                  <p className="font-display text-2xl text-brand-ink">Services are being refreshed.</p>
                  <p className="mt-2 text-brand-muted">Start a booking to view the latest availability.</p>
                </div>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {services.slice(0, 6).map((service) => (
                    <ServiceCard key={getServiceId(service)} service={service} onSelect={handleServiceSelect} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        <section id="about" aria-labelledby="about-heading" className="bg-brand-ink px-5 py-20 text-brand-cream sm:px-8 sm:py-28 lg:py-36">
          <div className="mx-auto grid max-w-7xl gap-16 lg:grid-cols-[0.9fr_1.1fr] lg:items-start lg:gap-24">
            <SectionIntro
              eyebrow="The Supremo way"
              title={<span id="about-heading">Good grooming is a small daily ritual.</span>}
              description="Supremo Barber brings traditional barbering and modern style together in a focused, welcoming setting in Novaliches."
              dark
            />
            <div className="grid gap-10 sm:grid-cols-2">
              {[
                { number: "01", title: "Start with the conversation", text: "A strong finish starts with understanding the look you want and the way you live in it." },
                { number: "02", title: "Respect the details", text: "From the outline to the final styling, every step is part of the result." },
                { number: "03", title: "Leave feeling ready", text: "The goal is simple: a clean, confident look that works beyond the chair." },
              ].map((principle) => (
                <div
                  key={principle.number}
                  className={`border-t border-white/15 pt-5 ${
                    principle.number === "03" ? "sm:col-span-2 sm:max-w-[calc(50%-1.25rem)]" : ""
                  }`}
                >
                  <span className="font-mono text-xs font-bold tracking-[0.2em] text-brand-gold">{principle.number}</span>
                  <h3 className="mt-4 font-display text-2xl text-brand-cream">{principle.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-brand-sand/70">{principle.text}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="mx-auto mt-16 grid max-w-7xl gap-4 border-t border-white/15 pt-8 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <a href={MAP_URL} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 text-brand-sand/75 hover:text-brand-cream">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-gold" aria-hidden="true" />
              <span className="leading-6">{CONTACT.address}</span>
            </a>
            <a href={`tel:${CONTACT.phone.replace(/\s/g, "")}`} className="flex items-center gap-3 text-brand-sand/75 hover:text-brand-cream">
              <Phone className="h-4 w-4 shrink-0 text-brand-gold" aria-hidden="true" />
              {CONTACT.phone}
            </a>
            <a href={`mailto:${CONTACT.email}`} className="flex items-center gap-3 text-brand-sand/75 hover:text-brand-cream">
              <Mail className="h-4 w-4 shrink-0 text-brand-gold" aria-hidden="true" />
              <span className="break-all">{CONTACT.email}</span>
            </a>
            <div className="flex items-start gap-3 text-brand-sand/75">
              <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-brand-gold" aria-hidden="true" />
              <span className="leading-6">{CONTACT.hours}<br />Sunday closed</span>
            </div>
          </div>
        </section>

        <section id="reviews" aria-labelledby="reviews-heading" className="bg-brand-sand/30 px-5 py-20 sm:px-8 sm:py-28 lg:py-36">
          <div className="mx-auto max-w-7xl">
            <SectionIntro
              eyebrow="In their words"
              title={<span id="reviews-heading">The best kind of finish is the one you feel.</span>}
              description="Recent feedback shared by customers who chose to show their review on the Supremo Barber landing page."
              centered
            />
            <div className="mt-12">
              {isLoadingContent ? (
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3" role="status" aria-live="polite">
                  {Array.from({ length: 3 }, (_, index) => (
                    <div key={index} className="h-[17rem] animate-pulse rounded-[1.5rem] bg-brand-line/60" />
                  ))}
                  <span className="sr-only">Loading reviews</span>
                </div>
              ) : contentError.reviews ? (
                <div className="rounded-[1.5rem] border border-brand-line bg-brand-cream px-6 py-10 text-center">
                  <p className="font-display text-2xl text-brand-ink">Reviews are taking a moment to load.</p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void loadContent()}
                    className="mt-5 rounded-full border-brand-rust text-brand-rust hover:bg-brand-rust hover:text-white"
                  >
                    Try again
                  </Button>
                </div>
              ) : reviews.length === 0 ? (
                <div className="rounded-[1.5rem] border border-brand-line bg-brand-cream px-6 py-10 text-center">
                  <p className="font-display text-2xl text-brand-ink">Customer stories are coming soon.</p>
                  <p className="mt-2 text-brand-muted">Book a visit and make the next one yours.</p>
                </div>
              ) : (
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                  {reviews.slice(0, 6).map((review, index) => (
                    <ReviewCard key={getReviewId(review, index)} review={review} index={index} onSelect={setSelectedReview} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        <section id="booking" aria-labelledby="booking-heading" className="bg-brand-gold px-5 py-20 sm:px-8 sm:py-28">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 lg:flex-row lg:items-end">
            <div className="max-w-2xl">
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.24em] text-brand-ink/65">Ready when you are</p>
              <h2 id="booking-heading" className="font-display text-5xl leading-[0.95] tracking-[-0.04em] text-brand-ink sm:text-6xl">
                Your next good cut is one click away.
              </h2>
              <p className="mt-5 max-w-xl text-base leading-8 text-brand-ink/75 sm:text-lg">
                Choose a service, pick an available time, and confirm your appointment with the existing Supremo Barber booking flow.
              </p>
            </div>
            <Button
              type="button"
              size="lg"
              onClick={onGetStarted}
              className="h-14 rounded-full bg-brand-ink px-7 text-base font-bold text-brand-cream shadow-xl hover:bg-brand-ink/90"
            >
              Book an appointment
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Button>
          </div>
          <div className="mx-auto mt-10 flex max-w-7xl flex-wrap gap-x-8 gap-y-3 border-t border-brand-ink/15 pt-5 text-sm font-medium text-brand-ink/70">
            <span className="inline-flex items-center gap-2"><Check className="h-4 w-4" aria-hidden="true" /> Live service availability</span>
            <span className="inline-flex items-center gap-2"><Check className="h-4 w-4" aria-hidden="true" /> 50% GCash deposit at checkout</span>
            <span className="inline-flex items-center gap-2"><Check className="h-4 w-4" aria-hidden="true" /> Sunday appointments unavailable</span>
          </div>
        </section>
      </main>

      <Footer
        onNavigateToTerms={onNavigateToTerms}
        onNavigateToPrivacy={onNavigateToPrivacy}
        showLandingLinks
      />

      <Dialog open={Boolean(selectedReview)} onOpenChange={(open) => !open && setSelectedReview(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto border-brand-line bg-brand-cream sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-3xl text-brand-ink">Customer review</DialogTitle>
            <DialogDescription className="text-brand-muted">Shared with permission on the Supremo Barber landing page.</DialogDescription>
          </DialogHeader>
          {selectedReview && (
            <div className="pt-4">
              <div className="flex gap-1" aria-label={`${getRating(selectedReview.rating)} out of 5 stars`}>
                {Array.from({ length: 5 }, (_, index) => (
                  <Star
                    key={index}
                    className={`h-5 w-5 ${index < getRating(selectedReview.rating) ? "fill-brand-gold text-brand-gold" : "text-brand-line"}`}
                    aria-hidden="true"
                  />
                ))}
              </div>
              <p className="mt-6 font-display text-2xl leading-9 text-brand-ink">“{selectedReview.comment}”</p>
              <p className="mt-6 border-t border-brand-line pt-5 text-sm font-bold uppercase tracking-[0.14em] text-brand-muted">
                {selectedReview.customerName || "Anonymous customer"}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
