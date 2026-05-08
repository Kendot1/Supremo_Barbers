import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Alert, AlertDescription } from "./ui/alert";
import { Calendar, Search, Edit, X, CheckCircle2, Clock, AlertCircle, Info, Download, Eye, User, Scissors, CreditCard, MessageSquare, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Plus, Loader2, UserCog, Check, ChevronsUpDown } from "lucide-react";

import { Tooltip, TooltipTrigger, TooltipContent } from "./ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "./ui/command";
import { toast } from "sonner";
import type { Appointment, User as UserType } from "../App";
import { exportToCSV, formatDateForExport, formatCurrencyForExport } from "./utils/exportUtils";
import { PasswordConfirmationDialog } from "./PasswordConfirmationDialog";
import API from "../services/api.service";
import { createNotification, logAppointmentCancelledByAdmin, logAppointmentStatusUpdate } from "../services/audit-notification.service";

// Utility function to parse date string without timezone issues
const parseLocalDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

// Available time slots for the appointment editor
const TIME_SLOTS = [
  "09:00 AM", "09:30 AM",
  "10:00 AM", "10:30 AM",
  "11:00 AM", "11:30 AM",
  "12:00 PM", "12:30 PM",
  "01:00 PM", "01:30 PM",
  "02:00 PM", "02:30 PM",
  "03:00 PM", "03:30 PM",
  "04:00 PM", "04:30 PM",
  "05:00 PM", "05:30 PM",
];

// Admin cancellation reason options
const ADMIN_CANCEL_REASONS = [
  'Customer no-show',
  'Barber unavailable',
  'Schedule conflict',
  'Payment issue',
  'Customer misbehavior',
  'Service unavailable',
  'Shop maintenance / closure',
  'Fraudulent booking',
  'other',
];

interface BookingReservationModuleProps {
  appointments: Appointment[];
  onUpdateAppointments: (appointments: Appointment[]) => void;
  onRefreshAppointments?: () => Promise<void>;
  adminUser?: UserType;
}

interface EditFormData {
  service: string;
  service_id: string;
  barber: string;
  barber_id: string;
  date: string;
  time: string;
  status: string;
  price: number;
}

export function BookingReservationModule({ appointments, onUpdateAppointments, onRefreshAppointments, adminUser }: BookingReservationModuleProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterBarber, setFilterBarber] = useState("all");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Appointment | null>(null);
  const [editFormData, setEditFormData] = useState<EditFormData>({
    service: "",
    service_id: "",
    barber: "",
    barber_id: "",
    date: "",
    time: "",
    status: "pending",
    price: 0,
  });
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [viewBooking, setViewBooking] = useState<Appointment | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus, filterBarber]);

  // Add Booking state
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [availableCustomers, setAvailableCustomers] = useState<any[]>([]);
  const [addFormData, setAddFormData] = useState({
    customer_id: "",
    service_id: "",
    barber_id: "",
    date: "",
    time: "",
  });
  const [isAddingBooking, setIsAddingBooking] = useState(false);

  // Popover open states for searchable combobox dropdowns
  const [customerPopoverOpen, setCustomerPopoverOpen] = useState(false);
  const [servicePopoverOpen, setServicePopoverOpen] = useState(false);
  const [barberPopoverOpen, setBarberPopoverOpen] = useState(false);

  // Data from API for dropdowns
  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [availableBarbers, setAvailableBarbers] = useState<any[]>([]);

  // Cancellation reason state
  const [isCancelReasonDialogOpen, setIsCancelReasonDialogOpen] = useState(false);
  const [cancelBookingId, setCancelBookingId] = useState<string | null>(null);
  const [selectedCancelReason, setSelectedCancelReason] = useState('');
  const [customCancelReason, setCustomCancelReason] = useState('');

  // Password confirmation state
  const [passwordAction, setPasswordAction] = useState<{
    type: 'save' | 'cancel';
    bookingId?: string;
    data?: EditFormData;
    cancelReason?: string;
  } | null>(null);

  // Fetch services, barbers, and customers from database on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [services, barbers, customers] = await Promise.all([
          API.services.getAll(),
          API.barbers.getAll(),
          API.users.getAll({ role: 'customer' }),
        ]);
        setAvailableServices(services || []);
        setAvailableBarbers(barbers || []);
        setAvailableCustomers((customers || []).filter((u: any) => u.role === 'customer'));
      } catch (error) {
        console.error('❌ Failed to load data:', error);
      }
    };
    fetchData();
  }, []);

  // Get unique barbers from appointments (fallback if API hasn't loaded)
  const barbers = Array.from(new Set(appointments.map(apt => apt.barber)));

  const filteredBookings = appointments.filter((booking) => {
    // Format date for better search experience
    const formattedDate = parseLocalDate(booking.date).toLocaleDateString();

    const matchesSearch =
      booking.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.userId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.barber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.date.includes(searchQuery) ||
      formattedDate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.time.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.price.toString().includes(searchQuery);

    const matchesStatus = filterStatus === "all" || booking.status === filterStatus;
    const matchesBarber = filterBarber === "all" || booking.barber === filterBarber;

    return matchesSearch && matchesStatus && matchesBarber;
  });

  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);
  const paginatedBookings = filteredBookings.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "pending":
        return {
          color: "bg-orange-100 text-orange-700 border-orange-200",
          icon: Clock,
        };
      case "confirmed":
        return {
          color: "bg-blue-100 text-blue-700 border-blue-200",
          icon: CheckCircle2,
        };
      case "upcoming":
        return {
          color: "bg-green-100 text-green-700 border-green-200",
          icon: CheckCircle2,
        };
      case "completed":
        return {
          color: "bg-green-100 text-green-700 border-green-200",
          icon: CheckCircle2,
        };
      case "cancelled":
        return {
          color: "bg-red-100 text-red-700 border-red-200",
          icon: AlertCircle,
        };
      case "rejected":
        return {
          color: "bg-red-100 text-red-700 border-red-200",
          icon: AlertCircle,
        };
      default:
        return {
          color: "bg-gray-100 text-gray-700 border-gray-200",
          icon: Clock,
        };
    }
  };

  const handleEditBooking = (booking: Appointment) => {
    setSelectedBooking(booking);
    setEditFormData({
      service: booking.service || booking.service_name || '',
      service_id: booking.service_id || '',
      barber: booking.barber || booking.barber_name || '',
      barber_id: booking.barber_id || '',
      date: booking.date || booking.appointment_date || '',
      time: booking.time || booking.appointment_time || '',
      status: booking.status,
      price: booking.price || booking.total_amount || 0,
    });
    setIsEditDialogOpen(true);
  };

  // When service changes, update the price automatically
  const handleServiceChange = (serviceId: string) => {
    const service = availableServices.find((s: any) => s.id === serviceId);
    if (service) {
      setEditFormData(prev => ({
        ...prev,
        service: service.name,
        service_id: service.id,
        price: service.price || prev.price,
      }));
    }
  };

  // When barber changes, update barber name/id
  const handleBarberChange = (barberId: string) => {
    const barber = availableBarbers.find((b: any) => b.id === barberId);
    if (barber) {
      setEditFormData(prev => ({
        ...prev,
        barber: barber.name,
        barber_id: barber.id,
      }));
    }
  };

  const handleSaveBooking = () => {
    if (!selectedBooking) return;

    // Trigger password confirmation
    setPasswordAction({
      type: 'save',
      data: editFormData
    });
  };

  const executeSaveBooking = async () => {
    if (!selectedBooking || !passwordAction?.data) return;

    const formData = passwordAction.data;

    try {
      // Build database-compatible update payload
      const dbUpdate: any = {
        status: formData.status,
        appointment_date: formData.date,
        appointment_time: formData.time,
      };

      // Only include service_id/barber_id if they changed and are valid UUIDs
      if (formData.service_id && formData.service_id !== selectedBooking.service_id) {
        dbUpdate.service_id = formData.service_id;
      }
      if (formData.barber_id && formData.barber_id !== selectedBooking.barber_id) {
        dbUpdate.barber_id = formData.barber_id;
      }
      if (formData.price !== selectedBooking.price) {
        dbUpdate.total_amount = formData.price;
      }

      let priceChangeMessage = "";
      if (formData.price !== selectedBooking.price) {
        // Down payment is fixed at 50% of the ORIGINAL price
        const downPaymentPaid = selectedBooking.price * 0.5;
        const newRemainingBalance = formData.price - downPaymentPaid;

        let noteMsg = "";
        if (newRemainingBalance < 0) {
          noteMsg = `Previous amount was ₱${selectedBooking.price}, new service is ₱${formData.price}. With your fixed down payment of ₱${downPaymentPaid}, there's an excess/refund of ₱${Math.abs(newRemainingBalance)}.`;
        } else {
          noteMsg = `Previous amount was ₱${selectedBooking.price}, new service is ₱${formData.price}. With your fixed down payment of ₱${downPaymentPaid}, your new remaining balance is: ₱${newRemainingBalance}.`;
        }

        priceChangeMessage = `Price adjustment: ${noteMsg}`;

        dbUpdate.notes = (selectedBooking as any).notes
          ? `${(selectedBooking as any).notes} | ${priceChangeMessage}`
          : priceChangeMessage;
      }

      // Persist to database FIRST
      await API.appointments.update(selectedBooking.id, dbUpdate);

      if (priceChangeMessage) {
        const customerId = selectedBooking.userId || (selectedBooking as any).customer_id || (selectedBooking as any).customerId;
        if (customerId) {
          createNotification({
            userId: customerId,
            userRole: 'customer',
            type: 'appointment_price_updated',
            title: 'Booking Price Updated',
            message: `Your booking for ${formData.service} was updated by the admin. ${priceChangeMessage.replace('Price adjustment: ', '')}`,
            relatedId: selectedBooking.id,
            relatedType: 'appointment',
            actionUrl: `/appointments`,
            actionLabel: 'View Booking',
          }).catch(console.error);
        }
      }

      // Notify customer if status or other details changed
      if (formData.status !== selectedBooking.status) {
        try {
          const customerId = selectedBooking.userId || (selectedBooking as any).customer_id || (selectedBooking as any).customerId;
          if (customerId) {
            await logAppointmentStatusUpdate(
              adminUser?.id || 'admin',
              'admin',
              adminUser?.name || 'Administrator',
              adminUser?.email || 'admin@admin.com',
              selectedBooking.id,
              selectedBooking.status,
              formData.status,
              {
                customerId: customerId,
                customerName: selectedBooking.customerName || 'Customer',
                barberId: selectedBooking.barber_id || formData.barber_id || 'unknown',
                service: formData.service,
                date: formData.date,
                time: formData.time
              }
            );
          }
        } catch (e) { console.error("Error logging status update:", e); }
      } else if (
        formData.date !== selectedBooking.date ||
        formData.time !== selectedBooking.time ||
        formData.barber !== selectedBooking.barber ||
        formData.service !== selectedBooking.service
      ) {
        try {
          const customerId = selectedBooking.userId || (selectedBooking as any).customer_id || (selectedBooking as any).customerId;
          if (customerId) {
            await createNotification({
              userId: customerId,
              userRole: 'customer',
              type: 'appointment_updated',
              title: 'Appointment Updated',
              message: `Your appointment details have been updated by the admin to ${formData.service} with ${formData.barber} on ${new Date(formData.date).toLocaleDateString()} at ${formData.time}.`,
              relatedId: selectedBooking.id,
              relatedType: 'appointment',
              actionUrl: `/appointments`,
              actionLabel: 'View Appointment'
            });
          }
        } catch (e) { console.error("Error sending update notif:", e); }
      }

      // Then update local state for immediate UI reflection
      const updatedAppointments = appointments.map(b =>
        b.id === selectedBooking.id
          ? {
            ...b,
            service: formData.service,
            service_id: formData.service_id || b.service_id,
            service_name: formData.service,
            barber: formData.barber,
            barber_id: formData.barber_id || b.barber_id,
            barber_name: formData.barber,
            date: formData.date,
            appointment_date: formData.date,
            time: formData.time,
            appointment_time: formData.time,
            status: formData.status,
            price: formData.price,
            total_amount: formData.price,
            notes: dbUpdate.notes || (b as any).notes,
          }
          : b
      );

      // Update state directly (bypass onUpdateAppointments to avoid double-update)
      onUpdateAppointments(updatedAppointments);

      toast.success("Booking updated successfully!");
      setIsEditDialogOpen(false);
      setSelectedBooking(null);
      setPasswordAction(null);
    } catch (error) {
      console.error('❌ Failed to update booking:', error);
      toast.error("Failed to update booking. Please try again.");
      setPasswordAction(null);
    }
  };

  const handleCancelBooking = (bookingId: string) => {
    // Find the booking to check its status
    const booking = appointments.find(b => b.id === bookingId);

    // Only allow cancelling upcoming bookings
    if (booking && booking.status !== 'upcoming' && booking.paymentStatus !== 'verified' && booking.status !== 'pending' && booking.status !== 'verified' && booking.status !== 'confirmed') {
      toast.error('This booking cannot be cancelled');
      return;
    }

    // Open cancellation reason dialog
    setCancelBookingId(bookingId);
    setSelectedCancelReason('');
    setCustomCancelReason('');
    setIsCancelReasonDialogOpen(true);
  };

  const handleConfirmCancelReason = () => {
    if (!cancelBookingId) return;

    if (!selectedCancelReason) {
      toast.error('Please select a reason for cancellation.');
      return;
    }

    if (selectedCancelReason === 'other' && !customCancelReason.trim()) {
      toast.error('Please provide your reason for cancellation.');
      return;
    }

    const finalReason = selectedCancelReason === 'other'
      ? customCancelReason.trim()
      : selectedCancelReason;

    // Close reason dialog, trigger password confirmation
    setIsCancelReasonDialogOpen(false);
    setPasswordAction({
      type: 'cancel',
      bookingId: cancelBookingId,
      cancelReason: finalReason,
    });
  };

  const executeCancelBooking = async () => {
    if (!passwordAction?.bookingId) return;

    const cancelReason = passwordAction.cancelReason || 'Cancelled by admin';
    const booking = appointments.find(b => b.id === passwordAction.bookingId);

    try {
      // Persist to database FIRST — set status to cancelled, payment to refunded, and save reason
      await API.appointments.update(passwordAction.bookingId, {
        status: 'cancelled',
        payment_status: 'refunded',
        cancellation_reason: cancelReason,
        cancelled_by: `Admin - ${adminUser?.name || 'Admin'}`,
        notes: `Admin cancelled: ${cancelReason}`,
      });


      // Send notifications to customer and barber (don't block UI)
      if (adminUser && booking) {
        logAppointmentCancelledByAdmin(
          adminUser.id,
          adminUser.name,
          adminUser.email,
          passwordAction.bookingId,
          {
            service: booking.service || booking.service_name || 'Unknown Service',
            customerId: booking.customer_id || booking.userId || '',
            customerName: booking.customerName || booking.customer_name || 'Customer',
            barberId: booking.barber_id || '',
            barberName: booking.barber || booking.barber_name || 'Barber',
            date: booking.date || booking.appointment_date || '',
            time: booking.time || booking.appointment_time || '',
            reason: cancelReason,
          }
        ).then(() => {

        }).catch((notifError) => {
          console.error('❌ Failed to send cancellation notifications:', notifError);
        });
      }

      toast.success('Booking cancelled successfully!');
      setPasswordAction(null);
      setCancelBookingId(null);

      // Refresh appointments from database to get the updated payment_status
      // This ensures the UI reflects the actual DB state (payment_status: refunded → paymentStatus: rejected)
      if (onRefreshAppointments) {
        await onRefreshAppointments();
      } else {
        // Fallback: update local state optimistically if no refresh callback
        const updatedAppointments = appointments.map(b =>
          b.id === passwordAction.bookingId
            ? {
              ...b,
              status: 'cancelled' as const,
              paymentStatus: 'rejected' as const,
              payment_status: 'refunded' as const,
              cancellationReason: cancelReason,
              cancellation_reason: cancelReason,
              cancelledBy: adminUser?.name || 'Admin',
              cancelledAt: new Date().toISOString(),
              notes: `Admin cancelled: ${cancelReason}`,
            }
            : b
        );
        onUpdateAppointments(updatedAppointments);
      }
    } catch (error) {
      console.error('❌ Failed to cancel booking:', error);
      toast.error('Failed to cancel booking. Please try again.');
      setPasswordAction(null);
    }
  };

  // ========== ADD BOOKING (Admin Auto-Verify) ==========

  // Helper to convert time string to minutes since midnight (handles AM/PM format)
  const timeToMinutes = (timeStr: string): number => {
    const [time, period] = timeStr.split(" ");
    const [hours, minutes] = time.split(":").map(Number);
    let totalHours = hours;
    if (period === "PM" && hours !== 12) totalHours += 12;
    else if (period === "AM" && hours === 12) totalHours = 0;
    return totalHours * 60 + minutes;
  };

  // Check if a time slot is taken for a given barber & date
  const isAddTimeSlotTaken = (time: string): boolean => {
    if (!addFormData.barber_id || !addFormData.date || !addFormData.service_id) return false;

    const selectedBarber = availableBarbers.find((b: any) => b.id === addFormData.barber_id);
    const selectedService = availableServices.find((s: any) => s.id === addFormData.service_id);
    if (!selectedBarber || !selectedService) return false;

    const dateString = addFormData.date;
    const newBookingStart = timeToMinutes(time);
    const newBookingEnd = newBookingStart + (selectedService.duration || 30);

    return appointments.some((apt) => {
      const isActiveAppointment = apt.status === 'pending' || apt.status === 'confirmed' || apt.status === 'upcoming' || apt.status === 'verified';
      const aptBarber = apt.barber || apt.barber_name || '';
      const aptDate = apt.date || apt.appointment_date || '';
      if (aptBarber !== selectedBarber.name || aptDate !== dateString || !isActiveAppointment) return false;

      const existingStart = timeToMinutes(apt.time || apt.appointment_time || '');
      const existingService = availableServices.find((s: any) => s.name === (apt.service || apt.service_name));
      const existingEnd = existingStart + (existingService?.duration || 30);

      return newBookingStart < existingEnd && newBookingEnd > existingStart;
    });
  };

  const handleAddBooking = async () => {
    if (!addFormData.customer_id || !addFormData.service_id || !addFormData.barber_id || !addFormData.date || !addFormData.time) {
      toast.error("Please complete all fields");
      return;
    }

    // Sunday check
    const dateObj = new Date(addFormData.date + 'T00:00:00');
    if (dateObj.getDay() === 0) {
      toast.error("Sorry, we're closed on Sundays!");
      return;
    }

    setIsAddingBooking(true);
    try {
      const selectedService = availableServices.find((s: any) => s.id === addFormData.service_id);
      const selectedBarber = availableBarbers.find((b: any) => b.id === addFormData.barber_id);
      const selectedCustomer = availableCustomers.find((c: any) => c.id === addFormData.customer_id);

      if (!selectedService || !selectedBarber || !selectedCustomer) {
        toast.error("Invalid selection. Please try again.");
        setIsAddingBooking(false);
        return;
      }

      const formattedDate = addFormData.date;
      const downPayment = selectedService.price * 0.5;
      const remainingAmount = selectedService.price * 0.5;

      // Create appointment with auto-verified status (admin creation)
      const newAppointment: any = {
        customer_id: selectedCustomer.id,
        barber_id: selectedBarber.id,
        service_id: selectedService.id,
        appointment_date: formattedDate,
        appointment_time: addFormData.time,
        total_amount: selectedService.price,
        down_payment: downPayment,
        remaining_amount: remainingAmount,
        status: "verified",
        payment_status: "paid",
        notes: "Booked by Admin",
        // Legacy fields for backward compatibility
        userId: selectedCustomer.id,
        service: selectedService.name,
        barber: selectedBarber.name,
        date: formattedDate,
        time: addFormData.time,
        price: selectedService.price,
        canCancel: true,
        customerName: selectedCustomer.name,
        paymentProof: "https://pub-86f4b5249e5c4021bb05d46908eeb094.r2.dev/supremo-barber/supremoWebLogo.png",
        paymentStatus: "verified",
        downPaymentPaid: true,
        remainingBalance: remainingAmount,
        rescheduledCount: 0,
        barberId: selectedBarber.id,
        serviceId: selectedService.id,
      };

      // Create appointment via API
      const createdAppointment = await API.appointments.create(newAppointment);

      // Create auto-verified payment record
      const paymentData = {
        appointment_id: createdAppointment?.id,
        customer_id: selectedCustomer.id,
        amount: downPayment,
        payment_type: "down_payment",
        payment_method: "cash",
        payment_proof_url: "https://pub-86f4b5249e5c4021bb05d46908eeb094.r2.dev/supremo-barber/supremoWebLogo.png",
        status: "verified",
        notes: "Payment verified by Admin",
      };

      try {
        await API.payments.create(paymentData);
      } catch (payErr) {
        console.error('⚠️ Payment record creation failed (booking was still created):', payErr);
      }

      // Send notification to customer
      try {
        await createNotification({
          userId: selectedCustomer.id,
          userRole: 'customer',
          type: 'appointment_created',
          title: 'Booking Confirmed',
          message: `Your appointment for ${selectedService.name} with ${selectedBarber.name} on ${new Date(formattedDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} at ${addFormData.time} has been booked and verified by the admin.`,
          relatedId: createdAppointment?.id,
          relatedType: 'appointment',
          actionUrl: '/appointments',
          actionLabel: 'View Booking',
        });
      } catch (notifErr) {
        console.error('⚠️ Notification failed:', notifErr);
      }

      toast.success("Booking created and auto-verified!");
      setIsAddDialogOpen(false);
      setAddFormData({ customer_id: "", service_id: "", barber_id: "", date: "", time: "" });

      // Refresh appointments to reflect the new booking
      if (onRefreshAppointments) {
        await onRefreshAppointments();
      }
    } catch (error) {
      console.error('❌ Failed to create booking:', error);
      toast.error(`Failed to create booking: ${(error as any).message || 'Please try again'}`);
    } finally {
      setIsAddingBooking(false);
    }
  };

  const handleExportBookings = () => {
    if (filteredBookings.length === 0) {
      toast.error("No bookings to export");
      return;
    }

    const exportData = filteredBookings.map(booking => ({
      'Booking ID': booking.id,
      'Customer ID': booking.userId,
      'Barber': booking.barber,
      'Service': booking.service,
      'Date': formatDateForExport(booking.date),
      'Time': booking.time,
      'Price': formatCurrencyForExport(booking.price),
      'Status': booking.status.charAt(0).toUpperCase() + booking.status.slice(1),
      'Payment Status': booking.paymentStatus || 'N/A',
      'Created At': booking.createdAt ? formatDateForExport(booking.createdAt) : 'N/A',
    }));

    const headers = ['Booking ID', 'Customer ID', 'Barber', 'Service', 'Date', 'Time', 'Price', 'Status', 'Payment Status', 'Created At'];

    exportToCSV(exportData, headers, 'supremo-barber-bookings');
    toast.success(`Exported ${filteredBookings.length} bookings successfully!`);
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card className="border-[#E8DCC8]">
          <CardContent className="pt-4 md:pt-6 p-3 md:p-6">
            <div className="flex items-center justify-between mb-1 md:mb-2">
              <Calendar className="w-4 h-4 md:w-5 md:h-5 text-[#DB9D47]" />
            </div>
            <div className="text-lg md:text-2xl text-[#5C4A3A] mb-0.5 md:mb-1">
              {appointments.filter((b) => b.status === "verified" && b.payment_status === "paid" || b.status === "pending" && b.payment_status === "pending").length}
            </div>
            <p className="text-xs md:text-sm text-[#87765E]">Upcoming</p>
          </CardContent>
        </Card>

        <Card className="border-[#E8DCC8]">
          <CardContent className="pt-4 md:pt-6 p-3 md:p-6">
            <div className="flex items-center justify-between mb-1 md:mb-2">
              <Clock className="w-4 h-4 md:w-5 md:h-5 text-[#F59E0B]" />
            </div>
            <div className="text-lg md:text-2xl text-[#5C4A3A] mb-0.5 md:mb-1">
              {appointments.length}
            </div>
            <p className="text-xs md:text-sm text-[#87765E]">Total</p>
          </CardContent>
        </Card>

        <Card className="border-[#E8DCC8]">
          <CardContent className="pt-4 md:pt-6 p-3 md:p-6">
            <div className="flex items-center justify-between mb-1 md:mb-2">
              <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 text-[#94A670]" />
            </div>
            <div className="text-lg md:text-2xl text-[#5C4A3A] mb-0.5 md:mb-1">
              {appointments.filter((b) => b.status === "completed").length}
            </div>
            <p className="text-xs md:text-sm text-[#87765E]">Completed</p>
          </CardContent>
        </Card>

        <Card className="border-[#E8DCC8]">
          <CardContent className="pt-4 md:pt-6 p-3 md:p-6">
            <div className="flex items-center justify-between mb-1 md:mb-2">
              <AlertCircle className="w-4 h-4 md:w-5 md:h-5 text-[#E57373]" />
            </div>
            <div className="text-lg md:text-2xl text-[#5C4A3A] mb-0.5 md:mb-1">
              {appointments.filter((b) => b.status === "cancelled").length}
            </div>
            <p className="text-xs md:text-sm text-[#87765E]">Cancelled</p>
          </CardContent>
        </Card>
      </div>

      {/* Bookings Table */}
      <Card className="border-[#E8DCC8]">
        <CardHeader>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-[#5C4A3A] text-base md:text-lg">Booking Management</CardTitle>
              <CardDescription className="text-[#87765E] text-xs md:text-sm">
                Manage reservations, update schedules, and handle cancellations
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => {
                  setAddFormData({ customer_id: "", service_id: "", barber_id: "", date: "", time: "" });
                  setIsAddDialogOpen(true);
                }}
                className="bg-[#DB9D47] hover:bg-[#C48D3D] text-white text-xs md:text-sm px-3 md:px-4"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                <span>Add Booking</span>
              </Button>
              <Button
                onClick={handleExportBookings}
                variant="outline"
                className="border-[#DB9D47] text-[#DB9D47] hover:bg-[#DB9D47] hover:text-white text-xs md:text-sm px-3 md:px-4"
              >
                <Download className="w-4 h-4 mr-1.5" />
                <span>Export Report</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-3 md:gap-4 mb-4 md:mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#87765E]" />
              <Input
                placeholder="Select bookings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-[#E8DCC8] text-sm"
              />
            </div>
            <div className="flex gap-2 md:gap-3">
              <Select value={filterBarber} onValueChange={setFilterBarber}>
                <SelectTrigger className="w-full md:w-48 border-[#E8DCC8]">
                  <SelectValue placeholder="Filter by barber" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Barbers</SelectItem>
                  {barbers.map(barber => (
                    <SelectItem key={barber} value={barber}>{barber}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full md:w-48 border-[#E8DCC8]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="rounded-md border border-[#E8DCC8] overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#FBF7EF]">
                  <TableHead className="text-[#5C4A3A]">ID</TableHead>
                  <TableHead className="text-[#5C4A3A] hidden lg:table-cell">Customer</TableHead>
                  <TableHead className="text-[#5C4A3A] hidden md:table-cell">Barber</TableHead>
                  <TableHead className="text-[#5C4A3A]">Date</TableHead>
                  <TableHead className="text-[#5C4A3A] hidden sm:table-cell">Time</TableHead>
                  <TableHead className="text-[#5C4A3A] hidden xl:table-cell">Service</TableHead>
                  <TableHead className="text-[#5C4A3A] text-right hidden md:table-cell">Amount</TableHead>
                  <TableHead className="text-[#5C4A3A]">Status</TableHead>
                  <TableHead className="text-[#5C4A3A] text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedBookings.map((booking) => {
                  const statusConfig = getStatusConfig(booking.status);
                  const StatusIcon = statusConfig.icon;
                  return (
                    <TableRow key={booking.id} className="hover:bg-[#FBF7EF]">
                      <TableCell className="text-[#5C4A3A] text-[10px] md:text-xs max-w-[60px] md:max-w-none truncate">{booking.id}</TableCell>
                      <TableCell className="text-[#5C4A3A] text-xs hidden lg:table-cell">{booking.customerName || booking.userId}</TableCell>
                      <TableCell className="text-[#87765E] text-xs hidden md:table-cell">{booking.barber}</TableCell>
                      <TableCell className="text-[#87765E] text-[10px] md:text-sm whitespace-nowrap">
                        {parseLocalDate(booking.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </TableCell>
                      <TableCell className="text-[#87765E] text-xs hidden sm:table-cell">{booking.time}</TableCell>
                      <TableCell className="text-[#87765E] text-xs hidden xl:table-cell">{booking.service}</TableCell>
                      <TableCell className="text-right text-[#5C4A3A] text-xs hidden md:table-cell">₱{booking.price}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${statusConfig.color} text-xs whitespace-nowrap`}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          <span className="hidden sm:inline">{booking.status}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-[#5C4A3A] hover:text-[#DB9D47] hover:bg-[#FBF7EF] h-8 w-8 sm:w-auto p-0 sm:px-2"
                                onClick={() => {
                                  setViewBooking(booking);
                                  setIsViewDialogOpen(true);
                                }}
                              >
                                <Eye className="w-4 h-4 sm:mr-1" />
                                <span className="hidden sm:inline text-xs">View</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>View booking details</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-[#DB9D47] hover:text-[#C88A35] hover:bg-[#FBF7EF] disabled:opacity-30 disabled:cursor-not-allowed h-8 w-8 sm:w-auto p-0 sm:px-2"
                                onClick={() => handleEditBooking(booking)}
                                disabled={booking.status === "cancelled" || booking.status === "rejected" || booking.status === "completed"}
                              >
                                <Edit className="w-4 h-4 sm:mr-1" />
                                <span className="hidden sm:inline text-xs">Edit</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{booking.status === "cancelled" || booking.status === "rejected" ? "Cancelled/rejected bookings cannot be edited" : "Edit booking details"}</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-[#E57373] hover:text-[#D32F2F] hover:bg-[#FBF7EF] disabled:opacity-30 disabled:cursor-not-allowed h-8 w-8 sm:w-auto p-0 sm:px-2"
                                onClick={() => handleCancelBooking(booking.id)}
                                disabled={booking.status === "cancelled" || booking.status === "rejected" || booking.status === "completed"}
                              >
                                <X className="w-4 h-4 sm:mr-1" />
                                <span className="hidden sm:inline text-xs">Cancel</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{booking.status === "cancelled" || booking.status === "rejected" || booking.status === "completed" ? "This booking cannot be cancelled" : "Cancel this booking"}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {filteredBookings.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between mt-4 md:mt-6 gap-4 py-2 border-t border-[#E8DCC8] pt-4">
              <div className="flex items-center gap-2">
                <span className="text-xs md:text-sm text-[#87765E]">Rows per page:</span>
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={(val) => {
                    setItemsPerPage(Number(val));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-[60px] h-8 border-none bg-transparent shadow-none focus:ring-0 text-[#5C4A3A] px-1">
                    <SelectValue placeholder={itemsPerPage.toString()} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-4 sm:ml-auto">
                <div className="text-xs md:text-sm text-[#87765E] whitespace-nowrap">
                  {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredBookings.length)} of {filteredBookings.length}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="w-8 h-8 rounded-md border-[#E8DCC8] text-[#87765E] hover:bg-[#FBF7EF] hover:text-[#5C4A3A] disabled:opacity-50"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="w-8 h-8 rounded-md border-[#E8DCC8] text-[#87765E] hover:bg-[#FBF7EF] hover:text-[#5C4A3A] disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 rounded-md p-0 hidden sm:inline-flex ${currentPage === page
                        ? "bg-[#DB9D47] text-white hover:bg-[#DB9D47] border-none"
                        : "border-[#E8DCC8] text-[#87765E] hover:bg-[#FBF7EF] hover:text-[#5C4A3A]"
                        }`}
                    >
                      {page}
                    </Button>
                  ))}

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="w-8 h-8 rounded-md border-[#E8DCC8] text-[#87765E] hover:bg-[#FBF7EF] hover:text-[#5C4A3A] disabled:opacity-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="w-8 h-8 rounded-md border-[#E8DCC8] text-[#87765E] hover:bg-[#FBF7EF] hover:text-[#5C4A3A] disabled:opacity-50"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Booking Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="text-[#5C4A3A] flex items-center gap-2">
              <Edit className="w-5 h-5 text-[#DB9D47]" />
              Edit Booking
            </DialogTitle>
            <DialogDescription className="text-[#87765E]">
              Update service, barber, schedule, or status
            </DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="grid gap-4 py-4">
              {/* Read-only Info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-[#FBF7EF] border border-[#E8DCC8]">
                  <p className="text-xs text-[#87765E] mb-0.5">Booking ID</p>
                  <p className="text-sm text-[#5C4A3A] font-medium truncate">{selectedBooking.id.slice(0, 12)}...</p>
                </div>
                <div className="p-3 rounded-lg bg-[#FBF7EF] border border-[#E8DCC8]">
                  <p className="text-xs text-[#87765E] mb-0.5">Customer</p>
                  <p className="text-sm text-[#5C4A3A] font-medium truncate">{selectedBooking.customerName || selectedBooking.userId}</p>
                </div>
              </div>

              {/* Service Dropdown - already booked services are disabled */}
              <div className="grid gap-2">
                <Label htmlFor="edit-service" className="text-[#5C4A3A] font-medium">Service</Label>
                {(() => {
                  // Find which services this customer already has active bookings for (exclude current booking)
                  const activeStatuses = ['pending', 'confirmed', 'verified', 'upcoming'];
                  const customerId = selectedBooking.userId || selectedBooking.customer_id || selectedBooking.customerId;

                  const customerActiveBookings = appointments.filter(apt => {
                    const aptCustomerId = apt.userId || apt.customer_id || apt.customerId;
                    const isSameCustomer = aptCustomerId === customerId;
                    const isNotCurrentBooking = apt.id !== selectedBooking.id;
                    const isActive = activeStatuses.includes(apt.status);
                    return isSameCustomer && isNotCurrentBooking && isActive;
                  });

                  // Collect both service IDs and service names that are already booked
                  const bookedServiceIds = new Set(customerActiveBookings.map(apt => apt.service_id || apt.serviceId || '').filter(Boolean));
                  const bookedServiceNames = new Set(customerActiveBookings.map(apt => (apt.service || apt.service_name || '').toLowerCase()).filter(Boolean));

                  return (
                    <Select
                      value={editFormData.service_id}
                      onValueChange={handleServiceChange}
                    >
                      <SelectTrigger id="edit-service" className="border-[#E8DCC8]">
                        <SelectValue placeholder="Select service">
                          {editFormData.service || "Select service"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {availableServices.length > 0 ? (
                          availableServices.map((service: any) => {
                            // Check by both ID and name for reliable matching
                            const isBooked = bookedServiceIds.has(service.id) || bookedServiceNames.has((service.name || '').toLowerCase());
                            return (
                              <SelectItem
                                key={service.id}
                                value={service.id}
                                disabled={isBooked}
                                className={isBooked ? 'opacity-50' : ''}
                              >
                                <div className="flex items-center justify-between w-full gap-4">
                                  <span>{service.name}{isBooked ? ' (Booked)' : ''}</span>
                                  <span className="text-xs text-[#87765E]">₱{service.price}</span>
                                </div>
                              </SelectItem>
                            );
                          })
                        ) : (
                          <SelectItem value={editFormData.service_id || 'current'} disabled>
                            {editFormData.service || 'No services loaded'}
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  );
                })()}
              </div>

              {/* Barber Dropdown */}
              <div className="grid gap-2">
                <Label htmlFor="edit-barber" className="text-[#5C4A3A] font-medium">Assign Barber</Label>
                <Select
                  value={editFormData.barber_id}
                  onValueChange={handleBarberChange}
                >
                  <SelectTrigger id="edit-barber" className="border-[#E8DCC8]">
                    <SelectValue placeholder="Select barber">
                      {editFormData.barber || "Select barber"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {availableBarbers.length > 0 ? (
                      availableBarbers.map((barber: any) => (
                        <SelectItem key={barber.id} value={barber.id}>
                          {barber.name}
                        </SelectItem>
                      ))
                    ) : (
                      // Fallback to barbers from appointments
                      barbers.map(barberName => (
                        <SelectItem key={barberName} value={barberName}>
                          {barberName}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-date" className="text-[#5C4A3A] font-medium">Date</Label>
                  <Input
                    id="edit-date"
                    type="date"
                    value={editFormData.date}
                    onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                    className="border-[#E8DCC8]"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-time" className="text-[#5C4A3A] font-medium">Time</Label>
                  <Select
                    value={editFormData.time}
                    onValueChange={(value) => setEditFormData({ ...editFormData, time: value })}
                  >
                    <SelectTrigger id="edit-time" className="border-[#E8DCC8]">
                      <SelectValue placeholder="Select time">
                        {editFormData.time || "Select time"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_SLOTS.map(slot => (
                        <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Status */}
              <div className="grid gap-2">
                <Label htmlFor="edit-status" className="text-[#5C4A3A] font-medium">Status</Label>
                <Select
                  value={editFormData.status}
                  onValueChange={(value) => setEditFormData({ ...editFormData, status: value })}
                >
                  <SelectTrigger id="edit-status" className="border-[#E8DCC8]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Price (read-only, auto-updated by service) - Shows fixed down payment logic */}
              <div className="p-3 rounded-lg bg-[#FBF7EF] border border-[#E8DCC8] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#87765E]">Original Amount</span>
                  <span className="text-sm font-medium text-[#5C4A3A]">₱{selectedBooking.price.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#87765E]">Fixed Down Payment (Paid)</span>
                  <span className="text-sm font-medium text-green-600">₱{(selectedBooking.price * 0.5).toLocaleString()}</span>
                </div>
                {editFormData.price !== selectedBooking.price && (
                  <>
                    <div className="border-t border-[#E8DCC8] pt-2 flex items-center justify-between">
                      <span className="text-sm text-[#5C4A3A] font-semibold">New Total Amount</span>
                      <span className="text-lg font-bold text-[#DB9D47]">₱{editFormData.price.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-[#D98555]">
                        {editFormData.price - (selectedBooking.price * 0.5) < 0 ? 'Excess / Refund Amount' : 'New Remaining Balance'}
                      </span>
                      <span className="text-lg font-bold text-[#D98555]">
                        ₱{Math.abs(editFormData.price - (selectedBooking.price * 0.5)).toLocaleString()}
                      </span>
                    </div>
                  </>
                )}
                {editFormData.price === selectedBooking.price && (
                  <div className="border-t border-[#E8DCC8] pt-2 flex items-center justify-between">
                    <span className="text-sm font-bold text-[#D98555]">Remaining Balance</span>
                    <span className="text-lg font-bold text-[#D98555]">₱{(selectedBooking.price * 0.5).toLocaleString()}</span>
                  </div>
                )}
              </div>

            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="border-[#E8DCC8]">
              Cancel
            </Button>
            <Button
              className="bg-[#DB9D47] hover:bg-[#C88A35] text-white"
              onClick={handleSaveBooking}
            >
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Password Confirmation Dialog */}
      <PasswordConfirmationDialog
        isOpen={!!passwordAction}
        onClose={() => setPasswordAction(null)}
        onConfirm={() => {
          if (passwordAction?.type === 'save') {
            executeSaveBooking();
          } else if (passwordAction?.type === 'cancel') {
            executeCancelBooking();
          }
        }}
        actionType={passwordAction?.type === 'save' ? 'update' : 'delete'}
        itemName={passwordAction?.type === 'save' ? 'booking' : 'booking'}
      />

      {/* Admin Cancellation Reason Dialog */}
      <Dialog open={isCancelReasonDialogOpen} onOpenChange={setIsCancelReasonDialogOpen}>
        <DialogContent className="sm:max-w-[480px] max-h-[85vh] overflow-y-auto bg-gradient-to-br from-[#FFFDF8] to-[#FFF8E8]">
          <DialogHeader>
            <DialogTitle className="text-[#5C4A3A] flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              Cancel Booking
            </DialogTitle>
            <DialogDescription className="text-[#87765E]">
              Please select a reason for cancelling this booking. The customer will be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Reason Selection */}
            <div className="grid grid-cols-2 gap-2">
              {ADMIN_CANCEL_REASONS.map((reason) => (
                <button
                  key={reason}
                  onClick={() => setSelectedCancelReason(reason)}
                  className={`p-3 rounded-lg border-2 text-left text-sm transition-all ${selectedCancelReason === reason
                    ? 'border-[#DB9D47] bg-[#DB9D47]/10 text-[#5C4A3A] font-medium'
                    : 'border-[#E8DCC8] bg-white text-[#87765E] hover:border-[#D4C5B0] hover:bg-[#FBF7EF]'
                    } ${reason === 'other' ? 'col-span-2' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${selectedCancelReason === reason
                      ? 'border-[#DB9D47] bg-[#DB9D47]'
                      : 'border-[#D4C5B0]'
                      }`}>
                      {selectedCancelReason === reason && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                    <span className="break-words">{reason === 'other' ? 'Other (specify below)' : reason}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Custom reason textarea */}
            {selectedCancelReason === 'other' && (
              <div className="space-y-2">
                <Label className="text-[#5C4A3A] font-medium">Specify reason</Label>
                <Textarea
                  value={customCancelReason}
                  onChange={(e) => setCustomCancelReason(e.target.value)}
                  placeholder="Enter your reason for cancellation..."
                  className="border-[#E8DCC8] min-h-[80px] resize-none"
                  maxLength={500}
                />
              </div>
            )}

            {/* Warning notice */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-800">
                <strong>Note:</strong> Cancelling this booking will set the payment status to rejected and notify the customer.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsCancelReasonDialogOpen(false);
                setCancelBookingId(null);
              }}
              className="border-[#E8DCC8]"
            >
              Go Back
            </Button>
            <Button
              onClick={handleConfirmCancelReason}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={!selectedCancelReason || (selectedCancelReason === 'other' && !customCancelReason.trim())}
            >
              Confirm Cancellation
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Booking Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#5C4A3A] flex items-center gap-2">
              <Eye className="w-5 h-5 text-[#DB9D47]" />
              Booking Details
            </DialogTitle>
            <DialogDescription className="text-[#87765E]">
              Full details for this booking
            </DialogDescription>
          </DialogHeader>
          {viewBooking && (
            <div className="space-y-4 py-2">
              {/* Status Badge */}
              <div className="flex justify-between items-center">
                <Badge variant="outline" className={`${getStatusConfig(viewBooking.status).color} text-sm px-3 py-1`}>
                  {(() => { const Icon = getStatusConfig(viewBooking.status).icon; return <Icon className="w-3.5 h-3.5 mr-1.5" />; })()}
                  {viewBooking.status.charAt(0).toUpperCase() + viewBooking.status.slice(1)}
                </Badge>
                <span className="text-xs text-[#87765E]">ID: {viewBooking.id.slice(0, 8)}...</span>
              </div>

              {/* Customer & Barber */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-[#FBF7EF] border border-[#E8DCC8]">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="w-3.5 h-3.5 text-[#DB9D47]" />
                    <span className="text-xs text-[#87765E]">Customer</span>
                  </div>
                  <p className="text-sm text-[#5C4A3A] font-medium">{viewBooking.customerName || viewBooking.userId}</p>
                </div>
                <div className="p-3 rounded-lg bg-[#FBF7EF] border border-[#E8DCC8]">
                  <div className="flex items-center gap-2 mb-1">
                    <Scissors className="w-3.5 h-3.5 text-[#DB9D47]" />
                    <span className="text-xs text-[#87765E]">Barber</span>
                  </div>
                  <p className="text-sm text-[#5C4A3A] font-medium">{viewBooking.barber}</p>
                </div>
              </div>

              {/* Service & Schedule */}
              <div className="p-3 rounded-lg bg-[#FBF7EF] border border-[#E8DCC8]">
                <div className="flex items-center gap-2 mb-2">
                  <Scissors className="w-3.5 h-3.5 text-[#DB9D47]" />
                  <span className="text-xs text-[#87765E]">Service</span>
                </div>
                <p className="text-sm text-[#5C4A3A] font-medium mb-2">{viewBooking.service}</p>
                <div className="flex items-center gap-4 text-xs text-[#87765E]">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {parseLocalDate(viewBooking.date).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
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
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-[#87765E]">Total</p>
                    <p className="text-[#5C4A3A] font-medium">₱{viewBooking.price}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#87765E]">Down Payment</p>
                    <p className="text-[#5C4A3A] font-medium">₱{(() => {
                      let dp = null;
                      if (viewBooking.notes) {
                        const dpMatches = [...viewBooking.notes.matchAll(/fixed down payment of ₱(\d+)/g)];
                        if (dpMatches.length > 0) dp = parseInt(dpMatches[dpMatches.length - 1][1], 10);
                        else {
                          const prevMatches = [...viewBooking.notes.matchAll(/Previous amount was ₱([\d,]+)/g)];
                          if (prevMatches.length > 0) dp = parseInt(prevMatches[0][1].replace(/,/g, ''), 10) * 0.5; // For old logic, DP was always 50% of very FIRST amount
                        }
                      }
                      return viewBooking.down_payment || dp || Math.round(viewBooking.price * 0.5);
                    })()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#87765E]">Remaining</p>
                    <p className="text-[#5C4A3A] font-medium">₱{(() => {
                      let rem = null;
                      if (viewBooking.notes) {
                        const remMatches = [...viewBooking.notes.matchAll(/remaining balance is: ₱([\d,]+)/g)];
                        if (remMatches.length > 0) rem = parseInt(remMatches[remMatches.length - 1][1].replace(/,/g, ''), 10);
                        else {
                          const excessMatches = [...viewBooking.notes.matchAll(/excess\/refund Amount of ₱([\d,]+)/gi)].concat([...viewBooking.notes.matchAll(/excess\/refund of ₱([\d,]+)/gi)]);
                          if (excessMatches.length > 0) rem = `-${parseInt(excessMatches[excessMatches.length - 1][1].replace(/,/g, ''), 10)}`;
                        }
                      }
                      return viewBooking.remainingBalance || viewBooking.remaining_amount || rem !== null ? rem : (() => {
                        let dp = null;
                        if (viewBooking.notes) {
                          const dpMatches = [...viewBooking.notes.matchAll(/fixed down payment of ₱(\d+)/g)];
                          if (dpMatches.length > 0) dp = parseInt(dpMatches[dpMatches.length - 1][1], 10);
                          else {
                            const prevMatches = [...viewBooking.notes.matchAll(/Previous amount was ₱([\d,]+)/g)];
                            if (prevMatches.length > 0) dp = parseInt(prevMatches[0][1].replace(/,/g, ''), 10) * 0.5;
                          }
                        }
                        return viewBooking.price - (dp || Math.round(viewBooking.price * 0.5));
                      })();
                    })()}</p>
                  </div>
                </div>
                {viewBooking.paymentStatus && (
                  <div className="mt-2 pt-2 border-t border-[#E8DCC8]">
                    <span className="text-xs text-[#87765E]">Payment Status: </span>
                    <Badge variant="outline" className={`text-xs ${viewBooking.paymentStatus === 'verified' ? 'bg-green-50 text-green-700 border-green-200' :
                      viewBooking.paymentStatus === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                        'bg-orange-50 text-orange-700 border-orange-200'
                      }`}>
                      {viewBooking.paymentStatus}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Payment Proof Image */}
              {viewBooking.paymentProof && (
                <div className="p-3 rounded-lg bg-[#FBF7EF] border border-[#E8DCC8]">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="w-3.5 h-3.5 text-[#DB9D47]" />
                    <span className="text-xs text-[#87765E]">Payment Proof</span>
                  </div>
                  <img
                    src={viewBooking.paymentProof}
                    alt="Payment Proof"
                    className="w-full max-h-48 object-contain rounded-md border border-[#E8DCC8] bg-white"
                  />
                </div>
              )}

              {/* Cancellation Reason */}
              {viewBooking.status === 'cancelled' && (viewBooking.cancellationReason || viewBooking.cancellation_reason || viewBooking.notes) && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquare className="w-3.5 h-3.5 text-red-500" />
                    <span className="text-xs font-semibold text-red-700">Cancellation Reason</span>
                  </div>
                  <p className="text-sm text-red-600">
                    {viewBooking.cancellationReason || viewBooking.cancellation_reason ||
                      viewBooking.notes?.replace('Customer cancelled: ', '').replace('Admin cancelled: ', '').replace('Barber cancelled: ', '')}
                  </p>
                  {(viewBooking.cancelledBy || viewBooking.cancelled_by || viewBooking.notes) && (
                    <p className="text-xs text-red-400 mt-1 italic">
                      Cancelled by: {viewBooking.cancelledBy || viewBooking.cancelled_by ||
                        (viewBooking.notes?.startsWith('Admin cancelled:') ? 'Admin' :
                          viewBooking.notes?.startsWith('Barber cancelled:') ? 'Barber' :
                            viewBooking.notes?.startsWith('Customer cancelled:') ? 'Customer' : 'Unknown')}
                    </p>
                  )}
                </div>
              )}

              {/* Notes (non-cancellation) */}
              {viewBooking.notes && !viewBooking.notes.startsWith('Customer cancelled:') && !viewBooking.notes.startsWith('Admin cancelled:') && !viewBooking.notes.startsWith('Barber cancelled:') && viewBooking.status !== 'cancelled' && (
                <div className="p-3 rounded-lg bg-[#FBF7EF] border border-[#E8DCC8]">
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquare className="w-3.5 h-3.5 text-[#DB9D47]" />
                    <span className="text-xs text-[#87765E]">Notes</span>
                  </div>
                  <p className="text-sm text-[#5C4A3A]">{viewBooking.notes}</p>
                </div>
              )}
            </div>
          )}
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)} className="border-[#E8DCC8]">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Booking Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
        setIsAddDialogOpen(open);
        if (!open) setAddFormData({ customer_id: "", service_id: "", barber_id: "", date: "", time: "" });
      }}>
        <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#5C4A3A] flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#DB9D47]" />
              Add Booking
            </DialogTitle>
            <DialogDescription className="text-[#87765E]">
              Create a new booking. Payment will be automatically verified.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Customer Selection — Searchable Combobox */}
            <div className="grid gap-2">
              <Label className="text-[#5C4A3A] font-medium flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#DB9D47]" />
                Customer
              </Label>
              <Popover open={customerPopoverOpen} onOpenChange={setCustomerPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={customerPopoverOpen}
                    className="w-full justify-between border-[#E8DCC8] font-normal text-sm h-10"
                  >
                    {addFormData.customer_id
                      ? (() => {
                        const c = availableCustomers.find((c: any) => c.id === addFormData.customer_id);
                        return c ? <span className="flex items-center gap-2 truncate"><User className="w-3.5 h-3.5 text-[#DB9D47] flex-shrink-0" />{c.name} <span className="text-xs text-[#87765E]">({c.email})</span></span> : "Select customer";
                      })()
                      : <span className="text-muted-foreground">Select customer...</span>}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search by name or email..." />
                    <CommandList>
                      <CommandEmpty>No customer found.</CommandEmpty>
                      <CommandGroup>
                        {availableCustomers.map((customer: any) => (
                          <CommandItem
                            key={customer.id}
                            value={`${customer.name} ${customer.email}`}
                            onSelect={() => {
                              setAddFormData(prev => ({ ...prev, customer_id: customer.id }));
                              setCustomerPopoverOpen(false);
                            }}
                            className="cursor-pointer"
                          >
                            <Check className={`mr-2 h-4 w-4 ${addFormData.customer_id === customer.id ? 'opacity-100 text-[#DB9D47]' : 'opacity-0'}`} />
                            <User className="w-3.5 h-3.5 text-[#87765E] mr-1.5" />
                            <span>{customer.name}</span>
                            <span className="text-xs text-[#87765E] ml-auto">{customer.email}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Service Selection — Searchable Combobox */}
            <div className="grid gap-2">
              <Label className="text-[#5C4A3A] font-medium flex items-center gap-1.5">
                <Scissors className="w-3.5 h-3.5 text-[#DB9D47]" />
                Service
              </Label>
              {(() => {
                const activeStatuses = ['pending', 'verified', 'upcoming'];
                const customerId = addFormData.customer_id;
                const customerActiveBookings = customerId ? appointments.filter(apt => {
                  const aptCustomerId = apt.userId || apt.customer_id || apt.customerId;
                  return aptCustomerId === customerId && activeStatuses.includes(apt.status);
                }) : [];
                const bookedServiceIds = new Set(customerActiveBookings.map(apt => apt.service_id || apt.serviceId || '').filter(Boolean));
                const bookedServiceNames = new Set(customerActiveBookings.map(apt => (apt.service || apt.service_name || '').toLowerCase()).filter(Boolean));

                return (
                  <Popover open={servicePopoverOpen} onOpenChange={setServicePopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={servicePopoverOpen}
                        className="w-full justify-between border-[#E8DCC8] font-normal text-sm h-10"
                      >
                        {addFormData.service_id
                          ? (() => {
                            const s = availableServices.find((s: any) => s.id === addFormData.service_id);
                            return s ? <span className="flex items-center gap-2 truncate"><Scissors className="w-3.5 h-3.5 text-[#DB9D47] flex-shrink-0" />{s.name} <span className="text-xs text-[#DB9D47] font-medium">₱{s.price}</span></span> : "Select service";
                          })()
                          : <span className="text-muted-foreground">Select service...</span>}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Select service..." />
                        <CommandList>
                          <CommandEmpty>No service found.</CommandEmpty>
                          <CommandGroup>
                            {availableServices.map((service: any) => {
                              const isBooked = bookedServiceIds.has(service.id) || bookedServiceNames.has((service.name || '').toLowerCase());
                              return (
                                <CommandItem
                                  key={service.id}
                                  value={`${service.name} ${service.description || ''}`}
                                  onSelect={() => {
                                    if (!isBooked) {
                                      setAddFormData(prev => ({ ...prev, service_id: service.id, time: "" }));
                                      setServicePopoverOpen(false);
                                    }
                                  }}
                                  disabled={isBooked}
                                  className={`cursor-pointer ${isBooked ? 'opacity-40' : ''}`}
                                >
                                  <Check className={`mr-2 h-4 w-4 ${addFormData.service_id === service.id ? 'opacity-100 text-[#DB9D47]' : 'opacity-0'}`} />
                                  <Scissors className="w-3.5 h-3.5 text-[#87765E] mr-1.5" />
                                  <div className="flex-1 min-w-0">
                                    <span>{service.name}{isBooked ? ' (Active Booking)' : ''}</span>
                                  </div>
                                  <span className="text-xs text-[#DB9D47] font-medium ml-auto whitespace-nowrap">₱{service.price} • {service.duration}min</span>
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                );
              })()}
            </div>

            {/* Barber Selection — Searchable Combobox */}
            <div className="grid gap-2">
              <Label className="text-[#5C4A3A] font-medium flex items-center gap-1.5">
                <UserCog className="w-3.5 h-3.5 text-[#DB9D47]" />
                Barber
              </Label>
              <Popover open={barberPopoverOpen} onOpenChange={setBarberPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={barberPopoverOpen}
                    className="w-full justify-between border-[#E8DCC8] font-normal text-sm h-10"
                  >
                    {addFormData.barber_id
                      ? (() => {
                        const b = availableBarbers.find((b: any) => b.id === addFormData.barber_id);
                        return b ? <span className="flex items-center gap-2 truncate"><UserCog className="w-3.5 h-3.5 text-[#DB9D47] flex-shrink-0" />{b.name}</span> : "Select barber";
                      })()
                      : <span className="text-muted-foreground">Select barber...</span>}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Select barber..." />
                    <CommandList>
                      <CommandEmpty>No barber found.</CommandEmpty>
                      <CommandGroup>
                        {availableBarbers.map((barber: any) => (
                          <CommandItem
                            key={barber.id}
                            value={barber.name}
                            onSelect={() => {
                              setAddFormData(prev => ({ ...prev, barber_id: barber.id, time: "" }));
                              setBarberPopoverOpen(false);
                            }}
                            className="cursor-pointer"
                          >
                            <Check className={`mr-2 h-4 w-4 ${addFormData.barber_id === barber.id ? 'opacity-100 text-[#DB9D47]' : 'opacity-0'}`} />
                            <UserCog className="w-3.5 h-3.5 text-[#87765E] mr-1.5" />
                            <span>{barber.name}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Date Selection */}
            <div className="grid gap-2">
              <Label className="text-[#5C4A3A] font-medium flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#DB9D47]" />
                Date
              </Label>
              <Input
                type="date"
                value={addFormData.date}
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) return;
                  const d = new Date(val + 'T00:00:00');
                  if (d.getDay() === 0) {
                    toast.error("Sorry, we're closed on Sundays!");
                    setAddFormData(prev => ({ ...prev, date: "", time: "" }));
                    return;
                  }
                  setAddFormData(prev => ({ ...prev, date: val, time: "" }));
                }}
                min={new Date().toISOString().split('T')[0]}
                max={(() => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().split('T')[0]; })()}
                className="border-[#E8DCC8]"
              />
              <p className="text-xs text-[#87765E]">Sundays are closed. Bookings up to 30 days ahead.</p>
            </div>

            {/* Time Selection */}
            {addFormData.date && addFormData.barber_id && addFormData.service_id && (
              <div className="grid gap-2">
                <Label className="text-[#5C4A3A] font-medium flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#DB9D47]" />
                  Time Slot
                </Label>
                <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1">
                  {TIME_SLOTS.map((time) => {
                    const isTaken = isAddTimeSlotTaken(time);
                    return (
                      <Button
                        key={time}
                        type="button"
                        onClick={() => {
                          if (!isTaken) setAddFormData(prev => ({ ...prev, time }));
                          else toast.error("This time slot is already booked!");
                        }}
                        variant={addFormData.time === time ? "default" : "outline"}
                        className={`text-xs py-2 flex flex-col gap-0.5 ${addFormData.time === time
                          ? "bg-[#DB9D47] hover:bg-[#C88D3F] text-white"
                          : isTaken
                            ? "opacity-40 cursor-not-allowed bg-gray-100 border-red-300"
                            : "hover:bg-[#FBF7EF] hover:border-[#DB9D47] border-[#E8DCC8]"
                          }`}
                        disabled={isTaken}
                      >
                        <span>{time}</span>
                        {isTaken && <span className="text-[9px] text-red-600 font-semibold">BOOKED</span>}
                      </Button>
                    );
                  })}
                </div>
                <p className="text-xs text-[#87765E]">Gray/disabled slots are already booked for this barber.</p>
              </div>
            )}

            {/* Booking Summary */}
            {addFormData.customer_id && addFormData.service_id && addFormData.barber_id && addFormData.date && addFormData.time && (
              <div className="p-3 rounded-lg bg-[#FBF7EF] border border-[#E8DCC8] space-y-2">
                <h4 className="text-sm font-semibold text-[#5C4A3A] flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#94A670]" />
                  Booking Summary
                </h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <span className="text-[#87765E]">Customer:</span>
                  <span className="text-[#5C4A3A] font-medium">{availableCustomers.find((c: any) => c.id === addFormData.customer_id)?.name}</span>
                  <span className="text-[#87765E]">Service:</span>
                  <span className="text-[#5C4A3A] font-medium">{availableServices.find((s: any) => s.id === addFormData.service_id)?.name}</span>
                  <span className="text-[#87765E]">Barber:</span>
                  <span className="text-[#5C4A3A] font-medium">{availableBarbers.find((b: any) => b.id === addFormData.barber_id)?.name}</span>
                  <span className="text-[#87765E]">Date & Time:</span>
                  <span className="text-[#5C4A3A] font-medium">
                    {new Date(addFormData.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at {addFormData.time}
                  </span>
                </div>
                <div className="border-t border-[#E8DCC8] pt-2 mt-2 space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#87765E]">Total Amount</span>
                    <span className="text-[#5C4A3A] font-bold">₱{availableServices.find((s: any) => s.id === addFormData.service_id)?.price?.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#87765E]">Down Payment (50%)</span>
                    <span className="text-green-600 font-medium">₱{((availableServices.find((s: any) => s.id === addFormData.service_id)?.price || 0) * 0.5).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#87765E]">Remaining Balance</span>
                    <span className="text-[#D98555] font-medium">₱{((availableServices.find((s: any) => s.id === addFormData.service_id)?.price || 0) * 0.5).toLocaleString()}</span>
                  </div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-2 mt-2">
                  <p className="text-xs text-green-700">
                    <strong>Auto-Verified:</strong> Payment will be automatically marked as verified since this booking is created by an admin.
                  </p>
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false);
                setAddFormData({ customer_id: "", service_id: "", barber_id: "", date: "", time: "" });
              }}
              className="border-[#E8DCC8]"
            >
              Cancel
            </Button>
            <Button
              className="bg-[#DB9D47] hover:bg-[#C88A35] text-white"
              onClick={handleAddBooking}
              disabled={!addFormData.customer_id || !addFormData.service_id || !addFormData.barber_id || !addFormData.date || !addFormData.time || isAddingBooking}
            >
              {isAddingBooking ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Confirm Booking
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}