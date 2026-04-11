import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Calendar } from "./ui/calendar";
import { Badge } from "./ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Loader2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import API from "../services/api.service";
import type { User as UserType, Appointment } from "../App";
import { toast } from "sonner";

interface BarberAvailability {
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  isAvailable: boolean;
  startTime: string; // Format: "09:00"
  endTime: string; // Format: "18:00"
}

interface BarberData extends UserType {
  availability?: BarberAvailability[];
}

interface TimeSlot {
  time: string;
  hour: number;
  minute: number;
  status: "available" | "limited" | "booked" | "closed";
  barbersAvailable: number;
  totalBarbers: number;
}

export function RealTimeSlotAvailability() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedBarber, setSelectedBarber] = useState<string>("any");
  const [barbers, setBarbers] = useState<BarberData[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFetchingAppointments, setIsFetchingAppointments] = useState(false);
  const [lastClickTime, setLastClickTime] = useState(0);

  // Parse time string (HH:MM) to minutes from midnight
  const parseTime = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Parse time string in 12-hour format (e.g., "9:00 AM") to minutes from midnight
  const parseTime12Hour = (time: string): number => {
    const match = time.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return 0;
    
    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const period = match[3].toUpperCase();
    
    if (period === 'PM' && hours !== 12) {
      hours += 12;
    } else if (period === 'AM' && hours === 12) {
      hours = 0;
    }
    
    return hours * 60 + minutes;
  };

  // Format minutes from midnight to time string
  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const isPM = hours >= 12;
    const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    return `${displayHour}:${mins.toString().padStart(2, '0')} ${isPM ? 'PM' : 'AM'}`;
  };

  // Generate all possible time slots based on barbers' working hours for a specific date
  const generateDynamicTimeSlots = (date: Date): Omit<TimeSlot, 'status' | 'barbersAvailable' | 'totalBarbers'>[] => {
    const dayOfWeek = date.getDay();
    const slots = new Set<number>(); // Use minutes from midnight

    // Collect all unique time slots from all barbers for this day
    barbers.forEach(barber => {
      if (!barber.availability || barber.availability.length === 0) {
        // If no availability data, use default 9-5
        const defaultStart = 9 * 60; // 9 AM
        const defaultEnd = 17 * 60; // 5 PM
        for (let time = defaultStart; time < defaultEnd; time += 30) {
          slots.add(time);
        }
        return;
      }

      const dayAvailability = barber.availability.find(a => a.dayOfWeek === dayOfWeek);
      
      if (dayAvailability && dayAvailability.isAvailable) {
        const startMinutes = parseTime(dayAvailability.startTime);
        const endMinutes = parseTime(dayAvailability.endTime);
        
        // Generate 30-minute slots
        for (let time = startMinutes; time < endMinutes; time += 30) {
          slots.add(time);
        }
      }
    });

    // Convert to array and sort
    const sortedSlots = Array.from(slots).sort((a, b) => a - b);

    return sortedSlots.map(minutes => ({
      time: formatTime(minutes),
      hour: Math.floor(minutes / 60),
      minute: minutes % 60,
    }));
  };

  // Check if a specific barber is working at a given time slot
  const isBarberWorkingAtSlot = (barber: BarberData, slotMinutes: number, dayOfWeek: number): boolean => {
    if (!barber.availability || barber.availability.length === 0) {
      // Default working hours: 9 AM - 5 PM, Monday-Saturday
      if (dayOfWeek === 0) return false; // Sunday off by default
      return slotMinutes >= 9 * 60 && slotMinutes < 17 * 60;
    }

    const dayAvailability = barber.availability.find(a => a.dayOfWeek === dayOfWeek);
    
    if (!dayAvailability || !dayAvailability.isAvailable) {
      return false;
    }

    const startMinutes = parseTime(dayAvailability.startTime);
    const endMinutes = parseTime(dayAvailability.endTime);

    return slotMinutes >= startMinutes && slotMinutes < endMinutes;
  };

  // Fetch barbers with their availability schedules
  const fetchBarbers = async () => {
    try {
      console.log('🔍 Fetching barbers...');
      const fetchedBarbers = await API.barbers.getAll();
      console.log('📋 All barbers from API:', fetchedBarbers);
      
      // Only include active barbers
      const activeBarbers = fetchedBarbers.filter(b => b.status === 'active' || b.isActive !== false);
      console.log('✅ Active barbers:', activeBarbers);
      
      // Fetch availability for each barber
      const barbersWithAvailability = await Promise.all(
        activeBarbers.map(async (barber) => {
          try {
            // Fetch barber's availability schedule from backend
            const availability = await API.barbers.getAvailability(barber.id || barber._id || '');
            console.log(`📅 Availability for ${barber.name}:`, availability);
            return {
              ...barber,
              availability: availability || [], // Use real availability or empty array
            };
          } catch (error) {
            console.warn(`Failed to fetch availability for barber ${barber.name}:`, error);
            // Return barber without availability (will use default hours)
            return {
              ...barber,
              availability: [],
            };
          }
        })
      );
      
      console.log('👥 Barbers with availability:', barbersWithAvailability);
      setBarbers(barbersWithAvailability as BarberData[]);
    } catch (error) {
      console.error('Error fetching barbers:', error);
      toast.error('Failed to load barbers');
      setBarbers([]);
    }
  };

  // Fetch appointments for selected date
  const fetchAppointments = async (date: Date) => {
    try {
      // Format date in local timezone (YYYY-MM-DD) to avoid UTC conversion issues
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      
      console.log('🔍 Fetching appointments for date (local timezone):', dateString);
      console.log('🌍 User timezone offset:', -date.getTimezoneOffset() / 60, 'hours from UTC');
      
      const allAppointments = await API.appointments.getAll({
        dateFrom: dateString,
        dateTo: dateString,
      });
      
      console.log('📅 Raw appointments from API:', allAppointments);
      
      // Only include confirmed appointments (pending and confirmed status)
      const relevantAppointments = allAppointments.filter(
        apt => apt.status === 'pending' || apt.status === 'confirmed'
      );
      
      console.log('✅ Filtered appointments (pending/confirmed):', relevantAppointments);
      
      setAppointments(relevantAppointments);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setAppointments([]);
    }
  };

  // Calculate slot availability based on barbers' schedules and appointments
  const calculateSlotAvailability = () => {
    if (!selectedDate) return [];

    const baseSlots = generateDynamicTimeSlots(selectedDate);
    const dayOfWeek = selectedDate.getDay();

    return baseSlots.map(slot => {
      const slotMinutes = slot.hour * 60 + slot.minute;

      // Determine which barbers are working at this time
      let workingBarbers = barbers;
      
      // Filter by selected barber if specified
      if (selectedBarber !== "any") {
        workingBarbers = barbers.filter(b => (b.id || b._id) === selectedBarber);
      }

      // Filter barbers who are actually working at this time slot
      const availableAtSlot = workingBarbers.filter(b => 
        isBarberWorkingAtSlot(b, slotMinutes, dayOfWeek)
      );

      const totalBarbers = availableAtSlot.length;

      if (totalBarbers === 0) {
        // No barbers working at this time - mark as closed
        return {
          ...slot,
          status: 'closed' as const,
          barbersAvailable: 0,
          totalBarbers: 0,
        };
      }

      // Count appointments that overlap with this time slot for working barbers
      const overlappingAppointments = appointments.filter(apt => {
        // Check if appointment is for one of the working barbers
        const isRelevantBarber = availableAtSlot.some(b => 
          apt.barber === b.name || apt.barber === (b.id || b._id) || apt.barberId === (b.id || b._id)
        );

        if (!isRelevantBarber) return false;

        // Parse appointment time from the time string (e.g., "9:00 AM")
        const aptStartMinutes = apt.time ? parseTime12Hour(apt.time) : 0;
        
        // Get service duration (default 30 mins if not available)
        const serviceDuration = apt.duration || 30;
        const aptEndMinutes = aptStartMinutes + serviceDuration;
        
        const slotStartMinutes = slot.hour * 60 + slot.minute;
        const slotEndMinutes = slotStartMinutes + 30;

        // Check if appointment overlaps with this slot
        return (
          aptStartMinutes < slotEndMinutes &&
          aptEndMinutes > slotStartMinutes
        );
      }).length;

      const barbersAvailable = Math.max(0, totalBarbers - overlappingAppointments);
      
      let status: "available" | "limited" | "booked" | "closed";
      if (barbersAvailable === 0) {
        status = "booked";
      } else if (barbersAvailable === 1) {
        status = "limited";
      } else {
        status = "available";
      }

      return {
        ...slot,
        status,
        barbersAvailable,
        totalBarbers,
      };
    });
  };

  // Check if selected barber is working on selected date
  const isSelectedBarberWorkingToday = (): boolean => {
    if (!selectedDate || selectedBarber === "any") return true;
    
    const dayOfWeek = selectedDate.getDay();
    const barber = barbers.find(b => (b.id || b._id) === selectedBarber);
    
    if (!barber) return false;
    
    if (!barber.availability || barber.availability.length === 0) {
      // Default: working Monday-Saturday
      return dayOfWeek !== 0;
    }
    
    const dayAvailability = barber.availability.find(a => a.dayOfWeek === dayOfWeek);
    return dayAvailability?.isAvailable || false;
  };

  // Get working barbers for selected date
  const getWorkingBarbersCount = (): number => {
    if (!selectedDate) return 0;
    
    const dayOfWeek = selectedDate.getDay();
    return barbers.filter(barber => {
      if (!barber.availability || barber.availability.length === 0) {
        // Default: working Monday-Saturday
        return dayOfWeek !== 0;
      }
      
      const dayAvailability = barber.availability.find(a => a.dayOfWeek === dayOfWeek);
      return dayAvailability?.isAvailable || false;
    }).length;
  };

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await fetchBarbers();
      if (selectedDate) {
        await fetchAppointments(selectedDate);
      }
      setIsLoading(false);
    };
    loadData();
  }, []);

  // Update appointments when date changes
  useEffect(() => {
    const loadAppointments = async () => {
      if (selectedDate) {
        setIsFetchingAppointments(true);
        await fetchAppointments(selectedDate);
        setIsFetchingAppointments(false);
      }
    };
    loadAppointments();
  }, [selectedDate]);

  // Recalculate slots when barbers, appointments, selected date, or selected barber changes
  useEffect(() => {
    console.log('🔄 Recalculating slots...');
    console.log('  - Barbers:', barbers.length);
    console.log('  - Appointments:', appointments.length);
    console.log('  - Selected Date:', selectedDate);
    console.log('  - Selected Barber:', selectedBarber);
    
    const slots = calculateSlotAvailability();
    console.log('⏰ Generated time slots:', slots);
    setTimeSlots(slots);
  }, [barbers, appointments, selectedBarber, selectedDate]);

  // Manual refresh function
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchBarbers();
    if (selectedDate) {
      await fetchAppointments(selectedDate);
    }
    setIsRefreshing(false);
    toast.success('Availability updated');
  };

  // Handle date selection with double-click prevention
  const handleDateSelect = (date: Date | undefined) => {
    const now = Date.now();
    
    // Prevent double-click (ignore clicks within 300ms)
    if (now - lastClickTime < 300) {
      return;
    }
    
    setLastClickTime(now);
    
    // If clicking the same date, keep it selected (don't toggle to undefined)
    if (date && selectedDate && 
        date.getDate() === selectedDate.getDate() &&
        date.getMonth() === selectedDate.getMonth() &&
        date.getFullYear() === selectedDate.getFullYear()) {
      return; // Don't change selection
    }
    
    setSelectedDate(date);
  };

  const getSlotColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-50 text-green-700 border-green-300 hover:bg-green-100 hover:border-green-400";
      case "limited":
        return "bg-orange-50 text-orange-700 border-orange-300 hover:bg-orange-100 hover:border-orange-400";
      case "booked":
        return "bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed opacity-60";
      case "closed":
        return "bg-red-50 text-red-400 border-red-200 cursor-not-allowed opacity-50";
      default:
        return "bg-gray-100 text-gray-500 border-gray-300";
    }
  };

  const getSlotIcon = (status: string) => {
    switch (status) {
      case "available":
        return "●";
      case "limited":
        return "◐";
      case "booked":
        return "○";
      case "closed":
        return "✕";
      default:
        return "○";
    }
  };

  // Group slots by time period
  const groupSlotsByPeriod = () => {
    const morning = timeSlots.filter(slot => slot.hour >= 0 && slot.hour < 12);
    const afternoon = timeSlots.filter(slot => slot.hour >= 12 && slot.hour < 17);
    const evening = timeSlots.filter(slot => slot.hour >= 17);

    return { morning, afternoon, evening };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#DB9D47] mx-auto mb-3" />
          <p className="text-[#87765E]">Loading availability...</p>
        </div>
      </div>
    );
  }

  const { morning, afternoon, evening } = groupSlotsByPeriod();
  const workingBarbersCount = getWorkingBarbersCount();
  const selectedBarberWorkingToday = isSelectedBarberWorkingToday();

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="border-[none] bg-gradient-to-br from-[#FBF7EF] to-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl text-[#5C4A3A]">
                Real-Time Slot Availability
              </CardTitle>
              <CardDescription className="text-[#87765E]">
                Live availability based on {barbers.length} active barber{barbers.length !== 1 ? 's' : ''} schedules
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="border-[#E8DCC8] text-[#5C4A3A] hover:bg-[#FBF7EF]"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Barber Availability Alert */}
      {barbers.length > 0 && selectedDate && (
        <Card className={`border-2 ${
          workingBarbersCount === 0 
            ? 'border-red-200 bg-red-50' 
            : workingBarbersCount < barbers.length 
            ? 'border-orange-200 bg-orange-50' 
            : 'border-green-200 bg-green-50'
        }`}>
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              {workingBarbersCount === 0 ? (
                <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              ) : workingBarbersCount < barbers.length ? (
                <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
              ) : (
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1">
                <p className={`text-sm font-medium ${
                  workingBarbersCount === 0 
                    ? 'text-red-900' 
                    : workingBarbersCount < barbers.length 
                    ? 'text-orange-900' 
                    : 'text-green-900'
                }`}>
                  {workingBarbersCount === 0 
                    ? 'No barbers available' 
                    : workingBarbersCount < barbers.length 
                    ? `Limited availability` 
                    : 'All barbers available'}
                </p>
                <p className={`text-xs mt-1 ${
                  workingBarbersCount === 0 
                    ? 'text-red-700' 
                    : workingBarbersCount < barbers.length 
                    ? 'text-orange-700' 
                    : 'text-green-700'
                }`}>
                  {workingBarbersCount} of {barbers.length} barber{barbers.length !== 1 ? 's' : ''} working on{' '}
                  {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                </p>
                {selectedBarber !== "any" && !selectedBarberWorkingToday && (
                  <p className="text-xs mt-2 text-red-700 font-medium">
                    ⚠️ Selected barber is not available on this day
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Sidebar - Calendar & Filters */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="border-[#E8DCC8]">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-[#5C4A3A]">
                Select Date
              </CardTitle>
              <CardDescription className="text-[#87765E]">
                Choose your preferred appointment date
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center py-4">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  className="rounded-md border border-[#E8DCC8] bg-white scale-110 p-4"
                  disabled={(date) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    
                    // Calculate 30 days from today
                    const maxDate = new Date(today);
                    maxDate.setDate(maxDate.getDate() + 30);
                    
                    // Disable dates before today OR after 30 days
                    return date < today || date > maxDate;
                  }}
                />
              </div>
              <div className="pt-4">
                <label className="text-sm text-[#5C4A3A] mb-2 block">
                  Filter by Barber
                </label>
                <Select
                  value={selectedBarber}
                  onValueChange={setSelectedBarber}
                >
                  <SelectTrigger className="border-[#E8DCC8]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">
                      Any Available Barber ({barbers.length})
                    </SelectItem>
                    {barbers.map(barber => {
                      const isWorking = selectedDate && isBarberWorkingAtSlot(
                        barber, 
                        9 * 60, // Just check if working at all on this day
                        selectedDate.getDay()
                      );
                      
                      return (
                        <SelectItem key={barber.id || barber._id} value={barber.id || barber._id || ''}>
                          <div className="flex items-center justify-between w-full">
                            <span>{barber.name}</span>
                            {selectedDate && (
                              <Badge 
                                variant={isWorking ? "default" : "secondary"} 
                                className={`ml-2 text-xs ${
                                  isWorking 
                                    ? 'bg-green-100 text-green-700' 
                                    : 'bg-gray-100 text-gray-500'
                                }`}
                              >
                                {isWorking ? 'Available' : 'Off'}
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Legend Card */}
          <Card className="border-[#E8DCC8] bg-[#FBF7EF]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-[#5C4A3A]">
                Availability Legend
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-green-500 flex-shrink-0"></div>
                <div>
                  <p className="text-sm text-[#5C4A3A]">
                    Available
                  </p>
                  <p className="text-xs text-[#87765E]">
                    2+ barbers free
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-orange-500 flex-shrink-0"></div>
                <div>
                  <p className="text-sm text-[#5C4A3A]">
                    Limited
                  </p>
                  <p className="text-xs text-[#87765E]">
                    1 barber free
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-gray-400 flex-shrink-0"></div>
                <div>
                  <p className="text-sm text-[#5C4A3A]">
                    Fully Booked
                  </p>
                  <p className="text-xs text-[#87765E]">
                    All barbers busy
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-red-400 flex-shrink-0"></div>
                <div>
                  <p className="text-sm text-[#5C4A3A]">
                    Closed
                  </p>
                  <p className="text-xs text-[#87765E]">
                    No barbers working
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="border-[#E8DCC8] bg-gradient-to-br from-[#DB9D47]/10 to-transparent">
            <CardContent className="pt-6">
              <div className="text-center space-y-3">
                <div>
                  <div className="text-3xl text-[#DB9D47] mb-1">
                    {timeSlots.filter(s => s.status === "available").length}
                  </div>
                  <p className="text-sm text-[#87765E]">
                    Slots Available
                  </p>
                </div>
                <div className="h-px bg-[#E8DCC8]" />
                <div>
                  <div className="text-2xl text-orange-600 mb-1">
                    {timeSlots.filter(s => s.status === "limited").length}
                  </div>
                  <p className="text-sm text-[#87765E]">
                    Limited Slots
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Content - Time Slots Grid */}
        <div className="lg:col-span-2">
          <Card className="border-[#E8DCC8]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl text-[#5C4A3A]">
                    {selectedDate?.toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </CardTitle>
                  <CardDescription className="text-[#87765E] mt-1">
                    {timeSlots.length > 0 
                      ? 'Click on any available slot to proceed with booking'
                      : 'No time slots available for this day'}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isFetchingAppointments ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-[#DB9D47] mx-auto mb-3" />
                    <p className="text-[#87765E]">Updating availability...</p>
                  </div>
                </div>
              ) : barbers.length === 0 ? (
                <div className="text-center py-12 bg-red-50 rounded-lg border-2 border-red-200">
                  <User className="w-12 h-12 mx-auto text-red-400 mb-3" />
                  <p className="text-red-900 font-medium mb-1">
                    No barbers available
                  </p>
                  <p className="text-sm text-red-700">
                    Please contact the shop administrator
                  </p>
                </div>
              ) : timeSlots.length === 0 ? (
                <div className="text-center py-12 bg-orange-50 rounded-lg border-2 border-orange-200">
                  <Clock className="w-12 h-12 mx-auto text-orange-400 mb-3" />
                  <p className="text-orange-900 font-medium mb-1">
                    No time slots available
                  </p>
                  <p className="text-sm text-orange-700 mt-2">
                    {selectedBarber !== "any" && !selectedBarberWorkingToday
                      ? 'The selected barber is not working on this day'
                      : workingBarbersCount === 0
                      ? 'All barbers are off on this day'
                      : 'No barbers have set their working hours for this day'}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (selectedBarber !== "any") {
                        setSelectedBarber("any");
                      }
                    }}
                    className="mt-4 border-orange-300 text-orange-700 hover:bg-orange-100"
                  >
                    {selectedBarber !== "any" ? 'View All Barbers' : 'Select Another Date'}
                  </Button>
                </div>
              ) : (
                <>
                  {/* Morning Slots */}
                  {morning.length > 0 && (
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-px flex-1 bg-[#E8DCC8]"></div>
                        <span className="text-sm text-[#87765E] px-2">
                          Morning ({morning[0]?.time} - {morning[morning.length - 1]?.time})
                        </span>
                        <div className="h-px flex-1 bg-[#E8DCC8]"></div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {morning.map((slot, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            disabled={slot.status === "booked" || slot.status === "closed"}
                            className={`h-auto py-4 px-3 flex flex-col items-center gap-2 border-2 transition-all ${
                              selectedBarber !== "any" && (slot.status === "available" || slot.status === "limited")
                                ? "bg-green-50 text-green-700 border-green-300 hover:bg-green-100 hover:border-green-400"
                                : getSlotColor(slot.status)
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-4 h-4" />
                              <span className="text-xs opacity-70">
                                {getSlotIcon(slot.status)}
                              </span>
                            </div>
                            <span className="text-sm font-medium">
                              {slot.time}
                            </span>
                            {slot.status === "available" || slot.status === "limited" ? (
                              <div className="flex items-center gap-1 text-xs opacity-80">
                                <User className="w-3 h-3" />
                                <span>{slot.barbersAvailable}/{slot.totalBarbers}</span>
                              </div>
                            ) : slot.status === "booked" ? (
                              <span className="text-xs opacity-60">
                                Full
                              </span>
                            ) : (
                              <span className="text-xs opacity-60">
                                Closed
                              </span>
                            )}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Afternoon Slots */}
                  {afternoon.length > 0 && (
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-px flex-1 bg-[#E8DCC8]"></div>
                        <span className="text-sm text-[#87765E] px-2">
                          Afternoon ({afternoon[0]?.time} - {afternoon[afternoon.length - 1]?.time})
                        </span>
                        <div className="h-px flex-1 bg-[#E8DCC8]"></div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {afternoon.map((slot, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            disabled={slot.status === "booked" || slot.status === "closed"}
                            className={`h-auto py-4 px-3 flex flex-col items-center gap-2 border-2 transition-all ${
                              selectedBarber !== "any" && (slot.status === "available" || slot.status === "limited")
                                ? "bg-green-50 text-green-700 border-green-300 hover:bg-green-100 hover:border-green-400"
                                : getSlotColor(slot.status)
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-4 h-4" />
                              <span className="text-xs opacity-70">
                                {getSlotIcon(slot.status)}
                              </span>
                            </div>
                            <span className="text-sm font-medium">
                              {slot.time}
                            </span>
                            {slot.status === "available" || slot.status === "limited" ? (
                              <div className="flex items-center gap-1 text-xs opacity-80">
                                <User className="w-3 h-3" />
                                <span>{slot.barbersAvailable}/{slot.totalBarbers}</span>
                              </div>
                            ) : slot.status === "booked" ? (
                              <span className="text-xs opacity-60">
                                Full
                              </span>
                            ) : (
                              <span className="text-xs opacity-60">
                                Closed
                              </span>
                            )}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Evening Slots */}
                  {evening.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-px flex-1 bg-[#E8DCC8]"></div>
                        <span className="text-sm text-[#87765E] px-2">
                          Evening ({evening[0]?.time} - {evening[evening.length - 1]?.time})
                        </span>
                        <div className="h-px flex-1 bg-[#E8DCC8]"></div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {evening.map((slot, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            disabled={slot.status === "booked" || slot.status === "closed"}
                            className={`h-auto py-4 px-3 flex flex-col items-center gap-2 border-2 transition-all ${
                              selectedBarber !== "any" && (slot.status === "available" || slot.status === "limited")
                                ? "bg-green-50 text-green-700 border-green-300 hover:bg-green-100 hover:border-green-400"
                                : getSlotColor(slot.status)
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-4 h-4" />
                              <span className="text-xs opacity-70">
                                {getSlotIcon(slot.status)}
                              </span>
                            </div>
                            <span className="text-sm font-medium">
                              {slot.time}
                            </span>
                            {slot.status === "available" || slot.status === "limited" ? (
                              <div className="flex items-center gap-1 text-xs opacity-80">
                                <User className="w-3 h-3" />
                                <span>{slot.barbersAvailable}/{slot.totalBarbers}</span>
                              </div>
                            ) : slot.status === "booked" ? (
                              <span className="text-xs opacity-60">
                                Full
                              </span>
                            ) : (
                              <span className="text-xs opacity-60">
                                Closed
                              </span>
                            )}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}