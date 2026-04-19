import { useState, useEffect, useMemo } from "react";
import type { Appointment, User as UserType } from "../App";
import API from "../services/api.service";
import { SupabaseReviewsService } from "../services/supabase-reviews.service";
import { PaymentProofUpload, PaymentStatusBadge } from "./PaymentProofUpload";
import { SupabaseSetupGuide } from "./SupabaseSetupGuide";
import { logPaymentProofUpload, logAppointmentCancelledByCustomer, logAppointmentRescheduledByCustomer } from "../services/audit-notification.service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Calendar as CalendarPicker } from "./ui/calendar";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Calendar,
  Clock,
  User,
  MapPin,
  Scissors,
  Edit,
  X,
  QrCode,
  Star,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  CreditCard,
  MessageSquare,
} from "lucide-react";
import { FaPesoSign } from "react-icons/fa6";
import { toast } from "sonner";

// Utility function to parse date string without timezone issues
const parseLocalDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

interface CustomerBookingManagementProps {
  user: UserType;
  appointments: Appointment[];
  onUpdateAppointments: (appointments: Appointment[]) => void;
  onNavigateToBooking?: () => void;
  onSetPreSelectedService?: (serviceId: string) => void;
  highlightedAppointmentId?: string | null;
}

export function CustomerBookingManagement({
  user,
  appointments,
  onUpdateAppointments,
  onNavigateToBooking,
  onSetPreSelectedService,
  highlightedAppointmentId
}: CustomerBookingManagementProps) {
  const [isRescheduleDialogOpen, setIsRescheduleDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isRebookDialogOpen, setIsRebookDialogOpen] = useState(false);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Appointment | null>(null);
  const [newDate, setNewDate] = useState<Date | undefined>(new Date());
  const [newTime, setNewTime] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewedAppointments, setReviewedAppointments] = useState<Set<string>>(new Set());
  const [showRlsError, setShowRlsError] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  const [selectedCancelReason, setSelectedCancelReason] = useState("");
  const [isViewDetailsOpen, setIsViewDetailsOpen] = useState(false);
  const [viewBooking, setViewBooking] = useState<Appointment | null>(null);

  // Scroll to highlighted appointment
  useEffect(() => {
    if (highlightedAppointmentId) {
      // Wait for DOM to render, then scroll to element
      setTimeout(() => {
        const element = document.getElementById(`appointment-${highlightedAppointmentId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    }
  }, [highlightedAppointmentId]);

  // Fetch existing reviews to track which appointments have been reviewed
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const allReviews = await API.reviews.getAll();
        // Filter reviews for this customer
        const customerReviews = allReviews.filter((r: any) => r.customerId === user.id);
        // Create a set of reviewed appointment IDs
        const reviewedIds = new Set(customerReviews.map((r: any) => r.appointmentId));
        setReviewedAppointments(reviewedIds);

      } catch (error) {
        console.error('Error fetching customer reviews:', error);
      }
    };

    fetchReviews();
  }, [user.id]);



  // Filter appointments for current user
  const userAppointments = useMemo(() => {
    const filtered = appointments.filter(apt => {

      return apt.userId === user.id || apt.customer_id === user.id;
    });

    return filtered;
  }, [appointments, user.id]);

  const upcomingBookings = useMemo(() => {
    const upcoming = userAppointments.filter((b) => b.status === "pending" || b.status === "confirmed" || b.status === "verified");

    return upcoming;
  }, [userAppointments]);

  const pastBookings = useMemo(() => {
    const past = userAppointments.filter((b) => b.status === "completed" || b.status === "cancelled" || b.status === "rejected");

    return past;
  }, [userAppointments]);

  // Set loading to false once appointments are loaded
  useMemo(() => {
    setIsLoading(false);
  }, [appointments]);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "pending":
        return {
          color: "bg-orange-100 text-orange-700 border-orange-200",
          label: "Pending",
        };
      case "confirmed":
        return {
          color: "bg-blue-100 text-blue-700 border-blue-200",
          label: "Confirmed",
        };
      case "verified":
        return {
          color: "bg-green-100 text-green-700 border-green-200",
          label: "Verified",
        };
      case "upcoming":
        return {
          color: "bg-blue-100 text-blue-700 border-blue-200",
          label: "Upcoming",
        };
      case "completed":
        return {
          color: "bg-green-100 text-green-700 border-green-200",
          label: "Completed",
        };
      case "cancelled":
        return {
          color: "bg-red-100 text-red-700 border-red-200",
          label: "Cancelled",
        };
      case "rejected":
        return {
          color: "bg-red-100 text-red-700 border-red-200",
          label: "Rejected",
        };
      default:
        return {
          color: "bg-gray-100 text-gray-700 border-gray-200",
          label: status,
        };
    }
  };

  // Get payment status config for better UI feedback
  const getPaymentStatusConfig = (paymentStatus?: string) => {
    switch (paymentStatus) {
      case "verified":
        return {
          color: "bg-green-100 text-green-700 border-green-200",
          label: "Payment Verified ✓",
          description: "Your payment has been approved"
        };
      case "rejected":
        return {
          color: "bg-red-100 text-red-700 border-red-200",
          label: "Payment Rejected ✗",
          description: "Please resubmit your payment proof"
        };
      case "pending":
        return {
          color: "bg-yellow-100 text-yellow-700 border-yellow-200",
          label: "Payment Pending",
          description: "Awaiting verification"
        };
      default:
        return null;
    }
  };

  // Check if booking can be rescheduled/cancelled (2-3 days in advance)
  const canModifyBooking = (bookingDate: string): { canModify: boolean; daysUntil: number } => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const appointmentDate = new Date(bookingDate);
    appointmentDate.setHours(0, 0, 0, 0);

    const daysUntil = Math.ceil((appointmentDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    return {
      canModify: daysUntil >= 2, // At least 2 days in advance
      daysUntil
    };
  };

  const handleReschedule = (booking: Appointment) => {
    const { canModify, daysUntil } = canModifyBooking(booking.date);

    if (!canModify) {
      toast.error(
        daysUntil === 0
          ? 'Cannot reschedule same-day appointments'
          : `Rescheduling requires at least 2 days notice. Your appointment is in ${daysUntil} day(s).`
      );
      return;
    }

    // Check if booking has already been rescheduled
    if ((booking.rescheduledCount ?? 0) >= 1) {
      toast.error('This appointment has already been rescheduled once. You cannot reschedule it again.');
      return;
    }

    setSelectedBooking(booking);
    setNewDate(parseLocalDate(booking.date));
    setNewTime(booking.time);
    setIsRescheduleDialogOpen(true);
  };

  const handleConfirmReschedule = async () => {
    if (!selectedBooking || !newDate || !newTime) {
      toast.error('Please select both date and time');
      return;
    }

    // Check if selected date is Sunday
    if (newDate.getDay() === 0) {
      toast.error("Sorry, we're closed on Sundays!");
      return;
    }

    const formattedDate = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}-${String(newDate.getDate()).padStart(2, '0')}`;

    const newRescheduledCount = (selectedBooking.rescheduledCount || 0) + 1;

    // Update appointments — onUpdateAppointments handles both state + DB sync
    const updatedAppointments = appointments.map(apt => {
      if (apt.id === selectedBooking.id) {
        return {
          ...apt,
          date: formattedDate,
          appointment_date: formattedDate,
          time: newTime,
          appointment_time: newTime,
          rescheduledCount: newRescheduledCount,
        };
      }
      return apt;
    });

    setIsRescheduleDialogOpen(false);
    setSelectedBooking(null);

    try {
      // onUpdateAppointments syncs to DB via App.tsx handleUpdateAppointments
      await onUpdateAppointments(updatedAppointments);

      // Send notifications to admin and barber about reschedule
      try {
        await logAppointmentRescheduledByCustomer(
          user.id,
          user.name,
          user.email,
          selectedBooking.id,
          {
            service: selectedBooking.service || selectedBooking.service_name || 'Unknown Service',
            barber: selectedBooking.barber || selectedBooking.barber_name || 'Unknown Barber',
            barberId: selectedBooking.barber_id || '',
            oldDate: selectedBooking.date || selectedBooking.appointment_date || '',
            oldTime: selectedBooking.time || selectedBooking.appointment_time || '',
            newDate: formattedDate,
            newTime: newTime,
          }
        );

      } catch (notifError) {
        console.error('❌ Failed to send reschedule notifications:', notifError);
      }

      if (newRescheduledCount >= 1) {
        toast.success('Appointment rescheduled! Note: This appointment can no longer be rescheduled.');
      } else {
        toast.success('Appointment rescheduled successfully!');
      }
    } catch (error: any) {
      console.error('❌ Failed to reschedule appointment:', error);
      toast.error('Reschedule limit exceeded. Please try again or contact support.');
    }
  };

  const handleCancelBookingClick = (booking: Appointment) => {
    const { canModify, daysUntil } = canModifyBooking(booking.date);

    if (!canModify) {
      toast.error(
        daysUntil === 0
          ? 'Cannot cancel same-day appointments'
          : `Cancellation requires at least 2 days notice. Your appointment is in ${daysUntil} day(s).`
      );
      return;
    }

    setSelectedBooking(booking);
    setIsCancelDialogOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!selectedBooking) return;

    if (!cancellationReason.trim() && selectedCancelReason !== 'other') {
      if (!selectedCancelReason) {
        toast.error('Please select a reason for cancellation.');
        return;
      }
    }

    if (selectedCancelReason === 'other' && !cancellationReason.trim()) {
      toast.error('Please provide your reason for cancellation.');
      return;
    }

    // Build the final reason string
    const finalReason = selectedCancelReason === 'other'
      ? cancellationReason.trim()
      : selectedCancelReason;

    try {
      const cancelledAt = new Date().toISOString();

      // Update the database directly with status, payment_status, and cancellation reason
      await API.appointments.update(selectedBooking.id, {
        status: 'cancelled',
        payment_status: 'refunded',
        notes: `Customer cancelled: ${finalReason}`,
        cancellation_reason: finalReason,
        cancelled_by: `Customer - ${user.name}`,
      });

      const updatedAppointments = appointments.map(apt => {
        if (apt.id === selectedBooking.id) {
          return {
            ...apt,
            status: 'cancelled' as const,
            paymentStatus: 'rejected' as const,  // camelCase for UI
            payment_status: 'refunded' as const,  // snake_case for DB sync
            cancellationReason: finalReason,
            cancellation_reason: finalReason,
            cancelledBy: `Customer - ${user.name}`,
            cancelled_by: `Customer - ${user.name}`,
            cancelledAt,
            notes: `Customer cancelled: ${finalReason}`,
          };
        }
        return apt;
      });

      onUpdateAppointments(updatedAppointments);

      // Send notifications to admin and barber about cancellation
      try {
        await logAppointmentCancelledByCustomer(
          user.id,
          user.name,
          user.email,
          selectedBooking.id,
          {
            service: selectedBooking.service || selectedBooking.service_name || 'Unknown Service',
            barber: selectedBooking.barber || selectedBooking.barber_name || 'Unknown Barber',
            barberId: selectedBooking.barber_id || '',
            date: selectedBooking.date || selectedBooking.appointment_date || '',
            time: selectedBooking.time || selectedBooking.appointment_time || '',
            reason: finalReason,
          }
        );

      } catch (notifError) {
        console.error('❌ Failed to send cancellation notifications:', notifError);
      }

      toast.success('Appointment cancelled successfully');
      setIsCancelDialogOpen(false);
      setSelectedBooking(null);
      setCancellationReason('');
      setSelectedCancelReason('');
    } catch (error) {
      console.error('❌ Error cancelling booking:', error);
      toast.error('Failed to cancel appointment. Please try again.');
    }
  };

  const handlePaymentProof = (booking: Appointment) => {
    setSelectedBooking(booking);
    setIsPaymentDialogOpen(true);
  };

  const handleSubmitPaymentProof = async (appointmentId: string, proofUrl: string) => {
    // Find the appointment
    const appointment = appointments.find(apt => apt.id === appointmentId);
    if (!appointment) {
      toast.error('Appointment not found');
      return;
    }

    // Update appointment with payment proof and set status to pending
    const updatedAppointments = appointments.map(apt => {
      if (apt.id === appointmentId) {
        return {
          ...apt,
          paymentProof: proofUrl,
          paymentStatus: 'pending' as const,
          downPaymentPaid: true,
          remainingBalance: apt.price * 0.5,
        };
      }
      return apt;
    });

    onUpdateAppointments(updatedAppointments);





    // Send notification to admin about payment proof upload
    try {
      await logPaymentProofUpload(
        user.id,
        user.name,
        user.email,
        appointmentId,
        proofUrl,
        appointment.price * 0.5 // Down payment amount (50%)
      );

    } catch (error) {
      console.error('❌ Failed to send admin notification:', error);
      // Don't fail the whole operation if notification fails
    }
  };

  const handleRebook = (booking: Appointment) => {
    // Fast rebooking: Navigate to booking flow with pre-selected service
    if (onSetPreSelectedService && onNavigateToBooking) {
      onSetPreSelectedService(booking.service_id);
      onNavigateToBooking();
      toast.success(`Ready to rebook ${booking.service || booking.service_name}!`);
    } else {
      // Fallback: Open rebook dialog if callbacks not available
      setSelectedBooking(booking);
      setNewDate(new Date());
      setNewTime('');
      setIsRebookDialogOpen(true);
    }
  };

  const handleConfirmRebook = async () => {
    if (!selectedBooking || !newDate || !newTime) {
      toast.error('Please select both date and time');
      return;
    }

    // Check if selected date is Sunday
    if (newDate.getDay() === 0) {
      toast.error("Sorry, we're closed on Sundays!");
      return;
    }

    const formattedDate = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}-${String(newDate.getDate()).padStart(2, '0')}`;

    // Create a new appointment with the same service but new date/time
    // Use the same format as BookingFlow.tsx
    const newAppointmentData = {
      // DO NOT send id - let the database generate UUID
      customer_id: user.id,
      barber_id: selectedBooking.barber_id,
      service_id: selectedBooking.service_id,
      appointment_date: formattedDate,
      appointment_time: newTime,
      total_amount: selectedBooking.total_amount || selectedBooking.price || 0,
      down_payment: (selectedBooking.total_amount || selectedBooking.price || 0) * 0.5,
      remaining_amount: (selectedBooking.total_amount || selectedBooking.price || 0) * 0.5,
      status: 'pending',
      payment_status: 'pending',
      notes: '',
      // Legacy fields for backward compatibility (frontend display)
      userId: user.id,
      service: selectedBooking.service || selectedBooking.service_name,
      barber: selectedBooking.barber || selectedBooking.barber_name,
      date: formattedDate,
      time: newTime,
      price: selectedBooking.total_amount || selectedBooking.price || 0,
      canCancel: true,
      customerName: user.name,
      paymentStatus: 'pending',
      downPaymentPaid: false,
      remainingBalance: (selectedBooking.total_amount || selectedBooking.price || 0) * 0.5,
      rescheduledCount: 0,
    };

    // OPTIMISTIC UPDATE: Close dialog and show success immediately
    setIsRebookDialogOpen(false);
    setSelectedBooking(null);
    toast.success('Service rebooked successfully! Please complete payment to confirm.');

    // Create appointment in background
    try {

      const createdAppointment = await API.appointments.create(newAppointmentData);


      // Add the new appointment to state with the server-generated UUID
      const updatedAppointments = [...appointments, createdAppointment];
      onUpdateAppointments(updatedAppointments);
    } catch (error: any) {
      console.error('❌ Failed to rebook appointment:', error);
      toast.error(error?.message || 'Failed to rebook appointment. Please try again.');
    }
  };

  const handleOpenReviewDialog = (booking: Appointment) => {
    setSelectedBooking(booking);
    setIsReviewDialogOpen(true);
  };

  const handleSubmitReview = async () => {
    if (!selectedBooking || !reviewRating || !reviewComment) {
      toast.error('Please provide a rating and a comment');
      return;
    }

    setIsSubmittingReview(true);

    try {


      // Submit review directly to Supabase database using only fields that exist
      const reviewData: any = {
        customer_id: user.id,
        rating: reviewRating,
        comment: reviewComment,
        appointment_id: selectedBooking.id,
        show_on_landing: false, // Admin can enable later
      };

      // Include barber_id if available
      if (selectedBooking.barber_id) {
        reviewData.barber_id = selectedBooking.barber_id;
      }

      const result = await SupabaseReviewsService.create(reviewData);


      // Add appointment ID to reviewed set
      setReviewedAppointments(prev => new Set([...prev, selectedBooking.id]));

      toast.success('Thank you for your review! It has been submitted successfully.');
    } catch (error: any) {
      console.error('❌ Error submitting review to Supabase:', error);

      // Show user-friendly error with setup instructions
      if (error.message && error.message.includes('Row-Level Security')) {
        toast.error(
          'Database setup required. Please check the browser console for instructions, or contact the administrator.',
          { duration: 8000 }
        );
        setShowRlsError(true);
      } else {
        toast.error('Failed to submit review. Please try again.');
      }
    } finally {
      setIsSubmittingReview(false);
      setIsReviewDialogOpen(false);
      setSelectedBooking(null);
      setReviewRating(0);
      setReviewComment("");
    }
  };

  return (
    <div className="space-y-6">
      {/* Show RLS Setup Guide if database error occurred */}
      {showRlsError && (
        <div className="mb-6">
          <SupabaseSetupGuide />
        </div>
      )}

      {/* Upcoming Bookings */}
      <Card className="border-[#E8DCC8]">
        <CardHeader>
          <CardTitle className="text-[#5C4A3A]">Upcoming Appointments</CardTitle>
          <CardDescription className="text-[#87765E]">
            Your scheduled visits to Supremo Barber
          </CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingBookings.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-[#E8DCC8] mx-auto mb-4" />
              <p className="text-[#87765E] mb-4">No upcoming appointments</p>
              <Button
                className="bg-[#DB9D47] hover:bg-[#C88A35] text-white"
                onClick={onNavigateToBooking}
              >
                Book Now
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingBookings.map((booking) => {
                const statusConfig = getStatusConfig(booking.status);
                const isHighlighted = highlightedAppointmentId === booking.id;
                return (
                  <div
                    key={booking.id}
                    id={`appointment-${booking.id}`}
                    className={`p-5 rounded-lg transition-all duration-500 cursor-pointer ${isHighlighted
                      ? 'bg-gradient-to-br from-[#FFF3C4] via-[#FBF7EF] to-white border-3 border-[#DB9D47] shadow-xl ring-4 ring-[#DB9D47]/30 animate-pulse'
                      : 'bg-gradient-to-br from-[#FBF7EF] to-white border-2 border-[#E8DCC8] hover:shadow-lg hover:border-[#DB9D47]/50'
                      }`}
                    onClick={() => {
                      setViewBooking(booking);
                      setIsViewDetailsOpen(true);
                    }}
                  >
                    {/* Just Verified Badge */}
                    {isHighlighted && (
                      <div className="mb-3 flex items-center gap-2 bg-gradient-to-r from-[#DB9D47] to-[#D98555] text-white px-3 py-2 rounded-full text-sm font-semibold shadow-md">
                        <CheckCircle className="w-4 h-4" />
                        <span>✨ Payment Just Verified!</span>
                      </div>
                    )}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#DB9D47] to-[#D98555] flex items-center justify-center flex-shrink-0">
                          <Scissors className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg text-[#5C4A3A] mb-1">{booking.service}</h3>
                          <div className="flex flex-wrap gap-3 text-sm text-[#87765E]">
                            <span className="flex items-center gap-1">
                              <User className="w-4 h-4" />
                              {booking.barber}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {parseLocalDate(booking.date).toLocaleDateString('en-PH', {
                                timeZone: 'Asia/Manila',
                              })}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {booking.time}
                            </span>
                          </div>


                          {/* Payment Status Badge */}
                          {booking.paymentProof && booking.paymentStatus && (
                            <div className="mt-2">
                              <PaymentStatusBadge status={booking.paymentStatus} />
                            </div>
                          )}

                          {/* Rejection hint - compact */}
                          {(booking.status === 'rejected' || booking.paymentStatus === 'rejected') && (
                            <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              Payment rejected — tap to view details
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className={statusConfig.color}>
                        {statusConfig.label}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-[#E8DCC8]">
                      <p className="text-lg text-[#DB9D47]">₱{booking.price}</p>
                      <div className="flex gap-2 flex-wrap">
                        {/* Payment proof submission/resubmission logic */}
                        {(!booking.paymentProof || booking.paymentStatus === 'pending' || booking.paymentStatus === 'rejected') &&
                          booking.paymentStatus !== 'verified' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-[#94A670] text-[#94A670] hover:bg-[#94A670] hover:text-white"
                              onClick={(e) => { e.stopPropagation(); handlePaymentProof(booking); }}
                            >
                              <QrCode className="w-4 h-4 mr-1" />
                              Resubmit Payment
                            </Button>
                          )}
                        {/* Reschedule button - disabled if already rescheduled once */}
                        {(booking.rescheduledCount ?? 0) >= 1 ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-gray-300 text-gray-400 cursor-not-allowed opacity-60"
                            disabled
                            title="This appointment has already been rescheduled once"
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Rescheduled
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-[#DB9D47] text-[#DB9D47] hover:bg-[#DB9D47] hover:text-white"
                            onClick={(e) => { e.stopPropagation(); handleReschedule(booking); }}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Reschedule
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-[#E57373] text-[#E57373] hover:bg-[#E57373] hover:text-white"
                          onClick={(e) => { e.stopPropagation(); handleCancelBookingClick(booking); }}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Past Bookings */}
      <Card className="border-[#E8DCC8]">
        <CardHeader>
          <CardTitle className="text-[#5C4A3A]">Booking History</CardTitle>
          <CardDescription className="text-[#87765E]">
            Your past appointments and services
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {pastBookings.map((booking) => {
              const statusConfig = getStatusConfig(booking.status);
              const hasReviewed = reviewedAppointments.has(booking.id);
              const canReview = booking.status === "completed" && !hasReviewed;

              // Extract cancellation reason from cancellationReason field, cancellation_reason (DB), or notes field
              const cancelReason = booking.cancellationReason || booking.cancellation_reason ||
                (booking.notes && (booking.notes.startsWith('Customer cancelled: ') || booking.notes.startsWith('Admin cancelled: ') || booking.notes.startsWith('Barber cancelled: '))
                  ? booking.notes.replace('Customer cancelled: ', '').replace('Admin cancelled: ', '').replace('Barber cancelled: ', '')
                  : null);

              return (
                <div
                  key={booking.id}
                  className="p-4 rounded-lg bg-[#FBF7EF] border border-[#E8DCC8] cursor-pointer hover:shadow-md hover:border-[#DB9D47]/50 transition-all"
                  onClick={() => {
                    setViewBooking(booking);
                    setIsViewDetailsOpen(true);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#DB9D47]/50 to-[#D98555]/50 flex items-center justify-center flex-shrink-0">
                        <Scissors className="w-5 h-5 text-[#DB9D47]" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[#5C4A3A]">{booking.service}</p>
                        <p className="text-sm text-[#87765E]">
                          {parseLocalDate(booking.date).toLocaleDateString()} • {booking.time}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-[#87765E]">₱{booking.price}</p>
                      <Badge variant="outline" className={statusConfig.color}>
                        {statusConfig.label}
                      </Badge>
                      {canReview && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-yellow-500 text-yellow-600 hover:bg-yellow-500 hover:text-white"
                          onClick={(e) => { e.stopPropagation(); handleOpenReviewDialog(booking); }}
                        >
                          <Star className="w-4 h-4 mr-1" />
                          Review
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-[#DB9D47] text-[#DB9D47] hover:bg-[#DB9D47] hover:text-white"
                        onClick={(e) => { e.stopPropagation(); handleRebook(booking); }}
                      >
                        Rebook
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Reschedule Dialog */}
      <Dialog open={isRescheduleDialogOpen} onOpenChange={setIsRescheduleDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Reschedule Appointment</DialogTitle>
            <DialogDescription>
              Choose a new date and time for your appointment
            </DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4 py-4">
              <div className="p-4 rounded-lg bg-[#FBF7EF] border border-[#E8DCC8]">
                <p className="text-sm text-[#87765E] mb-1">Current Booking</p>
                <p className="text-[#5C4A3A]">{selectedBooking.service}</p>
                <p className="text-sm text-[#87765E]">
                  {parseLocalDate(selectedBooking.date).toLocaleDateString()} at {selectedBooking.time}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-[#5C4A3A] mb-2 block">Select New Date (Next 30 Days)</label>
                  <CalendarPicker
                    mode="single"
                    selected={newDate}
                    onSelect={setNewDate}
                    className="rounded-md border border-[#E8DCC8]"
                    disabled={(date) => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const maxDate = new Date();
                      maxDate.setDate(maxDate.getDate() + 30);
                      maxDate.setHours(23, 59, 59, 999);
                      // Disable Sundays (0 = Sunday) and dates outside range
                      return date.getDay() === 0 || date < today || date > maxDate;
                    }}
                  />
                  <p className="text-xs text-[#87765E] mt-2">
                    Available dates: Today - {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  <p className="text-xs text-red-600 mt-1">
                    ⚠️ We're closed on Sundays
                  </p>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-[#5C4A3A] mb-2 block">Select New Time</label>
                    <Select value={newTime} onValueChange={setNewTime}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select time" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="9:00 AM">9:00 AM</SelectItem>
                        <SelectItem value="9:30 AM">9:30 AM</SelectItem>
                        <SelectItem value="10:00 AM">10:00 AM</SelectItem>
                        <SelectItem value="10:30 AM">10:30 AM</SelectItem>
                        <SelectItem value="11:00 AM">11:00 AM</SelectItem>
                        <SelectItem value="11:30 AM">11:30 AM</SelectItem>
                        <SelectItem value="12:00 PM">12:00 PM</SelectItem>
                        <SelectItem value="12:30 PM">12:30 PM</SelectItem>
                        <SelectItem value="1:00 PM">1:00 PM</SelectItem>
                        <SelectItem value="1:30 PM">1:30 PM</SelectItem>
                        <SelectItem value="2:00 PM">2:00 PM</SelectItem>
                        <SelectItem value="2:30 PM">2:30 PM</SelectItem>
                        <SelectItem value="3:00 PM">3:00 PM</SelectItem>
                        <SelectItem value="3:30 PM">3:30 PM</SelectItem>
                        <SelectItem value="4:00 PM">4:00 PM</SelectItem>
                        <SelectItem value="4:30 PM">4:30 PM</SelectItem>
                        <SelectItem value="5:00 PM">5:00 PM</SelectItem>
                        <SelectItem value="5:30 PM">5:30 PM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-orange-700">
                        Rescheduling is free up to 24 hours before your appointment
                      </p>
                    </div>
                  </div>
                  {selectedBooking && !selectedBooking.rescheduledCount && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-red-700 font-medium">⚠️ Important Notice</p>
                          <p className="text-xs text-red-600 mt-1">
                            You can only reschedule this appointment ONCE. After rescheduling, you will not be able to change it again.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsRescheduleDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-[#DB9D47] hover:bg-[#C88A35] text-white"
              onClick={handleConfirmReschedule}
              disabled={!newDate || !newTime}
            >
              Confirm Reschedule
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={isCancelDialogOpen} onOpenChange={(open) => {
        setIsCancelDialogOpen(open);
        if (!open) {
          setCancellationReason('');
          setSelectedCancelReason('');
        }
      }}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#5C4A3A] flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              Cancel Appointment
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#87765E]">
              Please select or provide a reason for cancellation. This helps us improve our service.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            {/* Appointment Details */}
            {selectedBooking && (
              <div className="p-3 rounded-lg bg-[#FBF7EF] border border-[#E8DCC8]">
                <p className="text-xs text-[#87765E] mb-1">Appointment Details</p>
                <p className="text-sm text-[#5C4A3A] font-medium">{selectedBooking.service}</p>
                <p className="text-xs text-[#87765E]">
                  {parseLocalDate(selectedBooking.date).toLocaleDateString()} at {selectedBooking.time}
                </p>
                <p className="text-xs text-[#87765E]">with {selectedBooking.barber}</p>
              </div>
            )}

            {/* Cancellation Reason Dropdown */}
            <div className="space-y-2">
              <Label htmlFor="customer-cancel-reason" className="text-[#5C4A3A]">
                Cancellation Reason <span className="text-red-600">*</span>
              </Label>
              <Select
                value={selectedCancelReason}
                onValueChange={(value) => {
                  setSelectedCancelReason(value);
                  if (value !== 'other') {
                    setCancellationReason('');
                  }
                }}
              >
                <SelectTrigger id="customer-cancel-reason" className="border-[#E8DCC8]">
                  <SelectValue placeholder="Select a reason..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Schedule conflict">Schedule Conflict</SelectItem>
                  <SelectItem value="Change of mind">Change of Mind</SelectItem>
                  <SelectItem value="Financial reasons">Financial Reasons</SelectItem>
                  <SelectItem value="Found another barber">Found Another Barber</SelectItem>
                  <SelectItem value="Emergency">Personal Emergency</SelectItem>
                  <SelectItem value="Health reasons">Health Reasons</SelectItem>
                  <SelectItem value="Transportation issue">Transportation Issue</SelectItem>
                  <SelectItem value="Weather conditions">Weather Conditions</SelectItem>
                  <SelectItem value="other">Other (Please specify)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom Reason Input */}
            {selectedCancelReason === 'other' && (
              <div className="space-y-2">
                <Label htmlFor="customer-custom-reason" className="text-[#5C4A3A]">
                  Please specify your reason <span className="text-red-600">*</span>
                </Label>
                <Textarea
                  id="customer-custom-reason"
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  placeholder="Enter your reason for cancellation..."
                  className="border-[#E8DCC8] min-h-[80px] focus:border-[#DB9D47] focus:ring-[#DB9D47] resize-none overflow-y-auto break-words"
                  style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
                  maxLength={300}
                  rows={3}
                />
                <p className="text-xs text-[#87765E] text-right">{cancellationReason.length}/300</p>
              </div>
            )}

            {/* Info Note */}
            {selectedCancelReason && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex gap-2">
                <AlertCircle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-orange-800">
                  <p className="font-medium">Important:</p>
                  <p className="mt-1">
                    Down payments are non-refundable upon cancellation. Your cancellation reason will be recorded.
                  </p>
                </div>
              </div>
            )}
          </div>

          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel
              className="border-[#E8DCC8] hover:bg-[#FBF7EF]"
              onClick={() => { setCancellationReason(''); setSelectedCancelReason(''); }}
            >
              Go Back
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              disabled={!selectedCancelReason || (selectedCancelReason === 'other' && !cancellationReason.trim())}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Confirm Cancellation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Payment Proof Upload Dialog */}
      {selectedBooking && (
        <PaymentProofUpload
          appointment={selectedBooking}
          open={isPaymentDialogOpen}
          onOpenChange={setIsPaymentDialogOpen}
          onSubmitProof={handleSubmitPaymentProof}
        />
      )}

      {/* Rebook Dialog */}
      <Dialog open={isRebookDialogOpen} onOpenChange={setIsRebookDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Rebook Service</DialogTitle>
            <DialogDescription>
              Book the same service again with a new date and time
            </DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4 py-4">
              <div className="p-4 rounded-lg bg-gradient-to-br from-[#FBF7EF] to-[#FFF9F0] border-2 border-[#DB9D47]">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#DB9D47] to-[#D98555] flex items-center justify-center">
                    <Scissors className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-[#87765E]">Rebooking Service</p>
                    <p className="text-[#5C4A3A]">{selectedBooking.service}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-[#87765E]">
                    <User className="w-4 h-4" />
                    <span>Barber: {selectedBooking.barber}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#DB9D47]">
                    <FaPesoSign className="w-4 h-4" />
                    <span>₱{selectedBooking.price}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-[#5C4A3A] mb-2 block">Select Date (Next 30 Days)</label>
                  <CalendarPicker
                    mode="single"
                    selected={newDate}
                    onSelect={setNewDate}
                    className="rounded-md border border-[#E8DCC8]"
                    disabled={(date) => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const maxDate = new Date();
                      maxDate.setDate(maxDate.getDate() + 30);
                      maxDate.setHours(23, 59, 59, 999);
                      // Disable Sundays (0 = Sunday) and dates outside range
                      return date.getDay() === 0 || date < today || date > maxDate;
                    }}
                  />
                  <p className="text-xs text-[#87765E] mt-2">
                    Available dates: Today - {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  <p className="text-xs text-red-600 mt-1">
                    ⚠️ We're closed on Sundays
                  </p>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-[#5C4A3A] mb-2 block">Select Time</label>
                    <Select value={newTime} onValueChange={setNewTime}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select time" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="9:00 AM">9:00 AM</SelectItem>
                        <SelectItem value="9:30 AM">9:30 AM</SelectItem>
                        <SelectItem value="10:00 AM">10:00 AM</SelectItem>
                        <SelectItem value="10:30 AM">10:30 AM</SelectItem>
                        <SelectItem value="11:00 AM">11:00 AM</SelectItem>
                        <SelectItem value="11:30 AM">11:30 AM</SelectItem>
                        <SelectItem value="12:00 PM">12:00 PM</SelectItem>
                        <SelectItem value="12:30 PM">12:30 PM</SelectItem>
                        <SelectItem value="1:00 PM">1:00 PM</SelectItem>
                        <SelectItem value="1:30 PM">1:30 PM</SelectItem>
                        <SelectItem value="2:00 PM">2:00 PM</SelectItem>
                        <SelectItem value="2:30 PM">2:30 PM</SelectItem>
                        <SelectItem value="3:00 PM">3:00 PM</SelectItem>
                        <SelectItem value="3:30 PM">3:30 PM</SelectItem>
                        <SelectItem value="4:00 PM">4:00 PM</SelectItem>
                        <SelectItem value="4:30 PM">4:30 PM</SelectItem>
                        <SelectItem value="5:00 PM">5:00 PM</SelectItem>
                        <SelectItem value="5:30 PM">5:30 PM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-blue-700 font-medium">Rebook Benefits</p>
                        <p className="text-xs text-blue-600 mt-1">
                          • Same service and quality<br />
                          • Choose your preferred time<br />
                          • Earn loyalty points again
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-orange-700">
                        Payment required: ₱{selectedBooking.price * 0.5} down payment (50%)
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsRebookDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-[#DB9D47] hover:bg-[#C88A35] text-white"
              onClick={handleConfirmRebook}
              disabled={!newDate || !newTime}
            >
              Confirm Rebook
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Leave a Review</DialogTitle>
            <DialogDescription>
              Share your experience with us
            </DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4 py-4">
              <div className="p-4 rounded-lg bg-[#FBF7EF] border border-[#E8DCC8]">
                <p className="text-sm text-[#87765E] mb-1">Appointment Details</p>
                <p className="text-[#5C4A3A]">{selectedBooking.service}</p>
                <p className="text-sm text-[#87765E]">
                  {parseLocalDate(selectedBooking.date).toLocaleDateString()} at {selectedBooking.time}
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <Label className="text-sm text-[#5C4A3A] mb-2 block">Rating</Label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map(rating => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => setReviewRating(rating)}
                        className="focus:outline-none transition-all hover:scale-110"
                      >
                        <Star
                          className={`w-8 h-8 cursor-pointer ${rating <= reviewRating
                            ? 'fill-[#DB9D47] text-[#DB9D47]'
                            : 'text-gray-300'
                            }`}
                        />
                      </button>
                    ))}
                  </div>
                  {reviewRating > 0 && (
                    <p className="text-sm text-[#87765E] mt-2">
                      {reviewRating === 5 && '⭐ Excellent!'}
                      {reviewRating === 4 && '⭐ Very Good!'}
                      {reviewRating === 3 && '⭐ Good'}
                      {reviewRating === 2 && '⭐ Fair'}
                      {reviewRating === 1 && '⭐ Needs Improvement'}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-sm text-[#5C4A3A] mb-2 block">Comment</Label>
                  <Textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Tell us about your experience..."
                    className="w-full h-32 border-[#E8DCC8] focus:border-[#DB9D47] focus:ring-[#DB9D47]"
                  />
                  <p className="text-xs text-[#87765E] mt-1">
                    {reviewComment.length}/500 characters
                  </p>
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsReviewDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-[#DB9D47] hover:bg-[#C88A35] text-white"
              onClick={handleSubmitReview}
              disabled={isSubmittingReview || !reviewRating || !reviewComment}
            >
              {isSubmittingReview ? 'Submitting...' : 'Submit Review'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* View Booking Details Dialog */}
      <Dialog open={isViewDetailsOpen} onOpenChange={setIsViewDetailsOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#5C4A3A] flex items-center gap-2">
              <Eye className="w-5 h-5 text-[#DB9D47]" />
              Booking Details
            </DialogTitle>
            <DialogDescription className="text-[#87765E]">
              Full details for this booking
            </DialogDescription>
          </DialogHeader>
          {viewBooking && (() => {
            const viewStatusConfig = getStatusConfig(viewBooking.status);
            const viewCancelReason = viewBooking.cancellationReason || viewBooking.cancellation_reason ||
              (viewBooking.notes && (viewBooking.notes.startsWith('Customer cancelled: ') || viewBooking.notes.startsWith('Admin cancelled: ') || viewBooking.notes.startsWith('Barber cancelled: '))
                ? viewBooking.notes.replace('Customer cancelled: ', '').replace('Admin cancelled: ', '').replace('Barber cancelled: ', '')
                : null);
            return (
              <div className="space-y-4 py-2">
                {/* Status */}
                <div className="flex justify-between items-center">
                  <Badge variant="outline" className={`${viewStatusConfig.color} text-sm px-3 py-1`}>
                    {viewStatusConfig.label}
                  </Badge>
                  <span className="text-xs text-[#87765E]">ID: {viewBooking.id.slice(0, 8)}...</span>
                </div>

                {/* Service & Barber */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-[#FBF7EF] border border-[#E8DCC8]">
                    <div className="flex items-center gap-2 mb-1">
                      <Scissors className="w-3.5 h-3.5 text-[#DB9D47]" />
                      <span className="text-xs text-[#87765E]">Service</span>
                    </div>
                    <p className="text-sm text-[#5C4A3A] font-medium">{viewBooking.service}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-[#FBF7EF] border border-[#E8DCC8]">
                    <div className="flex items-center gap-2 mb-1">
                      <User className="w-3.5 h-3.5 text-[#DB9D47]" />
                      <span className="text-xs text-[#87765E]">Barber</span>
                    </div>
                    <p className="text-sm text-[#5C4A3A] font-medium">{viewBooking.barber}</p>
                  </div>
                </div>

                {/* Date & Time */}
                <div className="p-3 rounded-lg bg-[#FBF7EF] border border-[#E8DCC8]">
                  <div className="flex items-center gap-4 text-sm text-[#5C4A3A]">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#DB9D47]" />
                      {parseLocalDate(viewBooking.date).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#DB9D47]" />
                      {viewBooking.time}
                    </span>
                  </div>
                </div>

                {/* Payment Info */}
                <div className="p-3 rounded-lg bg-[#FBF7EF] border border-[#E8DCC8]">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="w-3.5 h-3.5 text-[#DB9D47]" />
                    <span className="text-xs text-[#87765E]">Payment</span>
                  </div>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#87765E]">Total Amount</span>
                      <span className="text-[#5C4A3A] font-medium">₱{viewBooking.price.toLocaleString()}</span>
                    </div>
                    {(viewBooking.down_payment || viewBooking.downPaymentPaid) && (
                      <div className="flex justify-between">
                        <span className="text-[#87765E]">Down Payment</span>
                        <span className="text-[#5C4A3A] font-medium">₱{(viewBooking.down_payment || viewBooking.price * 0.5).toLocaleString()}</span>
                      </div>
                    )}
                    {viewBooking.status === 'completed' ? (
                      <div className="flex justify-between items-center pt-1.5 border-t border-[#E8DCC8]">
                        <span className="text-[#87765E]">Status</span>
                        <Badge className="bg-green-500 text-white text-xs">Fully Paid</Badge>
                      </div>
                    ) : (
                      <>
                        {(viewBooking.remainingBalance > 0 || viewBooking.remaining_amount > 0) && (
                          <div className="flex justify-between">
                            <span className="text-[#87765E]">Remaining</span>
                            <span className="text-orange-600 font-medium">₱{Number(viewBooking.remainingBalance || viewBooking.remaining_amount || 0).toFixed(2)}</span>
                          </div>
                        )}
                        {(viewBooking.paymentStatus) && (
                          <div className="flex justify-between items-center pt-1.5 border-t border-[#E8DCC8]">
                            <span className="text-[#87765E]">Payment Status</span>
                            <Badge className={`text-xs text-white ${viewBooking.paymentStatus === 'verified' ? 'bg-green-500' :
                                viewBooking.paymentStatus === 'rejected' ? 'bg-red-500' : 'bg-orange-500'
                              }`}>
                              {viewBooking.paymentStatus}
                            </Badge>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Rejection Reason */}
                {(viewBooking.status === 'rejected' || viewBooking.paymentStatus === 'rejected') && (viewBooking.rejectionReason || (viewBooking.notes && viewBooking.notes.includes('Payment rejected'))) && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                      <span className="text-xs font-semibold text-red-700">Rejection Reason</span>
                    </div>
                    <p className="text-sm text-red-600">
                      {viewBooking.rejectionReason || viewBooking.notes?.replace('Payment rejected: ', '')}
                    </p>
                  </div>
                )}

                {/* Cancellation Reason */}
                {viewBooking.status === 'cancelled' && viewCancelReason && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                    <div className="flex items-center gap-2 mb-1">
                      <MessageSquare className="w-3.5 h-3.5 text-red-500" />
                      <span className="text-xs font-semibold text-red-700">Cancellation Reason</span>
                    </div>
                    <p className="text-sm text-red-600">{viewCancelReason}</p>
                    {(viewBooking.cancelledBy || viewBooking.cancelled_by || viewBooking.notes) && (
                      <p className="text-xs text-red-400 mt-1 italic">
                        Cancelled by: {viewBooking.cancelledBy || viewBooking.cancelled_by ||
                          (viewBooking.notes?.startsWith('Admin cancelled:') ? 'Admin' :
                            viewBooking.notes?.startsWith('Barber cancelled:') ? 'Barber' :
                              viewBooking.notes?.startsWith('Customer cancelled:') ? 'You' : 'Unknown')}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setIsViewDetailsOpen(false)} className="border-[#E8DCC8]">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}