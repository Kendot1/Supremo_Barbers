import { useState, useRef, useEffect, useMemo, useCallback } from "react";
// Supremo Barber GCash QR Code
import qrImage from "figma:asset/9e9607467fe5e63f10eba24035950a8a0e4b1e0f.png";
import API from "../services/api.service";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import {
  Scissors,
  Clock,
  User,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  QrCode,
  CalendarDays,
  CheckCircle,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "./ui/utils";
import type { User as UserType, Appointment } from "../App";
import { ScrollArea } from "./ui/scroll-area";

interface BookingFlowProps {
  user: UserType;
  appointments: Appointment[];
  onAddAppointment: (appointment: Appointment) => void;
  onBookingComplete: (bookedServiceIds?: string[]) => void;
  preSelectedServiceId?: string | null;
  onClearPreSelectedService?: () => void;
  preSelectedServiceIds?: string[];
  onClearPreSelectedServiceIds?: () => void;
  preSelectedSlot?: {
    date: Date;
    time: string;
    barberName: string;
  } | null;
  onClearPreSelectedSlot?: () => void;
}

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  category?: string;
  description?: string;
  imageUrl?: string;
  isActive?: boolean;
}

interface Barber {
  id: string;
  name: string;
  email?: string;
  role?: string;
  isActive?: boolean;
  profileImage?: string;
  available?: boolean;
  image?: string;
  bookingsToday?: number;
}

// Fallback data for demo mode (when backend is unavailable)
const FALLBACK_SERVICES: Service[] = [
  {
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
    id: "5",
    name: "Supremo Espesyal",
    price: 450,
    duration: 60,
    description: "Complete grooming experience",
    imageUrl:
      "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBiYXJiZXJ8ZW58MXx8fHwxNzYwMTQ3NjI4fDA&ixlib=rb-4.1.0&q=80&w=1080",
    isActive: true,
  },
];

const FALLBACK_BARBERS: Barber[] = [
  {
    id: "barber-1",
    name: "Carlos Santos",
    email: "carlos@supremobarber.com",
    role: "barber",
    isActive: true,
    available: true,
    image:
      "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=400&h=400&fit=crop",
    bookingsToday: 2,
  },
  {
    id: "barber-2",
    name: "Miguel Reyes",
    email: "miguel@supremobarber.com",
    role: "barber",
    isActive: true,
    available: true,
    image:
      "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=400&h=400&fit=crop",
    bookingsToday: 3,
  },
  {
    id: "barber-3",
    name: "Rafael Cruz",
    email: "rafael@supremobarber.com",
    role: "barber",
    isActive: true,
    available: true,
    image:
      "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=400&h=400&fit=crop",
    bookingsToday: 1,
  },
];

const timeSlots = [
  "09:00 AM",
  "09:30 AM",
  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "11:30 AM",
  "12:00 PM",
  "12:30 PM",
  "01:00 PM",
  "01:30 PM",
  "02:00 PM",
  "02:30 PM",
  "03:00 PM",
  "03:30 PM",
  "04:00 PM",
  "04:30 PM",
  "05:00 PM",
  "05:30 PM",
];

export function BookingFlow({
  user,
  appointments,
  onAddAppointment,
  onBookingComplete,
  preSelectedServiceId,
  onClearPreSelectedService,
  preSelectedServiceIds,
  onClearPreSelectedServiceIds,
  preSelectedSlot,
  onClearPreSelectedSlot,
}: BookingFlowProps) {
  const calendarRef = useRef<any>(null);
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] =
    useState<Service | null>(null);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedBarber, setSelectedBarber] =
    useState<Barber | null>(null);
  const [selectedDate, setSelectedDate] = useState<
    Date | undefined
  >(undefined);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [paymentMethod] = useState<string>("gcash"); // Only GCash is allowed
  const [showConfirmDialog, setShowConfirmDialog] =
    useState(false);
  const [showQRPayment, setShowQRPayment] = useState(false);
  const [uploadedProof, setUploadedProof] = useState<
    string | null
  >(null);
  const [uploadedProofUrl, setUploadedProofUrl] = useState<
    string | null
  >(null);
  const [isUploadingProof, setIsUploadingProof] =
    useState(false);
  const [showFinalConfirmation, setShowFinalConfirmation] =
    useState(false);
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);

  // Database-driven state
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [isLoadingServices, setIsLoadingServices] =
    useState(true);
  const [isLoadingBarbers, setIsLoadingBarbers] =
    useState(true);
  const [failedServiceImages, setFailedServiceImages] = useState<Set<string>>(new Set());

  // Fetch services and barbers in parallel for better performance
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoadingServices(true);
        setIsLoadingBarbers(true);

        // Fetch both services and barbers in parallel
        const [fetchedServices, fetchedBarbers] = await Promise.all([
          API.services.getAll(),
          API.barbers.getAll(),
        ]);

        // Process services
        const activeServices = fetchedServices.filter(
          (s: Service) => s.isActive === true,
        );
        setServices(activeServices);
        setIsLoadingServices(false);

        // Process barbers
        const activeBarbers = fetchedBarbers
          .filter((b: Barber) => b.isActive !== false)
          .map((b: Barber) => ({
            ...b,
            available: true,
            image: b.avatarUrl,
            avatarUrl: b.avatarUrl,
            bookingsToday: 0,
          }));
        setBarbers(activeBarbers);
        setIsLoadingBarbers(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load booking data");
        setServices([]);
        setBarbers([]);
        setIsLoadingServices(false);
        setIsLoadingBarbers(false);
      }
    };

    fetchData();
  }, []);

  // Auto-select service when pre-selected from landing page
  useEffect(() => {
    if (
      preSelectedServiceId &&
      services.length > 0 &&
      !selectedService
    ) {
      const serviceToSelect = services.find(
        (s) => s.id === preSelectedServiceId,
      );
      if (serviceToSelect) {
        setSelectedService(serviceToSelect);
        // Add to selectedServices array so it shows as selected in the UI
        setSelectedServices([serviceToSelect]);
        // Stay on step 1 so user can see the selection
        setStep(1);
        // Clear the pre-selection after processing
        if (onClearPreSelectedService) {
          onClearPreSelectedService();
        }
      }
    }
  }, [
    preSelectedServiceId,
    services,
    selectedService,
    onClearPreSelectedService,
  ]);

  // Auto-select multiple services from favorites
  useEffect(() => {
    if (
      preSelectedServiceIds &&
      preSelectedServiceIds.length > 0 &&
      services.length > 0 &&
      selectedServices.length === 0
    ) {
      const servicesToSelect = services.filter((s) =>
        preSelectedServiceIds.includes(String(s.id))
      );
      if (servicesToSelect.length > 0) {
        setSelectedServices(servicesToSelect);
        // Also set the first one as the main selected service for compatibility
        setSelectedService(servicesToSelect[0]);
        // Clear the pre-selection after processing
        if (onClearPreSelectedServiceIds) {
          onClearPreSelectedServiceIds();
        }
      }
    }
  }, [
    preSelectedServiceIds,
    services,
    selectedServices,
    onClearPreSelectedServiceIds,
  ]);

  // Auto-select date and time when slot is pre-selected from dashboard
  useEffect(() => {
    if (preSelectedSlot && barbers.length > 0) {
      // Set the date and time
      setSelectedDate(preSelectedSlot.date);
      setSelectedTime(preSelectedSlot.time);
      
      // Try to find and select the barber by name
      const barberToSelect = barbers.find(
        (b) => b.name === preSelectedSlot.barberName
      );
      if (barberToSelect) {
        setSelectedBarber(barberToSelect);
      }
      
      // Clear the pre-selection after processing
      if (onClearPreSelectedSlot) {
        onClearPreSelectedSlot();
      }
    }
  }, [preSelectedSlot, barbers, onClearPreSelectedSlot]);

  // Helper to convert time string to minutes since midnight
  const timeToMinutes = (timeStr: string): number => {
    const [time, period] = timeStr.split(" ");
    const [hours, minutes] = time.split(":").map(Number);
    let totalHours = hours;

    if (period === "PM" && hours !== 12) {
      totalHours += 12;
    } else if (period === "AM" && hours === 12) {
      totalHours = 0;
    }

    return totalHours * 60 + minutes;
  };

  // Helper to get service duration by name
  const getServiceDuration = (serviceName: string): number => {
    const service = services.find(
      (s) => s.name === serviceName,
    );
    return service?.duration || 30;
  };

  // Check if a time slot is available considering service duration and overlaps
  const isTimeDisabled = (time: string): boolean => {
    if (!selectedBarber || !selectedDate || !selectedService)
      return false;

    const dateString = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;
    const newBookingStart = timeToMinutes(time);
    const newBookingEnd =
      newBookingStart + selectedService.duration;

    return appointments.some((apt) => {
      // Only consider active appointments (not cancelled or completed)
      const isActiveAppointment = 
        apt.status === 'pending' || 
        apt.status === 'confirmed' || 
        apt.status === 'upcoming';
      
      if (
        apt.barber !== selectedBarber.name ||
        apt.date !== dateString ||
        !isActiveAppointment
      ) {
        return false;
      }

      const existingStart = timeToMinutes(apt.time);
      const existingDuration = getServiceDuration(apt.service);
      const existingEnd = existingStart + existingDuration;

      // Check if time ranges overlap
      return (
        newBookingStart < existingEnd &&
        newBookingEnd > existingStart
      );
    });
  };

  // Check if all time slots are booked for the selected date
  const areAllSlotsBooked = useMemo(() => {
    if (!selectedDate || !selectedBarber || !selectedService) return false;
    return timeSlots.every((time) => isTimeDisabled(time));
  }, [selectedDate, selectedBarber, selectedService, appointments]);

  // Find the next available date with open slots
  const getNextAvailableDate = useMemo(() => {
    if (!selectedBarber || !selectedService) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check next 30 days
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() + i);
      
      // Skip Sundays (day 0)
      if (checkDate.getDay() === 0) continue;

      const dateString = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, "0")}-${String(checkDate.getDate()).padStart(2, "0")}`;

      // Check if any time slot is available on this date
      const hasAvailableSlot = timeSlots.some((time) => {
        const bookingStart = timeToMinutes(time);
        const bookingEnd = bookingStart + selectedService.duration;

        const isBooked = appointments.some((apt) => {
          const isActiveAppointment = 
            apt.status === 'pending' || 
            apt.status === 'confirmed' || 
            apt.status === 'upcoming';
          
          if (
            apt.barber !== selectedBarber.name ||
            apt.date !== dateString ||
            !isActiveAppointment
          ) {
            return false;
          }

          const existingStart = timeToMinutes(apt.time);
          const existingDuration = getServiceDuration(apt.service);
          const existingEnd = existingStart + existingDuration;

          return (
            bookingStart < existingEnd &&
            bookingEnd > existingStart
          );
        });

        return !isBooked;
      });

      if (hasAvailableSlot) {
        // Find the first available time slot for this date
        const firstAvailableTime = timeSlots.find((time) => {
          const bookingStart = timeToMinutes(time);
          const bookingEnd = bookingStart + selectedService.duration;

          const isBooked = appointments.some((apt) => {
            const isActiveAppointment = 
              apt.status === 'pending' || 
              apt.status === 'confirmed' || 
              apt.status === 'upcoming';
            
            if (
              apt.barber !== selectedBarber.name ||
              apt.date !== dateString ||
              !isActiveAppointment
            ) {
              return false;
            }

            const existingStart = timeToMinutes(apt.time);
            const existingDuration = getServiceDuration(apt.service);
            const existingEnd = existingStart + existingDuration;

            return (
              bookingStart < existingEnd &&
              bookingEnd > existingStart
            );
          });

          return !isBooked;
        });

        return {
          date: checkDate,
          time: firstAvailableTime || timeSlots[0],
        };
      }
    }

    return null;
  }, [selectedBarber, selectedService, appointments]);

  const handleServiceSelect = useCallback((serviceId: string) => {
    const service = services.find((s) => s.id === serviceId);
    if (!service) return;

    // Toggle service in the multi-select list
    setSelectedServices(prev => {
      const isAlreadySelected = prev.some(s => s.id === serviceId);
      if (isAlreadySelected) {
        // Remove it
        const updated = prev.filter(s => s.id !== serviceId);
        // Update main selectedService if needed
        if (updated.length > 0) {
          setSelectedService(updated[0]);
        } else {
          setSelectedService(null);
        }
        return updated;
      } else {
        // Add it
        const updated = [...prev, service];
        setSelectedService(service); // Set as main service
        return updated;
      }
    });
  }, [services]);

  const handleBarberSelect = useCallback((barberId: string) => {
    const barber = barbers.find((b) => b.id === barberId);
    setSelectedBarber(barber || null);
  }, [barbers]);

  const handleDateSelect = useCallback((date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedTime(""); // Reset time when date changes
  }, []);

  const handleTimeSelect = useCallback((time: string) => {
    setSelectedTime(time);
  }, []);

  const handleProceedToPayment = () => {
    setShowConfirmDialog(false);
    // Always show QR payment (GCash is the only payment method)
    setShowQRPayment(true);
  };

  const handleConfirmBooking = async () => {
    if (
      selectedServices.length === 0 ||
      !selectedBarber ||
      !selectedDate ||
      !selectedTime
    )
      return;

    setIsSubmittingBooking(true);
    
    try {
      // Calculate total price for all services
      const totalPrice = selectedServices.reduce((sum, service) => sum + service.price, 0);
      const totalDownPayment = totalPrice * 0.5;
      const totalRemaining = totalPrice * 0.5;

      // Create appointments for all selected services
      const appointmentPromises = selectedServices.map(async (service) => {
        const newAppointment: any = {
          // Don't set ID - let database generate UUID
          customer_id: user.id,
          barber_id: selectedBarber.id,
          service_id: service.id,
          appointment_date: `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`,
          appointment_time: selectedTime,
          total_amount: service.price,
          down_payment: service.price * 0.5,
          remaining_amount: service.price * 0.5,
          status: "pending",
          payment_status: "pending",
          notes: "",
          // Legacy fields for backward compatibility (frontend display)
          userId: user.id,
          service: service.name,
          barber: selectedBarber.name,
          date: `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`,
          time: selectedTime,
          price: service.price,
          canCancel: true,
          customerName: user.name,
          paymentProof: uploadedProofUrl || uploadedProof || undefined,
          paymentStatus: "pending",
          downPaymentPaid: true,
          remainingBalance: service.price * 0.5,
          rescheduledCount: 0, // Initialize reschedule count
        };

        const createdAppointment = await onAddAppointment(newAppointment);

        // Create payment record if proof exists
        if (uploadedProofUrl && createdAppointment?.id) {
          try {
            const paymentData = {
              appointment_id: createdAppointment.id,
              amount: service.price * 0.5,
              payment_type: "downpayment",
              payment_method: "gcash",
              proof_url: uploadedProofUrl,
            };

            await API.payments.create(paymentData);
          } catch (paymentError) {
            console.error("Error creating payment record:", paymentError);
            // Don't fail the whole booking if payment record fails
          }
        }

        return createdAppointment;
      });

      // Wait for all appointments to be created
      await Promise.all(appointmentPromises);

      // Collect booked service IDs to remove from favorites
      const bookedServiceIds = selectedServices.map(s => String(s.id));

      // Immediately close dialogs and show success
      setShowConfirmDialog(false);
      setShowQRPayment(false);
      setShowFinalConfirmation(false);
      setIsSubmittingBooking(false);
      
      toast.success(
        `${selectedServices.length} service(s) booked! Waiting for payment verification by admin.`,
      );

      // Reset form and switch to history tab immediately (no delay)
      setStep(1);
      setSelectedService(null);
      setSelectedServices([]);
      setSelectedBarber(null);
      setSelectedDate(undefined);
      setSelectedTime("");
      setUploadedProof(null);
      setUploadedProofUrl(null);
      
      // Pass booked service IDs to parent for favorites removal
      onBookingComplete(bookedServiceIds);
    } catch (error) {
      console.error("Error confirming booking:", error);
      toast.error(
        "Failed to confirm booking. Please try again.",
      );
      setIsSubmittingBooking(false);
      setShowFinalConfirmation(false);
    }
  };

  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const downPayment = (totalPrice * 0.5).toFixed(2);
  const remainingPayment = (totalPrice * 0.5).toFixed(2);

  // Generate dates for 1 month from today (30 days)
  const availableDates = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return date;
  });

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <Card className="border-[#E8DCC8]">
        <CardContent className="pt-6">
          {/* Desktop View */}
          <div className="hidden md:block">
            <div className="flex items-center justify-between">
              {[
                { num: 1, label: "Service" },
                { num: 2, label: "Barber" },
                { num: 3, label: "Date & Time" },
                { num: 4, label: "Payment" },
              ].map((s, idx) => (
                <div
                  key={s.num}
                  className="flex flex-col items-center flex-1"
                >
                  <div className="flex items-center w-full">
                    {idx > 0 && (
                      <div
                        className={cn(
                          "flex-1 h-1 transition-colors",
                          step > idx
                            ? "bg-[#DB9D47]"
                            : "bg-[#E8DCC8]",
                        )}
                      />
                    )}
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center transition-colors shadow-md mx-2",
                        step >= s.num
                          ? "bg-gradient-to-br from-[#DB9D47] to-[#C56E33] text-white"
                          : "bg-[#F8F0E0] text-[#87765E]",
                      )}
                    >
                      {s.num}
                    </div>
                    {idx < 3 && (
                      <div
                        className={cn(
                          "flex-1 h-1 transition-colors",
                          step > s.num
                            ? "bg-[#DB9D47]"
                            : "bg-[#E8DCC8]",
                        )}
                      />
                    )}
                  </div>
                  <span className="text-sm text-[#87765E] mt-2">
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile View */}
          <div className="md:hidden">
            <div className="flex items-center justify-between">
              {[1, 2, 3, 4].map((s, idx) => (
                <div
                  key={s}
                  className="flex flex-col items-center flex-1"
                >
                  <div className="flex items-center w-full">
                    {idx > 0 && (
                      <div
                        className={cn(
                          "flex-1 h-0.5 transition-colors",
                          step > idx
                            ? "bg-[#DB9D47]"
                            : "bg-[#E8DCC8]",
                        )}
                      />
                    )}
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-xs transition-colors shadow-sm mx-1",
                        step >= s
                          ? "bg-gradient-to-br from-[#DB9D47] to-[#C56E33] text-white"
                          : "bg-[#F8F0E0] text-[#87765E]",
                      )}
                    >
                      {s}
                    </div>
                    {idx < 3 && (
                      <div
                        className={cn(
                          "flex-1 h-0.5 transition-colors",
                          step > s
                            ? "bg-[#DB9D47]"
                            : "bg-[#E8DCC8]",
                        )}
                      />
                    )}
                  </div>
                  <span className="text-xs text-[#87765E] mt-1.5 text-center px-1">
                    {s === 1
                      ? "Service"
                      : s === 2
                        ? "Barber"
                        : s === 3
                          ? "Date"
                          : "Payment"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 1: Select Service */}
      {step === 1 && (
        <Card className="border-[#E8DCC8]">
          <CardHeader>
            <CardTitle className="text-[#5C4A3A]">
              Select Service(s)
            </CardTitle>
            <CardDescription className="text-[#87765E]">
              Choose one or more services for your appointment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingServices ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#DB9D47]"></div>
              </div>
            ) : services.length === 0 ? (
              <div className="text-center py-12 text-[#87765E]">
                No services available at the moment.
              </div>
            ) : (
              <ScrollArea className="h-[480px] pr-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {services.map((service) => (
                    <Card
                      key={service.id}
                      onClick={() =>
                        handleServiceSelect(service.id)
                      }
                      className={cn(
                        "border-2 cursor-pointer transition-all hover:shadow-md relative overflow-hidden",
                        selectedServices.some(s => s.id === service.id)
                          ? "border-[#DB9D47] shadow-lg ring-2 ring-[#DB9D47]/30"
                          : "border-[#E8DCC8] hover:border-[#DB9D47]/50",
                      )}
                    >
                      <CardContent className="p-0">
                        {/* Available Badge */}
                        <div className="absolute top-2 left-2 z-10">
                          <Badge className="bg-[#94A670] hover:bg-[#94A670] text-white text-xs px-2 py-0.5">
                            Available
                          </Badge>
                        </div>

                        {/* Selected Checkmark */}
                        {selectedServices.some(s => s.id === service.id) && (
                          <div className="absolute top-2 right-2 z-10">
                            <div className="bg-[#DB9D47] rounded-full p-1">
                              <CheckCircle2 className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        )}

                        {/* Service Image */}
                        <div className="w-full h-32 bg-gradient-to-br from-[#F5EDD8] to-[#E8DCC8] flex items-center justify-center overflow-hidden">
                          {service.imageUrl && !failedServiceImages.has(service.id) ? (
                            <img
                              src={service.imageUrl}
                              alt={service.name}
                              className="w-full h-full object-cover"
                              onError={() => {
                                console.log('❌ Service image failed to load:', service.imageUrl);
                                setFailedServiceImages(prev => new Set(prev).add(service.id));
                              }}
                            />
                          ) : (
                            <Scissors className="w-12 h-12 text-[#87765E] opacity-40" />
                          )}
                        </div>

                        {/* Service Info */}
                        <div className="p-3 space-y-2">
                          <h3
                            className={cn(
                              "text-sm line-clamp-1",
                              selectedServices.some(s => s.id === service.id)
                                ? "text-[#4B3621]"
                                : "text-[#5C4A3A]",
                            )}
                          >
                            {service.name}
                          </h3>

                          {service.description && (
                            <p className="text-xs text-[#87765E] line-clamp-2 min-h-[2rem]">
                              {service.description}
                            </p>
                          )}

                          <div className="flex items-center justify-between pt-1">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-[#87765E]" />
                              <span className="text-xs text-[#87765E]">
                                {service.duration} mins
                              </span>
                            </div>
                            <span className="text-[#DB9D47]">
                              ₱{service.price}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
            
            {/* Selected Services Summary */}
            {selectedServices.length > 0 && (
              <Card className="border-[#DB9D47] bg-[#FBF7EF]">
                <CardContent className="pt-4 pb-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-[#5C4A3A]">
                        Selected Services
                      </span>
                      <span className="font-medium text-[#5C4A3A]">
                        {selectedServices.length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#87765E]">
                        Total Duration
                      </span>
                      <span className="font-medium text-[#5C4A3A]">
                        {selectedServices.reduce((sum, s) => sum + s.duration, 0)} mins
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-[#E8DCC8]">
                      <span className="font-medium text-[#5C4A3A]">
                        Total Price
                      </span>
                      <span className="text-lg font-semibold text-[#DB9D47]">
                        ₱{selectedServices.reduce((sum, s) => sum + s.price, 0)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            <Button
              className="w-full bg-[#DB9D47] hover:bg-[#C58A38] text-white"
              disabled={selectedServices.length === 0}
              onClick={() => setStep(2)}
            >
              Continue {selectedServices.length > 1 ? `with ${selectedServices.length} Services` : ""}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Select Barber */}
      {step === 2 && (
        <Card className="border-[#E8DCC8]">
          <CardHeader>
            <CardTitle className="text-[#5C4A3A]">
              Select Barber
            </CardTitle>
            <CardDescription className="text-[#87765E]">
              Choose your preferred barber
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoadingBarbers ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#DB9D47]"></div>
              </div>
            ) : barbers.length === 0 ? (
              <div className="text-center py-12 text-[#87765E]">
                No barbers available at the moment.
              </div>
            ) : (
              <>
                {/* Mobile: Horizontal Scroll */}
                <div className="md:hidden">
                  <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
                    {barbers.map((barber) => (
                      <div
                        key={barber.id}
                        onClick={() =>
                          barber.available &&
                          handleBarberSelect(barber.id)
                        }
                        className={cn(
                          "relative border-2 rounded-lg cursor-pointer transition-all hover:shadow-lg overflow-hidden flex-shrink-0 w-[280px] snap-center",
                          !barber.available
                            ? "opacity-50 cursor-not-allowed"
                            : "",
                          selectedBarber?.id === barber.id
                            ? "border-[#DB9D47] ring-2 ring-[#DB9D47]"
                            : "border-[#E8DCC8] hover:border-[#DB9D47]",
                        )}
                      >
                        {/* Selected Indicator */}
                        {selectedBarber?.id === barber.id && (
                          <div className="absolute top-2 right-2 z-10 bg-[#DB9D47] rounded-full p-1">
                            <CheckCircle2 className="w-5 h-5 text-white" />
                          </div>
                        )}

                        {/* Barber Image */}
                        <div className="relative h-48 bg-[#FBF7EF] overflow-hidden">
                          {barber.avatarUrl ? (
                            <img
                              src={barber.avatarUrl}
                              alt={barber.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                console.log('❌ Barber avatar failed to load:', barber.avatarUrl);
                                // Replace with fallback image
                                e.currentTarget.src = 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#F5EDD8] to-[#E8DCC8]">
                              <User className="w-16 h-16 text-[#87765E] opacity-40" />
                            </div>
                          )}
                          {barber.available && (
                            <div className="absolute top-2 left-2">
                              <Badge className="bg-[#94A670] hover:bg-[#819157] text-white border-0">
                                Available
                              </Badge>
                            </div>
                          )}
                          {!barber.available && (
                            <div className="absolute top-2 left-2">
                              <Badge className="bg-[#87765E] text-white border-0">
                                Unavailable
                              </Badge>
                            </div>
                          )}
                        </div>

                        {/* Barber Info */}
                        <div className="p-4">
                          <h3 className="text-[#5C4A3A] mb-2">
                            {barber.name}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-[#87765E]">
                            <User className="w-4 h-4" />
                            <span>
                              {barber.bookingsToday}/5 bookings
                              today
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Scroll Hint */}
                  <p className="text-xs text-center text-[#87765E] mt-2">
                    Swipe to see more barbers
                  </p>
                </div>

                {/* Tablet & Desktop: Grid */}
                <div className="hidden md:grid md:grid-cols-3 gap-4">
                  {barbers.map((barber) => (
                    <div
                      key={barber.id}
                      onClick={() =>
                        barber.available &&
                        handleBarberSelect(barber.id)
                      }
                      className={cn(
                        "relative border-2 rounded-lg cursor-pointer transition-all hover:shadow-lg overflow-hidden",
                        !barber.available
                          ? "opacity-50 cursor-not-allowed"
                          : "",
                        selectedBarber?.id === barber.id
                          ? "border-[#DB9D47] ring-2 ring-[#DB9D47]"
                          : "border-[#E8DCC8] hover:border-[#DB9D47]",
                      )}
                    >
                      {/* Selected Indicator */}
                      {selectedBarber?.id === barber.id && (
                        <div className="absolute top-2 right-2 z-10 bg-[#DB9D47] rounded-full p-1">
                          <CheckCircle2 className="w-5 h-5 text-white" />
                        </div>
                      )}

                      {/* Barber Image */}
                      <div className="relative h-48 bg-[#FBF7EF] overflow-hidden">
                        {barber.avatarUrl ? (
                          <img
                            src={barber.avatarUrl}
                            alt={barber.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              console.log('❌ Barber avatar failed to load:', barber.avatarUrl);
                              // Replace with fallback image
                              e.currentTarget.src = 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#F5EDD8] to-[#E8DCC8]">
                            <User className="w-16 h-16 text-[#87765E] opacity-40" />
                          </div>
                        )}
                        {barber.available && (
                          <div className="absolute top-2 left-2">
                            <Badge className="bg-[#94A670] hover:bg-[#819157] text-white border-0">
                              Available
                            </Badge>
                          </div>
                        )}
                        {!barber.available && (
                          <div className="absolute top-2 left-2">
                            <Badge className="bg-[#87765E] text-white border-0">
                              Unavailable
                            </Badge>
                          </div>
                        )}
                      </div>

                      {/* Barber Info */}
                      <div className="p-4">
                        {/* Barber Avatar */}

                        <h3 className="text-[#5C4A3A] mb-2">
                          {barber.name}
                        </h3>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            {!isLoadingBarbers && barbers.length > 0 && (
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1 border-[#E8DCC8] text-[#5C4A3A] hover:bg-[#FBF7EF]"
                >
                  Back
                </Button>
                <Button
                  className="flex-1 bg-[#DB9D47] hover:bg-[#C58A38] text-white"
                  disabled={!selectedBarber}
                  onClick={() => setStep(3)}
                >
                  Continue
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Select Date & Time */}
      {step === 3 && (
        <Card className="border-[#E8DCC8]">
          <CardHeader>
            <CardTitle className="text-[#5C4A3A]">
              Select Date & Time
            </CardTitle>
            <CardDescription className="text-[#87765E]">
              Choose your preferred appointment slot
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Side-by-Side Layout: Calendar + Time Slots - Responsive */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Calendar Section - Left Side (2/3 width on desktop, full width on mobile) */}
              <div className="lg:col-span-2">
                <div className="flex items-center gap-2 mb-4">
                  <CalendarDays className="w-5 h-5 text-[#DB9D47]" />
                  <Label className="text-[#5C4A3A]">
                    Select Date
                  </Label>
                </div>

                <div className="border-2 border-[#E8DCC8] rounded-lg p-2 bg-white fullcalendar-supremo-compact max-h-[320px] sm:max-h-[380px] lg:max-h-none overflow-auto">
                  <FullCalendar
                    ref={calendarRef}
                    plugins={[dayGridPlugin, interactionPlugin]}
                    initialView="dayGridMonth"
                    headerToolbar={{
                      left: "prev,next",
                      center: "title",
                      right: "today",
                    }}
                    height="auto"
                    selectable={true}
                    selectMirror={true}
                    dayMaxEvents={true}
                    weekends={true}
                    dateClick={(info) => {
                      const clickedDate = new Date(info.date);
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const maxDate = new Date();
                      maxDate.setDate(maxDate.getDate() + 30);
                      maxDate.setHours(23, 59, 59, 999);

                      // Check if date is outside valid range
                      if (
                        clickedDate < today ||
                        clickedDate > maxDate
                      ) {
                        toast.error(
                          "Please select a date within the next 30 days",
                        );
                        return;
                      }

                      // Check if it's Sunday (0 = Sunday)
                      if (clickedDate.getDay() === 0) {
                        toast.error(
                          "Sorry, we're closed on Sundays!",
                        );
                        return;
                      }

                      handleDateSelect(clickedDate);
                    }}
                    dayCellClassNames={(arg) => {
                      const d = arg.date;
                      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                      const selectedDateStr = selectedDate
                        ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`
                        : undefined;

                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const maxDate = new Date();
                      maxDate.setDate(maxDate.getDate() + 30);
                      maxDate.setHours(23, 59, 59, 999);

                      const classes = [];

                      // Add selected class
                      if (dateStr === selectedDateStr) {
                        classes.push("fc-day-selected");
                      }

                      // Check if date is outside valid range
                      const cellDate = new Date(arg.date);
                      cellDate.setHours(0, 0, 0, 0);

                      if (
                        cellDate < today ||
                        cellDate > maxDate
                      ) {
                        classes.push("fc-day-disabled");
                        classes.push("fc-day-out-of-range");
                      }

                      // Add disabled and Sunday-specific class for Sundays
                      if (arg.date.getDay() === 0) {
                        classes.push("fc-day-disabled");
                        classes.push("fc-day-sunday-closed");
                      }

                      return classes;
                    }}
                    dayCellDidMount={(arg) => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const maxDate = new Date();
                      maxDate.setDate(maxDate.getDate() + 30);
                      maxDate.setHours(23, 59, 59, 999);

                      const cellDate = new Date(arg.date);
                      cellDate.setHours(0, 0, 0, 0);

                      // Disable click events for dates outside range or Sundays
                      if (
                        cellDate < today ||
                        cellDate > maxDate ||
                        arg.date.getDay() === 0
                      ) {
                        arg.el.style.pointerEvents = "none";
                      }
                    }}
                    dayCellContent={(arg) => {
                      // Extract day number (remove any suffix like 'st', 'nd', 'rd', 'th')
                      const dayNumber = arg.date.getDate();

                      return (
                        <div className="fc-daygrid-day-frame">
                          <div className="fc-daygrid-day-top">
                            <span className="fc-daygrid-day-number">
                              {dayNumber}
                            </span>
                          </div>
                        </div>
                      );
                    }}
                  />
                </div>

                {/* Sunday Closure Notice */}
                <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                    <span className="text-xs text-red-700">
                      We're closed on Sundays
                    </span>
                  </div>
                </div>

                {selectedDate && (
                  <div className="mt-3 p-2 bg-[#FFF9F0] border border-[#DB9D47] rounded-lg">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-[#DB9D47]" />
                      <span className="text-[#5C4A3A]">
                        {selectedDate.toLocaleDateString(
                          "en-US",
                          {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          },
                        )}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Time Slot Selection - Right Side (1/3 width on desktop, full width on mobile) */}
              <div className="lg:col-span-1">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-5 h-5 text-[#DB9D47]" />
                  <Label className="text-[#5C4A3A]">
                    Time Slot
                  </Label>
                </div>

                {!selectedDate ? (
                  <div className="border-2 border-dashed border-[#E8DCC8] rounded-lg p-8 text-center">
                    <CalendarDays className="w-12 h-12 text-[#E8DCC8] mx-auto mb-3" />
                    <p className="text-sm text-[#87765E]">
                      Select a date first
                    </p>
                  </div>
                ) : areAllSlotsBooked ? (
                  <div className="space-y-4">
                    <div className="border-2 border-[#DB9D47] bg-[#FFF9F0] rounded-lg p-6 text-center">
                      <AlertCircle className="w-12 h-12 text-[#DB9D47] mx-auto mb-3" />
                      <p className="text-sm text-[#5C4A3A] font-medium mb-2">
                        All time slots are booked for this date
                      </p>
                      <p className="text-xs text-[#87765E]">
                        Please select a different date
                      </p>
                    </div>

                    {getNextAvailableDate && (
                      <div className="border-2 border-[#94A670] bg-[#F5F8F0] rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <div className="bg-[#94A670] rounded-full p-2 mt-0.5">
                            <CheckCircle className="w-4 h-4 text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-[#5C4A3A] mb-1">
                              Next Available Slot
                            </p>
                            <p className="text-sm text-[#87765E] mb-2">
                              {getNextAvailableDate.date.toLocaleDateString("en-US", {
                                weekday: "long",
                                month: "long",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </p>
                            <p className="text-xs text-[#87765E]">
                              Starting at <span className="font-medium text-[#5C4A3A]">{getNextAvailableDate.time}</span>
                            </p>
                            <Button
                              onClick={() => {
                                handleDateSelect(getNextAvailableDate.date);
                                // Scroll calendar to that date if possible
                                if (calendarRef.current) {
                                  const calendarApi = calendarRef.current.getApi();
                                  calendarApi.gotoDate(getNextAvailableDate.date);
                                }
                              }}
                              className="mt-3 w-full bg-[#94A670] hover:bg-[#7F8F5E] text-white text-xs py-2"
                            >
                              Select This Date
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <ScrollArea className="h-[300px] sm:h-[350px] lg:h-[400px] pr-2">
                    <div className="space-y-2">
                      {timeSlots.map((time) => {
                        const disabled = isTimeDisabled(time);
                        const isSelected =
                          selectedTime === time;

                        return (
                          <button
                            key={time}
                            type="button"
                            onClick={() =>
                              !disabled &&
                              handleTimeSelect(time)
                            }
                            disabled={disabled}
                            className={cn(
                              "w-full p-3 border-2 rounded-lg transition-all text-left relative group",
                              isSelected &&
                                "border-[#DB9D47] bg-[#FFF9F0] shadow-md ring-1 ring-[#DB9D47]",
                              !isSelected &&
                                !disabled &&
                                "border-[#E8DCC8] hover:border-[#DB9D47] hover:bg-[#FBF7EF]",
                              disabled &&
                                "border-[#E8DCC8] bg-[#F8F8F8] cursor-not-allowed opacity-50",
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <div
                                className={cn(
                                  "flex items-center gap-2",
                                  isSelected
                                    ? "text-[#DB9D47]"
                                    : disabled
                                      ? "text-[#B5A490]"
                                      : "text-[#5C4A3A]",
                                )}
                              >
                                <Clock className="w-4 h-4" />
                                <span className="font-medium">
                                  {time}
                                </span>
                              </div>
                              {isSelected && (
                                <CheckCircle className="w-4 h-4 text-[#DB9D47]" />
                              )}
                            </div>
                            {disabled && (
                              <span className="text-xs text-[#B5A490] mt-1 block ml-6">
                                Booked
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                variant="outline"
                onClick={() => setStep(2)}
                className="flex-1 border-[#E8DCC8] text-[#5C4A3A] hover:bg-[#FBF7EF]"
              >
                Back
              </Button>
              <Button
                className="flex-1 bg-[#DB9D47] hover:bg-[#C58A38] text-white"
                disabled={!selectedDate || !selectedTime}
                onClick={() => setStep(4)}
              >
                Continue to Payment
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Payment */}
      {step === 4 && (
        <Card className="border-[#E8DCC8]">
          <CardHeader>
            <CardTitle className="text-[#5C4A3A]">
              Payment Method
            </CardTitle>
            <CardDescription className="text-[#87765E]">
              Choose how you'd like to pay
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-[#FBF7EF] border border-[#E8DCC8] p-4 rounded-lg space-y-2">
              <div className="space-y-1">
                <span className="text-[#87765E] text-sm">Service{selectedServices.length > 1 ? 's' : ''}:</span>
                {selectedServices.map((service, index) => (
                  <div key={service.id} className="flex justify-between text-sm pl-4">
                    <span className="text-[#5C4A3A]">
                      {selectedServices.length > 1 && `${index + 1}. `}{service.name}
                    </span>
                    <span className="text-[#5C4A3A]">
                      ₱{service.price}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#87765E]">Barber:</span>
                <span className="text-[#5C4A3A]">
                  {selectedBarber?.name}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#87765E]">Date:</span>
                <span className="text-[#5C4A3A]">
                  {selectedDate?.toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#87765E]">Time:</span>
                <span className="text-[#5C4A3A]">
                  {selectedTime}
                </span>
              </div>
              <div className="h-px bg-[#E8DCC8] my-2" />
              <div className="flex justify-between">
                <span className="text-[#87765E]">
                  Total Price:
                </span>
                <span className="text-xl text-[#DB9D47]">
                  ₱{totalPrice}
                </span>
              </div>
            </div>

            <div>
              <Label className="text-[#5C4A3A]">
                Payment Method
              </Label>
              <div className="mt-3 p-4 border-2 border-[#DB9D47] rounded-lg bg-[#FFF9F0]">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[#DB9D47] rounded-lg flex items-center justify-center">
                    <QrCode className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-[#5C4A3A]">
                      GCash Payment
                    </h4>
                    <p className="text-sm text-[#87765E]">
                      Scan QR code to pay 50% down payment
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-[#87765E] mt-2 text-center">
                Only GCash payments are accepted for down
                payment
              </p>
            </div>

            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => setStep(3)}
                className="flex-1 border-[#E8DCC8] text-[#5C4A3A] hover:bg-[#FBF7EF]"
              >
                Back
              </Button>
              <Button
                className="flex-1 bg-[#DB9D47] hover:bg-[#C58A38] text-white"
                onClick={() => setShowConfirmDialog(true)}
              >
                Confirm Booking
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
      >
        <AlertDialogContent className="border-[#E8DCC8]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-[#5C4A3A]">
              <AlertCircle className="w-5 h-5 text-[#DB9D47]" />
              Confirm Booking & Payment
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#87765E]">
              You're about to book an appointment. Please review
              your details.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Move content outside AlertDialogDescription to avoid nesting issues */}
          <div className="space-y-4">
            <div className="bg-[#FBF7EF] border border-[#E8DCC8] rounded-lg p-4 space-y-2">
              <div className="space-y-1">
                <span className="text-[#87765E] text-sm">Service{selectedServices.length > 1 ? 's' : ''}:</span>
                {selectedServices.map((service, index) => (
                  <div key={service.id} className="flex justify-between items-center">
                    <span className="text-[#5C4A3A] text-sm">
                      {index + 1}. {service.name}
                    </span>
                    <span className="text-[#5C4A3A] text-sm">
                      ₱{service.price}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#87765E]">Barber:</span>
                <span className="text-[#5C4A3A]">
                  {selectedBarber?.name}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#87765E]">
                  Total Price:
                </span>
                <span className="text-[#5C4A3A]">
                  ₱{totalPrice}
                </span>
              </div>
              <div className="h-px bg-[#E8DCC8] my-2" />
              <div className="flex justify-between items-center">
                <span className="text-[#5C4A3A]">
                  Down Payment (50%):
                </span>
                <span className="text-xl text-[#DB9D47]">
                  ₱{downPayment}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-[#87765E]">
                  Remaining (Pay at Shop):
                </span>
                <span className="text-[#5C4A3A]">
                  ₱{remainingPayment}
                </span>
              </div>
            </div>

            <div className="p-3 bg-[#FCF4E8] border border-[#E8C798] rounded-lg">
              <p className="text-sm text-[#6B5845]">
                <strong>⚠️ No Refund Policy:</strong> Please
                note that down payments are non-refundable. Make
                sure to arrive on time for your appointment.
              </p>
            </div>

            <p className="text-sm text-[#87765E]">
              Payment Method:{" "}
              <span className="text-[#5C4A3A]">
                GCash (50% Down Payment)
              </span>
            </p>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#E8DCC8] text-[#5C4A3A] hover:bg-[#FBF7EF]">
              No, Go Back
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleProceedToPayment}
              className="bg-[#DB9D47] hover:bg-[#C58A38] text-white"
            >
              Yes, Proceed to Payment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* QR Payment Dialog - Compressed */}
      <AlertDialog
        open={showQRPayment}
        onOpenChange={setShowQRPayment}
      >
        <AlertDialogContent className="border-[#E8DCC8] max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-[#5C4A3A] text-sm sm:text-base">
              <QrCode className="w-4 h-4 text-[#DB9D47]" />
              Complete Payment
            </AlertDialogTitle>
            <AlertDialogDescription className="sr-only">
              Scan the QR code and upload your payment proof to
              complete the booking
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2 sm:space-y-3">
            {/* Compact QR Code Section */}
            <div className="flex flex-col items-center gap-1.5 sm:gap-2">
              <div className="p-1.5 sm:p-2 rounded-lg border border-[#E8DCC8] bg-white">
                <div className="w-48 h-48 sm:w-60 sm:h-60 flex items-center justify-center bg-[#FBF7EF]">
                  <img
                    src={qrImage}
                    alt="Supremo Barber QR Payment"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
              <p className="text-xs sm:text-sm text-[#5C4A3A]">
                Scan to Pay ₱{downPayment}
              </p>

              {/* Compact Payment Info */}
              <div className="border border-[#DB9D47] rounded-lg p-2 sm:p-3 w-full bg-[#FFF9F0]">
                <div className="space-y-1 text-xs sm:text-sm">
                  <p className="text-[#5C4A3A] break-all">
                    <strong>GCash Number:</strong> 0920-4XX-XX31
                  </p>
                  <p className="text-[#5C4A3A] break-all">
                    <strong>Account Name:</strong> JOSHUA A.
                  </p>
                  <p className="text-[#5C4A3A] break-all">
                    <strong>User ID:</strong> •••••••••••X2KDAP
                  </p>
                </div>
              </div>
            </div>

            {/* Compact Upload Section */}
            <div className="space-y-2">
              <Label className="text-[#5C4A3A] text-xs sm:text-sm">
                Upload Proof of Payment
              </Label>

              <input
                id="payment-proof"
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (!file.type.startsWith("image/")) {
                      toast.error(
                        "Please upload an image file",
                      );
                      return;
                    }
                    if (file.size > 5 * 1024 * 1024) {
                      toast.error(
                        "File size must be less than 5MB",
                      );
                      return;
                    }

                    // Show preview immediately
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setUploadedProof(reader.result as string);
                    };
                    reader.readAsDataURL(file);

                    // Upload to Cloudflare R2
                    try {
                      setIsUploadingProof(true);
                      const formData = new FormData();
                      formData.append("file", file);
                      formData.append("type", "payment-proof"); // Specify upload type for proper folder organization

                      const result =
                        await API.uploadImage(formData);
                      setUploadedProofUrl(result.url);
                      toast.success(
                        "Payment proof uploaded successfully!",
                      );
                      console.log(
                        "✅ Payment proof uploaded to R2:",
                        result.url,
                      );
                    } catch (error) {
                      console.error(
                        "❌ Error uploading payment proof:",
                        error,
                      );
                      toast.error(
                        "Failed to upload payment proof. Please try again.",
                      );
                      setUploadedProof(null);
                    } finally {
                      setIsUploadingProof(false);
                    }
                  }
                }}
                className="hidden"
              />

              {!uploadedProof ? (
                <div
                  onClick={() =>
                    document
                      .getElementById("payment-proof")
                      ?.click()
                  }
                  className="border-2 border-dashed border-[#E8DCC8] rounded-lg p-3 sm:p-4 flex flex-col items-center justify-center cursor-pointer hover:border-[#DB9D47] transition-colors"
                >
                  {isUploadingProof ? (
                    <>
                      <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-[#DB9D47] mb-1.5 sm:mb-2 animate-pulse" />
                      <p className="text-xs sm:text-sm text-[#5C4A3A] mb-0.5 text-center">
                        Uploading to Cloudflare R2...
                      </p>
                    </>
                  ) : (
                    <>
                      <QrCode className="w-6 h-6 sm:w-8 sm:h-8 text-[#87765E] mb-1.5 sm:mb-2" />
                      <p className="text-xs sm:text-sm text-[#5C4A3A] mb-0.5 text-center">
                        Click to upload payment screenshot
                      </p>
                      <p className="text-[10px] sm:text-xs text-[#87765E] text-center">
                        PNG, JPG or JPEG (max. 5MB)
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative rounded-lg overflow-hidden border border-[#E8DCC8]">
                    <img
                      src={uploadedProof}
                      alt="Payment proof preview"
                      className="w-full h-32 sm:h-40 object-contain bg-[#FBF7EF]"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        document
                          .getElementById("payment-proof")
                          ?.click()
                      }
                      className="flex-1 border-[#DB9D47] text-[#DB9D47] hover:bg-[#DB9D47] hover:text-white text-[10px] sm:text-xs h-7 sm:h-8"
                    >
                      Change
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setUploadedProof(null);
                        setUploadedProofUrl(null);
                      }}
                      className="border-[#E57373] text-[#E57373] hover:bg-[#E57373] hover:text-white text-[10px] sm:text-xs h-7 sm:h-8"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Compact Info Alert */}
            <div className="border border-[#DB9D47] bg-orange-50 rounded-lg p-2 sm:p-3">
              <div className="flex items-start gap-1.5 sm:gap-2">
                <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#DB9D47] flex-shrink-0 mt-0.5" />
                <div className="text-[10px] sm:text-xs text-[#5C4A3A]">
                  <p className="mb-1 font-semibold">
                    Important:
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 text-[10px] sm:text-xs">
                    <li>
                      Complete down payment to confirm booking
                    </li>
                    <li>Verification takes 5-10 minutes</li>
                    <li>Down payments are non-refundable</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <AlertDialogFooter className="gap-2 flex-col sm:flex-row">
            <AlertDialogCancel
              onClick={() => {
                setShowQRPayment(false);
                setUploadedProof(null);
                setUploadedProofUrl(null);
              }}
              className="border-[#E8DCC8] text-xs sm:text-sm h-8 sm:h-9 w-full sm:w-auto"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!uploadedProof) {
                  toast.error(
                    "Please upload a payment proof image",
                  );
                  return;
                }
                setShowFinalConfirmation(true);
              }}
              disabled={!uploadedProof}
              className="bg-[#DB9D47] hover:bg-[#C88A35] text-white text-xs sm:text-sm h-8 sm:h-9 w-full sm:w-auto"
            >
              <CheckCircle2 className="w-3 h-3 mr-1.5" />
              Submit Proof
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Final Confirmation Dialog */}
      <AlertDialog
        open={showFinalConfirmation}
        onOpenChange={setShowFinalConfirmation}
      >
        <AlertDialogContent className="border-[#E8DCC8] max-w-md bg-gradient-to-br from-[#FFFDF8] to-[#FFF8E8]">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[#DB9D47] to-[#C88A3C] flex items-center justify-center shadow-lg">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
              <div>
                <AlertDialogTitle className="text-xl text-[#5C4A3A]">
                  Confirm Your Booking
                </AlertDialogTitle>
                <AlertDialogDescription className="text-sm text-[#8B7355] mt-1">
                  Please review your booking details one last
                  time
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>

          <div className="space-y-4">
            {/* Booking Summary */}
            <div className="bg-[#FBF7EF] border border-[#E8DCC8] rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Scissors className="w-5 h-5 text-[#DB9D47] flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-[#87765E]">
                    Service{selectedServices.length > 1 ? 's' : ''}
                  </p>
                  {selectedServices.map((service, index) => (
                    <p key={service.id} className="text-[#5C4A3A]">
                      {index + 1}. {service.name} - ₱{service.price}
                    </p>
                  ))}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-[#DB9D47] flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-[#87765E]">
                    Barber
                  </p>
                  <p className="text-[#5C4A3A]">
                    {selectedBarber?.name}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CalendarDays className="w-5 h-5 text-[#DB9D47] flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-[#87765E]">
                    Date & Time
                  </p>
                  <p className="text-[#5C4A3A]">
                    {selectedDate?.toLocaleDateString()} at{" "}
                    {selectedTime}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CreditCard className="w-5 h-5 text-[#DB9D47] flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-[#87765E]">
                    Payment
                  </p>
                  <p className="text-[#5C4A3A]">
                    ₱{downPayment} (Down Payment Paid)
                  </p>
                  <p className="text-xs text-[#87765E] mt-1">
                    Remaining: ₱{remainingPayment} (Pay at shop)
                  </p>
                </div>
              </div>
            </div>

            {/* Warning Notice */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800">
                  <p className="mb-1">
                    <strong>Important Reminders:</strong>
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>
                      Your booking will be pending admin
                      verification
                    </li>
                    <li>Down payment is non-refundable</li>
                    <li>
                      Cannot cancel on the same day as
                      appointment
                    </li>
                    <li>
                      Arrive 5-10 minutes before your scheduled
                      time
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <p className="text-xs text-center text-[#87765E]">
              By confirming, you agree to our booking terms and
              conditions
            </p>
          </div>

          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel
              onClick={() => setShowFinalConfirmation(false)}
              disabled={isSubmittingBooking}
              className="border-[#D4C5B0] text-[#5C4A3A] hover:bg-[#F5EDD8]"
            >
              Review Again
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmBooking}
              disabled={isSubmittingBooking}
              className="bg-gradient-to-r from-[#DB9D47] to-[#C88A3C] hover:from-[#C88A3C] hover:to-[#B87A2E] text-white shadow-lg disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {isSubmittingBooking ? 'Processing...' : 'Confirm Booking'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}