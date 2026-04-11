import { useState, useEffect, useMemo } from "react";
import type { Appointment, User as UserType } from "../App";
import API from "../services/api.service";
import { SupabaseReviewsService } from "../services/supabase-reviews.service";
import { PaymentProofUpload, PaymentStatusBadge } from "./PaymentProofUpload";
import { SupabaseSetupGuide } from "./SupabaseSetupGuide";
import { logPaymentProofUpload } from "../services/audit-notification.service";
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
  DollarSign,
} from "lucide-react";
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
        console.log('📝 Customer reviews loaded:', customerReviews.length);
      } catch (error) {
        console.error('Error fetching customer reviews:', error);
      }
    };
    
    fetchReviews();
  }, [user.id]);

  // Debug: Log appointments data
  console.log('🔍 CustomerBookingManagement - All appointments:', appointments.length);
  console.log('🔍 User ID:', user.id);
  console.log('🔍 User Role:', user.role);

  // Filter appointments for current user
  const userAppointments = useMemo(() => {
    const filtered = appointments.filter(apt => {
      console.log('🔍 Checking appointment:', apt.id, 'customer_id:', apt.customer_id, 'userId:', apt.userId);
      return apt.userId === user.id || apt.customer_id === user.id;
    });
    console.log('🔍 Filtered user appointments:', filtered.length);
    return filtered;
  }, [appointments, user.id]);

  const upcomingBookings = useMemo(() => {
    const upcoming = userAppointments.filter((b) => b.status === "pending" || b.status === "confirmed" || b.status === "verified");
    console.log('📅 Upcoming bookings:', upcoming.length, upcoming.map(b => ({ id: b.id, status: b.status, service: b.service })));
    return upcoming;
  }, [userAppointments]);
  
  const pastBookings = useMemo(() => {
    const past = userAppointments.filter((b) => b.status === "completed" || b.status === "cancelled" || b.status === "rejected");
    console.log('📋 Past bookings:', past.length);
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
    if (booking.rescheduledCount && booking.rescheduledCount >= 1) {
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
    
    // OPTIMISTIC UPDATE: Update UI immediately
    const updatedAppointments = appointments.map(apt => {
      if (apt.id === selectedBooking.id) {
        return {
          ...apt,
          date: formattedDate,
          appointment_date: formattedDate,
          time: newTime,
          appointment_time: newTime,
          rescheduledCount: (apt.rescheduledCount || 0) + 1,
        };
      }
      return apt;
    });

    onUpdateAppointments(updatedAppointments);
    
    toast.success('Appointment rescheduled successfully! Saving to database...');
    setIsRescheduleDialogOpen(false);
    setSelectedBooking(null);

    // Save to database in background
    try {
      console.log('📅 Updating appointment in database:', {
        id: selectedBooking.id,
        date: formattedDate,
        time: newTime,
        rescheduledCount: (selectedBooking.rescheduledCount || 0) + 1,
      });
      
      await API.appointments.update(selectedBooking.id, {
        appointment_date: formattedDate,
        appointment_time: newTime,
        rescheduled_count: (selectedBooking.rescheduledCount || 0) + 1,
      });
      
      console.log('✅ Appointment updated in database successfully');
      toast.success('Rescheduling confirmed! (Note: This appointment can no longer be rescheduled)');
    } catch (error: any) {
      console.error('❌ Failed to update appointment in database:', error);
      toast.error('Failed to save rescheduling. Please try again or contact support.');
      
      // Revert optimistic update on error
      onUpdateAppointments(appointments);
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

  const handleConfirmCancel = () => {
    if (!selectedBooking) return;

    const updatedAppointments = appointments.map(apt => {
      if (apt.id === selectedBooking.id) {
        return {
          ...apt,
          status: 'cancelled' as const,
        };
      }
      return apt;
    });

    onUpdateAppointments(updatedAppointments);
    
    // Send email notification (placeholder)
    console.log('📧 Email sent to admin and customer about cancellation');
    
    toast.success('Appointment cancelled successfully');
    setIsCancelDialogOpen(false);
    setSelectedBooking(null);
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
    
    // In real app, this would save to server
    console.log('💳 Payment proof submitted for', appointmentId, proofUrl);
    
    toast.success('Payment proof submitted! Waiting for admin verification.');
    
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
      console.log('✅ Admin notification sent for payment proof upload');
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
      console.log('📅 Creating rebook appointment:', newAppointmentData);
      const createdAppointment = await API.appointments.create(newAppointmentData);
      console.log('✅ Rebook appointment created:', createdAppointment);
      
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
      console.log('📝 Submitting review directly to Supabase:', {
        appointment_id: selectedBooking.id,
        customer_id: user.id,
        barber_id: selectedBooking.barber_id,
        rating: reviewRating,
        comment: reviewComment,
      });

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
      console.log('✅ Review created successfully in Supabase:', result);

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
                    className={`p-5 rounded-lg transition-all duration-500 ${
                      isHighlighted
                        ? 'bg-gradient-to-br from-[#FFF3C4] via-[#FBF7EF] to-white border-3 border-[#DB9D47] shadow-xl ring-4 ring-[#DB9D47]/30 animate-pulse'
                        : 'bg-gradient-to-br from-[#FBF7EF] to-white border-2 border-[#E8DCC8] hover:shadow-lg'
                    }`}
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
                          
                          {/* Rejection Reason Display */}
                          {(booking.status === 'rejected' || booking.paymentStatus === 'rejected') && booking.rejectionReason && (
                            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                              <p className="text-xs font-semibold text-red-700 mb-1 flex items-center gap-1">
                                <XCircle className="w-3 h-3" />
                                Rejection Reason:
                              </p>
                              <p className="text-xs text-red-600">{booking.rejectionReason}</p>
                              <p className="text-xs text-red-500 mt-2 italic">
                                Please resubmit your payment proof to confirm your booking.
                              </p>
                            </div>
                          )}
                          
                          {/* Also check notes field for rejection reason */}
                          {(booking.status === 'rejected' || booking.paymentStatus === 'rejected') && !booking.rejectionReason && booking.notes && booking.notes.includes('Payment rejected') && (
                            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                              <p className="text-xs font-semibold text-red-700 mb-1 flex items-center gap-1">
                                <XCircle className="w-3 h-3" />
                                Rejection Reason:
                              </p>
                              <p className="text-xs text-red-600">{booking.notes.replace('Payment rejected: ', '')}</p>
                              <p className="text-xs text-red-500 mt-2 italic">
                                Please resubmit your payment proof to confirm your booking.
                              </p>
                            </div>
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
                        {/* Show button ONLY if: no payment proof, OR pending (allow resubmit), OR rejected (allow resubmit) */}
                        {/* Hide button when verified/paid */}
                        {(!booking.paymentProof || booking.paymentStatus === 'pending' || booking.paymentStatus === 'rejected') && 
                         booking.paymentStatus !== 'verified' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-[#94A670] text-[#94A670] hover:bg-[#94A670] hover:text-white"
                            onClick={() => handlePaymentProof(booking)}
                          >
                            <QrCode className="w-4 h-4 mr-1" />
                            Resubmit Payment
                          </Button>
                        )}
                        {/* Always show reschedule and cancel buttons regardless of payment status */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-[#DB9D47] text-[#DB9D47] hover:bg-[#DB9D47] hover:text-white"
                          onClick={() => handleReschedule(booking)}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Reschedule
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-[#E57373] text-[#E57373] hover:bg-[#E57373] hover:text-white"
                          onClick={() => handleCancelBookingClick(booking)}
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
              return (
                <div
                  key={booking.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-[#FBF7EF] border border-[#E8DCC8]"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#DB9D47]/50 to-[#D98555]/50 flex items-center justify-center">
                      <Scissors className="w-5 h-5 text-[#DB9D47]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[#5C4A3A]">{booking.service}</p>
                      <p className="text-sm text-[#87765E]">
                        {parseLocalDate(booking.date).toLocaleDateString()} • {booking.time}
                      </p>
                      
                      {/* Rejection Reason Display for Past Bookings */}
                      {(booking.status === 'rejected' || booking.paymentStatus === 'rejected') && booking.rejectionReason && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
                          <p className="font-semibold text-red-700 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Rejected:
                          </p>
                          <p className="text-red-600">{booking.rejectionReason}</p>
                        </div>
                      )}
                      
                      {/* Also check notes field for rejection reason */}
                      {(booking.status === 'rejected' || booking.paymentStatus === 'rejected') && !booking.rejectionReason && booking.notes && booking.notes.includes('Payment rejected') && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
                          <p className="font-semibold text-red-700 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Rejected:
                          </p>
                          <p className="text-red-600">{booking.notes.replace('Payment rejected: ', '')}</p>
                        </div>
                      )}
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
                        onClick={() => handleOpenReviewDialog(booking)}
                      >
                        <Star className="w-4 h-4 mr-1" />
                        Review
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="border-[#DB9D47] text-[#DB9D47] hover:bg-[#DB9D47] hover:text-white"
                      onClick={() => handleRebook(booking)}
                    >
                      Rebook
                    </Button>
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
      <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Appointment?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this appointment? This action cannot be undone, but the cancelled booking will remain in your history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {selectedBooking && (
            <div className="p-4 rounded-lg bg-[#FBF7EF] border border-[#E8DCC8] my-4">
              <p className="text-sm text-[#87765E] mb-1">Appointment Details</p>
              <p className="text-[#5C4A3A]">{selectedBooking.service}</p>
              <p className="text-sm text-[#87765E]">
                {parseLocalDate(selectedBooking.date).toLocaleDateString()} at {selectedBooking.time}
              </p>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Appointment</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmCancel}
              className="bg-[#E57373] hover:bg-[#D63F3F] text-white"
            >
              Yes, Cancel Appointment
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
                    <DollarSign className="w-4 h-4" />
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
                          className={`w-8 h-8 cursor-pointer ${
                            rating <= reviewRating 
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
    </div>
  );
}