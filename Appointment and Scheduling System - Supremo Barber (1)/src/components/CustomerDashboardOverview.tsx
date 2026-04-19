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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  Calendar,
  Clock,
  History,
  Award,
  Scissors,
  ArrowRight,
  Star,
  Gift,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Receipt,
  XCircle,
  X,
  Heart,
  Loader2,
} from "lucide-react";
import { FaPesoSign } from "react-icons/fa6";
import { ImageWithFallback } from "./fallback/ImageWithFallback";
import type { User, Appointment } from "../App";
import API from "../services/api.service";
import { toast } from "sonner@2.0.3";
import { favoriteEvents } from "../utils/favoriteEvents";

interface CustomerDashboardOverviewProps {
  user: User;
  appointments: Appointment[];
  onNavigate: (tab: string) => void;
  onUpdateAppointments?: (appointments: Appointment[]) => void;
  onSelectSlot?: (date: Date, time: string, barberName: string) => void;
  onSetPreSelectedService?: (serviceId: string) => void;
}

interface Service {
  _id: string;
  id?: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  imageUrl?: string;
  isActive?: boolean;
}

export function CustomerDashboardOverview({
  user,
  appointments,
  onNavigate,
  onUpdateAppointments,
  onSelectSlot,
  onSetPreSelectedService,
}: CustomerDashboardOverviewProps) {
  const [availableSlots, setAvailableSlots] = useState<any[]>(
    [],
  );
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [isLoadingServices, setIsLoadingServices] =
    useState(true);
  const [selectedBooking, setSelectedBooking] =
    useState<Appointment | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [favoriteServices, setFavoriteServices] = useState<string[]>([]);

  // Fetch user's favorite services from API
  useEffect(() => {
    const fetchFavorites = async () => {
      if (!user.id) return;

      try {
        const favorites = await API.favorites.getAll(user.id);
        const favoriteIds = favorites.map((f: any) => f.serviceId);
        setFavoriteServices(favoriteIds);
      } catch (error) {
        console.error("Error fetching favorites:", error);
      }
    };

    fetchFavorites();
  }, [user.id]);

  // Listen for favorite events from other components
  useEffect(() => {
    if (!user.id) return;

    const unsubscribe = favoriteEvents.subscribe((event) => {
      // Only process events for this user
      if (event.userId !== user.id) return;

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
  }, [user.id]);

  // Toggle favorite with API integration
  const toggleFavorite = async (serviceId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click

    if (!user.id) {
      toast.error("Please login to add favorites");
      return;
    }

    const isFavorite = favoriteServices.includes(serviceId);

    // OPTIMISTIC UPDATE: Update UI immediately for instant feedback
    if (isFavorite) {
      setFavoriteServices(prev => prev.filter(id => id !== serviceId));
      // Emit event IMMEDIATELY for other components to update in real-time
      favoriteEvents.removeFavorite(user.id, serviceId);
      toast.success("Removed from favorites");
    } else {
      setFavoriteServices(prev => [...prev, serviceId]);
      // Emit event IMMEDIATELY for other components to update in real-time
      favoriteEvents.addFavorite(user.id, serviceId);
      toast.success("Added to favorites");
    }

    // Update database in background (no await needed for user perception)
    (async () => {
      try {
        if (isFavorite) {
          await API.favorites.remove(user.id, serviceId);
        } else {
          await API.favorites.add(user.id, serviceId);
        }
      } catch (error) {
        console.error("Error toggling favorite:", error);
        toast.error("Failed to update favorites");

        // REVERT optimistic update on error
        if (isFavorite) {
          setFavoriteServices(prev => [...prev, serviceId]);
          favoriteEvents.addFavorite(user.id, serviceId);
        } else {
          setFavoriteServices(prev => prev.filter(id => id !== serviceId));
          favoriteEvents.removeFavorite(user.id, serviceId);
        }
      }
    })();
  };

  // Filter appointments for current user
  const userAppointments = appointments.filter(
    (apt) =>
      apt.userId === user.id || apt.customer_id === user.id,
  );

  // Get upcoming appointments - filter by verified status only
  const upcomingAppointments = userAppointments
    .filter(
      (apt) =>
        apt.status === "pending" || apt.status === "verified",
    )
    .sort(
      (a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

  // Get recent bookings
  const recentBookings = [...userAppointments]
    .sort(
      (a, b) =>
        new Date(b.created_at || b.date).getTime() -
        new Date(a.created_at || a.date).getTime(),
    )
    .slice(0, 5)
    .map((apt) => ({
      service: apt.service,
      date: new Date(apt.date).toLocaleDateString(),
      status: apt.status,
      amount: apt.price,
    }));

  // Calculate completed services
  const completedServices = userAppointments.filter(
    (apt) => apt.status === "completed",
  ).length;
  const loyaltyPoints = completedServices * 50;
  const memberTier =
    loyaltyPoints >= 1000
      ? "Gold"
      : loyaltyPoints >= 500
        ? "Silver"
        : "Bronze";

  // Calculate available slots for today based on appointments
  useEffect(() => {
    const fetchAvailableSlots = async () => {
      try {
        setIsLoadingSlots(true);
        const today = new Date().toISOString().split("T")[0];

        // Get all appointments for today (across all customers)
        // Only count appointments that are not cancelled or completed
        const todayAppointments = appointments.filter(
          (apt) => {
            const isToday = apt.date === today || apt.appointment_date === today;
            const isActive = apt.status === 'pending' ||
              apt.status === 'confirmed' ||
              apt.status === 'upcoming';
            return isToday && isActive;
          }
        );

        // Define all available time slots (9:00 AM - 5:30 PM, 30-min intervals)
        const allTimeSlots = [
          "9:00 AM",
          "9:30 AM",
          "10:00 AM",
          "10:30 AM",
          "11:00 AM",
          "11:30 AM",
          "12:00 PM",
          "12:30 PM",
          "1:00 PM",
          "1:30 PM",
          "2:00 PM",
          "2:30 PM",
          "3:00 PM",
          "3:30 PM",
          "4:00 PM",
          "4:30 PM",
          "5:00 PM",
          "5:30 PM",
        ];

        // Get booked times for today (only from active appointments)
        const bookedTimes = todayAppointments.map(
          (apt) => apt.time || apt.appointment_time,
        );

        // Filter out booked times to show only available slots
        const availableTimes = allTimeSlots.filter(
          (time) => !bookedTimes.includes(time),
        );

        // Create slot objects (show all available)
        const slots = availableTimes
          .map((time) => ({
            time,
            barber: "Available",
            status: "available",
          }));

        setAvailableSlots(slots);
      } catch (error) {
        console.error(
          "Error calculating available slots:",
          error,
        );
        setAvailableSlots([]);
      } finally {
        setIsLoadingSlots(false);
      }
    };
    fetchAvailableSlots();
  }, [appointments]);

  // Handle booking card click to open popup
  const handleBookingClick = (booking: Appointment) => {
    setSelectedBooking(booking);
    setIsDialogOpen(true);
  };

  // Handle cancel appointment
  const handleCancelAppointment = async () => {
    if (!selectedBooking) return;

    try {
      setIsCancelling(true);

      const appointmentId = selectedBooking.id || selectedBooking._id;

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(appointmentId)) {
        console.error('Invalid appointment ID format:', appointmentId);
        toast.error('Invalid appointment ID. Please refresh the page and try again.');
        setIsCancelling(false);
        return;
      }



      // Try using the cancel endpoint, fallback to update if not available
      try {
        if (API.appointments && typeof API.appointments.cancel === 'function') {
          // Use the dedicated cancel endpoint
          await API.appointments.cancel(
            user.id,
            appointmentId,
            'Cancelled by customer'
          );
        } else {
          // Fallback: Use update endpoint

          await API.appointments.update(appointmentId, {
            status: 'cancelled',

            payment_status: 'refunded',
          });
        }
      } catch (apiError: any) {
        console.error('API Error:', apiError);
        throw apiError;
      }

      // Update the appointments list locally
      if (onUpdateAppointments && selectedBooking) {
        const updatedAppointments = appointments.map(apt =>
          apt.id === selectedBooking.id
            ? {
              ...apt,
              status: 'cancelled' as const,
              paymentStatus: 'rejected' as const,
              payment_status: 'refunded' as const,
            }
            : apt
        );
        onUpdateAppointments(updatedAppointments);
      }

      // Show success message
      toast.success('Appointment cancelled successfully');

      // Close dialog after a brief delay to show success state
      setTimeout(() => {
        setIsDialogOpen(false);
        setSelectedBooking(null);
      }, 500);
    } catch (error: any) {
      console.error('❌ Failed to cancel appointment:', error);
      toast.error(error?.message || 'Failed to cancel appointment. Please try again.');
    } finally {
      setIsCancelling(false);
    }
  };

  // Calculate popular services based on appointment history
  useEffect(() => {
    const calculatePopularServices = async () => {
      try {
        setIsLoadingServices(true);

        // Fetch all services from API
        const allServices = await API.services.getAll();

        // Count how many times each service appears in appointments
        const serviceCounts = new Map<string, number>();

        appointments.forEach((apt) => {
          const serviceName = apt.service || apt.service_name;
          if (serviceName) {
            serviceCounts.set(
              serviceName,
              (serviceCounts.get(serviceName) || 0) + 1,
            );
          }
        });

        // Match services with their booking counts and sort by popularity
        const servicesWithCounts = allServices
          .filter((s: Service) => s.isActive === true)
          .map((service: Service) => ({
            ...service,
            bookingCount: serviceCounts.get(service.name) || 0,
          }))
          .sort((a, b) => b.bookingCount - a.bookingCount)
          .slice(0, 6); // Top 6 most popular

        setServices(servicesWithCounts);
      } catch (error) {
        console.error(
          "Error calculating popular services:",
          error,
        );
        // Fallback: show all services if calculation fails
        try {
          const allServices = await API.services.getAll();
          const activeServices = allServices
            .filter((s: Service) => s.isActive === true)
            .slice(0, 6);
          setServices(activeServices);
        } catch (fallbackError) {
          setServices([]);
        }
      } finally {
        setIsLoadingServices(false);
      }
    };
    calculatePopularServices();
  }, [appointments]);

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">
      {/* Booking Details Popup */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      >
        <DialogContent className="sm:max-w-[600px] border-[#E8DCC8] bg-[#FAFAF8]">
          {selectedBooking && (
            <>
              <DialogHeader className="pb-4 border-b border-[#E8DCC8]">
                <DialogTitle className="text-[#5C4A3A] flex items-center gap-2 text-base">
                  <Scissors className="w-4 h-4 text-[#DB9D47]" />
                  Booking Details
                </DialogTitle>
                <DialogDescription className="text-[#87765E] text-sm">
                  View and manage your appointment
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Service Info */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-medium text-[#5C4A3A]">
                      {selectedBooking.service}
                    </h3>
                    <p className="text-sm text-[#87765E] mt-0.5">
                      with {selectedBooking.barber}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className={
                      selectedBooking.status === "confirmed"
                        ? "bg-[#94A670] text-white"
                        : "bg-[#F5E6D3] text-[#DB9D47]"
                    }
                  >
                    {selectedBooking.status}
                  </Badge>
                </div>

                {/* Date & Time */}
                <div className="flex items-center gap-6 py-3 border-y border-[#E8DCC8]">
                  <div className="flex items-center gap-2 text-sm text-[#5C4A3A]">
                    <Calendar className="w-4 h-4 text-[#DB9D47]" />
                    <span>{selectedBooking.date}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[#5C4A3A]">
                    <Clock className="w-4 h-4 text-[#DB9D47]" />
                    <span>{selectedBooking.time}</span>
                  </div>
                </div>

                {/* Price */}
                <div className="flex items-center justify-between py-3 border-b border-[#E8DCC8]">
                  <span className="text-sm text-[#5C4A3A]">
                    Total Price:
                  </span>
                  <span className="text-xl font-semibold text-[#DB9D47]">
                    ₱{selectedBooking.price}
                  </span>
                </div>

                {/* Payment Status */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#5C4A3A]">
                      Payment Status:
                    </span>
                    <span className="text-sm font-medium text-[#5C4A3A]">
                      {selectedBooking.paymentStatus === "paid"
                        ? "Paid"
                        : "Pending"}
                    </span>
                  </div>
                  {selectedBooking.paymentStatus ===
                    "pending" && (
                      <p className="text-sm text-[#DB9D47]">
                        50% down payment required ₱
                        {(selectedBooking.price * 0.5).toFixed(2)}
                      </p>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-3 pt-4 border-t border-[#E8DCC8]">
                  {selectedBooking.paymentProofUrl && (
                    <Button
                      variant="outline"
                      className="w-full border-[#E8DCC8] text-[#5C4A3A] hover:bg-[#FBF7EF]"
                      onClick={() => {
                        window.open(
                          selectedBooking.paymentProofUrl,
                          "_blank",
                        );
                      }}
                    >
                      <Receipt className="w-4 h-4 mr-2" />
                      View Payment Receipt
                    </Button>
                  )}

                  {selectedBooking.status === "pending" && (
                    <Button
                      className="w-full bg-red-500 text-white hover:bg-red-600 border-0"
                      onClick={handleCancelAppointment}
                      disabled={isCancelling}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      {isCancelling ? 'Cancelling...' : 'Cancel Appointment'}
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* 2. Combined: Upcoming Bookings + Available Slots */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Bookings */}
        <Card className="border-[#E8DCC8]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-[#5C4A3A]">
                  Upcoming Bookings
                </CardTitle>
                <CardDescription className="text-[#87765E]">
                  Your scheduled appointments
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate("manage")}
                className="text-[#DB9D47] hover:text-[#C88A35] hover:bg-[#FBF7EF] p-1 h-auto"
              >
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 overflow-hidden">
            {upcomingAppointments.length > 0 ? (
              <div
                className="space-y-2 overflow-y-auto overflow-x-hidden pr-2 scrollbar-thin scrollbar-thumb-[#DB9D47] scrollbar-track-[#FBF7EF]"
                style={{
                  maxHeight: '320px',
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#DB9D47 #FBF7EF'
                }}
              >
                {upcomingAppointments.map((booking) => (
                  <div
                    key={booking.id}
                    className="p-2 rounded-lg bg-[#FBF7EF] border border-[#E8DCC8] hover:shadow-md hover:border-[#DB9D47] transition-all cursor-pointer flex-shrink-0"
                    onClick={() =>
                      handleBookingClick(booking)
                    }
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Scissors className="w-3.5 h-3.5 text-[#DB9D47] flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <h4 className="text-[#5C4A3A] text-xs font-medium truncate">
                            {booking.service}
                          </h4>
                          <div className="flex items-center gap-2 text-[10px] text-[#87765E] mt-0.5">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-2.5 h-2.5" />
                              {booking.date}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              {booking.time}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Badge
                        variant="secondary"
                        className={
                          booking.status === "verified"
                            ? "bg-green-100 text-green-700 border-green-200 px-1.5 py-0"
                            : booking.status === "pending"
                              ? "bg-orange-100 text-orange-700 border-orange-200 px-1.5 py-0"
                              : "text-[10px] px-1.5 py-0"
                        }
                      >
                        {booking.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-[#87765E]">
                <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm mb-2">
                  No upcoming bookings
                </p>
                <Button
                  size="sm"
                  className="bg-[#DB9D47] hover:bg-[#C88A35] text-xs"
                  onClick={() => onNavigate("book")}
                >
                  Book Now
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Available Slots Today */}
        <Card className="border-[#E8DCC8]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-[#5C4A3A]">
                  Available Today
                </CardTitle>
                <CardDescription className="text-[#87765E]">
                  Book your preferred time
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate("slots")}
                className="text-[#DB9D47] hover:text-[#C88A35] hover:bg-[#FBF7EF] p-1 h-auto"
              >
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 overflow-hidden">
            {isLoadingSlots ? (
              <div className="text-center py-6 text-[#87765E]">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50 animate-spin" />
                <p className="text-sm">Loading slots...</p>
              </div>
            ) : availableSlots.length > 0 ? (
              <div
                className="space-y-2 overflow-y-auto overflow-x-hidden pr-2 scrollbar-thin scrollbar-thumb-[#DB9D47] scrollbar-track-[#FBF7EF]"
                style={{
                  maxHeight: '320px',
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#DB9D47 #FBF7EF'
                }}
              >
                {availableSlots.map((slot, index) => (
                  <div
                    key={`slot-${slot.time}-${slot.barber}-${index}`}
                    className="flex items-center justify-between p-3 rounded-lg border border-[#E8DCC8] hover:bg-[#FBF7EF] transition-colors cursor-pointer flex-shrink-0"
                    onClick={() => {
                      if (onSelectSlot) {
                        const today = new Date();
                        onSelectSlot(today, slot.time, slot.barber);
                      }
                      onNavigate("book");
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-[#94A670]" />
                      <div>
                        <p className="text-[#5C4A3A] text-sm">
                          {slot.time}
                        </p>
                        <p className="text-xs text-[#87765E]">
                          {slot.barber}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className="text-xs"
                    >
                      Available
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-[#87765E]">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm mb-2">
                  Check available time slots
                </p>
                <Button
                  size="sm"
                  className="bg-[#94A670] hover:bg-[#7E8F5E] text-xs"
                  onClick={() => onNavigate("slots")}
                >
                  View All Slots
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 3. Popular Services - Full Width */}
      <Card className="border-[#E8DCC8]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-[#5C4A3A]">
                Popular Services
              </CardTitle>
              <CardDescription className="text-[#87765E]">
                Most booked services this month
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate("services")}
              className="text-[#DB9D47] hover:text-[#C88A35] hover:bg-[#FBF7EF]"
            >
              View All
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingServices ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#DB9D47]"></div>
            </div>
          ) : services.length === 0 ? (
            <div className="text-center py-12 text-[#87765E]">
              <Scissors className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm mb-3">
                No services available at the moment
              </p>
              <Button
                size="sm"
                className="bg-[#DB9D47] hover:bg-[#C88A35]"
                onClick={() => onNavigate("services")}
              >
                View All Services
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {services.slice(0, 6).map((service) => {
                const serviceId = service.id || service._id;
                // Check if user already has an active booking for this service
                const hasActiveBooking = userAppointments.some(
                  (apt) =>
                    apt.service === service.name &&
                    (apt.status === 'pending' || apt.status === 'verified' || apt.status === 'confirmed' || apt.status === 'upcoming')
                );

                return (
                  <div
                    key={serviceId}
                  >
                    <Card className={`relative transition-all overflow-hidden hover:shadow-md border-2 ${hasActiveBooking ? 'border-gray-300 bg-gray-50/30' : 'border-[#E8DCC8] hover:border-[#DB9D47]/40'} cursor-pointer group`}>
                      <div className="relative h-48 overflow-hidden">
                        <ImageWithFallback
                          src={
                            service.imageUrl ||
                            "https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=400&h=400&fit=crop"
                          }
                          alt={service.name}
                          className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${hasActiveBooking ? 'opacity-75' : ''}`}
                        />
                        {/* Already Booked Badge */}
                        {hasActiveBooking && (
                          <Badge className="absolute top-3 left-3 bg-gray-500 hover:bg-gray-500 text-white z-10">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Already Booked
                          </Badge>
                        )}
                        {/* Favorite Icon */}
                        <button
                          onClick={(e) => toggleFavorite(service.id || service._id, e)}
                          className="absolute top-3 right-3 p-2 rounded-full bg-white shadow-md hover:shadow-lg transition-all hover:scale-110 z-10 cursor-pointer"
                          aria-label="Add to favorites"
                        >
                          <Heart
                            className={`w-5 h-5 transition-colors ${favoriteServices.includes(service.id || service._id)
                              ? "text-red-500 fill-current"
                              : "text-[#87765E] hover:text-[#DB9D47]"
                              }`}
                          />
                        </button>
                      </div>
                      <CardContent className="pt-4 pb-4">
                        <h3 className="text-lg text-[#5C4A3A] mb-2 group-hover:text-[#DB9D47] transition-colors">
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
                          <span className="text-lg text-[#DB9D47] font-semibold">
                            ₱{service.price}
                          </span>
                        </div>

                        {hasActiveBooking ? (
                          <Button
                            disabled
                            className="w-full bg-gray-600 text-white cursor-not-allowed opacity-80"
                          >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Already Booked
                          </Button>
                        ) : (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onSetPreSelectedService) {
                                onSetPreSelectedService(service.id || service._id);
                              }
                              onNavigate("book");
                            }}
                            className="w-full bg-[#DB9D47] hover:bg-[#C88A35] text-white cursor-pointer transition-all hover:shadow-md"
                          >
                            Book Now
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}