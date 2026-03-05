import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { TrendingUp, Users, DollarSign, Calendar, AlertCircle, Receipt, CheckCircle, ArrowRight } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import API from '../services/api.service';
import type { Appointment } from '../App';

interface AnalyticsOverviewProps {
  onNavigateToPaymentVerification?: () => void;
  onNavigateToBookings?: () => void;
}

export function AnalyticsOverview({ onNavigateToPaymentVerification, onNavigateToBookings }: AnalyticsOverviewProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch appointments from database
  useEffect(() => {
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
  }, []);

  // Calculate analytics from real appointment data
  const analytics = useMemo(() => {
    // Revenue data by month (last 10 months)
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const revenueByMonth = new Map<string, { revenue: number; customers: Set<string>; bookings: number }>();

    appointments.forEach(apt => {
      const date = new Date(apt.date);
      const monthKey = `${monthNames[date.getMonth()]}`;

      if (!revenueByMonth.has(monthKey)) {
        revenueByMonth.set(monthKey, { revenue: 0, customers: new Set(), bookings: 0 });
      }

      const data = revenueByMonth.get(monthKey)!;
      if (apt.status === 'completed') {
        data.revenue += apt.price || 0;
      }
      if (apt.userId) {
        data.customers.add(apt.userId);
      }
      data.bookings += 1;
    });

    const revenueData = Array.from(revenueByMonth.entries()).map(([month, data]) => ({
      month,
      revenue: data.revenue,
      customers: data.customers.size,
      bookings: data.bookings,
    }));

    // Service distribution
    const serviceCount = new Map<string, number>();
    appointments.forEach(apt => {
      const serviceName = apt.service_name || apt.service || 'Unknown Service';
      serviceCount.set(serviceName, (serviceCount.get(serviceName) || 0) + 1);
    });

    const totalServices = appointments.length;
    const serviceDistribution = Array.from(serviceCount.entries())
      .map(([name, count]) => ({
        name,
        value: Math.round((count / totalServices) * 100),
        color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Daily bookings (this week)
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dailyBookings = dayNames.map((day, index) => {
      const count = appointments.filter(apt => new Date(apt.date).getDay() === index).length;
      return { day, bookings: count };
    });

    // Recent transactions (last 5)
    const recentTransactions = appointments
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5)
      .map(apt => ({
        id: apt.id,
        customer: apt.customer_name || apt.customerName || apt.customer || (apt.userId ? `Customer #${apt.userId.slice(0, 8)}` : 'Unknown Customer'),
        service: apt.service_name || apt.service || 'Unknown Service',
        amount: `₱${apt.price || 0}`,
        date: apt.date,
        status: apt.status,
        payment: apt.paymentProof ? 'verified' : 'pending',
      }));

    const pendingPayments = recentTransactions.filter(t => t.payment === 'pending').length;

    return {
      revenueData,
      serviceDistribution,
      dailyBookings,
      recentTransactions,
      pendingPayments,
    };
  }, [appointments]);

  const { revenueData, serviceDistribution, dailyBookings, recentTransactions, pendingPayments } = analytics;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className="border-[#E8DCC8]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-[#DB9D47] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-[#87765E]">Loading analytics...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Access Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* All Booking Transactions */}
        <Card className="border-[#DB9D47] border-2 hover:shadow-lg transition-shadow flex flex-col">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[#DB9D47]" />
                <CardTitle className="text-[#5C4A3A]">All Booking Transactions</CardTitle>
              </div>
              <Badge className="bg-[#DB9D47] text-white">
                {recentTransactions.length} Total
              </Badge>
            </div>
            <CardDescription className="text-[#87765E]">
              View and manage all booking transactions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 flex-1 flex flex-col">
            {/* Recent Transactions Preview */}
            <div className="space-y-2 flex-1">
              {recentTransactions.slice(0, 3).map((transaction) => (
                <div 
                  key={transaction.id}
                  className="flex items-center justify-between p-3 bg-[#FBF7EF] rounded-lg border border-[#E8DCC8]"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-[#5C4A3A]">{transaction.id}</span>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          transaction.status === 'completed' 
                            ? 'border-green-500 text-green-700' 
                            : 'border-orange-500 text-orange-700'
                        }`}
                      >
                        {transaction.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-[#87765E] mt-1">{transaction.customer} • {transaction.service}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-[#DB9D47]">{transaction.amount}</p>
                    <p className="text-xs text-[#87765E]">{transaction.date}</p>
                  </div>
                </div>
              ))}
            </div>

            <Button 
              className="w-full bg-[#DB9D47] hover:bg-[#C88D3F] text-white"
              onClick={onNavigateToBookings}
            >
              View All Transactions
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>

        {/* Payment Verification Shortcut */}
        <Card className="border-[#94A670] border-2 hover:shadow-lg transition-shadow flex flex-col">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-[#94A670]" />
                <CardTitle className="text-[#5C4A3A]">Payment Verification</CardTitle>
              </div>
              {pendingPayments > 0 && (
                <Badge className="bg-orange-500 text-white animate-pulse">
                  {pendingPayments} Pending
                </Badge>
              )}
            </div>
            <CardDescription className="text-[#87765E]">
              Review and verify customer payment proofs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 flex-1 flex flex-col">
            {/* Pending Payments Stats */}
            <div className="space-y-4 flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="w-4 h-4 text-orange-600" />
                    <span className="text-xs text-orange-900">Pending</span>
                  </div>
                  <p className="text-2xl text-orange-900">{pendingPayments}</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-xs text-green-900">Verified</span>
                  </div>
                  <p className="text-2xl text-green-900">
                    {recentTransactions.filter(t => t.payment === 'verified').length}
                  </p>
                </div>
              </div>

              {pendingPayments > 0 && (
                <Alert className="border-orange-500 bg-orange-50">
                  <AlertCircle className="w-4 h-4 text-orange-600" />
                  <AlertDescription className="text-sm text-orange-900">
                    You have <strong>{pendingPayments} payment{pendingPayments > 1 ? 's' : ''}</strong> waiting for verification. 
                    Please review and approve/reject them.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <Button 
              className="w-full bg-[#94A670] hover:bg-[#7F8F5F] text-white"
              onClick={onNavigateToPaymentVerification}
            >
              Go to Payment Verification
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Revenue & Customer Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue & Customer Growth Trends</CardTitle>
          <CardDescription>Monthly performance overview</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.2}
                name="Revenue ($)"
              />
              <Area
                type="monotone"
                dataKey="customers"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.2}
                name="Customers"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Service Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Service Distribution</CardTitle>
            <CardDescription>Popular services breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={serviceDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {serviceDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Daily Bookings */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Booking Pattern</CardTitle>
            <CardDescription>Average bookings per day</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dailyBookings.filter(d => d.day !== 'Sun')}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px' 
                  }} 
                />
                <Bar dataKey="bookings" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}