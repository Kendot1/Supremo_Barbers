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
import { Calendar, Search, Edit, X, CheckCircle2, Clock, AlertCircle, Info, Download, Eye, User, Scissors, CreditCard, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import type { Appointment, User as UserType } from "../App";
import { exportToCSV, formatDateForExport, formatCurrencyForExport } from "./utils/exportUtils";
import { PasswordConfirmationDialog } from "./PasswordConfirmationDialog";
import API from "../services/api.service";
import { logAppointmentCancelledByAdmin } from "../services/audit-notification.service";

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

  // Fetch services and barbers from database on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [services, barbers] = await Promise.all([
          API.services.getAll(),
          API.barbers.getAll(),
        ]);
        setAvailableServices(services || []);
        setAvailableBarbers(barbers || []);

      } catch (error) {
        console.error('❌ Failed to load services/barbers:', error);
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



      // Persist to database FIRST
      await API.appointments.update(selectedBooking.id, dbUpdate);


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
            <Button
              onClick={handleExportBookings}
              className="bg-[#DB9D47] hover:bg-[#C48D3D] text-white text-xs md:text-sm px-3 md:px-4"
            >
              <Download className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Export Report</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-3 md:gap-4 mb-4 md:mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#87765E]" />
              <Input
                placeholder="Search bookings..."
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
                {filteredBookings.map((booking) => {
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
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-[#5C4A3A] hover:text-[#DB9D47] hover:bg-[#FBF7EF] h-8 w-8 p-0"
                            onClick={() => {
                              setViewBooking(booking);
                              setIsViewDialogOpen(true);
                            }}
                            title="View booking details"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-[#DB9D47] hover:text-[#C88A35] hover:bg-[#FBF7EF] disabled:opacity-30 disabled:cursor-not-allowed h-8 w-8 p-0"
                            onClick={() => handleEditBooking(booking)}
                            disabled={booking.status === "cancelled" || booking.status === "rejected" || booking.status === "completed"}
                            title={booking.status === "cancelled" || booking.status === "rejected" ? "Cancelled/rejected bookings cannot be edited" : "Edit booking"}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-[#E57373] hover:text-[#D32F2F] hover:bg-[#FBF7EF] disabled:opacity-30 disabled:cursor-not-allowed h-8 w-8 p-0"
                            onClick={() => handleCancelBooking(booking.id)}
                            disabled={booking.status === "cancelled" || booking.status === "rejected" || booking.status === "completed"}
                            title={booking.status === "cancelled" || booking.status === "rejected" || booking.status === "completed" ? "This booking cannot be cancelled" : "Cancel booking"}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
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

              {/* Price (read-only, auto-updated by service) */}
              <div className="p-3 rounded-lg bg-[#FBF7EF] border border-[#E8DCC8]">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#87765E]">Total Amount</span>
                  <span className="text-lg font-semibold text-[#DB9D47]">₱{editFormData.price.toLocaleString()}</span>
                </div>
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
                    <p className="text-[#5C4A3A] font-medium">₱{viewBooking.down_payment || Math.round(viewBooking.price * 0.5)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#87765E]">Remaining</p>
                    <p className="text-[#5C4A3A] font-medium">₱{viewBooking.remainingBalance || viewBooking.remaining_amount || Math.round(viewBooking.price * 0.5)}</p>
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
    </div>
  );
}