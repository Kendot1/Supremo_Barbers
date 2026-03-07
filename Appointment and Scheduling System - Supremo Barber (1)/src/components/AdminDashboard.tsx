import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Calendar, Users, Settings, LogOut, TrendingUp,
  Scissors, Clock, CheckCircle2, XCircle
} from 'lucide-react';
import { AppointmentManagement } from './AppointmentManagement';
import { BarberScheduleManager } from './BarberScheduleManager';
import { ServiceManagement } from './ServiceManagement';
import { ReportsAnalytics } from './ReportsAnalytics';
import { LoyaltyConfiguration } from './LoyaltyConfiguration';
import type { User, Appointment } from '../App';
import { FaPesoSign } from 'react-icons/fa6';

interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
  appointments?: Appointment[];
}

export function AdminDashboard({ user, onLogout, appointments = [] }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState('appointments');

  // Calculate stats from real data
  const today = new Date().toISOString().split('T')[0];

  const todayBookings = appointments.filter(apt => apt.date === today);
  const pendingApprovals = appointments.filter(apt => apt.status === 'pending').length;
  const completedToday = todayBookings.filter(apt => apt.status === 'completed');
  const todayRevenue = completedToday.reduce((sum, apt) => sum + apt.price, 0);

  const stats = [
    { label: "Today's Bookings", value: todayBookings.length.toString(), icon: Calendar, color: 'text-[#DB9D47]' },
    { label: 'Pending Approvals', value: pendingApprovals.toString(), icon: Clock, color: 'text-[#D98555]' },
    { label: 'Completed Today', value: completedToday.length.toString(), icon: CheckCircle2, color: 'text-[#94A670]' },
    { label: "Today's Revenue", value: `₱${todayRevenue.toLocaleString()}`, icon: FaPesoSign, color: 'text-[#B89968]' },
  ];

  return (
    <div className="min-h-screen bg-[#FFFDF8]">
      {/* Header */}
      <header className="bg-white border-b-2 border-[#E8DCC8] sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#DB9D47] to-[#D98555] rounded-lg flex items-center justify-center shadow-md">
                <Scissors className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-[#5C4A3A]">Admin Dashboard</h1>
                <p className="text-sm text-[#87765E]">{user.name} - Staff Manager</p>
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
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {stats.map((stat, index) => (
            <Card key={index} className="border-[#E8DCC8] hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div className="text-2xl text-[#5C4A3A] mb-1">{stat.value}</div>
                <p className="text-sm text-[#87765E]">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 bg-[#F8F0E0] border border-[#E8DCC8]">
            <TabsTrigger value="appointments" className="data-[state=active]:bg-[#DB9D47] data-[state=active]:text-white">
              <Calendar className="w-4 h-4 mr-2" />
              Appointments
            </TabsTrigger>
            <TabsTrigger value="barbers" className="data-[state=active]:bg-[#DB9D47] data-[state=active]:text-white">
              <Users className="w-4 h-4 mr-2" />
              Barber Schedules
            </TabsTrigger>
            <TabsTrigger value="services" className="data-[state=active]:bg-[#DB9D47] data-[state=active]:text-white">
              <Scissors className="w-4 h-4 mr-2" />
              Services
            </TabsTrigger>
            <TabsTrigger value="loyalty" className="data-[state=active]:bg-[#DB9D47] data-[state=active]:text-white">
              <TrendingUp className="w-4 h-4 mr-2" />
              Loyalty System
            </TabsTrigger>
            <TabsTrigger value="reports" className="data-[state=active]:bg-[#DB9D47] data-[state=active]:text-white">
              <TrendingUp className="w-4 h-4 mr-2" />
              Reports
            </TabsTrigger>
          </TabsList>

          <TabsContent value="appointments">
            <AppointmentManagement />
          </TabsContent>

          <TabsContent value="barbers">
            <BarberScheduleManager />
          </TabsContent>

          <TabsContent value="services">
            <ServiceManagement />
          </TabsContent>

          <TabsContent value="loyalty">
            <LoyaltyConfiguration />
          </TabsContent>

          <TabsContent value="reports">
            <ReportsAnalytics />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
