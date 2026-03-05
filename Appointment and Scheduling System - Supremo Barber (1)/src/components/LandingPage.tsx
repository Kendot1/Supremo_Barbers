import { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import API from "../services/api.service";
import { Card, CardContent } from "./ui/card";
import { ImageWithFallback } from "./fallback/ImageWithFallback";
import { Footer } from "./Footer";
import { normalizeR2Url } from "../utils/avatarUrl";
import {
  Scissors,
  Clock,
  Star,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Phone,
  Mail,
  Facebook,
  Instagram,
  Twitter,
  Menu,
  X,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "./ui/sheet";

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
  onServiceClick?: (serviceId: string) => void;
  onNavigateToTerms?: () => void;
  onNavigateToPrivacy?: () => void;
}

interface Service {
  _id: string;
  id: string; // Supabase returns 'id', keep both for compatibility
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

// Fallback data for demo mode (when backend is unavailable)
const FALLBACK_SERVICES: Service[] = [
  {
    _id: "1",
    id: "1",
    name: "Gupit Supremo",
    price: 250,
    duration: 30,
    description: "Classic haircut with modern styling",
    imageUrl:
      "https://images.unsplash.com/photo-1759408174071-f2971472dc73?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYXJiZXIlMjBjdXR0aW5nJTIwaGFpcnxlbnwxfHx8fDE3NjAxNDc1NjF8MA&ixlib=rb-4.1.0&q=80&w=1080",
    isActive: true,
  },
  {
    _id: "2",
    id: "2",
    name: "Gupit Supremo w/ Banlaw",
    price: 300,
    duration: 40,
    description: "Premium haircut with hair wash",
    imageUrl:
      "https://images.unsplash.com/photo-1605497788044-5a32c7078486?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYXJiZXIlMjBzaG9wJTIwc2VydmljZXxlbnwxfHx8fDE3NjAxNDc1OTB8MA&ixlib=rb-4.1.0&q=80&w=1080",
    isActive: true,
  },
  {
    _id: "3",
    id: "3",
    name: "Ahit Supremo",
    price: 200,
    duration: 30,
    description: "Clean and precise shave",
    imageUrl:
      "https://images.unsplash.com/photo-1621605815971-fbc98d665033?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYXJiZXIlMjBzaGF2ZXxlbnwxfHx8fDE3NjAxNDc1NjF8MA&ixlib=rb-4.1.0&q=80&w=1080",
    isActive: true,
  },
  {
    _id: "4",
    id: "4",
    name: "Hair Tattoo",
    price: 350,
    duration: 45,
    description: "Artistic hair designs",
    imageUrl:
      "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoYWlyJTIwZGVzaWdufGVufDF8fHx8MTc2MDE0NzY1N3ww&ixlib=rb-4.1.0&q=80&w=1080",
    isActive: true,
  },
  {
    _id: "5",
    id: "5",
    name: "Supremo Espesyal",
    price: 450,
    duration: 60,
    description: "Complete grooming experience",
    imageUrl:
      "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBiYXJiZXJ8ZW58MXx8fHwxNzYwMTQ3NjI4fDA&ixlib=rb-4.1.0&q=80&w=1080",
    isActive: true,
  },
  {
    _id: "6",
    id: "6",
    name: "Supremo Espesyal w/ Ahit",
    price: 550,
    duration: 75,
    description: "Premium grooming with shave",
    imageUrl:
      "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYXJiZXIlMjBncm9vbWluZ3xlbnwxfHx8fDE3NjAxNDc1NjF8MA&ixlib=rb-4.1.0&q=80&w=1080",
    isActive: true,
  },
  {
    _id: "7",
    id: "7",
    name: "Linis Tenga",
    price: 150,
    duration: 15,
    description: "Professional ear cleaning",
    imageUrl:
      "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYXJiZXIlMjB0b29sc3xlbnwxfHx8fDE3NjAxNDc1NjF8MA&ixlib=rb-4.1.0&q=80&w=1080",
    isActive: true,
  },
  {
    _id: "8",
    id: "8",
    name: "Tina (Hair Color)",
    price: 450,
    duration: 90,
    description: "Professional hair coloring",
    imageUrl:
      "https://images.unsplash.com/photo-1560066984-138dadb4c035?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoYWlyJTIwY29sb3J8ZW58MXx8fHwxNzYwMTQ3NjU3fDA&ixlib=rb-4.1.0&q=80&w=1080",
    isActive: true,
  },
  {
    _id: "9",
    id: "9",
    name: "Scalp Treatment",
    price: 450,
    duration: 45,
    description: "Therapeutic scalp care",
    imageUrl:
      "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzY2FscCUyMHRyZWF0bWVudHxlbnwxfHx8fDE3NjAxNDc1NjF8MA&ixlib=rb-4.1.0&q=80&w=1080",
    isActive: true,
  },
  {
    _id: "10",
    id: "10",
    name: "Perm",
    price: 1800,
    duration: 120,
    description: "Professional hair perming",
    imageUrl:
      "https://images.unsplash.com/photo-1562322140-8baeececf3df?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoYWlyJTIwcGVybXxlbnwxfHx8fDE3NjAxNDc1NjF8MA&ixlib=rb-4.1.0&q=80&w=1080",
    isActive: true,
  },
];

const FALLBACK_TESTIMONIALS: Review[] = [
  {
    id: "1",
    customerName: "Marcus Johnson",
    comment:
      "Best barbershop experience I've ever had! The attention to detail is amazing.",
    rating: 5,
    showOnLanding: true,
  },
  {
    id: "2",
    customerName: "David Chen",
    comment:
      "Professional service, great atmosphere, and my haircut always looks fresh!",
    rating: 5,
    showOnLanding: true,
  },
  {
    id: "3",
    customerName: "Robert Williams",
    comment:
      "Been coming here for 2 years. Never disappointed. Highly recommend!",
    rating: 5,
    showOnLanding: true,
  },
];

export function LandingPage({
  onGetStarted,
  onLogin,
  onServiceClick,
  onNavigateToTerms,
  onNavigateToPrivacy,
}: LandingPageProps) {
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [currentServiceIndex, setCurrentServiceIndex] =
    useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isTestimonialsPaused, setIsTestimonialsPaused] =
    useState(false);
  const [activeSection, setActiveSection] = useState("home");
  const servicesScrollRef = useRef<HTMLDivElement>(null);
  const testimonialsScrollRef = useRef<HTMLDivElement>(null);

  // Database-driven state
  const [services, setServices] = useState<Service[]>([]);
  const [testimonials, setTestimonials] = useState<Review[]>(
    [],
  );
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

  // Supremo Barber Lagro coordinates
  const BUSINESS_LAT = 14.7356399;
  const BUSINESS_LNG = 121.0685179;

  // Calculate distance using Haversine formula
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number => {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance;
  };

  // Handle Get Directions button click
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

          // Calculate distance
          const dist = calculateDistance(
            userCoords.lat,
            userCoords.lng,
            BUSINESS_LAT,
            BUSINESS_LNG,
          );

          // Format distance
          if (dist < 1) {
            setDistance(`${(dist * 1000).toFixed(0)} meters`);
          } else {
            setDistance(`${dist.toFixed(2)} km`);
          }

          // Create directions embed URL
          const businessCoords = `${BUSINESS_LAT},${BUSINESS_LNG}`;
          const directionsUrl = `https://www.google.com/maps/embed/v1/directions?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dF46OB-zq8g5b0&origin=${userCoords.lat},${userCoords.lng}&destination=${businessCoords}&mode=driving`;

          setMapSrc(directionsUrl);
          setIsCalculatingDistance(false);
        },
        (error) => {
         
          alert(
            "Unable to get your location. Please enable location services and try again.",
          );
          setIsCalculatingDistance(false);
        },
      );
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  };

  // Get user's location on mount (removed auto-request, now manual via button)
  useEffect(() => {
    // Set default map to show business location
    setMapSrc(
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3857.0899999999985!2d121.065943!3d14.7356399!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3397b18f133910f3%3A0xca4ad80100d1404f!2sSupremo%20Barber%20Lagro!5e0!3m2!1sen!2sph!4v1637000000000!5m2!1sen!2sph",
    );
  }, []);

  // Auto-scroll testimonials carousel
  useEffect(() => {
    if (testimonials.length === 0 || isTestimonialsPaused)
      return;

    const scrollContainer = testimonialsScrollRef.current;
    if (!scrollContainer) return;

    const scroll = () => {
      if (scrollContainer) {
        const maxScroll = scrollContainer.scrollWidth / 2; // Half because we duplicate

        if (scrollContainer.scrollLeft >= maxScroll) {
          // Reset to beginning for infinite loop
          scrollContainer.scrollLeft = 0;
        } else {
          // Smooth continuous scroll
          scrollContainer.scrollLeft += 1;
        }
      }
    };

    const intervalId = setInterval(scroll, 30); // Smooth scroll speed

    return () => clearInterval(intervalId);
  }, [testimonials.length, isTestimonialsPaused]);

  // Track active section based on scroll position
  useEffect(() => {
    const handleScroll = () => {
      const sections = [
        "home",
        "about",
        "services",
        "testimonials",
        "location",
        "contact",
      ];
      const scrollPosition = window.scrollY + 100; // Offset for navbar height

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
    handleScroll(); // Call once on mount

    return () =>
      window.removeEventListener("scroll", handleScroll);
  }, []);

  // Fetch services from database
  useEffect(() => {
    const fetchServices = async () => {
      try {
        setIsLoadingServices(true);
        const fetchedServices = await API.services.getAll();
        // Only show active services (strict check)
        const activeServices = fetchedServices.filter(
          (s: Service) => s.isActive === true,
        );
        setServices(activeServices);
      } catch (error) {
        // Silently handle error - database might be empty or backend not ready
        setServices([]);
      } finally {
        setIsLoadingServices(false);
      }
    };

    fetchServices();
  }, []);

  // Fetch reviews from database
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setIsLoadingReviews(true);
        const fetchedReviews = await API.reviews.getAll();
        // Only show reviews that are explicitly marked to show on landing page
        const landingReviews = fetchedReviews.filter(
          (r: Review) => r.showOnLanding === true,
        );
        setTestimonials(landingReviews);

       
      } catch (error) {
        console.error(
          "Error fetching reviews for landing page:",
          error,
        );
        // Use fallback testimonials on error
        setTestimonials([]);
      } finally {
        setIsLoadingReviews(false);
      }
    };

    fetchReviews();
  }, []);

  const nextTestimonial = () => {
    if (testimonials.length > 0) {
      setActiveTestimonial(
        (prev) => (prev + 1) % testimonials.length,
      );
    }
  };

  const prevTestimonial = () => {
    if (testimonials.length > 0) {
      setActiveTestimonial(
        (prev) =>
          (prev - 1 + testimonials.length) %
          testimonials.length,
      );
    }
  };

  const scrollToServices = () => {
    const servicesSection = document.getElementById("services");
    if (servicesSection) {
      servicesSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  const nextService = () => {
    setCurrentServiceIndex(
      (prev) => (prev + 1) % services.length,
    );
  };

  const prevService = () => {
    setCurrentServiceIndex(
      (prev) => (prev - 1 + services.length) % services.length,
    );
  };

  const scrollServices = (direction: "left" | "right") => {
    if (servicesScrollRef.current) {
      const scrollAmount = 308; // Width of card (288px) + gap (20px)
      const newScrollLeft =
        servicesScrollRef.current.scrollLeft +
        (direction === "right" ? scrollAmount : -scrollAmount);
      servicesScrollRef.current.scrollTo({
        left: newScrollLeft,
        behavior: "smooth",
      });
    }
  };

  // State for auto-sliding image carousel
  const [currentSlide, setCurrentSlide] = useState(0);
  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentSlide((prev) => prev + 1);
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(intervalId);
  }, []);

  // State for interactive feature cards
  const [activeCard, setActiveCard] = useState<number | null>(
    null,
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-b border-slate-200 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <img
                src="https://pub-86f4b5249e5c4021bb05d46908eeb094.r2.dev/supremo-barber/supremoWebLogo.png"
                alt="Supremo Barber Logo"
                className="h-10 w-10 sm:h-12 sm:w-12"
              />
              <div>
                <span className="text-base sm:text-xl text-slate-900">
                  Supremo Barber
                </span>
              </div>
            </div>
            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-8">
              <a
                href="#home"
                className={`text-slate-700 hover:text-[#DB9D47] transition-all pb-1 border-b-2 ${
                  activeSection === "home"
                    ? "border-[#DB9D47] text-[#DB9D47]"
                    : "border-transparent"
                } hover:border-[#DB9D47]`}
              >
                Home
              </a>
              <a
                href="#about"
                className={`text-slate-700 hover:text-[#DB9D47] transition-all pb-1 border-b-2 ${
                  activeSection === "about"
                    ? "border-[#DB9D47] text-[#DB9D47]"
                    : "border-transparent"
                } hover:border-[#DB9D47]`}
              >
                About Us
              </a>
              <a
                href="#services"
                className={`text-slate-700 hover:text-[#DB9D47] transition-all pb-1 border-b-2 ${
                  activeSection === "services"
                    ? "border-[#DB9D47] text-[#DB9D47]"
                    : "border-transparent"
                } hover:border-[#DB9D47]`}
              >
                Services
              </a>
              <a
                href="#testimonials"
                className={`text-slate-700 hover:text-[#DB9D47] transition-all pb-1 border-b-2 ${
                  activeSection === "testimonials"
                    ? "border-[#DB9D47] text-[#DB9D47]"
                    : "border-transparent"
                } hover:border-[#DB9D47]`}
              >
                Testimonials
              </a>
              <a
                href="#location"
                className={`text-slate-700 hover:text-[#DB9D47] transition-all pb-1 border-b-2 ${
                  activeSection === "location"
                    ? "border-[#DB9D47] text-[#DB9D47]"
                    : "border-transparent"
                } hover:border-[#DB9D47]`}
              >
                Location
              </a>
              <a
                href="#contact"
                className={`text-slate-700 hover:text-[#DB9D47] transition-all pb-1 border-b-2 ${
                  activeSection === "contact"
                    ? "border-[#DB9D47] text-[#DB9D47]"
                    : "border-transparent"
                } hover:border-[#DB9D47]`}
              >
                Contact
              </a>
              <Button
                onClick={onLogin}
                variant="outline"
                size="sm"
              >
                Login
              </Button>
            </div>
            {/* Mobile Navigation */}
            <div className="flex lg:hidden items-center gap-2">
              <Sheet
                open={mobileMenuOpen}
                onOpenChange={setMobileMenuOpen}
              >
                <SheetTrigger asChild>
                  <button className="inline-flex items-center justify-center px-2 py-2 hover:bg-slate-100 rounded-md transition-colors">
                    <Menu className="h-6 w-6 text-slate-700" />
                  </button>
                </SheetTrigger>
                <SheetContent
                  side="right"
                  className="w-[300px] sm:w-[400px]"
                >
                  <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                      <img
                        src="https://pub-86f4b5249e5c4021bb05d46908eeb094.r2.dev/supremo-barber/supremoWebLogo.png"
                        alt="Supremo Barber Logo"
                        className="h-10 w-10"
                      />
                      <div className="text-left">
                        <div className="text-lg">
                          Supremo Barber
                        </div>
                      </div>
                    </SheetTitle>
                    <SheetDescription className="sr-only">
                      Navigation menu for Supremo Barber
                    </SheetDescription>
                  </SheetHeader>
                  <div className="mt-8 flex flex-col gap-4">
                    <a
                      href="#home"
                      className="text-lg text-slate-700 hover:text-slate-900 transition-colors py-2"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Home
                    </a>
                    <a
                      href="#about"
                      className="text-lg text-slate-700 hover:text-slate-900 transition-colors py-2"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      About Us
                    </a>
                    <a
                      href="#services"
                      className="text-lg text-slate-700 hover:text-slate-900 transition-colors py-2"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Services
                    </a>
                    <a
                      href="#testimonials"
                      className="text-lg text-slate-700 hover:text-slate-900 transition-colors py-2"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Testimonials
                    </a>
                    <a
                      href="#location"
                      className="text-lg text-slate-700 hover:text-slate-900 transition-colors py-2"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Location
                    </a>
                    <a
                      href="#contact"
                      className="text-lg text-slate-700 hover:text-slate-900 transition-colors py-2"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Contact
                    </a>
                    <div className="border-t border-slate-200 pt-4 mt-2 space-y-3">
                      
                      <Button
                        onClick={() => {
                          onLogin();
                          setMobileMenuOpen(false);
                        }}
                        variant="outline"
                        className="w-full"
                      >
                        Login
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
        className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16"
      >
        <div className="absolute inset-0">
          <img
            src="https://pub-86f4b5249e5c4021bb05d46908eeb094.r2.dev/supremo-barber/home.jpg"
            alt="Supremo Barber Shop Interior"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 to-slate-900/40" />
        </div>

        <div className="relative z-10 text-center text-white px-4 py-12">
          <div className="inline-flex items-center justify-center mb-4 sm:mb-6">
            <img
              src="https://pub-86f4b5249e5c4021bb05d46908eeb094.r2.dev/supremo-barber/supremoWebLogo.png"
              alt="Supremo Barber Logo"
              className="h-20 w-20 sm:h-28 sm:w-28 md:h-32 md:w-32"
            />
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl mb-4 sm:mb-6 text-white px-2">
            Stay Sharp. Look Supreme.
          </h1>
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl mb-6 sm:mb-8 text-slate-200 max-w-2xl mx-auto px-4">
            Premium barbering services with modern style and
            traditional craftsmanship
          </p>
          <Button
            size="lg"
            onClick={scrollToServices}
            className="bg-[#DB9D47] hover:bg-[#C56E33] text-white px-6 py-5 sm:px-8 sm:py-6 text-base sm:text-lg shadow-lg hover:shadow-xl transition-all"
          >
            Book Now
          </Button>
        </div>

        {/* Scroll Indicator */}
        <div className="hidden sm:block absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/50 rounded-full flex items-start justify-center p-2">
            <div className="w-1 h-3 bg-white/50 rounded-full" />
          </div>
        </div>
      </section>

      {/* About Us Section */}
      <section
        id="about"
        className="py-12 sm:py-16 md:py-24 bg-slate-50"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12 items-center mb-12 sm:mb-16">
            {/* Auto-sliding Image Carousel */}
            <div className="relative h-[350px] sm:h-[450px] md:h-[550px] overflow-hidden rounded-2xl shadow-2xl group bg-[#5C4A3A]">
              <div
                className="flex transition-transform duration-1000 ease-in-out h-full"
                style={{
                  transform: `translateX(-${(currentSlide % 4) * 100}%)`,
                  width: "400%",
                }}
              >
                <div className="w-full h-full flex-shrink-0">
                  <ImageWithFallback
                    src="https://pub-86f4b5249e5c4021bb05d46908eeb094.r2.dev/supremo-barber/505002634_1124361566390528_1724927473209330463_n.jpg"
                    alt="Barber Cutting Hair"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="w-full h-full flex-shrink-0">
                  <ImageWithFallback
                    src="https://pub-86f4b5249e5c4021bb05d46908eeb094.r2.dev/supremo-barber/506784157_1129798049180213_1555651505459883985_n.jpg"
                    alt="Modern Barbershop Interior"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="w-full h-full flex-shrink-0">
                  <ImageWithFallback
                    src="https://pub-86f4b5249e5c4021bb05d46908eeb094.r2.dev/supremo-barber/509339966_1133597715466913_2353055682521326682_n.jpg"
                    alt="Barber Styling Beard"
                    className="w-full h-full object-cover object-center"
                  />
                </div>
                <div className="w-full h-full flex-shrink-0">
                  <ImageWithFallback
                    src="https://pub-86f4b5249e5c4021bb05d46908eeb094.r2.dev/supremo-barber/516586604_1150745710418780_7458982299338019424_n.jpg"
                    alt="Professional Barber Tools"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Slide Indicators */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-10">
                {[0, 1, 2, 3].map((index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      currentSlide % 4 === index
                        ? "w-8 bg-[#DB9D47]"
                        : "bg-white/50 hover:bg-white/80"
                    }`}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* About Text - Right Side */}
            <div className="space-y-4">
              <h2 className="text-3xl sm:text-4xl md:text-5xl text-slate-900">
                About Our Barbershop
              </h2>
              <p className="text-base sm:text-lg md:text-xl text-slate-600 leading-relaxed">
                Since 2017, we've been dedicated to providing
                exceptional grooming services in a welcoming and
                professional environment. With years of
                expertise and passion, Supremo Barber has become
                a trusted destination for modern gentlemen.
              </p>
              <p className="text-sm sm:text-base text-slate-500 leading-relaxed">
                Our commitment to excellence, combined with a
                warm atmosphere and skilled craftsmanship,
                ensures every visit is an experience worth
                remembering. We don't just cut hair – we craft
                confidence.
              </p>
            </div>
          </div>

          {/* Interactive Feature Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {/* Card 1 - Expert Barbers */}
            <Card
              key="feature-expert-barbers"
              className={`group cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 border-2 ${
                activeCard === 0
                  ? "border-[#DB9D47] bg-gradient-to-br from-[#F3E5AB]/20 to-white"
                  : "border-gray-200 hover:border-[#DB9D47]/50"
              }`}
              onClick={() =>
                setActiveCard(activeCard === 0 ? null : 0)
              }
            >
              <CardContent className="p-6 sm:p-8 text-center">
                <div
                  className={`w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-5 rounded-full flex items-center justify-center transition-all duration-300 ${
                    activeCard === 0
                      ? "bg-[#DB9D47] scale-110"
                      : "bg-[#F3E5AB]/30 group-hover:bg-[#DB9D47]/20"
                  }`}
                >
                  <Scissors
                    className={`w-8 h-8 sm:w-10 sm:h-10 transition-colors duration-300 ${
                      activeCard === 0
                        ? "text-white"
                        : "text-[#DB9D47]"
                    }`}
                  />
                </div>
                <h3 className="text-xl sm:text-2xl font-semibold text-[#4B2E05] mb-2 sm:mb-3">
                  Expert Barbers
                </h3>
                <p
                  className={`text-sm sm:text-base text-[#6B5835] transition-all duration-300 leading-relaxed ${
                    activeCard === 0
                      ? "h-auto opacity-100"
                      : "h-auto opacity-70 group-hover:opacity-100"
                  }`}
                >
                  Our team of skilled professionals brings years
                  of experience and passion to every cut.
                </p>
                {activeCard === 0 && (
                  <div className="mt-5 pt-5 border-t border-[#DB9D47]/30 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <p className="text-xs sm:text-sm text-[#6B5835] italic">
                      ✨ All barbers certified with 5+ years
                      experience
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Card 2 - Premium Quality */}
            <Card
              key="feature-premium-quality"
              className={`group cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 border-2 ${
                activeCard === 1
                  ? "border-[#C56E33] bg-gradient-to-br from-[#C56E33]/10 to-white"
                  : "border-gray-200 hover:border-[#C56E33]/50"
              }`}
              onClick={() =>
                setActiveCard(activeCard === 1 ? null : 1)
              }
            >
              <CardContent className="p-6 sm:p-8 text-center">
                <div
                  className={`w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-5 rounded-full flex items-center justify-center transition-all duration-300 ${
                    activeCard === 1
                      ? "bg-[#C56E33] scale-110"
                      : "bg-[#C56E33]/10 group-hover:bg-[#C56E33]/20"
                  }`}
                >
                  <Star
                    className={`w-8 h-8 sm:w-10 sm:h-10 transition-colors duration-300 ${
                      activeCard === 1
                        ? "text-white"
                        : "text-[#C56E33]"
                    }`}
                  />
                </div>
                <h3 className="text-xl sm:text-2xl font-semibold text-[#4B2E05] mb-2 sm:mb-3">
                  Premium Quality
                </h3>
                <p
                  className={`text-sm sm:text-base text-[#6B5835] transition-all duration-300 leading-relaxed ${
                    activeCard === 1
                      ? "h-auto opacity-100"
                      : "h-auto opacity-70 group-hover:opacity-100"
                  }`}
                >
                  We use only the finest products and tools to
                  ensure the best results for our clients.
                </p>
                {activeCard === 1 && (
                  <div className="mt-5 pt-5 border-t border-[#C56E33]/30 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <p className="text-xs sm:text-sm text-[#6B5835] italic">
                      ✨ Premium brands: Reuzel, Layrite,
                      Uppercut
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Card 3 - Modern Environment */}
            <Card
              key="feature-modern-environment"
              className={`group cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 border-2 ${
                activeCard === 2
                  ? "border-[#7B8A4E] bg-gradient-to-br from-[#7B8A4E]/10 to-white"
                  : "border-gray-200 hover:border-[#7B8A4E]/50"
              }`}
              onClick={() =>
                setActiveCard(activeCard === 2 ? null : 2)
              }
            >
              <CardContent className="p-6 sm:p-8 text-center">
                <div
                  className={`w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-5 rounded-full flex items-center justify-center transition-all duration-300 ${
                    activeCard === 2
                      ? "bg-[#7B8A4E] scale-110"
                      : "bg-[#7B8A4E]/10 group-hover:bg-[#7B8A4E]/20"
                  }`}
                >
                  <Clock
                    className={`w-8 h-8 sm:w-10 sm:h-10 transition-colors duration-300 ${
                      activeCard === 2
                        ? "text-white"
                        : "text-[#7B8A4E]"
                    }`}
                  />
                </div>
                <h3 className="text-xl sm:text-2xl font-semibold text-[#4B2E05] mb-2 sm:mb-3">
                  Modern Environment
                </h3>
                <p
                  className={`text-sm sm:text-base text-[#6B5835] transition-all duration-300 leading-relaxed ${
                    activeCard === 2
                      ? "h-auto opacity-100"
                      : "h-auto opacity-70 group-hover:opacity-100"
                  }`}
                >
                  Our barbershop is designed with modern
                  aesthetics and comfort in mind.
                </p>
                {activeCard === 2 && (
                  <div className="mt-5 pt-5 border-t border-[#7B8A4E]/30 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <p className="text-xs sm:text-sm text-[#6B5835] italic">
                      ✨ Clean and stylish interior
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section
        id="services"
        className="py-12 sm:py-16 md:py-24 bg-white"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12 md:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl text-slate-900 mb-3 sm:mb-4">
              Our Services
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-slate-600 max-w-3xl mx-auto px-2">
              From classic cuts to modern styles, we offer a
              full range of grooming services
            </p>
          </div>

          {/* Desktop Grid - Two Rows */}
          <div className="hidden md:block">
            {isLoadingServices ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#DB9D47]"></div>
              </div>
            ) : services.length === 0 ? (
              <div className="text-center py-12 text-slate-600">
                No services available at the moment.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-5 pb-4">
                {services.slice(0, 6).map((service) => (
                  <Card
                    key={service.id || service._id}
                    className="hover:shadow-lg transition-shadow overflow-hidden border-[#E8DCC8]"
                    onClick={() =>
                      onServiceClick?.(
                        service.id || service._id,
                      )
                    }
                  >
                    <div className="relative h-44 overflow-hidden">
                      <ImageWithFallback
                        src={
                          normalizeR2Url(service.imageUrl) ||
                          "https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=400&h=400&fit=crop"
                        }
                        alt={service.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <CardContent className="p-4">
                      <div className="mb-3">
                        <h3 className="text-lg text-[#5C4A3A] mb-1.5">
                          {service.name}
                        </h3>
                        <p className="text-xs text-[#87765E] mb-3 line-clamp-2 leading-relaxed">
                          {service.description}
                        </p>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs text-[#87765E]">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{service.duration} min</span>
                        </div>
                        <div className="text-[#DB9D47]">
                          <span className="text-base">
                            ₱{service.price}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Mobile Carousel */}
          <div className="md:hidden relative">
            {isLoadingServices ? (
              <Card
                key="loading-services"
                className="border-[#E8DCC8] p-12"
              >
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#DB9D47]"></div>
                </div>
              </Card>
            ) : services.length === 0 ? (
              <Card
                key="no-services"
                className="border-[#E8DCC8] p-12"
              >
                <div className="text-center text-slate-600">
                  No services available at the moment.
                </div>
              </Card>
            ) : (
              <div>
                <Card
                  key={`service-mobile-${currentServiceIndex}`}
                  className="hover:shadow-lg transition-shadow overflow-hidden border-[#E8DCC8] cursor-pointer"
                  onClick={() =>
                    onServiceClick?.(
                      services[currentServiceIndex]._id,
                    )
                  }
                >
                  <div className="relative h-48 overflow-hidden">
                    <ImageWithFallback
                      src={
                        normalizeR2Url(
                          services[currentServiceIndex].imageUrl,
                        ) ||
                        "https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=400&h=400&fit=crop"
                      }
                      alt={services[currentServiceIndex].name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <CardContent className="p-6">
                    <div className="mb-4">
                      <h3 className="text-xl text-[#5C4A3A] mb-2">
                        {services[currentServiceIndex].name}
                      </h3>
                      <p className="text-sm text-[#87765E] mb-4">
                        {
                          services[currentServiceIndex]
                            .description
                        }
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-[#87765E]">
                        <Clock className="w-4 h-4" />
                        <span>
                          {
                            services[currentServiceIndex]
                              .duration
                          }{" "}
                          min
                        </span>
                      </div>
                      <div className="text-[#DB9D47]">
                        <span className="text-lg">
                          ₱{services[currentServiceIndex].price}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Dots Indicator */}
                <div className="flex justify-center gap-2 mt-6">
                  {services.slice(0, 6).map((_, index) => (
                    <button
                      key={index}
                      onClick={() =>
                        setCurrentServiceIndex(index)
                      }
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === currentServiceIndex
                          ? "bg-[#DB9D47] w-8"
                          : "bg-slate-300"
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="text-center mt-8 space-y-3">
            <Button
              size="lg"
              onClick={onGetStarted}
              className="bg-[#DB9D47] hover:bg-[#C56E33] text-white shadow-lg hover:shadow-xl transition-all"
            >
              See More Services
            </Button>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section
        id="testimonials"
        className="py-12 sm:py-16 md:py-24 bg-slate-50 overflow-hidden"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12 md:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl text-slate-900 mb-3 sm:mb-4">
              What Our Clients Say
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-slate-600">
              Don't just take our word for it
            </p>
          </div>

          <div className="relative">
            {isLoadingReviews ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#DB9D47]"></div>
              </div>
            ) : testimonials.length === 0 ? (
              <Card className="p-6 sm:p-8 md:p-12">
                <div className="text-center text-slate-600">
                  No reviews available at the moment.
                </div>
              </Card>
            ) : (
              <div
                ref={testimonialsScrollRef}
                className="flex gap-6 overflow-x-auto scrollbar-hide pb-4"
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
                {/* Duplicate testimonials array twice for infinite loop effect */}
                {[...testimonials, ...testimonials].map(
                  (testimonial, index) => (
                    <Card
                      key={`${testimonial.id}-${index}`}
                      className="flex-shrink-0 w-80 sm:w-96 p-8 transition-all duration-300 hover:shadow-xl border-[#E8DCC8]"
                    >
                      <div className="flex flex-col items-center text-center">
                        {testimonial.customerAvatar ? (
                          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full mb-4 shadow-lg overflow-hidden ring-4 ring-[#DB9D47]/20">
                            <ImageWithFallback
                              src={normalizeR2Url(testimonial.customerAvatar)}
                              alt={testimonial.customerName || "Customer"}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-[#DB9D47] to-[#C56E33] rounded-full flex items-center justify-center text-white text-xl sm:text-2xl mb-4 shadow-lg">
                            {testimonial.customerName
                              ?.substring(0, 2)
                              .toUpperCase() || "CU"}
                          </div>
                        )}
                        <div className="flex gap-1 mb-4">
                          {[...Array(testimonial.rating)].map(
                            (_, i) => (
                              <Star
                                key={i}
                                className="w-5 h-5 fill-yellow-400 text-yellow-400"
                              />
                            ),
                          )}
                        </div>
                        <p className="text-base sm:text-lg text-slate-700 mb-6 italic leading-relaxed min-h-[80px]">
                          "{testimonial.comment}"
                        </p>
                        <div className="border-t border-slate-200 pt-4 w-full">
                          <p className="font-semibold text-lg text-slate-900 mb-1">
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

      {/* Location Section */}
      <section
        id="location"
        className="py-12 sm:py-16 md:py-24 bg-white"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12 md:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl text-slate-900 mb-3 sm:mb-4">
              Visit Us
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-slate-600">
              {userLocation
                ? "Directions from your location to Supremo Barber"
                : "Find our location and plan your visit"}
            </p>
          </div>

          {/* Get Directions Button and Distance Display */}
          {!userLocation && (
            <div className="text-center mb-8">
              <Button
                size="lg"
                onClick={handleGetDirections}
                disabled={isCalculatingDistance}
                className="bg-[#DB9D47] hover:bg-[#C56E33] text-white shadow-lg hover:shadow-xl transition-all"
              >
                {isCalculatingDistance ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Calculating...
                  </>
                ) : (
                  <>
                    <MapPin className="w-5 h-5 mr-2" />
                    Get Directions
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Distance Display */}
          {distance && userLocation && (
            <div className="text-center mb-8">
              <Card className="inline-block px-6 py-4 bg-gradient-to-r from-[#F3E5AB]/30 to-[#FFF9F0] border-[#DB9D47]/40">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#DB9D47] rounded-full flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm text-[#87765E]">
                      Distance from your location
                    </p>
                    <p className="text-xl text-[#4B2E05]">
                      {distance}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Full-width Map Container */}
          <div className="rounded-2xl overflow-hidden shadow-2xl h-[500px] sm:h-[600px] lg:h-[700px]">
            {mapSrc ? (
              <iframe
                src={mapSrc}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Supremo Barber Location"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-slate-100">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#DB9D47] mx-auto mb-4"></div>
                  <p className="text-slate-600">
                    Loading map...
                  </p>
                </div>
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
    </div>
  );
}