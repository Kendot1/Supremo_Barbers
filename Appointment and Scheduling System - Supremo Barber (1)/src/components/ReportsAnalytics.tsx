import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from './ui/select';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { TrendingUp, DollarSign, Users, Calendar, Download, FileText, FileSpreadsheet } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { exportToCSV } from './utils/exportUtils';
import API from '../services/api.service';
import type { Appointment } from '../App';

interface ReportsAnalyticsProps {
  appointments?: Appointment[];
}

export function ReportsAnalytics({ appointments: propAppointments }: ReportsAnalyticsProps = {}) {
  const [timeRange, setTimeRange] = useState('weekly');
  const [appointments, setAppointments] = useState<Appointment[]>(propAppointments || []);
  const [isLoading, setIsLoading] = useState(!propAppointments);

  // Fetch appointments if not provided via props
  useEffect(() => {
    if (!propAppointments) {
      const fetchAppointments = async () => {
        try {
          setIsLoading(true);
          const data = await API.appointments.getAll();
          setAppointments(data);
        } catch (error) {
          // Silently handle - backend might not be running
          setAppointments([]);
        } finally {
          setIsLoading(false);
        }
      };
      fetchAppointments();
    }
  }, [propAppointments]);

  // Calculate data from real appointments
  const { dailyData, weeklyData, monthlyData, stats } = useMemo(() => {
    const completed = appointments.filter(apt => apt.status === 'completed');
    
    // Daily data (last 7 days)
    const dailyRevenue = new Map();
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dailyRevenue.set(dateStr, { revenue: 0, bookings: 0 });
    }
    
    completed.forEach(apt => {
      if (dailyRevenue.has(apt.date)) {
        const day = dailyRevenue.get(apt.date);
        day.revenue += apt.price;
        day.bookings += 1;
      }
    });

    const daily = Array.from(dailyRevenue.entries()).map(([date, data]) => ({
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      revenue: data.revenue,
      bookings: data.bookings,
    }));

    // Weekly data (last 4 weeks) - placeholder
    const weekly = [
      { week: 'Week 1', revenue: 0, customers: 0 },
      { week: 'Week 2', revenue: 0, customers: 0 },
      { week: 'Week 3', revenue: 0, customers: 0 },
      { week: 'Week 4', revenue: 0, customers: 0 },
    ];

    // Monthly data (last 4 months)
    const monthly = [
      { month: 'Jul', revenue: 0, customers: 0 },
      { month: 'Aug', revenue: 0, customers: 0 },
      { month: 'Sep', revenue: 0, customers: 0 },
      { month: 'Oct', revenue: 0, customers: 0 },
    ];

    // Calculate stats
    const totalRevenue = completed.reduce((sum, apt) => sum + apt.price, 0);
    const totalBookings = appointments.length;
    const uniqueCustomers = new Set(appointments.map(apt => apt.userId)).size;
    const avgBookingValue = totalBookings > 0 ? Math.round(totalRevenue / totalBookings) : 0;

    return {
      dailyData: daily,
      weeklyData: weekly,
      monthlyData: monthly,
      stats: [
        { label: 'Total Revenue', value: `₱${totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-green-600' },
        { label: 'Total Bookings', value: totalBookings.toString(), icon: Calendar, color: 'text-blue-600' },
        { label: 'Active Customers', value: uniqueCustomers.toString(), icon: Users, color: 'text-purple-600' },
        { label: 'Avg. Booking Value', value: `₱${avgBookingValue}`, icon: TrendingUp, color: 'text-orange-600' },
      ],
    };
  }, [appointments]);

  const getChartData = () => {
    switch (timeRange) {
      case 'daily':
        return dailyData;
      case 'weekly':
        return weeklyData;
      case 'monthly':
        return monthlyData;
      default:
        return weeklyData;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-[#DB9D47] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-[#87765E]">Loading reports...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div className="text-2xl text-slate-900 mb-1">{stat.value}</div>
              <p className="text-sm text-slate-600">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Revenue & Bookings</CardTitle>
              <CardDescription>Track performance over time</CardDescription>
            </div>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={getChartData()}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis 
                dataKey={timeRange === 'daily' ? 'date' : timeRange === 'weekly' ? 'week' : 'month'} 
                stroke="#64748b" 
              />
              <YAxis stroke="#64748b" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px' 
                }} 
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="#3b82f6" 
                strokeWidth={2}
                name="Revenue ($)"
              />
              {timeRange === 'daily' && (
                <Line 
                  type="monotone" 
                  dataKey="bookings" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Bookings"
                />
              )}
              {(timeRange === 'weekly' || timeRange === 'monthly') && (
                <Line 
                  type="monotone" 
                  dataKey="customers" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Customers"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Services & Barbers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Services</CardTitle>
            <CardDescription>Most popular services this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: 'Gupit Supremo w/ Banlaw', bookings: 145, revenue: '₱43,500' },
                { name: 'Supremo Espesyal', bookings: 98, revenue: '₱44,100' },
                { name: 'Gupit Supremo', bookings: 76, revenue: '₱19,000' },
                { name: 'Tina (Hair Color)', bookings: 42, revenue: '₱18,900' },
              ].map((service, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="text-slate-900">{service.name}</p>
                    <p className="text-sm text-slate-600">{service.bookings} bookings</p>
                  </div>
                  <p className="text-slate-900">{service.revenue}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Barbers</CardTitle>
            <CardDescription>Best performing barbers this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: 'Tony Stark', bookings: 128, revenue: '₱41,600' },
                { name: 'Peter Parker', bookings: 115, revenue: '₱37,375' },
                { name: 'Bruce Wayne', bookings: 98, revenue: '₱31,850' },
              ].map((barber, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="text-slate-900">{barber.name}</p>
                    <p className="text-sm text-slate-600">{barber.bookings} bookings</p>
                  </div>
                  <p className="text-slate-900">{barber.revenue}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

