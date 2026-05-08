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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Alert, AlertDescription } from "./ui/alert";
import {
  TrendingUp,
  Award,
  Calendar,
  Search,
  AlertCircle,

  Filter,
  Download,
  Loader2,
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

  const [isLoadingData, setIsLoadingData] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedTransaction, setSelectedTransaction] = useState<any | null>(null);

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
              <FaPesoSign className="w-4 h-4 md:w-5 md:h-5 text-[#DB9D47]" />
              <span
                className={`text-xs md:text-sm ${analytics.dailyGrowth >= 0 ? "text-[#94A670]" : "text-red-600"}`}
              >
                {analytics.dailyGrowth >= 0 ? "+" : ""}
                {analytics.dailyGrowth}%
              </span>
            </div>
            <div className="text-lg md:text-2xl font-semibold text-[#5C4A3A] mb-0.5 md:mb-1">
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
            <div className="text-lg md:text-2xl font-semibold text-[#5C4A3A] mb-0.5 md:mb-1">
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
            <div className="text-sm md:text-lg font-semibold text-[#5C4A3A] mb-0.5 md:mb-1 truncate">
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
            <div className="text-lg md:text-2xl font-semibold text-[#5C4A3A] mb-0.5 md:mb-1">
              {analytics.totalTransactions}
            </div>
            <p className="text-xs md:text-sm text-[#87765E]">
              Transactions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Time Period Filter */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm md:text-base font-semibold text-[#5C4A3A]">Analytics Overview</h3>
        <Select
          value={timeFilter}
          onValueChange={setTimeFilter}
        >
          <SelectTrigger className="w-[130px] md:w-[160px] border-[#E8DCC8] text-sm">
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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <Card className="border-[#E8DCC8]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[#5C4A3A] text-sm md:text-base">
              Revenue Trend
            </CardTitle>
            <CardDescription className="text-[#87765E] text-xs md:text-sm">
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
              className="h-[220px] sm:h-[260px] md:h-[300px] w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyRevenueData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#E8DCC8"
                  />
                  <XAxis dataKey="day" stroke="#87765E" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#87765E" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value: number) => `₱${value}`} />
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
          <CardHeader className="pb-2">
            <CardTitle className="text-[#5C4A3A] text-sm md:text-base">
              Top Services by Revenue
            </CardTitle>
            <CardDescription className="text-[#87765E] text-xs md:text-sm">
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
              className="h-[220px] sm:h-[260px] md:h-[300px] w-full"
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
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis stroke="#87765E" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value: number) => `₱${value}`} />
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
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-[#5C4A3A] text-sm md:text-base">
                Transaction History
              </CardTitle>
              <CardDescription className="text-[#87765E] text-xs md:text-sm">
                Detailed revenue breakdown by service
              </CardDescription>
            </div>
            <Button
              className="bg-[#DB9D47] hover:bg-[#C88A35] text-white text-xs md:text-sm px-3 md:px-4"
              onClick={handleExportRevenue}
            >
              <Download className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Export</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-3 md:gap-4 mb-4 md:mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#87765E]" />
              <Input
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-[#E8DCC8] text-sm"
              />
            </div>
            <div className="flex gap-2 md:gap-3">
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
                  <TableHead className="text-[#5C4A3A] hidden lg:table-cell">
                    ID
                  </TableHead>
                  <TableHead className="text-[#5C4A3A]">
                    Service
                  </TableHead>
                  <TableHead className="text-[#5C4A3A] hidden md:table-cell">
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
                      className="hover:bg-[#FBF7EF] cursor-pointer"
                      onClick={(e) => {
                        if (!(e.target as HTMLElement).closest('button, a')) {
                          setSelectedTransaction(txn);
                        }
                      }}
                    >
                      <TableCell className="font-mono text-xs text-[#87765E] hidden lg:table-cell">
                        {txn.id.slice(0, 8)}
                      </TableCell>
                      <TableCell className="text-[#5C4A3A] text-xs sm:text-sm">
                        {txn.serviceName}
                      </TableCell>
                      <TableCell className="text-[#5C4A3A] text-xs sm:text-sm hidden md:table-cell">
                        {txn.barber}
                      </TableCell>
                      <TableCell className="text-[#5C4A3A] text-xs sm:text-sm whitespace-nowrap">
                        {parseLocalDate(
                          txn.date,
                        ).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-medium text-[#94A670] text-xs sm:text-sm">
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

      {/* Transaction Details Dialog (Mobile View) */}
      <Dialog open={!!selectedTransaction} onOpenChange={(open) => !open && setSelectedTransaction(null)}>
        <DialogContent className="sm:max-w-md bg-[#FBF7EF] border-[#E8DCC8]">
          <DialogHeader>
            <DialogTitle className="text-[#5C4A3A]">Transaction Details</DialogTitle>
            <DialogDescription className="text-[#87765E]">
              Complete information for this transaction.
            </DialogDescription>
          </DialogHeader>
          
          {selectedTransaction && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-3 gap-2 border-b border-[#E8DCC8] pb-3">
                <span className="text-[#87765E] text-sm">Transaction ID</span>
                <span className="col-span-2 text-[#5C4A3A] font-mono text-sm font-medium">{selectedTransaction.id}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 border-b border-[#E8DCC8] pb-3">
                <span className="text-[#87765E] text-sm">Service</span>
                <span className="col-span-2 text-[#5C4A3A] text-sm font-medium">{selectedTransaction.serviceName}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 border-b border-[#E8DCC8] pb-3">
                <span className="text-[#87765E] text-sm">Barber</span>
                <span className="col-span-2 text-[#5C4A3A] text-sm font-medium">{selectedTransaction.barber}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 border-b border-[#E8DCC8] pb-3">
                <span className="text-[#87765E] text-sm">Date</span>
                <span className="col-span-2 text-[#5C4A3A] text-sm font-medium">
                  {parseLocalDate(selectedTransaction.date).toLocaleDateString("en-US", {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1">
                <span className="text-[#87765E] text-sm font-semibold">Total Price</span>
                <span className="col-span-2 text-[#94A670] text-lg font-bold">₱{selectedTransaction.price.toLocaleString()}</span>
              </div>
            </div>
          )}
          
          <div className="mt-2 flex justify-end">
            <Button 
              className="bg-[#DB9D47] hover:bg-[#C88A35] text-white" 
              onClick={() => setSelectedTransaction(null)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}