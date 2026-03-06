import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Clock,
  DollarSign,
  Scissors,
  Star,
  Loader2,
  CheckCircle2,
  Heart,
} from "lucide-react";
import { toast } from "sonner@2.0.3";
import API from "../services/api.service";
import { favoriteEvents } from "../utils/favoriteEvents";

interface Service {
  id?: string | number;
  _id?: string | number;
  name: string;
  price: number;
  duration: number;
  description?: string;
  imageUrl?: string;
  isActive?: boolean;
  popular?: boolean;
  image?: string;
}

// Fallback data for demo mode (when backend is unavailable)
const FALLBACK_SERVICES: Service[] = [
  {
    id: 1,
    name: "Gupit Supremo",
    price: 250,
    duration: 30,
    description:
      "Classic haircut with modern styling techniques for a fresh, clean look",
    image:
      "https://images.unsplash.com/photo-1759408174071-f2971472dc73?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYXJiZXIlMjBjdXR0aW5nJTIwaGFpcnxlbnwxfHx8fDE3NjAxNDc1NjF8MA&ixlib=rb-4.1.0&q=80&w=1080",
    popular: false,
  },
  {
    id: 2,
    name: "Gupit Supremo w/ Banlaw",
    price: 300,
    duration: 40,
    description:
      "Premium haircut with professional hair wash and scalp treatment",
    image:
      "https://images.unsplash.com/photo-1605497788044-5a32c7078486?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYXJiZXIlMjBzaG9wJTIwc2VydmljZXxlbnwxfHx8fDE3NjAxNDc1OTB8MA&ixlib=rb-4.1.0&q=80&w=1080",
    popular: true,
  },
  {
    id: 3,
    name: "Ahit Supremo",
    price: 200,
    duration: 30,
    description:
      "Clean, precise traditional shave for the perfect smooth finish",
    image:
      "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYXJiZXIlMjBzaGF2ZXxlbnwxfHx8fDE3NjAxNDc2MDZ8MA&ixlib=rb-4.1.0&q=80&w=1080",
    popular: false,
  },
  {
    id: 4,
    name: "Hair Tattoo",
    price: 350,
    duration: 45,
    description:
      "Artistic hair designs and patterns for a unique, personalized style",
    image:
      "https://images.unsplash.com/photo-1622296089863-eb7fc530daa8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoYWlyJTIwdGF0dG9vfGVufDF8fHx8MTc2MDE0NzYyMHww&ixlib=rb-4.1.0&q=80&w=1080",
    popular: true,
  },
  {
    id: 5,
    name: "Supremo Espesyal",
    price: 450,
    duration: 60,
    description:
      "Complete grooming experience with haircut, styling, and premium treatments",
    image:
      "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYXJiZXIlMjBncm9vbWluZ3xlbnwxfHx8fDE3NjAxNDc2MzR8MA&ixlib=rb-4.1.0&q=80&w=1080",
    popular: true,
  },
  {
    id: 6,
    name: "Supremo Espesyal w/ Ahit",
    price: 550,
    duration: 75,
    description:
      "Premium grooming package with complete haircut, styling, and traditional shave",
    image:
      "https://images.unsplash.com/photo-1621605815971-fbc98d665033?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYXJiZXIlMjBwcmVtaXVtfGVufDF8fHx8MTc2MDE0NzY0NXww&ixlib=rb-4.1.0&q=80&w=1080",
    popular: false,
  },
  {
    id: 7,
    name: "Linis Tenga",
    price: 150,
    duration: 15,
    description:
      "Professional ear cleaning service for hygiene and comfort",
    image:
      "https://images.unsplash.com/photo-1560066984-138dadb4c035?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYXJiZXIlMjBzaG9wfGVufDF8fHx8MTc2MDE0NzY1N3ww&ixlib=rb-4.1.0&q=80&w=1080",
    popular: false,
  },
  {
    id: 8,
    name: "Tina (Hair Color)",
    price: 450,
    duration: 90,
    description:
      "Professional hair coloring with high-quality products and expert application",
    image:
      "https://images.unsplash.com/photo-1562322140-8baeececf3df?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoYWlyJTIwY29sb3J8ZW58MXx8fHwxNzYwMTQ3NjcxfDA&ixlib=rb-4.1.0&q=80&w=1080",
    popular: false,
  },
  {
    id: 9,
    name: "Bleaching",
    price: 800,
    duration: 120,
    description:
      "Professional hair bleaching service with aftercare treatment",
    image:
      "https://images.unsplash.com/photo-1582095133179-bfd08e2fc6b3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxibGVhY2glMjBoYWlyfGVufDF8fHx8MTc2MDE0NzY4Mnww&ixlib=rb-4.1.0&q=80&w=1080",
    popular: false,
  },
  {
    id: 10,
    name: "Supremo Package",
    price: 1800,
    duration: 180,
    description:
      "Ultimate grooming package: haircut, color, styling, shave, and premium treatments",
    image:
      "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYXJiZXIlMjBzaGF2ZXxlbnwxfHx8fDE3NjAxNDc2MDZ8MA&ixlib=rb-4.1.0&q=80&w=1080",
    popular: true,
  },
];

export function ServicesShowcase({
  onBookService,
  onServiceClick,
  userId,
}: {
  onBookService?: () => void;
  onServiceClick?: (serviceId: string) => void;
  userId?: string;
}) {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [favoriteServices, setFavoriteServices] = useState<string[]>([]);
  const [togglingFavoriteId, setTogglingFavoriteId] = useState<string | null>(null);

  // Fetch services from database
  useEffect(() => {
    const fetchServices = async () => {
      try {
        setIsLoading(true);
        const fetchedServices = await API.services.getAll();
        // Only show active services (strict check)
        const activeServices = fetchedServices.filter(
          (s: Service) => s.isActive === true,
        );
        setServices(activeServices);
      } catch (error) {
        console.error("Error fetching services:", error);
        setServices([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchServices();
  }, []);

  // Fetch user's favorite services
  useEffect(() => {
    const fetchFavorites = async () => {
      if (!userId) return;
      
      try {
        const favorites = await API.favorites.getAll(userId);
        const favoriteIds = favorites.map((f: any) => f.serviceId);
        setFavoriteServices(favoriteIds);
      } catch (error) {
        console.error("Error fetching favorites:", error);
      }
    };

    // Fetch in background without blocking render
    fetchFavorites();
  }, [userId]);

  // Listen for favorite events from other components (e.g., booking completion)
  useEffect(() => {
    if (!userId) return;

    const unsubscribe = favoriteEvents.subscribe((event) => {
      // Only process events for this user
      if (event.userId !== userId) return;

      if (event.type === 'added') {
        setFavoriteServices(prev => {
          if (prev.includes(event.serviceId)) return prev;
          return [...prev, event.serviceId];
        });
      } else if (event.type === 'removed') {
        setFavoriteServices(prev => prev.filter(id => id !== event.serviceId));
      }
    });

    return () => unsubscribe();
  }, [userId]);

  const handleBookService = (e: React.MouseEvent, service: Service) => {
    e.stopPropagation(); // Prevent any parent click handlers
    
    const serviceId = (service.id || service._id)?.toString() || "";

    if (onServiceClick) {
      // Pre-select the service and navigate to booking
      onServiceClick(serviceId);
    } else if (onBookService) {
      onBookService();
    } else {
      toast.success(`${service.name} selected!`, {
        description:
          "Please go to the booking tab to complete your reservation.",
      });
    }
  };

  const handleToggleFavorite = async (e: React.MouseEvent, serviceId: string) => {
    e.stopPropagation(); // Prevent card selection when clicking favorite
    
    if (!userId) {
      toast.error("Please login to add favorites");
      return;
    }

    const isFavorite = favoriteServices.includes(serviceId);
    
    // OPTIMISTIC UPDATE: Update UI immediately for instant feedback
    if (isFavorite) {
      setFavoriteServices(prev => prev.filter(id => id !== serviceId));
      // Emit event IMMEDIATELY for other components to update in real-time
      favoriteEvents.removeFavorite(userId, serviceId);
      toast.success("Removed from favorites");
    } else {
      setFavoriteServices(prev => [...prev, serviceId]);
      // Emit event IMMEDIATELY for other components to update in real-time
      favoriteEvents.addFavorite(userId, serviceId);
      toast.success("Added to favorites");
    }

    // Update database in background (no await needed for user perception)
    (async () => {
      try {
        if (isFavorite) {
          await API.favorites.remove(userId, serviceId);
        } else {
          await API.favorites.add(userId, serviceId);
        }
      } catch (error) {
        console.error("Error toggling favorite:", error);
        toast.error("Failed to update favorites");
        
        // REVERT optimistic update on error
        if (isFavorite) {
          setFavoriteServices(prev => [...prev, serviceId]);
          favoriteEvents.addFavorite(userId, serviceId);
        } else {
          setFavoriteServices(prev => prev.filter(id => id !== serviceId));
          favoriteEvents.removeFavorite(userId, serviceId);
        }
      }
    })();
  };



  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-[#E8DCC8]">
        <CardHeader className="pt-[24px] pr-[24px] pb-[16px] pl-[24px]">
          <CardTitle className="text-2xl text-[#5C4A3A]">
            Select Service
          </CardTitle>
          <CardDescription className="text-[#87765E]">
            Choose your preferred service
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Services Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#DB9D47]" />
        </div>
      ) : services.length === 0 ? (
        <Card className="border-[#E8DCC8]">
          <CardContent className="py-12 text-center text-slate-500">
            No services available at the moment.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((service) => {
              const serviceId = (service.id || service._id)?.toString() || "";
              const isFavorite = favoriteServices.includes(serviceId);
              const isToggling = togglingFavoriteId === serviceId;
              
              return (
                <Card
                  key={serviceId}
                  className="relative transition-all overflow-hidden hover:shadow-md border-2 border-[#E8DCC8] hover:border-[#DB9D47]/40"
                >
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={
                        service.imageUrl ||
                        service.image ||
                        "https://images.unsplash.com/photo-1503951914875-452162b0f3f1"
                      }
                      alt={service.name}
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Available Badge */}
                    <Badge className="absolute top-3 left-3 bg-green-600 text-white hover:bg-green-600">
                      Available
                    </Badge>
                    
                    {/* Favorite Button - Always show for logged-in users */}
                    {userId && (
                      <button
                        onClick={(e) => handleToggleFavorite(e, serviceId)}
                        disabled={isToggling}
                        className="absolute top-3 right-3 bg-white rounded-full p-2 shadow-md hover:shadow-lg transition-all disabled:opacity-50 z-10"
                      >
                        {isToggling ? (
                          <Loader2 className="w-5 h-5 text-[#DB9D47] animate-spin" />
                        ) : (
                          <Heart
                            className={`w-5 h-5 transition-colors ${
                              isFavorite
                                ? "text-red-500 fill-current"
                                : "text-[#87765E]"
                            }`}
                          />
                        )}
                      </button>
                    )}
                    
                    {/* Popular Badge */}
                    {service.popular && (
                      <Badge className="absolute bottom-3 left-3 bg-[#DB9D47] text-white hover:bg-[#DB9D47]">
                        <Star className="w-3 h-3 mr-1 fill-current" />
                        Popular
                      </Badge>
                    )}
                  </div>
                  
                  <CardContent className="pt-4 pb-4">
                    <h3 className="text-lg text-[#5C4A3A] mb-2">
                      {service.name}
                    </h3>
                    <p className="text-sm text-[#87765E] mb-3 line-clamp-2">
                      {service.description}
                    </p>
                    
                    <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#E8DCC8]">
                      <span className="flex items-center gap-1 text-sm text-[#87765E]">
                        <Clock className="w-4 h-4" />
                        {service.duration} mins
                      </span>
                      <span className="text-lg text-[#DB9D47]">
                        ₱{service.price}
                      </span>
                    </div>
                    
                    <Button
                      className="w-full bg-[#DB9D47] hover:bg-[#C88A35] text-white"
                      onClick={(e) => handleBookService(e, service)}
                    >
                      Book Now
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}