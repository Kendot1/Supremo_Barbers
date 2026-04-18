import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "./ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Scissors,
  X,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  List,
} from "lucide-react";
import { FaPesoSign } from "react-icons/fa6";
import type { Appointment } from "../App";
import { cn } from "./ui/utils";

// Utility function to parse date string without timezone issues
const parseLocalDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
};

interface AppointmentCalendarProps {
  appointments: Appointment[];
  viewMode?: "all" | "barber";
  barberName?: string;
  onDateSelect?: (date: Date) => void;
  onEventClick?: (appointment: Appointment) => void;
}

export function AppointmentCalendar({
  appointments,
  viewMode = "all",
  barberName,
  onDateSelect,
  onEventClick,
}: AppointmentCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [calendarView, setCalendarView] = useState<
    "month" | "week" | "day"
  >("month");

  // Filter appointments based on viewMode
  const filteredAppointments = useMemo(() => {
    if (viewMode === "barber" && barberName) {
      return appointments.filter(
        (apt) => apt.barber === barberName,
      );
    }
    return appointments;
  }, [appointments, viewMode, barberName]);

  // Get appointments for a specific date
  const getAppointmentsForDate = (
    date: Date,
  ): Appointment[] => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    return filteredAppointments.filter(
      (apt) => apt.date === dateStr,
    );
  };

  // Generate calendar days for month view
  const getCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday

    const days: Date[] = [];
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay())); // End on Saturday

    for (
      let d = new Date(startDate);
      d <= endDate;
      d.setDate(d.getDate() + 1)
    ) {
      days.push(new Date(d));
    }

    return days;
  };

  // Generate days for week view
  const getWeekDays = () => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(
      currentDate.getDate() - currentDate.getDay(),
    );

    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  };

  // Time slots for day/week view
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

  const handlePreviousMonth = () => {
    setCurrentDate(
      new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - 1,
        1,
      ),
    );
  };

  const handleNextMonth = () => {
    setCurrentDate(
      new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        1,
      ),
    );
  };

  const handlePreviousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const handlePreviousDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() - 1);
    setCurrentDate(newDate);
  };

  const handleNextDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + 1);
    setCurrentDate(newDate);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const getStatusColors = (status: string) => {
    switch (status) {
      case "upcoming":
      case "confirmed":
        return "bg-blue-500 text-white border-blue-600";
      case "pending":
        return "bg-orange-500 text-white border-orange-600";
      case "completed":
        return "bg-green-500 text-white border-green-600";
      case "cancelled":
        return "bg-red-500 text-white border-red-600";
      default:
        return "bg-gray-500 text-white border-gray-600";
    }
  };

  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setIsDialogOpen(true);
    onEventClick?.(appointment);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  return (
    <>
      <Card className="border-[#E8DCC8]">
        <CardHeader className="pb-3 sm:pb-6">
          <div className="flex items-center justify-between flex-wrap gap-2 sm:gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-[#5C4A3A] text-base sm:text-lg">
                <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5 text-[#DB9D47]" />
                <span className="hidden sm:inline">
                  Appointment Calendar
                </span>
                <span className="sm:hidden">Calendar</span>
              </CardTitle>
              <CardDescription className="text-[#87765E] text-xs sm:text-sm">
                {viewMode === "barber" && barberName
                  ? `Viewing appointments for ${barberName}`
                  : "All appointments across the system"}
              </CardDescription>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleToday}
                className="border-[#E8DCC8] text-[#5C4A3A] hover:bg-[#FBF7EF] text-xs sm:text-sm h-7 sm:h-9 px-2 sm:px-3"
              >
                Today
              </Button>
              <div className="flex items-center gap-0.5 sm:gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={
                    calendarView === "month"
                      ? handlePreviousMonth
                      : calendarView === "week"
                        ? handlePreviousWeek
                        : handlePreviousDay
                  }
                  className="h-7 w-7 sm:h-9 sm:w-9 border-[#E8DCC8]"
                >
                  <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={
                    calendarView === "month"
                      ? handleNextMonth
                      : calendarView === "week"
                        ? handleNextWeek
                        : handleNextDay
                  }
                  className="h-7 w-7 sm:h-9 sm:w-9 border-[#E8DCC8]"
                >
                  <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs
            value={calendarView}
            onValueChange={(v) =>
              setCalendarView(v as "month" | "week" | "day")
            }
            className="space-y-2 sm:space-y-4"
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-sm sm:text-xl text-[#5C4A3A]">
                {calendarView === "month" &&
                  currentDate.toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                {calendarView === "week" &&
                  `Week of ${currentDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
                {calendarView === "day" &&
                  currentDate.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
              </h3>
              <TabsList className="bg-[#FBF7EF] h-7 sm:h-9">
                <TabsTrigger
                  value="month"
                  className="data-[state=active]:bg-[#DB9D47] data-[state=active]:text-white text-[10px] sm:text-xs h-6 sm:h-8 px-2 sm:px-3"
                >
                  Month
                </TabsTrigger>
                <TabsTrigger
                  value="week"
                  className="data-[state=active]:bg-[#DB9D47] data-[state=active]:text-white text-[10px] sm:text-xs h-6 sm:h-8 px-2 sm:px-3"
                >
                  Week
                </TabsTrigger>
                <TabsTrigger
                  value="day"
                  className="data-[state=active]:bg-[#DB9D47] data-[state=active]:text-white text-[10px] sm:text-xs h-6 sm:h-8 px-2 sm:px-3"
                >
                  Day
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Month View */}
            <TabsContent
              value="month"
              className="space-y-2 sm:space-y-4"
            >
              <div className="border border-[#E8DCC8] rounded-lg overflow-hidden">
                {/* Calendar Header */}
                <div className="grid grid-cols-7 bg-[#FBF7EF]">
                  {[
                    "Sun",
                    "Mon",
                    "Tue",
                    "Wed",
                    "Thu",
                    "Fri",
                    "Sat",
                  ].map((day) => (
                    <div
                      key={day}
                      className="p-1 sm:p-2 text-center text-[10px] sm:text-xs text-[#5C4A3A] border-b border-r border-[#E8DCC8] last:border-r-0"
                    >
                      {day}
                    </div>
                  ))}
                </div>
                {/* Calendar Grid */}
                <div className="grid grid-cols-7">
                  {getCalendarDays().map((day, idx) => {
                    const dayAppointments =
                      getAppointmentsForDate(day);
                    return (
                      <div
                        key={idx}
                        className={cn(
                          "min-h-[60px] sm:min-h-[100px] p-1 sm:p-2 border-b border-r border-[#E8DCC8] last:border-r-0",
                          !isCurrentMonth(day) &&
                            "bg-[#FAFAF8]",
                          isToday(day) && "bg-[#FFF9F0]",
                        )}
                      >
                        <div
                          className={cn(
                            "text-[10px] sm:text-sm mb-0.5 sm:mb-1",
                            isToday(day)
                              ? "text-[#DB9D47]"
                              : isCurrentMonth(day)
                                ? "text-[#5C4A3A]"
                                : "text-[#B5A490]",
                          )}
                        >
                          {day.getDate()}
                        </div>
                        <div className="space-y-0.5 sm:space-y-1">
                          {dayAppointments
                            .slice(0, 2)
                            .map((apt) => (
                              <div
                                key={apt.id}
                                onClick={() =>
                                  handleAppointmentClick(apt)
                                }
                                className={cn(
                                  "text-[8px] sm:text-xs p-0.5 sm:p-1 rounded cursor-pointer hover:opacity-80 transition-opacity truncate",
                                  getStatusColors(apt.status),
                                )}
                              >
                                <span className="hidden sm:inline">
                                  {apt.time} - {apt.service}
                                </span>
                                <span className="sm:hidden">
                                  {apt.time.slice(0, 5)}
                                </span>
                              </div>
                            ))}
                          {dayAppointments.length > 2 && (
                            <div className="text-[8px] sm:text-xs text-[#87765E] pl-0.5 sm:pl-1">
                              +{dayAppointments.length - 2}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </TabsContent>

            {/* Week View */}
            <TabsContent value="week" className="space-y-4">
              <div className="border border-[#E8DCC8] rounded-lg overflow-hidden">
                {/* Header Row */}
                <div className="grid grid-cols-8 bg-[#FBF7EF]">
                  <div className="p-3 text-sm text-[#5C4A3A] font-medium border-b border-r border-[#E8DCC8]">
                    Time
                  </div>
                  {getWeekDays().map((day, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "p-3 text-center border-b border-r border-[#E8DCC8] last:border-r-0",
                        isToday(day) && "bg-[#FFF9F0]",
                      )}
                    >
                      <div
                        className={cn(
                          "text-xs uppercase tracking-wide mb-1 font-medium",
                          isToday(day)
                            ? "text-[#DB9D47]"
                            : "text-[#87765E]",
                        )}
                      >
                        {day.toLocaleDateString("en-US", {
                          weekday: "short",
                        })}
                      </div>
                      <div
                        className={cn(
                          "text-lg",
                          isToday(day)
                            ? "text-[#DB9D47] font-medium"
                            : "text-[#5C4A3A]",
                        )}
                      >
                        {day.getDate()}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Time Slots */}
                <div className="max-h-[500px] overflow-y-auto">
                  {timeSlots.map((time, timeIdx) => (
                    <div
                      key={time}
                      className={cn(
                        "grid grid-cols-8 min-h-[70px]",
                        timeIdx % 2 === 0
                          ? "bg-white"
                          : "bg-[#FFFDF8]",
                      )}
                    >
                      <div className="p-3 text-sm text-[#87765E] flex items-start font-medium border-b border-r border-[#E8DCC8]">
                        {time}
                      </div>
                      {getWeekDays().map((day, idx) => {
                        const dayAppointments =
                          getAppointmentsForDate(day).filter(
                            (apt) => apt.time === time,
                          );
                        return (
                          <div
                            key={idx}
                            className={cn(
                              "p-2 relative border-b border-r border-[#E8DCC8] last:border-r-0",
                              isToday(day) &&
                                timeIdx % 2 === 0 &&
                                "bg-[#FFFDF8]",
                              isToday(day) &&
                                timeIdx % 2 !== 0 &&
                                "bg-[#FFF9F0]",
                            )}
                          >
                            {dayAppointments.map((apt) => (
                              <div
                                key={apt.id}
                                onClick={() =>
                                  handleAppointmentClick(apt)
                                }
                                className={cn(
                                  "text-xs p-2 rounded cursor-pointer hover:opacity-90 transition-all mb-1",
                                  getStatusColors(apt.status),
                                )}
                              >
                                <div className="truncate font-medium">
                                  {apt.service}
                                </div>
                                {viewMode === "all" && (
                                  <div className="truncate text-xs opacity-90 mt-0.5">
                                    {apt.barber}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Day View */}
            <TabsContent value="day" className="space-y-4">
              <div className="border border-[#E8DCC8] rounded-lg overflow-hidden">
                <div className="max-h-[500px] overflow-y-auto">
                  {timeSlots.map((time, timeIdx) => {
                    const appointments = getAppointmentsForDate(
                      currentDate,
                    ).filter((apt) => apt.time === time);
                    return (
                      <div
                        key={time}
                        className={cn(
                          "flex border-b border-[#E8DCC8] min-h-[80px]",
                          timeIdx % 2 === 0
                            ? "bg-white"
                            : "bg-[#FFFDF8]",
                        )}
                      >
                        <div className="w-32 p-3 text-sm text-[#87765E] border-r border-[#E8DCC8] flex-shrink-0 flex items-start">
                          {time}
                        </div>
                        <div className="flex-1 p-2 space-y-2">
                          {appointments.map((apt) => (
                            <div
                              key={apt.id}
                              onClick={() =>
                                handleAppointmentClick(apt)
                              }
                              className={cn(
                                "p-3 rounded cursor-pointer hover:opacity-90 transition-all",
                                getStatusColors(apt.status),
                              )}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Scissors className="w-4 h-4 flex-shrink-0" />
                                    <span className="truncate">
                                      {apt.service}
                                    </span>
                                  </div>
                                  {viewMode === "all" && (
                                    <div className="text-sm opacity-90 truncate">
                                      {apt.barber}
                                    </div>
                                  )}
                                </div>
                                <div className="text-right ml-3 flex-shrink-0">
                                  <div className="text-sm">
                                    ₱{apt.price}
                                  </div>
                                  <Badge
                                    variant="outline"
                                    className="mt-1 bg-white/20 border-white/30 text-white text-xs"
                                  >
                                    {apt.status}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          ))}
                          {appointments.length === 0 && (
                            <div className="text-sm text-[#B5A490] italic p-3 opacity-60">
                              No appointments
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Legend */}
          <div className="mt-6 pt-6 border-t border-[#E8DCC8]">
            <h4 className="text-sm text-[#5C4A3A] mb-3">
              Status Legend:
            </h4>
            <div className="flex flex-wrap gap-3">
              <Badge
                variant="outline"
                className="bg-blue-500 text-white border-blue-600"
              >
                Upcoming/Confirmed
              </Badge>
              <Badge
                variant="outline"
                className="bg-orange-500 text-white border-orange-600"
              >
                Pending
              </Badge>
              <Badge
                variant="outline"
                className="bg-green-500 text-white border-green-600"
              >
                Completed
              </Badge>
              <Badge
                variant="outline"
                className="bg-red-500 text-white border-red-600"
              >
                Cancelled
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}