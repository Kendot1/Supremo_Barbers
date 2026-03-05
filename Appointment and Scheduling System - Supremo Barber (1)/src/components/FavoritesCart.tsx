import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import {
  Heart,
  Trash2,
  Clock,
  DollarSign,
  CalendarPlus,
  Loader2,
  ShoppingBag,
} from "lucide-react";
import { toast } from "sonner@2.0.3";
import API from "../services/api.service";
import { favoriteEvents } from "../utils/favoriteEvents";

interface Service {
  id: string | number;
  name: string;
  price: number;
  duration: number;
  description?: string;
  imageUrl?: string;
  image?: string;
  popular?: boolean;
}

interface FavoritesCartProps {
  userId: string;
  onBookService: (serviceId: string) => void;
  trigger?: React.ReactNode;
}

export function FavoritesCart({
  userId,
  onBookService,
  trigger,
}: FavoritesCartProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [favoriteServices, setFavoriteServices] = useState<Service[]>([]);
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Fetch favorites count (lightweight - just for badge)
  const fetchFavoritesCount = async () => {
    if (!userId) return;

    try {
      const favorites = await API.favorites.getAll(userId);
      setFavoriteCount(favorites?.length || 0);
    } catch (error) {
      console.error("Error fetching favorites count:", error);
    }
  };

  // Fetch favorites and their service details (detailed - for sheet content)
  const fetchFavorites = async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      
      // Get favorite service IDs
      const favorites = await API.favorites.getAll(userId);
      
      if (!favorites || favorites.length === 0) {
        setFavoriteServices([]);
        setFavoriteCount(0);
        return;
      }

      // Update count immediately
      setFavoriteCount(favorites.length);

      // Get all services
      const allServices = await API.services.getAll();
      
      // Filter services that are in favorites
      const favoriteServiceIds = favorites.map((f: any) => f.serviceId);
      const favServices = allServices.filter((s: Service) =>
        favoriteServiceIds.includes(String(s.id))
      );

      setFavoriteServices(favServices);
    } catch (error) {
      console.error("Error fetching favorites:", error);
      toast.error("Failed to load favorites");
    } finally {
      setIsLoading(false);
    }
  };

  // Load favorites count on mount and when userId changes (for badge)
  useEffect(() => {
    fetchFavoritesCount();
    
    // Listen to favorite events for real-time updates (like notifications)
    const unsubscribe = favoriteEvents.subscribe((event) => {
      // Only update if event is for current user
      if (event.userId === userId) {
        if (event.type === 'added') {
          // Increment count instantly
          setFavoriteCount(prev => prev + 1);
        } else if (event.type === 'removed') {
          // Decrement count instantly
          setFavoriteCount(prev => Math.max(0, prev - 1));
          
          // Also update the detailed list if sheet is open
          if (isOpen) {
            setFavoriteServices(prev => 
              prev.filter(s => String(s.id) !== event.serviceId)
            );
          }
        }
      }
    });
    
    return () => unsubscribe();
  }, [userId, isOpen]);

  // Load detailed favorites when sheet opens
  useEffect(() => {
    if (isOpen) {
      fetchFavorites();
    }
  }, [isOpen, userId]);

  const handleRemoveFavorite = async (serviceId: string) => {
    try {
      setRemovingId(serviceId);
      
      // OPTIMISTIC UPDATE: Update UI immediately
      setFavoriteServices((prev) =>
        prev.filter((s) => String(s.id) !== serviceId)
      );
      setFavoriteCount((prev) => Math.max(0, prev - 1));
      
      // Then update database
      await API.favorites.remove(userId, serviceId);
      
      // Emit event for other components to update in real-time
      favoriteEvents.removeFavorite(userId, serviceId);
      
      toast.success("Removed from favorites");
    } catch (error) {
      console.error("Error removing favorite:", error);
      toast.error("Failed to remove from favorites");
      // Revert optimistic update on error
      fetchFavorites();
    } finally {
      setRemovingId(null);
    }
  };

  const handleBookNow = (serviceId: string) => {
    onBookService(serviceId);
    setIsOpen(false);
    toast.success("Service selected! Complete your booking.");
  };

  const totalPrice = favoriteServices.reduce((sum, s) => sum + s.price, 0);
  const totalDuration = favoriteServices.reduce((sum, s) => sum + s.duration, 0);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {trigger || (
          <Button
            variant="ghost"
            size="icon"
            className="relative text-[#5C4A3A] hover:bg-[#FBF7EF]"
          >
            <Heart className="w-5 h-5" />
            {favoriteCount > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-[#DB9D47] text-white hover:bg-[#DB9D47] text-xs">
                {favoriteCount}
              </Badge>
            )}
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-[#5C4A3A]">
            <Heart className="w-5 h-5 text-red-500 fill-current" />
            My Favorites
          </SheetTitle>
          <SheetDescription className="text-[#87765E]">
            Services you've saved for later
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#DB9D47]" />
            </div>
          ) : favoriteServices.length === 0 ? (
            <Card className="border-[#E8DCC8]">
              <CardContent className="py-12 text-center">
                <ShoppingBag className="w-12 h-12 mx-auto text-[#E8DCC8] mb-4" />
                <p className="text-[#87765E] mb-2">No favorites yet</p>
                <p className="text-sm text-[#87765E]">
                  Browse services and tap the heart icon to add favorites
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Favorites List */}
              <div className="space-y-3">
                {favoriteServices.map((service) => {
                  const serviceId = String(service.id);
                  const isRemoving = removingId === serviceId;

                  return (
                    <Card
                      key={serviceId}
                      className="border-[#E8DCC8] overflow-hidden hover:shadow-md transition-shadow"
                    >
                      <div className="flex gap-3 p-3">
                        {/* Service Image */}
                        <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden">
                          <img
                            src={
                              service.imageUrl ||
                              service.image ||
                              "https://images.unsplash.com/photo-1503951914875-452162b0f3f1"
                            }
                            alt={service.name}
                            className="w-full h-full object-cover"
                          />
                          {service.popular && (
                            <Badge className="absolute top-1 left-1 text-xs bg-[#DB9D47] text-white hover:bg-[#DB9D47]">
                              Popular
                            </Badge>
                          )}
                        </div>

                        {/* Service Details */}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-[#5C4A3A] mb-1 truncate">
                            {service.name}
                          </h4>
                          <p className="text-xs text-[#87765E] mb-2 line-clamp-2">
                            {service.description}
                          </p>

                          <div className="flex items-center gap-3 text-xs text-[#87765E]">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {service.duration}m
                            </span>
                            <span className="flex items-center gap-1 text-[#DB9D47] font-medium">
                              <DollarSign className="w-3 h-3" />₱
                              {service.price}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveFavorite(serviceId)}
                            disabled={isRemoving}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                          >
                            {isRemoving ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleBookNow(serviceId)}
                            className="h-8 w-8 p-0 bg-[#DB9D47] hover:bg-[#C88A35] text-white"
                          >
                            <CalendarPlus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>

              {/* Summary Card */}
              <Card className="border-[#DB9D47] bg-[#FBF7EF]">
                <CardContent className="pt-4 pb-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#87765E]">
                        Total Services
                      </span>
                      <span className="font-medium text-[#5C4A3A]">
                        {favoriteServices.length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#87765E]">
                        Total Duration
                      </span>
                      <span className="font-medium text-[#5C4A3A]">
                        {totalDuration} mins
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-[#E8DCC8]">
                      <span className="font-medium text-[#5C4A3A]">
                        Total Price
                      </span>
                      <span className="text-lg font-semibold text-[#DB9D47]">
                        ₱{totalPrice}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Action Button */}
              <Button
                className="w-full bg-[#DB9D47] hover:bg-[#C88A35] text-white"
                onClick={() => {
                  if (favoriteServices.length > 0) {
                    handleBookNow(String(favoriteServices[0].id));
                  }
                }}
              >
                <CalendarPlus className="w-4 h-4 mr-2" />
                Book First Service
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
