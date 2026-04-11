import { useState, useMemo, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Alert, AlertDescription } from "./ui/alert";
import {
  DollarSign,
  TrendingUp,
  Award,
  Calendar,
  Search,
  AlertCircle,
  Brain,
  Filter,
  Download,
  Loader2,
} from "lucide-react";
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
  Line,
  LineChart,
} from "recharts";
import type { Appointment } from "../App";
import { toast } from "sonner";
import { exportToCSV, formatDateForExport, formatCurrencyForExport } from "./utils/exportUtils";
import { Pagination } from "./ui/pagination";
import API from "../services/api.service";

// Utility function to parse date string without timezone issues
const parseLocalDate = (
  dateString: string | undefined,
): Date => {
  if (!dateString) {
    return new Date(); // Return current date if dateString is undefined
  }
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
};

// Helper to get date from appointment (handles both date and appointment_date fields)
const getAppointmentDate = (
  appointment: Appointment,
): string => {
  return (
    appointment.date ||
    appointment.appointment_date ||
    new Date().toISOString().split("T")[0]
  );
};

interface RevenueModuleProps {
  // This prop is kept for backward compatibility but will be ignored
  // Data will be fetched from database instead
  appointments?: Appointment[];
}

export function RevenueModule({
  appointments: _deprecatedAppointments,
}: RevenueModuleProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [timeFilter, setTimeFilter] = useState("week"); // day, week, month, year
  const [filterBarber, setFilterBarber] = useState("all");
  const [filterPriceRange, setFilterPriceRange] =
    useState("all");
  const [aiPredictions, setAiPredictions] = useState<any>(null);
  const [isLoadingPredictions, setIsLoadingPredictions] =
    useState(true);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Database state
  const [appointments, setAppointments] = useState<
    Appointment[]
  >([]);
  const [barbers, setBarbers] = useState<any[]>([]);

  // Fetch all data from database
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoadingData(true);
        const [appointmentsData, barbersData] =
          await Promise.all([
            API.appointments.getAll(),
            API.barbers.getAll(),
          ]);

        console.log("📊 Revenue Module - Appointments:", appointmentsData);
        console.log("💈 Revenue Module - Barbers:", barbersData);
        console.log("🔍 Sample appointment:", appointmentsData?.[0]);
        
        setAppointments(appointmentsData || []);
        setBarbers(barbersData || []);
      } catch (error) {
        console.error("Failed to fetch revenue data:", error);
        toast.error("Failed to load revenue data");
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchData();
  }, []);

  // Fetch AI predictions from backend
  useEffect(() => {
    const fetchPredictions = async () => {
      try {
        setIsLoadingPredictions(true);
        const data = await API.analytics.getRevenue({
          period: timeFilter as any,
        });

        // Extract prediction data from backend
        if (data && data.predictions) {
          setAiPredictions(data.predictions);
        } else {
          // Generate predictions from current data if backend doesn't provide them
          generateLocalPredictions();
        }
      } catch (error) {
        // Backend not available - generate local predictions
        generateLocalPredictions();
      } finally {
        setIsLoadingPredictions(false);
      }
    };

    if (!isLoadingData) {
      fetchPredictions();
    }
  }, [timeFilter, appointments, isLoadingData]);

  // Generate predictions based on local data
  const generateLocalPredictions = () => {
    const completedAppointments = appointments.filter(
      (a) => a.status === "completed",
    );

    if (completedAppointments.length === 0) {
      setAiPredictions({
        predictedRevenue: 0,
        expectedBookings: 0,
        peakDay: "N/A",
        trend: "No Data",
        growthRate: 0,
      });
      return;
    }

    // Calculate historical averages
    const totalRevenue = completedAppointments.reduce(
      (sum, a) => sum + (a.price || 0),
      0,
    );
    const avgRevenue =
      totalRevenue / completedAppointments.length;

    // Find peak day
    const dayCount = new Map<number, number>();
    completedAppointments.forEach((a) => {
      const dateStr = getAppointmentDate(a);
      const day = new Date(dateStr).getDay();
      dayCount.set(day, (dayCount.get(day) || 0) + 1);
    });
    const peakDayIndex =
      Array.from(dayCount.entries()).sort(
        (a, b) => b[1] - a[1],
      )[0]?.[0] || 0;
    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    // Calculate growth rate (simplified - compare first half vs second half)
    const midPoint = Math.floor(
      completedAppointments.length / 2,
    );
    const firstHalfRevenue = completedAppointments
      .slice(0, midPoint)
      .reduce((sum, a) => sum + (a.price || 0), 0);
    const secondHalfRevenue = completedAppointments
      .slice(midPoint)
      .reduce((sum, a) => sum + (a.price || 0), 0);
    const growthRate =
      midPoint > 0 && firstHalfRevenue > 0
        ? ((secondHalfRevenue / midPoint -
            firstHalfRevenue / midPoint) /
            (firstHalfRevenue / midPoint)) *
          100
        : 0;

    // Predict based on time filter
    let multiplier = 1;
    let expectedBookings = completedAppointments.length;

    switch (timeFilter) {
      case "day":
        multiplier = 1.05; // 5% optimistic increase
        expectedBookings = Math.round(
          (completedAppointments.length / 30) * 1.05,
        );
        break;
      case "week":
        multiplier = 1.08;
        expectedBookings = Math.round(
          (completedAppointments.length / 4) * 1.08,
        );
        break;
      case "month":
        multiplier = 1.12;
        expectedBookings = Math.round(
          completedAppointments.length * 1.12,
        );
        break;
      case "year":
        multiplier = 1.15;
        expectedBookings = Math.round(
          completedAppointments.length * 12 * 1.15,
        );
        break;
    }

    const predictedRevenue = Math.round(
      totalRevenue * multiplier,
    );

    setAiPredictions({
      predictedRevenue,
      expectedBookings,
      peakDay: dayNames[peakDayIndex],
      trend:
        growthRate > 0
          ? "Upward"
          : growthRate < 0
            ? "Downward"
            : "Stable",
      growthRate: Math.abs(growthRate),
    });
  };

  // Helper function to get barber name by ID
  const getBarberName = (barberId: string): string => {
    const barber = barbers.find((b) => b.id === barberId);
    if (barber) {
      return barber.name || barber.id;
    }
    return barberId;
  };

  // Convert completed appointments to transactions with real names
  const transactions = useMemo(
    () =>
      appointments
        .filter((a) => a.status === "completed")
        .map((a) => ({
          id: a.id,
          serviceName:
            a.service || a.service_name || "Unknown Service",
          price: a.price || a.total_amount || 0,
          date: getAppointmentDate(a),
          barber: getBarberName(a.barber || a.barber_id || ""),
          barberId: a.barber || a.barber_id || "",
        })),
    [appointments, barbers],
  );

  // Get unique barber names for filter
  const uniqueBarbers = Array.from(
    new Set(transactions.map((t) => t.barber)),
  );

  // Calculate analytics from real transactions with growth rates
  const analytics = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000)
      .toISOString()
      .split("T")[0];
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const lastMonth =
      currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear =
      currentMonth === 0 ? currentYear - 1 : currentYear;

    const dailyTransactions = transactions.filter(
      (t) => t.date === today,
    );
    const yesterdayTransactions = transactions.filter(
      (t) => t.date === yesterday,
    );
    const monthlyTransactions = transactions.filter((t) => {
      const txnDate = new Date(t.date);
      return (
        txnDate.getMonth() === currentMonth &&
        txnDate.getFullYear() === currentYear
      );
    });
    const lastMonthTransactions = transactions.filter((t) => {
      const txnDate = new Date(t.date);
      return (
        txnDate.getMonth() === lastMonth &&
        txnDate.getFullYear() === lastMonthYear
      );
    });

    const dailyRevenue = dailyTransactions.reduce(
      (sum, t) => sum + t.price,
      0,
    );
    const yesterdayRevenue = yesterdayTransactions.reduce(
      (sum, t) => sum + t.price,
      0,
    );
    const monthlyRevenue = monthlyTransactions.reduce(
      (sum, t) => sum + t.price,
      0,
    );
    const lastMonthRevenue = lastMonthTransactions.reduce(
      (sum, t) => sum + t.price,
      0,
    );

    // Calculate growth rates
    const dailyGrowth =
      yesterdayRevenue > 0
        ? ((dailyRevenue - yesterdayRevenue) /
            yesterdayRevenue) *
          100
        : 0;
    const monthlyGrowth =
      lastMonthRevenue > 0
        ? ((monthlyRevenue - lastMonthRevenue) /
            lastMonthRevenue) *
          100
        : 0;

    // Calculate transaction count growth
    const transactionGrowth =
      lastMonthTransactions.length > 0
        ? ((monthlyTransactions.length -
            lastMonthTransactions.length) /
            lastMonthTransactions.length) *
          100
        : 0;

    // Find top service
    const serviceRevenue = new Map<string, number>();
    transactions.forEach((t) => {
      serviceRevenue.set(
        t.serviceName,
        (serviceRevenue.get(t.serviceName) || 0) + t.price,
      );
    });
    const topService =
      Array.from(serviceRevenue.entries()).sort(
        (a, b) => b[1] - a[1],
      )[0]?.[0] || "N/A";

    return {
      dailyRevenue,
      dailyGrowth: Math.round(dailyGrowth * 10) / 10,
      monthlyRevenue,
      monthlyGrowth: Math.round(monthlyGrowth * 10) / 10,
      topService,
      totalTransactions: monthlyTransactions.length,
      transactionGrowth:
        Math.round(transactionGrowth * 10) / 10,
    };
  }, [transactions]);

  // Calculate revenue data based on time filter
  const dailyRevenueData = useMemo(() => {
    const now = new Date();
    let data: { day: string; revenue: number; id: string }[] = [];

    switch (timeFilter) {
      case "day": {
        // Hourly data for today
        const hours = Array.from({ length: 24 }, (_, i) => i);
        const hourlyRevenue = new Map<number, number>();

        transactions
          .filter(
            (t) => t.date === now.toISOString().split("T")[0],
          )
          .forEach((t) => {
            // Since we don't have hour data, distribute evenly
            const randomHour =
              Math.floor(Math.random() * 12) + 8; // 8am to 8pm
            hourlyRevenue.set(
              randomHour,
              (hourlyRevenue.get(randomHour) || 0) + t.price,
            );
          });

        data = hours.slice(8, 20).map((hour) => ({
          day: `${hour}:00`,
          revenue: hourlyRevenue.get(hour) || 0,
          id: `hour-${hour}`,
        }));
        break;
      }
      case "week": {
        // Last 7 days
        const days = [
          "Sun",
          "Mon",
          "Tue",
          "Wed",
          "Thu",
          "Fri",
          "Sat",
        ];
        const revenueByDay = new Map<number, number>();

        const weekAgo = new Date(now.getTime() - 7 * 86400000);
        transactions
          .filter((t) => new Date(t.date) >= weekAgo)
          .forEach((t) => {
            const day = new Date(t.date).getDay();
            revenueByDay.set(
              day,
              (revenueByDay.get(day) || 0) + t.price,
            );
          });

        data = days.map((day, index) => ({
          day,
          revenue: revenueByDay.get(index) || 0,
          id: `day-${index}-${day}`,
        }));
        break;
      }
      case "month": {
        // Last 30 days
        const revenueByDate = new Map<string, number>();

        for (let i = 29; i >= 0; i--) {
          const date = new Date(now.getTime() - i * 86400000);
          const dateStr = date.toISOString().split("T")[0];
          revenueByDate.set(dateStr, 0);
        }

        transactions.forEach((t) => {
          if (revenueByDate.has(t.date)) {
            revenueByDate.set(
              t.date,
              (revenueByDate.get(t.date) || 0) + t.price,
            );
          }
        });

        data = Array.from(revenueByDate.entries()).map(
          ([date, revenue], index) => ({
            day: new Date(date).getDate().toString(),
            revenue,
            id: `date-${date}-${index}`,
          }),
        );
        break;
      }
      case "year": {
        // Last 12 months
        const months = [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ];
        const revenueByMonth = new Map<number, number>();

        transactions.forEach((t) => {
          const month = new Date(t.date).getMonth();
          revenueByMonth.set(
            month,
            (revenueByMonth.get(month) || 0) + t.price,
          );
        });

        data = months.map((month, index) => ({
          day: month,
          revenue: revenueByMonth.get(index) || 0,
          id: `month-${index}-${month}`,
        }));
        break;
      }
    }

    return data;
  }, [transactions, timeFilter]);

  // Calculate top services data
  const topServicesData = useMemo(() => {
    const serviceRevenue = new Map<string, number>();
    transactions.forEach((t) => {
      serviceRevenue.set(
        t.serviceName,
        (serviceRevenue.get(t.serviceName) || 0) + t.price,
      );
    });

    return Array.from(serviceRevenue.entries())
      .map(([service, revenue], index) => ({ 
        service, 
        revenue,
        id: `service-${service.replace(/\s+/g, '-')}-${index}-${revenue}`
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [transactions]);

  const filteredTransactions = transactions.filter((txn) => {
    // Format date for better search experience (supports both YYYY-MM-DD and formatted dates)
    const formattedDate = parseLocalDate(
      txn.date,
    ).toLocaleDateString();

    const matchesSearch =
      txn.id
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      txn.serviceName
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      txn.barber
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      txn.price.toString().includes(searchQuery) ||
      txn.date.includes(searchQuery) ||
      formattedDate
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

    const matchesBarber =
      filterBarber === "all" || txn.barber === filterBarber;

    let matchesPrice = true;
    if (filterPriceRange === "low")
      matchesPrice = txn.price < 300;
    else if (filterPriceRange === "medium")
      matchesPrice = txn.price >= 300 && txn.price < 500;
    else if (filterPriceRange === "high")
      matchesPrice = txn.price >= 500;

    return matchesSearch && matchesBarber && matchesPrice;
  });

  // Calculate pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTransactions = filteredTransactions.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);

  const handleExportRevenue = () => {
    if (filteredTransactions.length === 0) {
      toast.error("No revenue data to export");
      return;
    }

    const exportData = filteredTransactions.map((txn) => ({
      "Transaction ID": txn.id,
      Service: txn.serviceName,
      Barber: txn.barber,
      Date: formatDateForExport(txn.date),
      Amount: formatCurrencyForExport(txn.price),
    }));

    const totalRevenue = filteredTransactions.reduce(
      (sum, txn) => sum + txn.price,
      0,
    );

    // Add summary row
    exportData.push({
      "Transaction ID": "",
      Service: "",
      Barber: "TOTAL",
      Date: "",
      Amount: formatCurrencyForExport(totalRevenue),
    } as any);

    const headers = [
      "Transaction ID",
      "Service",
      "Barber",
      "Date",
      "Amount",
    ];

    exportToCSV(exportData, headers, "supremo-barber-revenue");
    toast.success(
      `Exported ${filteredTransactions.length} transactions successfully!`,
    );
  };

  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#DB9D47]" />
        <span className="ml-2 text-[#87765E]">
          Loading revenue data...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Analytics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card className="border-[#E8DCC8]">
          <CardContent className="pt-4 md:pt-6 p-3 md:p-6">
            <div className="flex items-center justify-between mb-1 md:mb-2">
              <p className="w-4 h-4 md:w-5 md:h-5 text-[#DB9D47]">
                ₱
              </p>
              .
              <span
                className={`text-xs md:text-sm ${analytics.dailyGrowth >= 0 ? "text-[#94A670]" : "text-red-600"}`}
              >
                {analytics.dailyGrowth >= 0 ? "+" : ""}
                {analytics.dailyGrowth}%
              </span>
            </div>
            <div className="text-lg md:text-2xl text-[#5C4A3A] mb-0.5 md:mb-1">
              ₱{analytics.dailyRevenue.toLocaleString()}
            </div>
            <p className="text-xs md:text-sm text-[#87765E]">
              Today
            </p>
          </CardContent>
        </Card>

        <Card className="border-[#E8DCC8]">
          <CardContent className="pt-4 md:pt-6 p-3 md:p-6">
            <div className="flex items-center justify-between mb-1 md:mb-2">
              <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-[#94A670]" />
              <span
                className={`text-xs md:text-sm ${analytics.monthlyGrowth >= 0 ? "text-[#94A670]" : "text-red-600"}`}
              >
                {analytics.monthlyGrowth >= 0 ? "+" : ""}
                {analytics.monthlyGrowth}%
              </span>
            </div>
            <div className="text-lg md:text-2xl text-[#5C4A3A] mb-0.5 md:mb-1">
              ₱{analytics.monthlyRevenue.toLocaleString()}
            </div>
            <p className="text-xs md:text-sm text-[#87765E]">
              Monthly
            </p>
          </CardContent>
        </Card>

        <Card className="border-[#E8DCC8]">
          <CardContent className="pt-4 md:pt-6 p-3 md:p-6">
            <div className="flex items-center justify-between mb-1 md:mb-2">
              <Award className="w-4 h-4 md:w-5 md:h-5 text-[#D98555]" />
            </div>
            <div className="text-sm md:text-lg text-[#5C4A3A] mb-0.5 md:mb-1 truncate">
              {analytics.topService}
            </div>
            <p className="text-xs md:text-sm text-[#87765E]">
              Top Service
            </p>
          </CardContent>
        </Card>

        <Card className="border-[#E8DCC8]">
          <CardContent className="pt-4 md:pt-6 p-3 md:p-6">
            <div className="flex items-center justify-between mb-1 md:mb-2">
              <Calendar className="w-4 h-4 md:w-5 md:h-5 text-[#B89968]" />
              <span
                className={`text-xs md:text-sm ${analytics.transactionGrowth >= 0 ? "text-[#94A670]" : "text-red-600"}`}
              >
                {analytics.transactionGrowth >= 0 ? "+" : ""}
                {analytics.transactionGrowth}%
              </span>
            </div>
            <div className="text-lg md:text-2xl text-[#5C4A3A] mb-0.5 md:mb-1">
              {analytics.totalTransactions}
            </div>
            <p className="text-xs md:text-sm text-[#87765E]">
              Transactions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* AI Revenue Prediction */}
      <Card className="border-[#DB9D47] border-2 bg-gradient-to-br from-[#FBF7EF] to-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-[#DB9D47]" />
              <CardTitle className="text-[#5C4A3A]">
                AI Revenue Prediction
              </CardTitle>
            </div>
            <Select
              value={timeFilter}
              onValueChange={setTimeFilter}
            >
              <SelectTrigger className="w-[180px] border-[#E8DCC8]">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Daily</SelectItem>
                <SelectItem value="week">Weekly</SelectItem>
                <SelectItem value="month">Monthly</SelectItem>
                <SelectItem value="year">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <CardDescription className="text-[#87765E]">
            Predictive analytics based on historical data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-white border border-[#E8DCC8]">
              <p className="text-sm text-[#87765E]">
                Predicted Revenue
              </p>
              {isLoadingPredictions ? (
                <p className="text-2xl text-[#5C4A3A] mt-1">
                  ...
                </p>
              ) : (
                <>
                  <p className="text-2xl text-[#5C4A3A] mt-1">
                    ₱
                    {aiPredictions?.predictedRevenue?.toLocaleString() ||
                      "0"}
                  </p>
                  <p
                    className={`text-xs mt-1 ${aiPredictions?.growthRate >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {aiPredictions?.growthRate >= 0 ? "+" : ""}
                    {aiPredictions?.growthRate?.toFixed(1) ||
                      "0"}
                    % growth
                  </p>
                </>
              )}
            </div>
            <div className="p-4 rounded-lg bg-white border border-[#E8DCC8]">
              <p className="text-sm text-[#87765E]">
                Expected Bookings
              </p>
              {isLoadingPredictions ? (
                <p className="text-2xl text-[#5C4A3A] mt-1">
                  ...
                </p>
              ) : (
                <>
                  <p className="text-2xl text-[#5C4A3A] mt-1">
                    {aiPredictions?.expectedBookings || "0"}
                  </p>
                  <p className="text-xs text-[#87765E] mt-1">
                    Projected bookings
                  </p>
                </>
              )}
            </div>
            <div className="p-4 rounded-lg bg-white border border-[#E8DCC8]">
              <p className="text-sm text-[#87765E]">Peak Day</p>
              {isLoadingPredictions ? (
                <p className="text-lg text-[#5C4A3A] mt-1">
                  ...
                </p>
              ) : (
                <>
                  <p className="text-lg text-[#5C4A3A] mt-1">
                    {aiPredictions?.peakDay || "N/A"}
                  </p>
                  <p className="text-xs text-[#87765E] mt-1">
                    Highest demand
                  </p>
                </>
              )}
            </div>
            <div className="p-4 rounded-lg bg-white border border-[#E8DCC8]">
              <p className="text-sm text-[#87765E]">Trend</p>
              {isLoadingPredictions ? (
                <p className="text-lg text-[#5C4A3A] mt-1">
                  ...
                </p>
              ) : (
                <>
                  <p className="text-lg text-[#5C4A3A] mt-1">
                    {aiPredictions?.trend || "No Data"}
                  </p>
                  <p
                    className={`text-xs mt-1 ${aiPredictions?.trend === "Upward" ? "text-green-600" : aiPredictions?.trend === "Downward" ? "text-red-600" : "text-[#87765E]"}`}
                  >
                    {aiPredictions?.trend === "Upward"
                      ? "Positive outlook"
                      : aiPredictions?.trend === "Downward"
                        ? "Needs attention"
                        : "Stable outlook"}
                  </p>
                </>
              )}
            </div>
          </div>

          <Alert className="border-[#DB9D47] bg-orange-50">
            <AlertCircle className="w-4 h-4 text-[#DB9D47]" />
            <AlertDescription className="text-sm text-[#5C4A3A]">
              <strong>Disclaimer:</strong> AI predictions are
              based on historical data patterns and should be
              used as guidance only. Actual results may vary
              based on market conditions, seasonality, and
              external factors.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-[#E8DCC8]">
          <CardHeader>
            <CardTitle className="text-[#5C4A3A]">
              Revenue Trend
            </CardTitle>
            <CardDescription className="text-[#87765E]">
              {timeFilter === "day"
                ? "Hourly"
                : timeFilter === "week"
                  ? "Last 7 days"
                  : timeFilter === "month"
                    ? "Last 30 days"
                    : "Last 12 months"}{" "}
              performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                revenue: {
                  label: "Revenue",
                  color: "#DB9D47",
                },
              }}
              className="h-[250px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyRevenueData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#E8DCC8"
                  />
                  <XAxis dataKey="day" stroke="#87765E" />
                  <YAxis stroke="#87765E" />
                  <ChartTooltip
                    content={<ChartTooltipContent />}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#DB9D47"
                    strokeWidth={2}
                    dot={{ fill: "#DB9D47" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="border-[#E8DCC8]">
          <CardHeader>
            <CardTitle className="text-[#5C4A3A]">
              Top Services by Revenue
            </CardTitle>
            <CardDescription className="text-[#87765E]">
              Best performing services
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                revenue: {
                  label: "Revenue",
                  color: "#D98555",
                },
              }}
              className="h-[250px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topServicesData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#E8DCC8"
                  />
                  <XAxis
                    dataKey="service"
                    stroke="#87765E"
                    fontSize={12}
                  />
                  <YAxis stroke="#87765E" />
                  <ChartTooltip
                    content={<ChartTooltipContent />}
                  />
                  <Bar
                    dataKey="revenue"
                    fill="#D98555"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card className="border-[#E8DCC8]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-[#5C4A3A]">
                Transaction History
              </CardTitle>
              <CardDescription className="text-[#87765E]">
                Detailed revenue breakdown by service
              </CardDescription>
            </div>
            <Button
              className="bg-[#DB9D47] hover:bg-[#C88A35] text-white"
              onClick={handleExportRevenue}
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#87765E]" />
              <Input
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-[#E8DCC8]"
              />
            </div>
            <div className="flex gap-3">
              <Select
                value={filterBarber}
                onValueChange={setFilterBarber}
              >
                <SelectTrigger className="w-full md:w-48 border-[#E8DCC8]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by barber" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    All Barbers
                  </SelectItem>
                  {uniqueBarbers.map((barber) => (
                    <SelectItem key={barber} value={barber}>
                      {barber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filterPriceRange}
                onValueChange={setFilterPriceRange}
              >
                <SelectTrigger className="w-full md:w-48 border-[#E8DCC8]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Price range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    All Prices
                  </SelectItem>
                  <SelectItem value="low">
                    Low (&lt;₱300)
                  </SelectItem>
                  <SelectItem value="medium">
                    Medium (₱300-500)
                  </SelectItem>
                  <SelectItem value="high">
                    High (₱500+)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="rounded-md border border-[#E8DCC8] overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#FBF7EF]">
                  <TableHead className="text-[#5C4A3A]">
                    ID
                  </TableHead>
                  <TableHead className="text-[#5C4A3A]">
                    Service
                  </TableHead>
                  <TableHead className="text-[#5C4A3A]">
                    Barber
                  </TableHead>
                  <TableHead className="text-[#5C4A3A]">
                    Date
                  </TableHead>
                  <TableHead className="text-[#5C4A3A] text-right">
                    Price
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-[#87765E] py-8"
                    >
                      No transactions found
                    </TableCell>
                  </TableRow>
                ) : (
                  currentTransactions.map((txn) => (
                    <TableRow
                      key={txn.id}
                      className="hover:bg-[#FBF7EF]"
                    >
                      <TableCell className="font-mono text-xs text-[#87765E]">
                        {txn.id.slice(0, 8)}
                      </TableCell>
                      <TableCell className="text-[#5C4A3A]">
                        {txn.serviceName}
                      </TableCell>
                      <TableCell className="text-[#5C4A3A]">
                        {txn.barber}
                      </TableCell>
                      <TableCell className="text-[#5C4A3A]">
                        {parseLocalDate(
                          txn.date,
                        ).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-medium text-[#94A670]">
                          ₱{txn.price.toLocaleString()}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Summary Footer */}
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-[#87765E]">
              Showing {filteredTransactions.length} completed transactions
            </span>
            <span className="font-medium text-[#5C4A3A]">
              Total Revenue: <span className="text-[#94A670]">₱{filteredTransactions.reduce((sum, txn) => sum + txn.price, 0).toLocaleString()}</span>
            </span>
          </div>

          {/* Pagination */}
          <Pagination
            totalItems={filteredTransactions.length}
            itemsPerPage={itemsPerPage}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(newSize) => {
              setItemsPerPage(newSize);
              setCurrentPage(1);
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}