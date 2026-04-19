import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "./ui/tabs";
import {
  LayoutDashboard,
  Settings,
  Shield,
  Database,
  Activity,
  LogOut,
  Calendar,
  AlertTriangle,
  Clock,
  Users,
  Star,
  Receipt,
  CheckCircle,
} from "lucide-react";
import { FaPesoSign } from "react-icons/fa6";
import { AnalyticsOverview } from "./AnalyticsOverview";
import { SystemSettings } from "./SystemSettings";
import { AuditLogs } from "./AuditLogs";
import { ReviewsManagement } from "./ReviewsManagement";
import { AppointmentManagement } from "./AppointmentManagement";
import { PaymentVerification } from "./PaymentVerification";
import { ServicesModule } from "./ServicesModule";
import type { User, Appointment } from "../App";
import API from "../services/api.service";

interface SuperAdminDashboardProps {
  user: User;
  onLogout: () => void;
  appointments?: Appointment[];
  onUpdateAppointment?: (appointmentId: string, updates: Partial<Appointment>) => void;
}

export function SuperAdminDashboard({
  user,
  onLogout,
  appointments = [],
  onUpdateAppointment = () => { },
}: SuperAdminDashboardProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);

  // Fetch all users on component mount
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoadingUsers(true);
        const data = await API.users.getAll();
        setUsers(data);
      } catch (error) {
        // Silently handle error - backend might not be running
        // Just show 0 users instead of error
        setUsers([]);
      } finally {
        setIsLoadingUsers(false);
      }
    };
    fetchUsers();
  }, []);

  // Calculate stats from real data
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const activeBookings = appointments.filter(
    apt => apt.status === 'pending' || apt.status === 'confirmed' || apt.status === 'upcoming'
  ).length;

  const monthlyRevenue = appointments
    .filter(apt => {
      if (apt.status !== 'completed') return false;
      const aptDate = new Date(apt.date);
      return aptDate.getMonth() === currentMonth && aptDate.getFullYear() === currentYear;
    })
    .reduce((sum, apt) => sum + apt.price, 0);

  const stats = [
    {
      label: "Total Users",
      value: isLoadingUsers ? "..." : users.length.toString(),
      icon: Users,
      color: "text-[#DB9D47]",
    },
    {
      label: "Active Bookings",
      value: activeBookings.toString(),
      icon: Calendar,
      color: "text-[#94A670]",
    },
    {
      label: "Monthly Revenue",
      value: `₱${monthlyRevenue.toLocaleString()}`,
      icon: FaPesoSign,
      color: "text-[#D98555]",
    },
  ];

  return (
    <div className="min-h-screen bg-[#FFFDF8]">
      {/* Header - Clean White Design */}
      <header className="bg-white border-b-2 border-[#E8DCC8] sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#DB9D47] to-[#D98555] rounded-lg flex items-center justify-center shadow-md">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-[#5C4A3A]">
                  Super Admin Dashboard
                </h1>
                <p className="text-sm text-[#87765E]">
                  {user.name}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={onLogout}
              className="border-[#DB9D47] text-[#5C4A3A] hover:bg-[#DB9D47] hover:text-white transition-all"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 bg-[#F8F0E0] border border-[#E8DCC8] flex-wrap">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-[#DB9D47] data-[state=active]:text-white"
            >
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="services"
              className="data-[state=active]:bg-[#DB9D47] data-[state=active]:text-white"
            >
              <Database className="w-4 h-4 mr-2" />
              Services
            </TabsTrigger>
            <TabsTrigger
              value="bookings"
              className="data-[state=active]:bg-[#DB9D47] data-[state=active]:text-white"
            >
              <Receipt className="w-4 h-4 mr-2" />
              Bookings
            </TabsTrigger>
            <TabsTrigger
              value="payments"
              className="data-[state=active]:bg-[#DB9D47] data-[state=active]:text-white"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Payments
            </TabsTrigger>
            <TabsTrigger
              value="reviews"
              className="data-[state=active]:bg-[#DB9D47] data-[state=active]:text-white"
            >
              <Star className="w-4 h-4 mr-2" />
              Reviews
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="data-[state=active]:bg-[#DB9D47] data-[state=active]:text-white"
            >
              <Settings className="w-4 h-4 mr-2" />
              System Settings
            </TabsTrigger>
            <TabsTrigger
              value="logs"
              className="data-[state=active]:bg-[#DB9D47] data-[state=active]:text-white"
            >
              <Activity className="w-4 h-4 mr-2" />
              Audit Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat, index) => (
                <Card
                  key={index}
                  className="border-[#E8DCC8] hover:shadow-lg transition-shadow"
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-2">
                      <stat.icon
                        className={`w-5 h-5 ${stat.color}`}
                      />
                    </div>
                    <div className="text-2xl text-[#5C4A3A] mb-1">
                      {stat.value}
                    </div>
                    <p className="text-sm text-[#87765E]">
                      {stat.label}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Analytics with navigation handlers */}
            <AnalyticsOverview
              onNavigateToPaymentVerification={() => setActiveTab('payments')}
              onNavigateToBookings={() => setActiveTab('bookings')}
            />
          </TabsContent>

          <TabsContent value="services">
            <ServicesModule
              user={user}
              onBookService={(serviceId) => {
                setActiveTab("bookings");
              }}
            />
          </TabsContent>

          <TabsContent value="bookings">
            <AppointmentManagement user={user} />
          </TabsContent>

          <TabsContent value="payments">
            <PaymentVerification
              appointments={appointments}
              onUpdateAppointment={onUpdateAppointment}
              userRole="admin"
              currentUser={user ? { id: user.id, name: user.name, email: user.email } : undefined}
            />
          </TabsContent>

          <TabsContent value="reviews">
            <ReviewsManagement />
          </TabsContent>

          <TabsContent value="settings">
            <SystemSettings />
          </TabsContent>

          <TabsContent value="logs">
            <AuditLogs />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}