import { useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import {
  Calendar, Users, LogOut, TrendingUp,
  Scissors, Clock, CheckCircle2, Menu, X,
  LayoutDashboard, Activity
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from './ui/sheet';
import { AppointmentManagement } from './AppointmentManagement';
import { BarberScheduleManager } from './BarberScheduleManager';
import { ServiceManagement } from './ServiceManagement';
import { ReportsAnalytics } from './ReportsAnalytics';
import { LoyaltyConfiguration } from './LoyaltyConfiguration';
import { Footer } from './Footer';
import type { User, Appointment } from '../App';
import { FaPesoSign } from 'react-icons/fa6';

interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
  appointments?: Appointment[];
}

export function AdminDashboard({ user, onLogout, appointments = [] }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState('appointments');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const menuItems = [
    { id: 'appointments', label: 'Appointments', icon: Calendar },
    { id: 'barbers', label: 'Barbers', icon: Users },
    { id: 'services', label: 'Services', icon: Scissors },
    { id: 'loyalty', label: 'Loyalty', icon: TrendingUp },
    { id: 'reports', label: 'Reports', icon: Activity },
  ];

  // Calculate stats from real data
  const today = new Date().toISOString().split('T')[0];

  const todayBookings = appointments.filter(apt => apt.date === today);
  const pendingApprovals = appointments.filter(apt => apt.status === 'pending').length;
  const completedToday = todayBookings.filter(apt => apt.status === 'completed');
  const todayRevenue = completedToday.reduce((sum, apt) => sum + apt.price, 0);

  const stats = [
    { label: "Today's Bookings", value: todayBookings.length.toString(), icon: Calendar, color: 'bg-[#DB9D47]' },
    { label: 'Pending Approvals', value: pendingApprovals.toString(), icon: Clock, color: 'bg-[#D98555]' },
    { label: 'Completed Today', value: completedToday.length.toString(), icon: CheckCircle2, color: 'bg-[#94A670]' },
    { label: "Today's Revenue", value: `₱${todayRevenue.toLocaleString()}`, icon: FaPesoSign, color: 'bg-[#B89968]' },
  ];

  return (
    <div className="min-h-screen bg-[#FFFDF8] flex flex-col">
      <div className="flex flex-1">
        {/* Sidebar - Hidden on mobile, visible on desktop */}
        <aside
          className={`
          fixed left-0 top-0 h-full bg-gradient-to-b from-[#5C4A3A] to-[#4A3828] text-[#F5EDD8] transition-all duration-300 z-20 shadow-2xl
          hidden lg:block
          ${sidebarOpen ? 'lg:w-64' : 'lg:w-20'}
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
                    <p className="text-[#F5EDD8]">Supremo Barber</p>
                    <p className="text-xs text-[#C4B49D]">Admin Panel</p>
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
                      ? 'bg-[#DB9D47] text-white shadow-lg shadow-[#DB9D47]/50'
                      : 'text-[#D4C5B0] hover:bg-[#6E5A48] hover:text-[#F5EDD8]'
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
                  <p className="text-sm text-[#F5EDD8]">{user.name}</p>
                  <p className="text-xs text-[#C4B49D]">Administrator</p>
                </div>
              )}
              <Button
                variant="ghost"
                onClick={onLogout}
                className="w-full justify-start text-[#D4C5B0] hover:text-[#F5EDD8] hover:bg-[#6E5A48]"
              >
                <LogOut className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span className="ml-3">Logout</span>}
              </Button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main
          className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'} flex flex-col`}
        >
          {/* Top Bar - Desktop: sidebar toggle + title | Mobile: logo + title + hamburger */}
          <header className="bg-white border-b-2 border-[#E8DCC8] sticky top-0 z-10 shadow-sm">
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
                {/* Mobile: show logo */}
                <img
                  src="https://pub-86f4b5249e5c4021bb05d46908eeb094.r2.dev/supremo-barber/supremoWebLogo.png"
                  alt="Supremo Barber Logo"
                  className="h-8 w-8 lg:hidden"
                />
                <div className="min-w-0">
                  <h1 className="text-base md:text-xl lg:text-2xl text-[#5C4A3A] truncate">
                    {menuItems.find((item) => item.id === activeTab)?.label || 'Dashboard'}
                  </h1>
                  <p className="text-xs text-[#87765E] lg:hidden">Admin Panel</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Mobile: Hamburger Menu */}
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
                  <SheetContent side="right" className="w-[280px] sm:w-[320px] bg-white border-l border-[#E8DCC8]">
                    <SheetHeader>
                      <SheetTitle className="text-[#5C4A3A] flex items-center gap-2 text-base">
                        <img
                          src="https://pub-86f4b5249e5c4021bb05d46908eeb094.r2.dev/supremo-barber/supremoWebLogo.png"
                          alt="Supremo Barber Logo"
                          className="h-7 w-7 sm:h-8 sm:w-8"
                        />
                        Admin Menu
                      </SheetTitle>
                      <SheetDescription className="text-[#87765E] text-sm">
                        Navigate through your admin panel
                      </SheetDescription>
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
                        <p className="text-xs text-[#87765E]">Administrator</p>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          </header>

          {/* Content Area */}
          <div className="p-3 md:p-4 lg:p-6 flex-1 min-h-0">
            {/* Stats Grid - Only show on appointments tab */}
            {activeTab === 'appointments' && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
                {stats.map((stat, index) => (
                  <div
                    key={index}
                    className="flex flex-col p-3 sm:p-4 bg-[#FBF7EF] rounded-lg border border-[#E8DCC8] hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className={`${stat.color} p-2 rounded-lg`}>
                        <stat.icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                      </div>
                    </div>
                    <p className="text-xl sm:text-2xl text-[#5C4A3A] mb-1 truncate">{stat.value}</p>
                    <p className="text-xs sm:text-sm text-[#87765E] truncate">{stat.label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Content based on active tab */}
            <div>
              {activeTab === 'appointments' && <AppointmentManagement />}
              {activeTab === 'barbers' && <BarberScheduleManager />}
              {activeTab === 'services' && <ServiceManagement />}
              {activeTab === 'loyalty' && <LoyaltyConfiguration />}
              {activeTab === 'reports' && <ReportsAnalytics />}
            </div>
          </div>
        </main>
      </div>

      {/* Footer - Hidden on mobile/tablet, shown on desktop */}
      <div
        className={`hidden lg:block transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}
      >
        <Footer />
      </div>
    </div>
  );
}
