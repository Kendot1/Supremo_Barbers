import { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import API from "../services/api.service";
import { Card, CardContent } from "./ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { ImageWithFallback } from "./fallback/ImageWithFallback";
import { Footer } from "./Footer";
import { normalizeR2Url } from "../utils/avatarUrl";
import {
  Scissors,
  Clock,
  Star,
  MapPin,
  Menu,
  Award,
  Users,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
  Facebook,
  Instagram,
  Twitter,
  Shield,
  Heart,
  Calendar,
  Sparkles,
  CheckCircle,
  Wallet,
  Bell,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "./ui/sheet";
import { useIntersectionObserver } from "../hooks/useIntersectionObserver";

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
  onServiceClick?: (serviceId: string) => void;
  onNavigateToTerms?: () => void;
  onNavigateToPrivacy?: () => void;
}

interface Service {
  _id: string;
  id: string;
  name: string;
  price: number;
  duration: number;
  description?: string;
  imageUrl?: string;
  isActive?: boolean;
}

interface Review {
  id: string;
  customerName: string;
  customerAvatar?: string;
  comment: string;
  rating: number;
  showOnLanding?: boolean;
}

export function LandingPage({
  onGetStarted,
  onLogin,
  onServiceClick,
  onNavigateToTerms,
  onNavigateToPrivacy,
}: LandingPageProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isTestimonialsPaused, setIsTestimonialsPaused] =
    useState(false);
  const [activeSection, setActiveSection] = useState("home");
  const testimonialsScrollRef = useRef<HTMLDivElement>(null);
  const mobileServicesScrollRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);

  // Database-driven state
  const [services, setServices] = useState<Service[]>([]);
  const [testimonials, setTestimonials] = useState<Review[]>(
    [],
  );
  const [selectedTestimonial, setSelectedTestimonial] = useState<Review | null>(null);
  const [isLoadingServices, setIsLoadingServices] =
    useState(true);
  const [isLoadingReviews, setIsLoadingReviews] =
    useState(true);

  // User location state
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [mapSrc, setMapSrc] = useState("");
  const [distance, setDistance] = useState<string | null>(null);
  const [isCalculatingDistance, setIsCalculatingDistance] =
    useState(false);

  // Scroll animation refs
  const [heroRef, heroVisible] = useIntersectionObserver({
    threshold: 0.2,
  });
  const [aboutRef, aboutVisible] = useIntersectionObserver({
    threshold: 0.15,
  });
  const [servicesRef, servicesVisible] =
    useIntersectionObserver({ threshold: 0.1 });
  const [testimonialsRef, testimonialsVisible] =
    useIntersectionObserver({ threshold: 0.1 });

  // Process step refs for scroll animation
  const [step1Ref, step1Visible] = useIntersectionObserver({
    threshold: 0.5,
  });
  const [step2Ref, step2Visible] = useIntersectionObserver({
    threshold: 0.5,
  });
  const [step3Ref, step3Visible] = useIntersectionObserver({
    threshold: 0.5,
  });
  const [step4Ref, step4Visible] = useIntersectionObserver({
    threshold: 0.5,
  });

  // State for service carousel
  const [currentServiceIndex, setCurrentServiceIndex] =
    useState(0);
  const [hoveredService, setHoveredService] = useState<
    number | null
  >(null);

  // Animated counter state
  const [counters, setCounters] = useState({
    years: 0,
    clients: 0,
    rating: 0,
  });

  // Supremo Barber Lagro coordinates
  const BUSINESS_LAT = 14.7356399;
  const BUSINESS_LNG = 121.0685179;

  // Parallax effect
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, {
      passive: true,
    });
    return () =>
      window.removeEventListener("scroll", handleScroll);
  }, []);

  // Calculate distance
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Handle Get Directions
  const handleGetDirections = () => {
    if (navigator.geolocation) {
      setIsCalculatingDistance(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userCoords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(userCoords);

          const dist = calculateDistance(
            userCoords.lat,
            userCoords.lng,
            BUSINESS_LAT,
            BUSINESS_LNG,
          );

          if (dist < 1) {
            setDistance(`${(dist * 1000).toFixed(0)} meters`);
          } else {
            setDistance(`${dist.toFixed(2)} km`);
          }

          const directionsUrl = `https://www.google.com/maps/embed/v1/directions?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dF46OB-zq8g5b0&origin=${userCoords.lat},${userCoords.lng}&destination=${BUSINESS_LAT},${BUSINESS_LNG}&mode=driving`;

          setMapSrc(directionsUrl);
          setIsCalculatingDistance(false);
        },
        () => {
          alert(
            "Unable to get your location. Please enable location services.",
          );
          setIsCalculatingDistance(false);
        },
      );
    }
  };

  // Initialize map
  useEffect(() => {
    setMapSrc(
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3857.0899999999985!2d121.065943!3d14.7356399!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3397b18f133910f3%3A0xca4ad80100d1404f!2sSupremo%20Barber%20Lagro!5e0!3m2!1sen!2sph!4v1637000000000!5m2!1sen!2sph",
    );
  }, []);

  // Animated counter effect
  useEffect(() => {
    if (!heroVisible) return;

    const targets = { years: 7, clients: 10000, rating: 5.0 };
    const duration = 2000;
    const steps = 60;
    const stepDuration = duration / steps;

    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;

      setCounters({
        years: Math.floor(targets.years * progress),
        clients: Math.floor(targets.clients * progress),
        rating: parseFloat(
          (targets.rating * progress).toFixed(1),
        ),
      });

      if (currentStep >= steps) {
        setCounters(targets);
        clearInterval(interval);
      }
    }, stepDuration);

    return () => clearInterval(interval);
  }, [heroVisible]);

  // Auto-scroll testimonials
  useEffect(() => {
    if (testimonials.length === 0 || isTestimonialsPaused)
      return;

    const scrollContainer = testimonialsScrollRef.current;
    if (!scrollContainer) return;

    const scroll = () => {
      if (scrollContainer) {
        // Exact width of card (w-96 = 384px) + flex gap (gap-8 = 32px)
        const cardWidth = 384 + 32;
        // The total scrollable width of ONE full set of testimonials
        const singleSetWidth = cardWidth * testimonials.length;

        if (scrollContainer.scrollLeft >= singleSetWidth) {
          // Seamless pixel-perfect reset to exactly match the duplicate offset
          scrollContainer.scrollLeft -= singleSetWidth;
          scrollContainer.scrollLeft += 1;
        } else {
          scrollContainer.scrollLeft += 1;
        }
      }
    };

    const intervalId = setInterval(scroll, 30);
    return () => clearInterval(intervalId);
  }, [testimonials.length, isTestimonialsPaused]);

  // Track active section
  useEffect(() => {
    const handleScroll = () => {
      const sections = [
        "home",
        "about",
        "services",
        "testimonials",
      ];
      const scrollPosition = window.scrollY + 100;

      for (const sectionId of sections) {
        const section = document.getElementById(sectionId);
        if (section) {
          const sectionTop = section.offsetTop;
          const sectionBottom =
            sectionTop + section.offsetHeight;

          if (
            scrollPosition >= sectionTop &&
            scrollPosition < sectionBottom
          ) {
            setActiveSection(sectionId);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () =>
      window.removeEventListener("scroll", handleScroll);
  }, []);

  // Fetch services
  useEffect(() => {
    const fetchServices = async () => {
      try {
        setIsLoadingServices(true);
        const fetchedServices = await API.services.getAll();
        const activeServices = fetchedServices.filter(
          (s: Service) => s.isActive === true,
        );
        setServices(activeServices);
      } catch (error) {
        setServices([]);
      } finally {
        setIsLoadingServices(false);
      }
    };
    fetchServices();
  }, []);

  // Fetch reviews
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setIsLoadingReviews(true);
        const fetchedReviews = await API.reviews.getAll();
        const landingReviews = fetchedReviews.filter(
          (r: Review) => r.showOnLanding === true,
        );
        setTestimonials(landingReviews);
      } catch (error) {
        setTestimonials([]);
      } finally {
        setIsLoadingReviews(false);
      }
    };
    fetchReviews();
  }, []);

  const scrollToServices = () => {
    document
      .getElementById("services")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Professional Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-2xl border-b border-slate-200/60 z-50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-24">
            <div className="flex items-center gap-4 group cursor-pointer">
              <div className="relative">
                <div className="absolute inset-0 bg-[#DB9D47]/20 rounded-2xl blur-xl group-hover:bg-[#DB9D47]/30 transition-all"></div>
                <img
                  src="https://pub-86f4b5249e5c4021bb05d46908eeb094.r2.dev/supremo-barber/supremoWebLogo.png"
                  alt="Supremo Barber"
                  className="relative h-16 w-16 group-hover:scale-105 transition-transform"
                />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">
                  Supremo Barber
                </div>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-12">
              {[
                "Home",
                "About",
                "Services",
                "Testimonials",
              ].map((section) => (
                <a
                  key={section}
                  href={`#${section.toLowerCase()}`}
                  className={`relative text-sm font-semibold tracking-wide transition-colors group ${activeSection === section.toLowerCase()
                    ? "text-[#DB9D47]"
                    : "text-slate-600 hover:text-slate-900"
                    }`}
                >
                  {section}
                  <span
                    className={`absolute -bottom-1 left-0 h-0.5 bg-[#DB9D47] transition-all ${activeSection === section.toLowerCase()
                      ? "w-full"
                      : "w-0 group-hover:w-full"
                      }`}
                  ></span>
                </a>
              ))}
            </div>

            <div className="hidden lg:flex items-center gap-4">
              <Button
                onClick={onLogin}
                variant="ghost"
                className="text-slate-700 hover:text-slate-900 font-semibold"
              >
                Sign In
              </Button>
              <Button
                onClick={onGetStarted}
                className="bg-[#DB9D47] hover:bg-[#C56E33] text-white px-6 shadow-lg shadow-[#DB9D47]/30 hover:shadow-xl hover:scale-105 transition-all"
              >
                Book Now
              </Button>
            </div>

            {/* Mobile Menu */}
            <div className="lg:hidden">
              <Sheet
                open={mobileMenuOpen}
                onOpenChange={setMobileMenuOpen}
              >
                <SheetTrigger asChild>
                  <button className="p-3 hover:bg-slate-100 rounded-xl transition-colors">
                    <Menu className="h-6 w-6 text-slate-700" />
                  </button>
                </SheetTrigger>
                <SheetContent
                  side="right"
                  className="w-[300px]"
                >
                  <SheetHeader>
                    <SheetTitle>Menu</SheetTitle>
                    <SheetDescription className="sr-only">
                      Navigation menu
                    </SheetDescription>
                  </SheetHeader>
                  <div className="mt-8 flex flex-col gap-4">
                    {[
                      "Home",
                      "About",
                      "Services",
                      "Testimonials",
                    ].map((section) => (
                      <a
                        key={section}
                        href={`#${section.toLowerCase()}`}
                        className="text-lg font-semibold text-slate-700 hover:text-[#DB9D47] py-2 transition-colors"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {section}
                      </a>
                    ))}
                    <div className="border-t pt-4 mt-2 space-y-3">
                      <Button
                        onClick={() => {
                          onLogin();
                          setMobileMenuOpen(false);
                        }}
                        variant="outline"
                        className="w-full"
                      >
                        Sign In
                      </Button>
                      <Button
                        onClick={() => {
                          scrollToServices();
                          setMobileMenuOpen(false);
                        }}
                        className="w-full bg-[#DB9D47] hover:bg-[#C56E33] text-white"
                      >
                        Book Now
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section
        id="home"
        ref={heroRef}
        className="relative min-h-screen flex items-center pt-24 pb-20 overflow-hidden"
      >
        {/* Background with Parallax */}
        <div
          className="absolute inset-0 z-0"
          style={{
            transform: `translateY(${scrollY * 0.5}px)`,
          }}
        >
          <img
            src="https://pub-86f4b5249e5c4021bb05d46908eeb094.r2.dev/supremo-barber/home.jpg"
            className="w-full h-full object-cover scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-slate-900/70 to-slate-900/60"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-transparent to-transparent"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 w-full">
          <div className="grid grid-cols-1 gap-16 items-center justify-center">
            {/* Left Content */}
            <div
              className={`text-white transition-all duration-1000 text-center max-w-4xl mx-auto ${heroVisible
                ? "opacity-100 translate-x-0"
                : "opacity-0 -translate-x-10"
                }`}
            >
              {/* Main Headline */}
              <h1 className="text-6xl sm:text-7xl lg:text-8xl font-bold mb-8 leading-[0.95]">
                <span className="block text-white">
                  Stay Sharp.
                </span>
                <span className="block mt-2 bg-gradient-to-r from-[#DB9D47] via-[#F3E5AB] to-[#DB9D47] bg-clip-text text-transparent">
                  Look Supreme.
                </span>
              </h1>

              <p className="text-xl sm:text-2xl text-slate-300 mb-12 max-w-2xl leading-relaxed mx-auto">
                Experience the art of traditional barbering
                combined with modern style. Book your
                transformation today.
              </p>

              {/* CTA Button */}
              <div className="flex justify-center mb-16">
                <Button
                  size="lg"
                  onClick={scrollToServices}
                  className="group bg-[#DB9D47] hover:bg-[#C56E33] text-white px-10 py-7 text-xl font-semibold shadow-2xl shadow-[#DB9D47]/40 hover:shadow-[#DB9D47]/60 hover:scale-105 transition-all"
                >
                  Book Appointment
                  <ArrowRight className="ml-2 w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>

              {/* Horizontal Stats */}
              <div className="flex flex-wrap items-center justify-center gap-8 lg:gap-12">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#DB9D47]/20 flex items-center justify-center border border-[#DB9D47]/30">
                    <Award className="w-6 h-6 text-[#DB9D47]" />
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-white">
                      {counters.years}+
                    </div>
                    <div className="text-sm text-slate-400">
                      Years Experience
                    </div>
                  </div>
                </div>

                <div className="w-px h-12 bg-slate-700 hidden sm:block"></div>

                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#DB9D47]/20 flex items-center justify-center border border-[#DB9D47]/30">
                    <Users className="w-6 h-6 text-[#DB9D47]" />
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-white">
                      10k+
                    </div>
                    <div className="text-sm text-slate-400">
                      Happy Clients
                    </div>
                  </div>
                </div>

                <div className="w-px h-12 bg-slate-700 hidden sm:block"></div>

                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#DB9D47]/20 flex items-center justify-center border border-[#DB9D47]/30">
                    <Star className="w-6 h-6 text-[#DB9D47]" />
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-white">
                      {counters.rating.toFixed(1)}
                    </div>
                    <div className="text-sm text-slate-400">
                      Average Rating
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Barber Figure */}
            <div
              className={`hidden lg:block transition-all duration-1000 delay-300 ${heroVisible
                ? "opacity-100 translate-x-0"
                : "opacity-0 translate-x-10"
                }`}
            >
              <div className="relative">
                {/* Decorative Elements */}
                <div className="absolute -top-8 -left-8 w-72 h-72 bg-[#DB9D47]/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute -bottom-8 -right-8 w-72 h-72 bg-[#C56E33]/10 rounded-full blur-3xl animate-pulse animation-delay-1000"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
          <div className="text-white/60 text-sm font-medium">
            Scroll to explore
          </div>
          <div className="w-6 h-10 border-2 border-white/40 rounded-full flex items-start justify-center p-1.5">
            <div className="w-1 h-3 bg-white/60 rounded-full animate-scroll-down"></div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section
        id="about"
        ref={aboutRef}
        className="relative py-32 bg-white overflow-hidden"
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {/* Section Header */}
          <div
            className={`max-w-3xl mb-20 transition-all duration-1000 ${aboutVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-10"
              }`}
          >
            <div className="inline-flex items-center gap-2 bg-[#DB9D47]/10 rounded-full px-4 py-2 mb-6 border border-[#DB9D47]/20">
              <div className="w-2 h-2 bg-[#DB9D47] rounded-full animate-pulse"></div>
              <span className="text-sm font-bold text-[#DB9D47] uppercase tracking-wider">
                About Us
              </span>
            </div>
            <h2 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-slate-900 mb-6">
              Your Go-To Destination for{" "}
              <span className="text-[#DB9D47]">
                Premier Grooming
              </span>
            </h2>
            <p className="text-xl text-slate-600 leading-relaxed">
              Where tradition meets innovation in the art of
              men's grooming
            </p>
          </div>

          {/* Bento Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-20">
            {/* Large Story Card */}
            <div
              className={`lg:col-span-8 transition-all duration-1000 delay-200 ${aboutVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-10"
                }`}
            >
              <Card className="h-full bg-gradient-to-br from-[#5C4A3A] to-[#3E3229] text-white p-12 rounded-3xl border-none shadow-2xl overflow-hidden group hover:scale-[1.02] transition-transform duration-500">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#DB9D47]/10 rounded-full blur-3xl"></div>
                <div className="relative">
                  <h3 className="text-3xl font-bold mb-6">
                    Excellence Since 2017
                  </h3>
                  <p className="text-lg text-slate-300 leading-relaxed mb-6">
                    At Supremo Barber, we believe grooming is
                    more than just a service—it's an experience.
                    Since 2017, we've been Lagro's premier
                    destination for men who demand excellence in
                    every cut, style, and detail.
                  </p>
                  <p className="text-base text-slate-400 leading-relaxed mb-8">
                    Our master barbers combine years of
                    expertise with the latest techniques to
                    deliver precision haircuts, classic shaves,
                    and modern styling. Using only premium
                    products from trusted brands like Reuzel,
                    Layrite, and Uppercut, we ensure every
                    client walks out looking and feeling their
                    absolute best.
                  </p>

                  {/* Contact Info */}
                  <div className="space-y-4 pt-6 border-t border-white/20">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-[#DB9D47]/20 flex items-center justify-center border border-[#DB9D47]/30">
                        <MapPin className="w-6 h-6 text-[#DB9D47]" />
                      </div>
                      <div>
                        <div className="font-semibold text-white mb-1">
                          Visit Us
                        </div>
                        <div className="text-sm text-slate-400">
                          Lagro, Quezon City, Philippines
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-[#DB9D47]/20 flex items-center justify-center border border-[#DB9D47]/30">
                        <Clock className="w-6 h-6 text-[#DB9D47]" />
                      </div>
                      <div>
                        <div className="font-semibold text-white mb-1">
                          Open Hours
                        </div>
                        <div className="text-sm text-slate-400">
                          Mon-Sat: 9AM - 8PM • Closed Sunday
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Map Card */}
            <div
              className={`lg:col-span-4 transition-all duration-1000 delay-300 ${aboutVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-10"
                }`}
            >
              <Card className="h-full rounded-3xl overflow-hidden shadow-2xl border-2 border-[#DB9D47]/20 group hover:shadow-[#DB9D47]/30 hover:scale-[1.02] transition-all duration-500">
                <div className="relative h-full min-h-[400px]">
                  {distance && userLocation && (
                    <div className="absolute top-4 left-4 z-20 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl px-4 py-3 border border-[#DB9D47]/20">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-[#DB9D47]" />
                        <div>
                          <div className="text-xs text-slate-600 font-semibold">
                            Distance
                          </div>
                          <div className="text-lg font-bold text-slate-900">
                            {distance}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {!userLocation && (
                    <div className="absolute top-4 left-4 z-20">

                    </div>
                  )}

                  {mapSrc ? (
                    <iframe
                      src={mapSrc}
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      allowFullScreen
                      loading="lazy"
                      title="Location"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-100">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#DB9D47]"></div>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>

          {/* Feature Cards */}
          <div
            className={`grid grid-cols-1 md:grid-cols-3 gap-6 transition-all duration-1000 delay-400 ${aboutVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-10"
              }`}
          >
            {[
              {
                icon: CheckCircle2,
                title: "Master Barbers",
                desc: "Our certified barbers bring 5-7 years of professional experience, mastering both classic techniques and contemporary styles",
                color: "from-[#DB9D47] to-[#C56E33]",
              },
              {
                icon: Shield,
                title: "Premium Quality",
                desc: "We exclusively use top-tier professional products—Reuzel for pomades, Layrite for styling, and Uppercut for finishing touches",
                color: "from-[#87765E] to-[#5C4A3A]",
              },
              {
                icon: Heart,
                title: "Client-First Experience",
                desc: "Enjoy a relaxing atmosphere with personalized consultations, ensuring your style vision becomes reality every visit",
                color: "from-[#C56E33] to-[#A0522D]",
              },
            ].map((feature, idx) => (
              <Card
                key={idx}
                className="group relative bg-white rounded-3xl p-8 border-2 border-slate-100 hover:border-[#DB9D47]/30 hover:shadow-2xl hover:shadow-[#DB9D47]/10 transition-all duration-500 hover:-translate-y-2 overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#DB9D47]/5 to-transparent rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
                <div className="relative">
                  <div
                    className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.color} shadow-xl mb-6 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`}
                  >
                    <feature.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-slate-600 leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
              </Card>
            ))}
          </div>

          {/* How It Works - Integrated Timeline */}
          <div className="mt-32 pt-16 border-t-2 border-[#DB9D47]/10">
            <div
              className={`text-center mb-20 transition-all duration-1000 ${aboutVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-10"
                }`}
            >
              <div className="inline-flex items-center gap-2 bg-[#DB9D47]/10 rounded-full px-4 py-2 mb-6 border border-[#DB9D47]/20">
                <Calendar className="w-4 h-4 text-[#DB9D47]" />
                <span className="text-sm font-bold text-[#DB9D47] uppercase tracking-wider">
                  How It Works
                </span>
              </div>
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 mb-6">
                Your Journey to{" "}
                <span className="text-[#DB9D47]">
                  Supreme Style
                </span>
              </h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Four simple steps to secure your spot and
                experience premium grooming
              </p>
            </div>

            {/* Animated Timeline Steps */}
            <div className="relative max-w-4xl mx-auto">
              {/* Vertical Line */}
              <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#DB9D47] via-[#DB9D47] to-transparent hidden lg:block -translate-x-1/2"></div>

              {/* Step 1 */}
              <div ref={step1Ref} className="relative mb-24">
                <div
                  className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-center transition-all duration-1000 ${step1Visible
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-20"
                    }`}
                >
                  <div className="lg:text-right">
                    <div className="inline-block lg:block">
                      <div className="inline-flex items-center gap-2 bg-[#DB9D47]/10 rounded-full px-4 py-2 mb-4 border border-[#DB9D47]/20">
                        <span className="text-sm font-bold text-[#DB9D47]">
                          STEP 01
                        </span>
                      </div>
                      <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">
                        Browse & Select Your Service
                      </h3>
                      <p className="text-base text-slate-600 leading-relaxed max-w-lg lg:ml-auto">
                        Explore our curated range of premium
                        services—from precision haircuts and
                        beard trims to hot towel shaves and
                        styling.
                      </p>
                    </div>
                  </div>
                  <div className="relative lg:pl-12">
                    <div className="absolute left-1/2 lg:left-0 top-1/2 -translate-y-1/2 w-16 h-16 -translate-x-1/2 lg:translate-x-0 bg-gradient-to-br from-[#DB9D47] to-[#C56E33] rounded-full shadow-xl shadow-[#DB9D47]/40 flex items-center justify-center z-10 animate-pulse-slow">
                      <Scissors className="w-8 h-8 text-white" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div ref={step2Ref} className="relative mb-24">
                <div
                  className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-center transition-all duration-1000 ${step2Visible
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-20"
                    }`}
                >
                  <div className="lg:order-2">
                    <div className="inline-block lg:block">
                      <div className="inline-flex items-center gap-2 bg-[#DB9D47]/10 rounded-full px-4 py-2 mb-4 border border-[#DB9D47]/20">
                        <span className="text-sm font-bold text-[#DB9D47]">
                          STEP 02
                        </span>
                      </div>
                      <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">
                        Pick Your Perfect Time
                      </h3>
                      <p className="text-base text-slate-600 leading-relaxed max-w-lg">
                        View real-time availability and choose a
                        date and time that fits your schedule.
                        Our system shows only open slots.
                      </p>
                    </div>
                  </div>
                  <div className="relative lg:order-1 lg:pr-12 lg:text-right">
                    <div className="absolute left-1/2 lg:left-auto lg:right-0 top-1/2 -translate-y-1/2 w-16 h-16 -translate-x-1/2 lg:translate-x-0 bg-gradient-to-br from-[#DB9D47] to-[#C56E33] rounded-full shadow-xl shadow-[#DB9D47]/40 flex items-center justify-center z-10 animate-pulse-slow">
                      <Calendar className="w-8 h-8 text-white" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div ref={step3Ref} className="relative mb-24">
                <div
                  className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-center transition-all duration-1000 ${step3Visible
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-20"
                    }`}
                >
                  <div className="lg:text-right">
                    <div className="inline-block lg:block">
                      <div className="inline-flex items-center gap-2 bg-[#DB9D47]/10 rounded-full px-4 py-2 mb-4 border border-[#DB9D47]/20">
                        <span className="text-sm font-bold text-[#DB9D47]">
                          STEP 03
                        </span>
                      </div>
                      <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">
                        Secure with 50% Deposit
                      </h3>
                      <p className="text-base text-slate-600 leading-relaxed max-w-lg lg:ml-auto">
                        Review your booking details and confirm
                        with a quick 50% deposit payment to
                        secure your appointment.
                      </p>
                    </div>
                  </div>
                  <div className="relative lg:pl-12">
                    <div className="absolute left-1/2 lg:left-0 top-1/2 -translate-y-1/2 w-16 h-16 -translate-x-1/2 lg:translate-x-0 bg-gradient-to-br from-[#DB9D47] to-[#C56E33] rounded-full shadow-xl shadow-[#DB9D47]/40 flex items-center justify-center z-10 animate-pulse-slow">
                      <Wallet className="w-8 h-8 text-white" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 4 */}
              <div ref={step4Ref} className="relative">
                <div
                  className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-center transition-all duration-1000 ${step4Visible
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-20"
                    }`}
                >
                  <div className="lg:order-2">
                    <div className="inline-block lg:block">
                      <div className="inline-flex items-center gap-2 bg-[#DB9D47]/10 rounded-full px-4 py-2 mb-4 border border-[#DB9D47]/20">
                        <span className="text-sm font-bold text-[#DB9D47]">
                          STEP 04
                        </span>
                      </div>
                      <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">
                        Experience Supreme Grooming
                      </h3>
                      <p className="text-base text-slate-600 leading-relaxed max-w-lg">
                        Arrive on time and relax. Our expert
                        barbers will deliver a personalized
                        grooming experience.
                      </p>
                    </div>
                  </div>
                  <div className="relative lg:order-1 lg:pr-12 lg:text-right">
                    <div className="absolute left-1/2 lg:left-auto lg:right-0 top-1/2 -translate-y-1/2 w-16 h-16 -translate-x-1/2 lg:translate-x-0 bg-gradient-to-br from-[#DB9D47] to-[#C56E33] rounded-full shadow-xl shadow-[#DB9D47]/40 flex items-center justify-center z-10 animate-pulse-slow">
                      <Sparkles className="w-8 h-8 text-white" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <div
              className={`text-center mt-16 transition-all duration-1000 ${step4Visible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-10"
                }`}
            >
              <Button
                size="lg"
                onClick={scrollToServices}
                className="bg-[#DB9D47] hover:bg-[#C56E33] text-white px-10 py-6 text-base font-semibold shadow-2xl shadow-[#DB9D47]/30 hover:shadow-[#DB9D47]/40 hover:scale-105 transition-all rounded-2xl"
              >
                Get Started Now
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section
        id="services"
        ref={servicesRef}
        className="relative py-32 bg-gradient-to-b from-slate-50 to-white overflow-hidden"
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {/* Section Header */}
          <div
            className={`text-center max-w-3xl mx-auto mb-20 transition-all duration-1000 ${servicesVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-10"
              }`}
          >
            <div className="inline-flex items-center gap-2 bg-[#DB9D47]/10 rounded-full px-4 py-2 mb-6 border border-[#DB9D47]/20">
              <Scissors className="w-4 h-4 text-[#DB9D47]" />
              <span className="text-sm font-bold text-[#DB9D47] uppercase tracking-wider">
                Services
              </span>
            </div>
            <h2 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-slate-900 mb-6">
              Premium{" "}
              <span className="text-[#DB9D47]">Services</span>
            </h2>
            <p className="text-xl text-slate-600">
              Choose from our range of expert grooming services
              tailored to your style
            </p>
          </div>

          {/* Desktop Grid */}
          <div className="hidden md:block">
            {isLoadingServices ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#DB9D47]"></div>
              </div>
            ) : services.length === 0 ? (
              <div className="text-center py-20 text-slate-600">
                No services available.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {services.slice(0, 6).map((service, index) => (
                  <Card
                    key={service.id || service._id}
                    className={`group relative overflow-hidden bg-white cursor-pointer transition-all duration-500 hover:shadow-xl border border-slate-200 ${servicesVisible
                      ? "animate-fade-in-up"
                      : "opacity-0"
                      }`}
                    onClick={() =>
                      onServiceClick?.(
                        service.id || service._id,
                      )
                    }
                    onMouseEnter={() =>
                      setHoveredService(index)
                    }
                    onMouseLeave={() => setHoveredService(null)}
                    style={{
                      animationDelay: `${index * 100}ms`,
                    }}
                  >
                    {/* Traditional Barber Pole Stripe Accent */}
                    <div className="absolute top-0 left-0 w-1 h-full bg-[#DB9D47] transform origin-top transition-all duration-500 group-hover:w-2"></div>

                    {/* Image Container */}
                    <div className="relative h-40 overflow-hidden bg-slate-100">
                      <ImageWithFallback
                        src={
                          normalizeR2Url(service.imageUrl) ||
                          "https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=600"
                        }
                        alt={service.name}
                        className={`w-full h-full object-cover transition-all duration-500 ${hoveredService === index
                          ? "scale-105"
                          : "scale-100"
                          }`}
                      />
                      <div className="absolute inset-0 bg-slate-900/20"></div>
                    </div>

                    {/* Content */}
                    <CardContent className="p-4">
                      {/* Title */}
                      <h3 className="text-xl font-bold text-slate-900 mb-2">
                        {service.name}
                      </h3>

                      {/* Description */}
                      <p className="text-slate-600 mb-4 line-clamp-2 text-sm leading-snug">
                        {service.description}
                      </p>

                      {/* Divider Line */}
                      <div className="w-full h-px bg-slate-200 mb-3"></div>

                      {/* Details Row */}
                      <div className="flex items-center justify-between">
                        {/* Duration */}
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Clock className="w-3.5 h-3.5" />
                          <span className="text-xs font-medium">
                            {service.duration} min
                          </span>
                        </div>

                        {/* Price */}
                        <div className="text-right">
                          <div className="text-xl font-bold text-[#DB9D47]">
                            ₱{service.price}
                          </div>
                        </div>
                      </div>

                      {/* Hover Action */}
                      <div
                        className={`mt-3 pt-3 border-t border-slate-200 transition-all duration-300 ${hoveredService === index
                          ? "opacity-100 translate-y-0"
                          : "opacity-0 translate-y-2"
                          }`}
                      >
                        <div className="flex items-center justify-center gap-2 text-[#DB9D47] font-semibold">
                          <span className="text-xs uppercase tracking-wide">
                            Book This Service
                          </span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Mobile Carousel - Swipeable */}
          <div className="md:hidden">
            {isLoadingServices ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#DB9D47]"></div>
              </div>
            ) : services.length === 0 ? (
              <div className="text-center py-20 text-slate-600">
                No services available.
              </div>
            ) : (
              <div>
                {/* Swipeable container */}
                <div
                  ref={mobileServicesScrollRef}
                  className="flex gap-4 overflow-x-auto pb-4 -mx-6 px-6 scrollbar-hide"
                  style={{
                    scrollSnapType: "x mandatory",
                    WebkitOverflowScrolling: "touch",
                  }}
                  onScroll={() => {
                    const el = mobileServicesScrollRef.current;
                    if (el) {
                      const cardWidth = el.offsetWidth * 0.85 + 16; // card width + gap
                      const idx = Math.round(el.scrollLeft / cardWidth);
                      setCurrentServiceIndex(
                        Math.min(idx, Math.min(services.length, 6) - 1)
                      );
                    }
                  }}
                >
                  {services.slice(0, 6).map((service, index) => (
                    <Card
                      key={service.id || service._id}
                      className="flex-shrink-0 overflow-hidden rounded-3xl border-2 border-[#DB9D47]/20 shadow-xl bg-white cursor-pointer"
                      style={{
                        width: "85%",
                        minWidth: "85%",
                        scrollSnapAlign: "center",
                      }}
                      onClick={() =>
                        onServiceClick?.(service.id || service._id)
                      }
                    >
                      <div className="relative h-56 overflow-hidden">
                        <ImageWithFallback
                          src={
                            normalizeR2Url(service.imageUrl) ||
                            "https://images.unsplash.com/photo-1621605815971-fbc98d665033"
                          }
                          alt={service.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/50 to-transparent"></div>
                        <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-xl rounded-2xl px-4 py-2.5 shadow-2xl border border-[#DB9D47]/20">
                          <div className="text-xs text-slate-600 font-semibold">
                            From
                          </div>
                          <div className="text-xl font-bold text-[#DB9D47]">
                            ₱{service.price}
                          </div>
                        </div>
                        <div className="absolute bottom-4 left-4 right-4">
                          <h3 className="text-2xl font-bold text-white drop-shadow-lg">
                            {service.name}
                          </h3>
                        </div>
                      </div>
                      <CardContent className="p-5 bg-white">
                        <p className="text-slate-600 mb-3 text-sm line-clamp-2">
                          {service.description}
                        </p>
                        <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                          <div className="flex items-center gap-2 text-slate-600">
                            <Clock className="w-4 h-4 text-[#DB9D47]" />
                            <span className="font-semibold text-sm">
                              {service.duration} min
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-[#DB9D47] font-semibold text-xs uppercase tracking-wide">
                            Book Now
                            <ArrowRight className="w-3.5 h-3.5" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Swipe hint + dots */}
                <div className="flex flex-col items-center gap-3 mt-6">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <ChevronLeft className="w-3 h-3" />
                    <span>Swipe to explore</span>
                    <ChevronRight className="w-3 h-3" />
                  </div>
                  <div className="flex justify-center gap-2">
                    {services.slice(0, 6).map((_, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setCurrentServiceIndex(index);
                          const el = mobileServicesScrollRef.current;
                          if (el) {
                            const cardWidth = el.offsetWidth * 0.85 + 16;
                            el.scrollTo({
                              left: cardWidth * index,
                              behavior: "smooth",
                            });
                          }
                        }}
                        className={`h-2.5 rounded-full transition-all duration-300 ${index === currentServiceIndex
                          ? "bg-[#DB9D47] w-8"
                          : "bg-slate-300 hover:bg-slate-400 w-2.5"
                          }`}
                        aria-label={`Go to service ${index + 1}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* CTA */}
          <div
            className={`text-center mt-16 transition-all duration-1000 delay-300 ${servicesVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-10"
              }`}
          >
            <Button
              size="lg"
              onClick={onGetStarted}
              className="bg-[#DB9D47] hover:bg-[#C56E33] text-white px-10 py-6 text-base font-semibold shadow-2xl shadow-[#DB9D47]/30 hover:shadow-[#DB9D47]/40 hover:scale-105 transition-all rounded-2xl"
            >
              View All Services
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section
        id="testimonials"
        ref={testimonialsRef}
        className="relative py-32 bg-white overflow-hidden"
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {/* Section Header */}
          <div
            className={`text-center max-w-3xl mx-auto mb-20 transition-all duration-1000 ${testimonialsVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-10"
              }`}
          >
            <div className="inline-flex items-center gap-2 bg-[#DB9D47]/10 rounded-full px-4 py-2 mb-6 border border-[#DB9D47]/20">
              <Star className="w-4 h-4 text-[#DB9D47]" />
              <span className="text-sm font-bold text-[#DB9D47] uppercase tracking-wider">
                Testimonials
              </span>
            </div>
            <h2 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-slate-900 mb-6">
              What Our{" "}
              <span className="text-[#DB9D47]">Clients Say</span>
            </h2>
            <p className="text-xl text-slate-600">
              Join thousands of satisfied customers who trust us
              with their style
            </p>
          </div>

          {/* Testimonials Scroll */}
          <div className="relative">
            {isLoadingReviews ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#DB9D47]"></div>
              </div>
            ) : testimonials.length === 0 ? (
              <div className="text-center py-20 text-slate-600">
                No testimonials available.
              </div>
            ) : (
              <div
                ref={testimonialsScrollRef}
                className="flex gap-8 overflow-x-auto scrollbar-hide pb-4"
                style={{
                  scrollbarWidth: "none",
                  msOverflowStyle: "none",
                }}
                onMouseEnter={() =>
                  setIsTestimonialsPaused(true)
                }
                onMouseLeave={() =>
                  setIsTestimonialsPaused(false)
                }
              >
                {[...testimonials, ...testimonials, ...testimonials, ...testimonials, ...testimonials, ...testimonials].map(
                  (testimonial, index) => (
                    <Card
                      key={`${testimonial.id}-${index}`}
                      className="flex-shrink-0 w-96 h-[450px] p-10 transition-all duration-500 hover:shadow-2xl border-2 border-slate-100 hover:border-[#DB9D47]/30 rounded-3xl cursor-pointer hover:bg-slate-50"
                      onClick={() => setSelectedTestimonial(testimonial)}
                    >
                      <div className="flex flex-col items-center text-center h-full justify-between">
                        {testimonial.customerAvatar ? (
                          <div className="w-20 h-20 rounded-full mb-6 shadow-xl overflow-hidden ring-4 ring-[#DB9D47]/20">
                            <ImageWithFallback
                              src={normalizeR2Url(
                                testimonial.customerAvatar,
                              )}
                              alt={
                                testimonial.customerName ||
                                "Customer"
                              }
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-20 h-20 bg-gradient-to-br from-[#DB9D47] to-[#C56E33] rounded-full flex items-center justify-center text-white text-2xl mb-6 shadow-xl">
                            {testimonial.customerName
                              ?.substring(0, 2)
                              .toUpperCase() || "CU"}
                          </div>
                        )}
                        <div className="flex gap-1 mb-6">
                          {[...Array(testimonial.rating)].map(
                            (_, i) => (
                              <Star
                                key={i}
                                className="w-5 h-5 fill-[#DB9D47] text-[#DB9D47]"
                              />
                            ),
                          )}
                        </div>
                        <p className="text-lg text-slate-700 mb-6 italic leading-relaxed line-clamp-4">
                          "{testimonial.comment}"
                        </p>
                        <div className="border-t-2 border-[#DB9D47]/20 pt-6 w-full">
                          <p className="font-bold text-xl text-slate-900 mb-1">
                            {testimonial.customerName ||
                              "Anonymous Customer"}
                          </p>

                        </div>
                      </div>
                    </Card>
                  ),
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer
        onNavigateToTerms={onNavigateToTerms}
        onNavigateToPrivacy={onNavigateToPrivacy}
      />

      {/* Testimonial Modal */}
      <Dialog open={!!selectedTestimonial} onOpenChange={(open) => !open && setSelectedTestimonial(null)}>
        <DialogContent className="sm:max-w-md md:max-w-lg lg:max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center text-[#5C4A3A]">Review</DialogTitle>
            <DialogDescription className="text-center">
              Customer Feedback
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center text-center p-4">
            {selectedTestimonial?.customerAvatar ? (
              <div className="w-24 h-24 rounded-full mb-6 shadow-xl overflow-hidden ring-4 ring-[#DB9D47]/20">
                <ImageWithFallback
                  src={normalizeR2Url(selectedTestimonial.customerAvatar)}
                  alt={selectedTestimonial.customerName || "Customer"}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-24 h-24 bg-gradient-to-br from-[#DB9D47] to-[#C56E33] rounded-full flex items-center justify-center text-white text-3xl mb-6 shadow-xl">
                {selectedTestimonial?.customerName?.substring(0, 2).toUpperCase() || "CU"}
              </div>
            )}
            <div className="flex gap-1 mb-6">
              {[...Array(selectedTestimonial?.rating || 5)].map((_, i) => (
                <Star key={i} className="w-6 h-6 fill-[#DB9D47] text-[#DB9D47]" />
              ))}
            </div>
            <p className="text-lg md:text-xl text-slate-700 mb-8 italic leading-relaxed">
              "{selectedTestimonial?.comment}"
            </p>
            <div className="border-t-2 border-[#DB9D47]/20 pt-6 w-full">
              <p className="font-bold text-2xl text-slate-900 mb-1">
                {selectedTestimonial?.customerName || "Anonymous Customer"}
              </p>

            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
