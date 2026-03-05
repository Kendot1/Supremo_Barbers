import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
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
import { Calendar, Clock, User, Scissors, XCircle, Star, Search, Filter } from 'lucide-react';
import { toast } from 'sonner';
import type { Appointment } from '../App';

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

  // Get unique barbers from appointments
  const barbers = Array.from(new Set(appointments.map(apt => apt.barber)));

  const handleCancelBooking = () => {
    if (!selectedBooking) return;

    const updatedBookings = appointments.map(b => 
      b.id === selectedBooking.id 
        ? { ...b, status: 'cancelled' as const, canCancel: false } 
        : b
    );
    
    onUpdateAppointments(updatedBookings);
    setCancelDialogOpen(false);
    setSelectedBooking(null);
    toast.success('Booking cancelled. No refund will be issued.');
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
                          ₱{booking.price}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
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
                  {pastBookings.map((booking) => (
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
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Booking</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this appointment?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-800 font-semibold mb-1">
                No Refund Policy
              </p>
              <p className="text-sm text-red-700">
                Please note that all bookings are non-refundable. Your down payment will not be refunded if you cancel this appointment.
              </p>
            </div>
            {selectedBooking && (
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Service:</span>
                  <span className="text-slate-900">{selectedBooking.service}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Barber:</span>
                  <span className="text-slate-900">{selectedBooking.barber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Date:</span>
                  <span className="text-slate-900">{selectedBooking.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Time:</span>
                  <span className="text-slate-900">{selectedBooking.time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Down Payment Paid:</span>
                  <span className="text-slate-900">₱{(selectedBooking.price * 0.5).toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              Keep Booking
            </Button>
            <Button variant="destructive" onClick={handleCancelBooking}>
              Cancel Anyway
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
                    className={`w-10 h-10 ${
                      star <= rating
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

