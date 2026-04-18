import { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import {
  TrendingUp,
  Award,
  Calendar,
  Star,
  CheckCircle2,
} from "lucide-react";
import { FaPesoSign } from "react-icons/fa6";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "./ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Badge } from "./ui/badge";
import type { Appointment, User } from "../App";
import API from "../services/api.service";

interface BarberEarningsOverviewProps {
  appointments: Appointment[];
  user: User;
}

interface EarningsData {
  totalEarnings: number;
  totalAppointments: number;
  averageEarningPerAppointment: number;
  earningsByDate: Array<{
    date: string;
    amount: number;
    count: number;
  }>;
}

interface BarberAppointment {
  id: string;
  appointmentDate?: string;
  appointment_date?: string;
  status: string;
  totalPrice?: number;
  total_amount?: number;
  price?: number;
  serviceName?: string;
  service_name?: string;
  service?: string;
  barberName?: string;
  barber_name?: string;
  barber?: string;
  customerName?: string;
  customer_name?: string;
  customer?: string;
}

interface Review {
  id: string;
  barberId?: string;
  barber_id?: string;
  rating: number;
}

export function BarberEarningsOverview({
  appointments,
  user,
}: BarberEarningsOverviewProps) {
  const [earningsData, setEarningsData] =
    useState<EarningsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [barberId, setBarberId] = useState<string | null>(null);
  const [barberAppointments, setBarberAppointments] = useState<
    BarberAppointment[]
  >([]);
  const [barberReviews, setBarberReviews] = useState<Review[]>(
    [],
  );

  // Fetch barber ID from user ID
  useEffect(() => {
    const fetchBarberData = async () => {
      try {
        const barberProfile = await API.barbers.getByUserId(
          user.id,
        );
        if (barberProfile) {
          setBarberId(barberProfile.id);
        }
      } catch (error) {
        console.error("Error fetching barber profile:", error);
      }
    };

    if (user?.id) {
      fetchBarberData();
    }
  }, [user?.id]);

  // Fetch barber appointments
  useEffect(() => {
    const fetchAppointments = async () => {
      if (!barberId) return;

      try {
        const data =
          await API.appointments.getByBarberId(barberId);
        console.log("📊 Barber Appointments fetched:", data);
        console.log("📊 Sample appointment:", data?.[0]);
        setBarberAppointments(data || []);
      } catch (error) {
        console.warn(
          "⚠️ Appointments data not available:",
          error,
        );
        setBarberAppointments([]);
      }
    };

    fetchAppointments();
  }, [barberId]);

  // Fetch barber reviews
  useEffect(() => {
    const fetchReviews = async () => {
      if (!barberId) return;

      try {
        const data = await API.reviews.getByBarberId(barberId);
        console.log("⭐ Barber Reviews fetched:", data);
        console.log("⭐ Reviews count:", data?.length);
        console.log("⭐ Sample review:", data?.[0]);
        setBarberReviews(data || []);
      } catch (error) {
        console.warn("⚠️ Reviews data not available:", error);
        setBarberReviews([]);
      }
    };

    fetchReviews();
  }, [barberId]);

  // Fetch earnings data from database
  useEffect(() => {
    const fetchEarnings = async () => {
      if (!barberId) return;

      setIsLoading(true);
      try {
        // Calculate date range for current week
        const today = new Date();
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        const startDate = weekStart.toISOString().split("T")[0];
        const endDate = weekEnd.toISOString().split("T")[0];

        const data = await API.barbers.getEarnings(barberId, {
          startDate,
          endDate,
        });
        setEarningsData(data);
      } catch (error) {
        console.warn(
          "⚠️ Earnings data not available - using fallback data",
        );
        console.log(
          "ℹ️ This is normal if no completed appointments exist yet",
        );
        // Fallback to empty data
        setEarningsData({
          totalEarnings: 0,
          totalAppointments: 0,
          averageEarningPerAppointment: 0,
          earningsByDate: [],
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchEarnings();
  }, [barberId]);

  // Calculate weekly data from database earnings
  const weeklyData = useMemo(() => {
    const dayNames = [
      "Sun",
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri",
      "Sat",
    ];
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay()); // Start of current week (Sunday)

    const dailyEarnings = Array(7)
      .fill(0)
      .map((_, index) => {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + index);
        const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

        // Find earnings from database data
        const dayData = earningsData?.earningsByDate?.find(
          (e) => e.date === dateString,
        );
        const earnings = dayData?.amount || 0;

        return {
          day: dayNames[index],
          earnings,
        };
      });

    return dailyEarnings;
  }, [earningsData]);

  // Calculate stats from database data
  const stats = useMemo(() => {
    const today = new Date();
    const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    console.log("💡 Calculating stats...");
    console.log(
      "💡 Total appointments:",
      barberAppointments.length,
    );
    console.log("💡 Total reviews:", barberReviews.length);

    // All appointments (excluding cancelled) for total bookings
    const allAppointments = barberAppointments.filter(
      (apt) => apt.status !== "cancelled",
    );
    const completedAppointments = barberAppointments.filter(
      (apt) => apt.status === "completed",
    );

    console.log(
      "💡 Completed appointments:",
      completedAppointments.length,
    );

    // Total bookings count (all non-cancelled appointments)
    const totalBookings = allAppointments.length;

    // Total earnings from all completed appointments
    // Handle both camelCase and snake_case field names
    const totalEarnings = completedAppointments.reduce(
      (sum, apt) => {
        const price =
          apt.totalPrice || apt.total_amount || apt.price || 0;
        console.log("💰 Appointment price:", price, "Fields:", {
          totalPrice: apt.totalPrice,
          total_amount: apt.total_amount,
          price: apt.price,
        });
        return sum + price;
      },
      0,
    );

    console.log("💰 Total Earnings calculated:", totalEarnings);

    // Completion rate
    const completionRate =
      allAppointments.length > 0
        ? Math.round(
            (completedAppointments.length /
              allAppointments.length) *
              100,
          )
        : 0;

    // Average rating from reviews
    // Handle both camelCase and snake_case for barberId
    const relevantReviews = barberReviews.filter((review) => {
      const reviewBarberId =
        review.barberId || review.barber_id;
      return reviewBarberId === barberId;
    });

    console.log(
      "⭐ Relevant reviews for barber:",
      relevantReviews.length,
    );

    const avgRating =
      relevantReviews.length > 0
        ? (
            relevantReviews.reduce((sum, review) => {
              console.log("⭐ Review rating:", review.rating);
              return sum + (review.rating || 0);
            }, 0) / relevantReviews.length
          ).toFixed(1)
        : "0";

    console.log("⭐ Average Rating calculated:", avgRating);

    // Weekly stats from database
    const weeklyEarnings = earningsData?.totalEarnings || 0;

    // Find the best day
    const maxEarnings = Math.max(
      ...weeklyData.map((d) => d.earnings),
    );
    const topDay =
      weeklyData.find((d) => d.earnings === maxEarnings)?.day ||
      "N/A";

    return {
      totalBookings,
      totalEarnings,
      completionRate,
      avgRating,
      weeklyEarnings,
      topDay,
      completedCuts: earningsData?.totalAppointments || 0,
    };
  }, [
    earningsData,
    weeklyData,
    barberAppointments,
    barberReviews,
    barberId,
  ]);

  const topStats = [
    {
      label: "Total Bookings",
      value: stats.totalBookings.toString(),
      icon: Calendar,
      color: "bg-[#DB9D47]",
      trend: "+12%",
      trendUp: true,
    },
    {
      label: "Total Earnings",
      value: `₱${stats.totalEarnings}`,
      icon: FaPesoSign,
      color: "bg-[#94A670]",
      trend: "+8%",
      trendUp: true,
    },
    {
      label: "Completion Rate",
      value: `${stats.completionRate}%`,
      icon: CheckCircle2,
      color: "bg-[#D98555]",
      trend: "+3%",
      trendUp: true,
    },
    {
      label: "Average Rating",
      value: stats.avgRating,
      icon: Star,
      color: "bg-[#B89968]",
      trend: "+0.2",
      trendUp: true,
    },
  ];

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">
      {/* Stats Cards - New Layout matching the image */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {topStats.map((stat, index) => (
          <div
            key={index}
            className="flex flex-col p-3 sm:p-4 bg-[#FBF7EF] rounded-lg border border-[#E8DCC8] hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-2">
              <div className={`${stat.color} p-2 rounded-lg`}>
                <stat.icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div
                className={`flex items-center gap-1 text-xs ${stat.trendUp ? "text-green-600" : "text-red-600"}`}
              >
                <TrendingUp className="w-3 h-3" />
                <span className="hidden sm:inline">
                  {stat.trend}
                </span>
              </div>
            </div>
            <p className="text-xl sm:text-2xl text-[#5C4A3A] mb-1 truncate">
              {stat.value}
            </p>
            <p className="text-xs sm:text-sm text-[#87765E] truncate">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Weekly Chart */}
      <Card className="border-[#E8DCC8]">
        <CardHeader>
          <CardTitle className="text-[#5C4A3A]">
            Weekly Earnings Breakdown
          </CardTitle>
          <CardDescription className="text-[#87765E]">
            Daily earnings for the current week
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 overflow-x-auto">
          <ChartContainer
            config={{
              earnings: {
                label: "Earnings",
                color: "#DB9D47",
              },
            }}
            className="h-[300px] sm:h-[400px] w-full min-w-[300px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={weeklyData}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 20,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#E8DCC8"
                />
                <XAxis
                  dataKey="day"
                  stroke="#87765E"
                  style={{ fontSize: "14px" }}
                />
                <YAxis
                  stroke="#87765E"
                  style={{ fontSize: "14px" }}
                  tickFormatter={(value) => `₱${value}`}
                />
                <ChartTooltip
                  content={<ChartTooltipContent />}
                />
                <Bar
                  dataKey="earnings"
                  fill="#DB9D47"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={60}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Revenue Details Table */}
      <Card className="border-[#E8DCC8]">
        <CardHeader>
          <CardTitle className="text-[#5C4A3A]">
            Revenue Details
          </CardTitle>
          <CardDescription className="text-[#87765E]">
            Completed appointments with customer information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border border-[#E8DCC8] rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#FBF7EF]">
                    <TableHead className="text-[#5C4A3A]">ID</TableHead>
                    <TableHead className="text-[#5C4A3A]">Service</TableHead>
                    
                    <TableHead className="text-[#5C4A3A]">Customer</TableHead>
                    <TableHead className="text-[#5C4A3A]">Date</TableHead>
                    <TableHead className="text-[#5C4A3A] text-right">Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {barberAppointments
                    .filter((apt) => apt.status === "completed")
                    .sort((a, b) => {
                      const dateA = new Date(a.appointmentDate || a.appointment_date || "");
                      const dateB = new Date(b.appointmentDate || b.appointment_date || "");
                      return dateB.getTime() - dateA.getTime();
                    })
                    .map((appointment) => {
                      const appointmentId = appointment.id.substring(0, 8);
                      const service = appointment.serviceName || appointment.service_name || appointment.service || "N/A";
                      const barber = appointment.barberName || appointment.barber_name || appointment.barber || user.name;
                      const customer = appointment.customerName || appointment.customer_name || appointment.customer || "N/A";
                      const date = appointment.appointmentDate || appointment.appointment_date || "N/A";
                      const price = appointment.totalPrice || appointment.total_amount || appointment.price || 0;

                      return (
                        <TableRow key={appointment.id} className="hover:bg-[#FBF7EF]">
                          <TableCell className="font-mono text-xs text-[#87765E]">
                            {appointmentId}
                          </TableCell>
                          <TableCell className="text-[#5C4A3A]">
                            {service}
                          </TableCell>
                         
                          <TableCell className="text-[#5C4A3A]">
                            {customer}
                          </TableCell>
                          <TableCell className="text-[#5C4A3A]">
                            {new Date(date).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-medium text-[#94A670]">
                              ₱{price.toLocaleString()}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  {barberAppointments.filter((apt) => apt.status === "completed").length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-[#87765E]">
                        No completed appointments yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Summary Footer */}
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-[#87765E]">
              Showing {barberAppointments.filter((apt) => apt.status === "completed").length} completed appointments
            </span>
            <span className="font-medium text-[#5C4A3A]">
              Total Revenue: <span className="text-[#94A670]">₱{stats.totalEarnings.toLocaleString()}</span>
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}