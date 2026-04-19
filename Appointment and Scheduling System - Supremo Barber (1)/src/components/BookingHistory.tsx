import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from './ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle
} from './ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from './ui/select';
import { Calendar, Clock, User, Scissors, XCircle, Star, Search, Filter, Edit, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { Appointment } from '../App';
import API from '../services/api.service';

// Utility function to parse date string without timezone issues
const parseLocalDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

interface BookingHistoryProps {
  userId: string;
  appointments: Appointment[];
  onUpdateAppointments: (appointments: Appointment[]) => void;
}

export function BookingHistory({ userId, appointments, onUpdateAppointments }: BookingHistoryProps) {
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Appointment | null>(null);
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBarber, setFilterBarber] = useState('all');
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [selectedCancelReason, setSelectedCancelReason] = useState('');

  // Get unique barbers from appointments
  const barbers = Array.from(new Set(appointments.map(apt => apt.barber)));

  const handleCancelBooking = async () => {
    if (!selectedBooking) return;

    if (!selectedCancelReason) {
      toast.error('Please select a reason for cancellation.');
      return;
    }

    if (selectedCancelReason === 'other' && !cancellationReason.trim()) {
      toast.error('Please provide your reason for cancellation.');
      return;
    }

    // Build the final reason string
    const finalReason = selectedCancelReason === 'other'
      ? cancellationReason.trim()
      : selectedCancelReason;

    setIsCancelling(true);
    try {
      // Update the database directly with both status, payment_status, and cancellation reason
      await API.appointments.update(selectedBooking.id, {
        status: 'cancelled',
        payment_status: 'refunded',
        notes: `Customer cancelled: ${finalReason}`,
        cancellation_reason: finalReason,
      });

      // Update local state to reflect the change immediately
      const updatedBookings = appointments.map(b =>
        b.id === selectedBooking.id
          ? {
            ...b,
            status: 'cancelled' as const,
            paymentStatus: 'rejected' as const,  // camelCase for UI
            payment_status: 'refunded' as const,  // snake_case for DB sync
            cancellationReason: finalReason,
            notes: `Customer cancelled: ${finalReason}`,
            canCancel: false
          }
          : b
      );

      onUpdateAppointments(updatedBookings);
      setCancelDialogOpen(false);
      setSelectedBooking(null);
      setCancellationReason('');
      setSelectedCancelReason('');

      toast.success('Booking cancelled. No refund will be issued.');
    } catch (error) {
      console.error('❌ Error cancelling booking:', error);
      toast.error('Failed to cancel booking. Please try again.');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleRateService = () => {
    if (!selectedBooking || rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    toast.success(`Thank you for rating ${selectedBooking.barber}!`);
    setRatingDialogOpen(false);
    setSelectedBooking(null);
    setRating(0);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'upcoming':
        return <Badge variant="default">Upcoming</Badge>;
      case 'completed':
        return <Badge>Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return null;
    }
  };

  const filteredAppointments = appointments.filter(apt => {
    // Format date for better search experience
    const formattedDate = parseLocalDate(apt.date).toLocaleDateString();

    const matchesSearch =
      apt.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.barber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.date.includes(searchQuery) ||
      formattedDate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.time.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.price.toString().includes(searchQuery);
    const matchesBarber = filterBarber === 'all' || apt.barber === filterBarber;

    return matchesSearch && matchesBarber;
  });

  const upcomingBookings = filteredAppointments.filter(b => b.status === 'upcoming');
  const pastBookings = filteredAppointments.filter(b => b.status !== 'upcoming');

  return (
    <div className="space-y-6">
      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
          <Input
            placeholder="Search by service or barber..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterBarber} onValueChange={setFilterBarber}>
          <SelectTrigger className="w-full md:w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter by barber" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Barbers</SelectItem>
            {barbers.map(barber => (
              <SelectItem key={barber} value={barber}>{barber}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Upcoming Bookings */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Appointments</CardTitle>
          <CardDescription>Your scheduled bookings</CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingBookings.length === 0 ? (
            <p className="text-center text-slate-500 py-8">No upcoming appointments</p>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>Barber</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcomingBookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Scissors className="w-4 h-4 text-slate-400" />
                          {booking.service}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-slate-400" />
                          {booking.barber}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <div>
                            <div>{booking.date}</div>
                            <div className="text-sm text-slate-500">{booking.time}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>

                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
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
                              onClick={() => {
                                toast.info('Please use the Manage Bookings tab to reschedule.');
                              }}
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              Reschedule
                            </Button>
                          )}
                          {booking.canCancel && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedBooking(booking);
                                setCancelDialogOpen(true);
                              }}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Cancel
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Past Bookings */}
      <Card>
        <CardHeader>
          <CardTitle>Booking History</CardTitle>
          <CardDescription>Your past appointments</CardDescription>
        </CardHeader>
        <CardContent>
          {pastBookings.length === 0 ? (
            <p className="text-center text-slate-500 py-8">No booking history</p>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>Barber</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pastBookings.map((booking) => {
                    // Extract cancellation reason from cancellationReason field or notes field
                    const cancelReason = booking.cancellationReason ||
                      (booking.notes && booking.notes.startsWith('Customer cancelled: ')
                        ? booking.notes.replace('Customer cancelled: ', '')
                        : null);

                    const priceNoteMatch = booking.notes && booking.notes.match(/Price adjustment: (.*)/);
                    const priceNote = priceNoteMatch ? priceNoteMatch[1] : null;

                    return (
                      <TableRow key={booking.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Scissors className="w-4 h-4 text-slate-400" />
                            <div>
                              {booking.service}
                              {/* Cancellation Reason Display */}
                              {booking.status === 'cancelled' && cancelReason && (
                                <div className="mt-1 text-xs text-red-500 flex items-start gap-1">
                                  <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                  <span>Reason: {cancelReason}</span>
                                </div>
                              )}
                              {/* Price Note Display */}
                              {priceNote && (
                                <div className="mt-1 text-xs text-amber-600 flex items-start gap-1">
                                  <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                  <span>{priceNote}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-slate-400" />
                            {booking.barber}
                          </div>
                        </TableCell>
                        <TableCell>{booking.date}</TableCell>
                        <TableCell>₱{booking.price}</TableCell>
                        <TableCell>{getStatusBadge(booking.status)}</TableCell>
                        <TableCell className="text-right">
                          {booking.status === 'completed' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedBooking(booking);
                                setRatingDialogOpen(true);
                              }}
                            >
                              <Star className="w-4 h-4 mr-1" />
                              Rate
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={(open) => {
        setCancelDialogOpen(open);
        if (!open) {
          setCancellationReason('');
          setSelectedCancelReason('');
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-800 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              Cancel Booking
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              Please select or provide a reason for cancellation. This helps us improve our service.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Appointment Details */}
            {selectedBooking && (
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <p className="text-xs text-slate-500 mb-1">Appointment Details</p>
                <p className="text-sm text-slate-800 font-medium">{selectedBooking.service}</p>
                <p className="text-xs text-slate-500">
                  {selectedBooking.date} at {selectedBooking.time}
                </p>
                <p className="text-xs text-slate-500">with {selectedBooking.barber}</p>
                <p className="text-xs text-slate-500 mt-1">Down Payment: ₱{(() => {
                  let dp = null;
                  if (selectedBooking.notes) {
                    const dpMatches = [...selectedBooking.notes.matchAll(/fixed down payment of ₱(\d+)/g)];
                    if (dpMatches.length > 0) dp = parseInt(dpMatches[dpMatches.length - 1][1], 10);
                    else {
                      const prevMatches = [...selectedBooking.notes.matchAll(/Previous amount was ₱([\d,]+)/g)];
                      if (prevMatches.length > 0) dp = parseInt(prevMatches[0][1].replace(/,/g, ''), 10) * 0.5;
                    }
                  }
                  return ((selectedBooking as any).down_payment || dp || Math.round(selectedBooking.price * 0.5)).toFixed(2);
                })()}</p>
              </div>
            )}

            {/* Cancellation Reason Dropdown */}
            <div className="space-y-2">
              <Label htmlFor="history-cancel-reason" className="text-slate-700">
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
                <SelectTrigger id="history-cancel-reason" className="border-slate-200">
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
                <Label htmlFor="history-custom-reason" className="text-slate-700">
                  Please specify your reason <span className="text-red-600">*</span>
                </Label>
                <Textarea
                  id="history-custom-reason"
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  placeholder="Enter your reason for cancellation..."
                  className="border-slate-200 min-h-[80px] resize-none overflow-y-auto break-words"
                  style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
                  maxLength={300}
                  rows={3}
                />
                <p className="text-xs text-slate-400 text-right">{cancellationReason.length}/300</p>
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

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => {
              setCancelDialogOpen(false);
              setCancellationReason('');
              setSelectedCancelReason('');
            }}>
              Go Back
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelBooking}
              disabled={isCancelling || !selectedCancelReason || (selectedCancelReason === 'other' && !cancellationReason.trim())}
              className="bg-red-600 hover:bg-red-700"
            >
              <XCircle className="w-4 h-4 mr-2" />
              {isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rating Dialog */}
      <Dialog open={ratingDialogOpen} onOpenChange={setRatingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rate Your Experience</DialogTitle>
            <DialogDescription>
              How was your service with {selectedBooking?.barber}?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className="focus:outline-none"
                >
                  <Star
                    className={`w-10 h-10 ${star <= rating
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-slate-300'
                      }`}
                  />
                </button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRatingDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRateService}>
              Submit Rating
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

