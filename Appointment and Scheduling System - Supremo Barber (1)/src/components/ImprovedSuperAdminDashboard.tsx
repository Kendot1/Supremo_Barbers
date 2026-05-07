import { useState, useEffect } from "react";
import {
  Users,
  Calendar,
  LayoutDashboard,
  Settings,
  LogOut,
  Bell,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  UserCog,
  Scissors,
  CreditCard,
  TrendingUp,
  Star,
  Activity,
  RefreshCw,
} from "lucide-react";
import { FaPesoSign } from "react-icons/fa6";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";
import { Button } from "./ui/button";
import {
  NotificationCenter,
  type Notification,
} from "./NotificationCenter";

import type { User, Appointment } from "../App";
import API from "../services/api.service";
import { AnalyticsOverview } from "./AnalyticsOverview";
import { Footer } from "./Footer";
import { BarberModule } from "./BarberModule";
import { ServicesModule } from "./ServicesModule";
import { BookingReservationModule } from "./BookingReservationModule";
import { PaymentVerification } from "./PaymentVerification";
import { ReportsAnalytics } from "./ReportsAnalytics";
import { RevenueModule } from "./RevenueModule";
import { SystemSettings } from "./SystemSettings";
import { UserManagement } from "./UserManagement";
import { CustomerReviews } from "./CustomerReviews";
import { AuditLogs } from "./AuditLogs";

interface SuperAdminDashboardProps {
  user: User;
  onLogout: () => void;
  appointments: Appointment[];
  onUpdateAppointments: (appointments: Appointment[]) => void;
  onRefreshAppointments?: () => Promise<void>;
  notifications: Notification[];
  onMarkNotificationAsRead: (id: string) => void;
  onMarkAllNotificationsAsRead: () => void;
  onDeleteNotification: (id: string) => void;
  onClearAllNotifications: () => void;
  onAddNotification: (notification: Notification) => void;
}

export function ImprovedSuperAdminDashboard({
  user,
  onLogout,
  appointments,
  onUpdateAppointments,
  onRefreshAppointments,
  notifications,
  onMarkNotificationAsRead,
  onMarkAllNotificationsAsRead,
  onDeleteNotification,
  onClearAllNotifications,
  onAddNotification,
}: SuperAdminDashboardProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

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

  // Auto-refresh appointments and users every 30 seconds
  useEffect(() => {
    const refreshInterval = setInterval(async () => {


      // Refresh appointments if callback provided
      if (onRefreshAppointments) {
        try {
          await onRefreshAppointments();

        } catch (error) {
          console.error("❌ Failed to refresh appointments:", error);
        }
      }

      // Refresh users
      try {
        const data = await API.users.getAll();
        setUsers(data);

      } catch (error) {
        console.error("❌ Failed to refresh users:", error);
      }

      setLastRefresh(new Date());
    }, 30000); // 30 seconds

    return () => clearInterval(refreshInterval);
  }, [onRefreshAppointments]);

  // Manual refresh function
  const handleManualRefresh = async () => {


    // Refresh appointments
    if (onRefreshAppointments) {
      try {
        await onRefreshAppointments();
      } catch (error) {
        console.error("❌ Failed to refresh appointments:", error);
      }
    }

    // Refresh users
    try {
      const data = await API.users.getAll();
      setUsers(data);
    } catch (error) {
      console.error("❌ Failed to refresh users:", error);
    }

    setLastRefresh(new Date());
  };

  // Calculate stats from real data
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const activeBookings = appointments.filter(
    (apt) =>
      apt.status === "pending" ||
      apt.status === "confirmed" ||
      apt.status === "upcoming",
  ).length;

  const monthlyRevenue = appointments
    .filter((apt) => {
      if (apt.status !== "completed") return false;
      const aptDate = new Date(apt.date);
      return (
        aptDate.getMonth() === currentMonth &&
        aptDate.getFullYear() === currentYear
      );
    })
    .reduce((sum, apt) => sum + apt.price, 0);

  const stats = [
    {
      label: "Total Users",
      value: isLoadingUsers ? "..." : users.length.toString(),
      icon: Users,
      color: "bg-[#DB9D47]",
    },
    {
      label: "Active Bookings",
      value: activeBookings.toString(),
      icon: Calendar,
      color: "bg-[#94A670]",
    },
    {
      label: "Monthly Revenue",
      value: `₱${monthlyRevenue.toLocaleString()}`,
      icon: FaPesoSign,
      color: "bg-[#D98555]",
    },
  ];

  const menuItems = [
    {
      id: "overview",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    { id: "customers", label: "Customers", icon: Users },
    { id: "barbers", label: "Barbers", icon: UserCog },
    { id: "services", label: "Services", icon: Scissors },
    { id: "bookings", label: "Bookings", icon: Calendar },
    {
      id: "payments",
      label: "Payment Verification",
      icon: CreditCard,
    },
    { id: "revenue", label: "Revenue", icon: TrendingUp },
    { id: "reviews", label: "Reviews", icon: Star },
    {
      id: "settings",
      label: "System Settings",
      icon: Settings,
    },
    { id: "logs", label: "Audit Logs", icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-[#FFFDF8] flex flex-col" style={{ overflowX: 'clip' }}>


      <div className="flex flex-1 w-full" style={{ overflowX: 'clip' }}>
        {/* Sidebar - Hidden on mobile, visible on desktop */}
        <aside
          className={`
          fixed left-0 top-0 h-full bg-gradient-to-b from-[#5C4A3A] to-[#4A3828] text-[#F5EDD8] transition-all duration-300 z-20 shadow-2xl
          hidden lg:block
          ${sidebarOpen ? "lg:w-64" : "lg:w-20"}
        `}
        >
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="p-4 border-b border-[#6E5A48]">
              <div className="flex items-center gap-3">
                <img
                  src="https://pub-86f4b5249e5c4021bb05d46908eeb094.r2.dev/supremo-barber/supremoWebLogo.png"
                  alt="Supremo Barber Logo"
                  className="h-10 w-10 flex-shrink-0"
                />
                {sidebarOpen && (
                  <div>
                    <p className="text-[#F5EDD8]">
                      Supremo Barber
                    </p>

                  </div>
                )}
              </div>
            </div>

            {/* Menu Items */}
            <nav className="flex-1 p-4 space-y-2">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all
                  ${activeTab === item.id
                      ? "bg-[#DB9D47] text-white shadow-lg shadow-[#DB9D47]/50"
                      : "text-[#D4C5B0] hover:bg-[#6E5A48] hover:text-[#F5EDD8]"
                    }
                `}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {sidebarOpen && <span>{item.label}</span>}
                </button>
              ))}
            </nav>

            {/* User Info & Logout */}
            <div className="p-4 border-t border-[#6E5A48]">
              {sidebarOpen && (
                <div className="mb-3 px-4 py-2 bg-[#6E5A48] rounded-lg">
                  <p className="text-sm text-[#F5EDD8]">
                    {user.name}
                  </p>
                  <p className="text-xs text-[#C4B49D]">
                    {user.email}
                  </p>
                </div>
              )}
              <Button
                variant="ghost"
                onClick={onLogout}
                className="w-full justify-start text-[#D4C5B0] hover:text-[#F5EDD8] hover:bg-[#6E5A48]"
              >
                <LogOut className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && (
                  <span className="ml-3">Logout</span>
                )}
              </Button>
            </div>
          </div>
        </aside>

        {/* Main Content - No margin on mobile, margin on desktop for sidebar */}
        <main
          className={`flex-1 transition-all duration-300 min-w-0 ${sidebarOpen ? "lg:ml-64" : "lg:ml-20"} flex flex-col`}
          style={{ overflowX: 'clip' }}
        >
          {/* Top Bar */}
          <header className="bg-white border-b-2 border-[#E8DCC8] sticky top-0 z-10 shadow-sm overflow-hidden">
            <div className="px-3 py-3 md:px-6 md:py-4 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
                {/* Sidebar toggle - only visible on desktop */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="hidden lg:flex text-[#5C4A3A] hover:bg-[#FBF7EF]"
                >
                  {sidebarOpen ? (
                    <X className="w-5 h-5" />
                  ) : (
                    <Menu className="w-5 h-5" />
                  )}
                </Button>
                {/* Mobile: Hamburger Menu (left side) */}
                <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                  <SheetTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="lg:hidden text-[#5C4A3A] hover:bg-[#FBF7EF] p-2"
                    >
                      <Menu className="w-5 h-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[280px] sm:w-[320px] bg-white border-r border-[#E8DCC8]">
                    <SheetHeader>
                      <SheetTitle className="text-[#5C4A3A] flex items-center gap-2 text-base">
                        <img
                          src="https://pub-86f4b5249e5c4021bb05d46908eeb094.r2.dev/supremo-barber/supremoWebLogo.png"
                          alt="Supremo Barber Logo"
                          className="h-7 w-7 sm:h-8 sm:w-8"
                        />
                        Supremo Barber
                      </SheetTitle>

                    </SheetHeader>

                    <div className="mt-6 flex flex-col gap-2">
                      {menuItems.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            setActiveTab(item.id);
                            setMobileMenuOpen(false);
                          }}
                          className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors ${activeTab === item.id
                            ? 'bg-[#DB9D47] text-white'
                            : 'text-[#5C4A3A] hover:bg-[#FBF7EF]'
                            }`}
                        >
                          <item.icon className="w-5 h-5" />
                          <span>{item.label}</span>
                        </button>
                      ))}

                      {/* Divider */}
                      <div className="h-px bg-[#E8DCC8] my-2" />

                      {/* Logout Button */}
                      <button
                        onClick={() => {
                          setMobileMenuOpen(false);
                          onLogout();
                        }}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-[#E57373] hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="w-5 h-5" />
                        <span>Logout</span>
                      </button>
                    </div>

                    {/* User Info at Bottom */}
                    <div className="absolute bottom-6 left-0 right-0 px-6">
                      <div className="bg-[#FBF7EF] border border-[#E8DCC8] rounded-lg p-3">
                        <p className="text-xs text-[#87765E] mb-1">Logged in as</p>
                        <p className="text-sm text-[#5C4A3A]">{user.name}</p>
                        <p className="text-xs text-[#87765E]">{user.email}</p>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
                {/* Mobile: show logo */}

                <div className="min-w-0">
                  <h1 className="text-base md:text-xl lg:text-2xl text-[#5C4A3A] truncate">
                    {
                      menuItems.find(
                        (item) => item.id === activeTab,
                      )?.label
                    }
                  </h1>

                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <NotificationCenter
                  userId={user.id}
                  userRole="admin"
                  onNavigate={(url) => {
                    // Parse URL and extract query parameters
                    const [path, queryString] = url.split('?');
                    const params = new URLSearchParams(queryString || '');

                    // Map the URL to dashboard tabs (Admin uses 'bookings', not 'appointments')
                    if (path === '/appointments' || path === '/bookings') {
                      setActiveTab('bookings');
                    } else if (path === '/payment-verification' || path === '/payments') {
                      setActiveTab('payments');
                    } else if (path === '/profile' || path === '/settings') {
                      setActiveTab('settings');
                    } else if (path === '/services') {
                      setActiveTab('services');
                    } else if (path === '/barbers') {
                      setActiveTab('barbers');
                    } else if (path === '/customers') {
                      setActiveTab('customers');
                    } else if (path === '/analytics' || path === '/overview') {
                      setActiveTab('overview');
                    } else if (path === '/revenue') {
                      setActiveTab('revenue');
                    } else if (path === '/reviews') {
                      setActiveTab('reviews');
                    } else if (path === '/audit-logs' || path === '/logs') {
                      setActiveTab('logs');
                    }
                  }}
                />
              </div>
            </div>
          </header>

          {/* Content Area */}
          <div className="p-3 md:p-4 lg:p-6 flex-1 min-h-0 overflow-x-hidden">
            {activeTab === "overview" && (
              <div className="space-y-4 md:space-y-6 max-w-full overflow-x-hidden">
                {/* Stats Grid - Always 3 Columns */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4">
                  {stats.map((stat, index) => (
                    <div
                      key={index}
                      className="flex flex-col p-2.5 sm:p-3 md:p-4 bg-[#FBF7EF] rounded-lg border border-[#E8DCC8] hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                        <div
                          className={`${stat.color} p-1.5 sm:p-2 rounded-lg`}
                        >
                          <stat.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-white" />
                        </div>
                      </div>
                      <p className="text-base sm:text-xl md:text-2xl text-[#5C4A3A] mb-0.5 sm:mb-1 truncate">
                        {stat.value}
                      </p>
                      <p className="text-[10px] sm:text-xs md:text-sm text-[#87765E] truncate">
                        {stat.label}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Analytics */}
                <AnalyticsOverview
                  onNavigateToPaymentVerification={() =>
                    setActiveTab("payments")
                  }
                  onNavigateToBookings={() =>
                    setActiveTab("bookings")
                  }
                />
              </div>
            )}

            {activeTab === "customers" && <UserManagement />}
            {activeTab === "barbers" && (
              <BarberModule appointments={appointments} />
            )}
            {activeTab === "services" && (
              <ServicesModule
                user={user}
                onBookService={(serviceId) => {
                  setActiveTab("bookings");
                }}
              />
            )}
            {activeTab === "bookings" && (
              <BookingReservationModule
                appointments={appointments}
                onUpdateAppointments={onUpdateAppointments}
                onRefreshAppointments={onRefreshAppointments}
                adminUser={user}
              />
            )}
            {activeTab === "payments" && (
              <PaymentVerification
                appointments={appointments}
                onUpdateAppointment={(
                  appointmentId,
                  updates,
                ) => {
                  const updatedAppointments = appointments.map(
                    (apt) =>
                      apt.id === appointmentId
                        ? { ...apt, ...updates }
                        : apt,
                  );
                  onUpdateAppointments(updatedAppointments);
                }}
                userRole="admin"
                onAddNotification={onAddNotification}
                onRefreshAppointments={onRefreshAppointments}
                currentUser={user}
              />
            )}
            {activeTab === "revenue" && (
              <RevenueModule appointments={appointments} />
            )}
            {activeTab === "reviews" && <CustomerReviews isActive={activeTab === "reviews"} />}
            {activeTab === "settings" && <SystemSettings />}
            {activeTab === "logs" && <AuditLogs isActive={activeTab === "logs"} />}
          </div>
        </main>
      </div>

      {/* Footer - Hidden on mobile/tablet, shown on desktop */}
      <div
        className={`hidden lg:block transition-all duration-300 ${sidebarOpen ? "lg:ml-64" : "lg:ml-20"}`}
      >
        <Footer />
      </div>


    </div>
  );
}