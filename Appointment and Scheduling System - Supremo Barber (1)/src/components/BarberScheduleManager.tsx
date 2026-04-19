import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from './ui/table';
import { Scissors, Calendar, Clock, CheckCircle2, XCircle, UserCog } from 'lucide-react';
import { toast } from 'sonner';
import API from '../services/api.service';

interface Barber {
  id: string;
  name: string;
  available: boolean;
  todayBookings: number;
  maxBookings: number;
  schedule: {
    day: string;
    startTime: string;
    endTime: string;
    available: boolean;
  }[];
}

const mockBarbers: Barber[] = [
  {
    id: '1',
    name: 'Tony Stark',
    available: true,
    todayBookings: 3,
    maxBookings: 5,
    schedule: [
      { day: 'Monday', startTime: '09:00', endTime: '17:00', available: true },
      { day: 'Tuesday', startTime: '09:00', endTime: '17:00', available: true },
      { day: 'Wednesday', startTime: '09:00', endTime: '17:00', available: true },
      { day: 'Thursday', startTime: '09:00', endTime: '17:00', available: true },
      { day: 'Friday', startTime: '09:00', endTime: '17:00', available: true },
      { day: 'Saturday', startTime: '10:00', endTime: '14:00', available: true },
      { day: 'Sunday', startTime: '', endTime: '', available: false },
    ],
  },
  {
    id: '2',
    name: 'Peter Parker',
    available: true,
    todayBookings: 4,
    maxBookings: 5,
    schedule: [
      { day: 'Monday', startTime: '09:00', endTime: '17:00', available: true },
      { day: 'Tuesday', startTime: '09:00', endTime: '17:00', available: true },
      { day: 'Wednesday', startTime: '09:00', endTime: '17:00', available: true },
      { day: 'Thursday', startTime: '09:00', endTime: '17:00', available: true },
      { day: 'Friday', startTime: '09:00', endTime: '17:00', available: true },
      { day: 'Saturday', startTime: '', endTime: '', available: false },
      { day: 'Sunday', startTime: '', endTime: '', available: false },
    ],
  },
  {
    id: '3',
    name: 'Bruce Wayne',
    available: true,
    todayBookings: 2,
    maxBookings: 5,
    schedule: [
      { day: 'Monday', startTime: '10:00', endTime: '18:00', available: true },
      { day: 'Tuesday', startTime: '10:00', endTime: '18:00', available: true },
      { day: 'Wednesday', startTime: '10:00', endTime: '18:00', available: true },
      { day: 'Thursday', startTime: '10:00', endTime: '18:00', available: true },
      { day: 'Friday', startTime: '10:00', endTime: '18:00', available: true },
      { day: 'Saturday', startTime: '10:00', endTime: '16:00', available: true },
      { day: 'Sunday', startTime: '', endTime: '', available: false },
    ],
  },
];

export function BarberScheduleManager() {
  const [barbers, setBarbers] = useState<Barber[]>(mockBarbers);
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch barbers from database
  useEffect(() => {
    const fetchBarbers = async () => {
      try {
        setIsLoading(true);
        const users = await API.barbers.getAll();

        const transformedBarbers: Barber[] = users.map(user => ({
          id: user.id,
          name: user.name,
          available: user.isActive ?? true,
          todayBookings: 0, // Would need appointments data
          maxBookings: 5,
          schedule: [
            { day: 'Monday', startTime: '09:00', endTime: '17:00', available: true },
            { day: 'Tuesday', startTime: '09:00', endTime: '17:00', available: true },
            { day: 'Wednesday', startTime: '09:00', endTime: '17:00', available: true },
            { day: 'Thursday', startTime: '09:00', endTime: '17:00', available: true },
            { day: 'Friday', startTime: '09:00', endTime: '17:00', available: true },
            { day: 'Saturday', startTime: '10:00', endTime: '14:00', available: true },
            { day: 'Sunday', startTime: '', endTime: '', available: false },
          ],
        }));

        setBarbers(transformedBarbers);
      } catch (error) {
        console.error('Error fetching barbers:', error);
        setBarbers(mockBarbers);
      } finally {
        setIsLoading(false);
      }
    };
    fetchBarbers();
  }, []);

  const handleToggleAvailability = async (barberId: string) => {
    try {
      const barber = barbers.find(b => b.id === barberId);
      if (!barber) return;

      await API.barbers.update(barberId, {
        isActive: !barber.available,
      });

      setBarbers(barbers.map(b =>
        b.id === barberId ? { ...b, available: !b.available } : b
      ));
      toast.success('Barber availability updated in database');
    } catch (error) {
      console.error('Error updating availability:', error);
      toast.error('Failed to update availability');
    }
  };

  return (
    <div className="space-y-6">
      {/* Barbers Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Barbers Overview</CardTitle>
          <CardDescription>Manage barber availability and schedules</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Barber Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Today's Bookings</TableHead>
                  <TableHead>Availability</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {barbers.map((barber) => (
                  <TableRow key={barber.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <UserCog className="w-4 h-4 text-slate-400" />
                        {barber.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={barber.available ? 'default' : 'secondary'}>
                        {barber.available ? (
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                        ) : (
                          <XCircle className="w-3 h-3 mr-1" />
                        )}
                        {barber.available ? 'Available' : 'Unavailable'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={
                          barber.todayBookings >= barber.maxBookings
                            ? 'text-red-600'
                            : 'text-slate-900'
                        }>
                          {barber.todayBookings} / {barber.maxBookings}
                        </span>
                        {barber.todayBookings >= barber.maxBookings && (
                          <Badge variant="destructive">Full</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={barber.available}
                        onCheckedChange={() => handleToggleAvailability(barber.id)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedBarber(
                          selectedBarber?.id === barber.id ? null : barber
                        )}
                      >
                        {selectedBarber?.id === barber.id ? 'Hide' : 'View'} Schedule
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Selected Barber Schedule */}
      {selectedBarber && (
        <Card>
          <CardHeader>
            <CardTitle>{selectedBarber.name}'s Weekly Schedule</CardTitle>
            <CardDescription>Configure working hours for each day</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {selectedBarber.schedule.map((day, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-28">
                      <Label>{day.day}</Label>
                    </div>
                    {day.available ? (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Clock className="w-4 h-4" />
                        <span>{day.startTime} - {day.endTime}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-slate-500">Not available</span>
                    )}
                  </div>
                  <Badge variant={day.available ? 'default' : 'secondary'}>
                    {day.available ? 'Open' : 'Closed'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

