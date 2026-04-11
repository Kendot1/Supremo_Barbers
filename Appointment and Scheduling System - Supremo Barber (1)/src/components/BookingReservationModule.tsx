import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Alert, AlertDescription } from "./ui/alert";
import { Calendar, Search, Edit, X, CheckCircle2, Clock, AlertCircle, Info, Download } from "lucide-react";
import { toast } from "sonner";
import type { Appointment } from "../App";
import { exportToCSV, formatDateForExport, formatCurrencyForExport } from "./utils/exportUtils";
import { PasswordConfirmationDialog } from "./PasswordConfirmationDialog";

// Utility function to parse date string without timezone issues
const parseLocalDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

interface BookingReservationModuleProps {
  appointments: Appointment[];
  onUpdateAppointments: (appointments: Appointment[]) => void;
}

interface EditFormData {
  barber: string;
  date: string;
  time: string;
  status: "upcoming" | "completed" | "cancelled";
}

export function BookingReservationModule({ appointments, onUpdateAppointments }: BookingReservationModuleProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterBarber, setFilterBarber] = useState("all");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Appointment | null>(null);
  const [editFormData, setEditFormData] = useState<EditFormData>({
    barber: "",
    date: "",
    time: "",
    status: "upcoming",
  });

  // Password confirmation state
  const [passwordAction, setPasswordAction] = useState<{
    type: 'save' | 'cancel';
    bookingId?: string;
    data?: EditFormData;
  } | null>(null);

  // Get unique barbers
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
    // Only allow editing pending or confirmed bookings
    if (booking.status !== 'pending' && booking.status !== 'confirmed' && booking.status !== 'upcoming') {
      toast.error('Only pending or confirmed bookings can be edited');
      return;
    }
    
    setSelectedBooking(booking);
    setEditFormData({
      barber: booking.barber,
      date: booking.date,
      time: booking.time,
      status: booking.status,
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveBooking = () => {
    if (!selectedBooking) return;
    
    // Trigger password confirmation
    setPasswordAction({
      type: 'save',
      data: editFormData
    });
  };

  const executeSaveBooking = () => {
    if (!selectedBooking || !passwordAction?.data) return;

    const updatedAppointments = appointments.map(b => 
      b.id === selectedBooking.id 
        ? { 
            ...b, 
            barber: passwordAction.data.barber,
            date: passwordAction.data.date,
            time: passwordAction.data.time,
            status: passwordAction.data.status 
          }
        : b
    );
    
    onUpdateAppointments(updatedAppointments);
    toast.success("Booking updated successfully!");
    setIsEditDialogOpen(false);
    setSelectedBooking(null);
    setPasswordAction(null);
  };

  const handleCancelBooking = (bookingId: string) => {
    // Find the booking to check its status
    const booking = appointments.find(b => b.id === bookingId);
    
    // Only allow cancelling upcoming bookings
    if (booking && booking.status !== 'upcoming') {
      toast.error('Only upcoming bookings can be cancelled');
      return;
    }
    
    // Trigger password confirmation
    setPasswordAction({
      type: 'cancel',
      bookingId: bookingId
    });
  };

  const executeCancelBooking = () => {
    if (!passwordAction?.bookingId) return;

    const updatedAppointments = appointments.map(b =>
      b.id === passwordAction.bookingId
        ? { ...b, status: "cancelled" as const }
        : b
    );
    onUpdateAppointments(updatedAppointments);
    toast.success("Booking cancelled successfully!");
    setPasswordAction(null);
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
              { appointments.filter( (b) => b.status === "verified" && b.payment_status === "paid" ).length }
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
                            className="text-[#DB9D47] hover:text-[#C88A35] hover:bg-[#FBF7EF] disabled:opacity-30 disabled:cursor-not-allowed h-8 w-8 p-0"
                            onClick={() => handleEditBooking(booking)}
                            disabled={booking.status !== "upcoming" && booking.paymentStatus !== "verified"}
                            title={booking.status !== "upcoming" && booking.paymentStatus !== "verified" ? "Only upcoming bookings or verified payments can be edited" : "Edit booking"}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-[#E57373] hover:text-[#D32F2F] hover:bg-[#FBF7EF] disabled:opacity-30 disabled:cursor-not-allowed h-8 w-8 p-0"
                            onClick={() => handleCancelBooking(booking.id)}
                            disabled={booking.status !== "upcoming" && booking.paymentStatus !== "verified"}
                            title={booking.status !== "upcoming" && booking.paymentStatus !== "verified" ? "Only upcoming bookings or verified payments can be cancelled" : "Cancel booking"}
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
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Booking</DialogTitle>
            <DialogDescription>
              Update booking details or change assignment
            </DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="grid gap-4 py-4">
              {/* Info Alert - Only for upcoming bookings */}
              {selectedBooking.status === 'upcoming' && (
                <Alert className="border-[#DB9D47] bg-[#FFF9F0]">
                  <Info className="w-4 h-4 text-[#DB9D47]" />
                  <AlertDescription className="text-sm text-[#5C4A3A]">
                    You can update all details for upcoming bookings including changing the status to completed or cancelled.
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="grid gap-2">
                <Label>Booking ID</Label>
                <Input value={selectedBooking.id} disabled />
              </div>
              <div className="grid gap-2">
                <Label>Customer ID</Label>
                <Input value={selectedBooking.userId} disabled />
              </div>
              <div className="grid gap-2">
                <Label>Service</Label>
                <Input value={selectedBooking.service} disabled />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-barber">Assign Barber</Label>
                <Select 
                  value={editFormData.barber} 
                  onValueChange={(value) => setEditFormData({ ...editFormData, barber: value })}
                >
                  <SelectTrigger id="edit-barber">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Tony Stark">Tony Stark</SelectItem>
                    <SelectItem value="Bruce Wayne">Bruce Wayne</SelectItem>
                    <SelectItem value="Peter Parker">Peter Parker</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-date">Date</Label>
                  <Input 
                    id="edit-date" 
                    type="date" 
                    value={editFormData.date}
                    onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-time">Time</Label>
                  <Input 
                    id="edit-time" 
                    type="text" 
                    value={editFormData.time}
                    onChange={(e) => setEditFormData({ ...editFormData, time: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select 
                  value={editFormData.status} 
                  onValueChange={(value) => setEditFormData({ ...editFormData, status: value as "upcoming" | "completed" | "cancelled" })}
                >
                  <SelectTrigger id="edit-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
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
    </div>
  );
}