/**
 * Analytics Hook
 * Calculates analytics from real data instead of hardcoded values
 */

import { useMemo } from 'react';
import type { Appointment } from '../App';

interface User {
  id: string;
  role: string;
  [key: string]: any;
}

export function useAnalytics(appointments: Appointment[], users?: User[]) {
  const analytics = useMemo(() => {
    // Calculate total users
    const totalUsers = users?.length || 0;
    
    // Calculate active bookings (pending or confirmed)
    const activeBookings = appointments.filter(
      apt => apt.status === 'pending' || apt.status === 'confirmed' || apt.status === 'upcoming'
    ).length;
    
    // Calculate monthly revenue (current month, completed appointments)
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthlyRevenue = appointments
      .filter(apt => {
        if (apt.status !== 'completed') return false;
        const aptDate = new Date(apt.date);
        return aptDate.getMonth() === currentMonth && aptDate.getFullYear() === currentYear;
      })
      .reduce((sum, apt) => sum + apt.price, 0);
    
    // Calculate total revenue (all completed)
    const totalRevenue = appointments
      .filter(apt => apt.status === 'completed')
      .reduce((sum, apt) => sum + apt.price, 0);
    
    // Calculate total bookings
    const totalBookings = appointments.length;
    const completedBookings = appointments.filter(apt => apt.status === 'completed').length;
    
    // Calculate average booking value
    const avgBookingValue = completedBookings > 0 ? totalRevenue / completedBookings : 0;
    
    // Calculate active customers (unique users with bookings)
    const activeCustomers = new Set(appointments.map(apt => apt.userId)).size;
    
    // Get barber statistics
    const barberStats = appointments.reduce((acc, apt) => {
      if (!acc[apt.barber]) {
        acc[apt.barber] = { count: 0, revenue: 0 };
      }
      acc[apt.barber].count++;
      if (apt.status === 'completed') {
        acc[apt.barber].revenue += apt.price;
      }
      return acc;
    }, {} as Record<string, { count: number; revenue: number }>);
    
    // Find most booked barber
    const mostBookedBarber = Object.entries(barberStats)
      .sort((a, b) => b[1].count - a[1].count)[0]?.[0] || 'N/A';
    
    // Calculate completion rate
    const completionRate = totalBookings > 0 
      ? (completedBookings / totalBookings) * 100 
      : 0;
    
    return {
      totalUsers,
      activeBookings,
      monthlyRevenue,
      totalRevenue,
      totalBookings,
      completedBookings,
      avgBookingValue,
      activeCustomers,
      mostBookedBarber,
      completionRate,
      barberStats,
    };
  }, [appointments, users]);
  
  return analytics;
}

/**
 * Calculate revenue by time period
 */
export function useRevenueByPeriod(appointments: Appointment[], period: 'day' | 'week' | 'month' | 'year' = 'month') {
  return useMemo(() => {
    const completedAppointments = appointments.filter(apt => apt.status === 'completed');
    
    if (period === 'day') {
      // Last 7 days
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const today = new Date();
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(today);
        date.setDate(date.getDate() - (6 - i));
        return {
          day: days[date.getDay()],
          revenue: 0,
          date: date.toISOString().split('T')[0],
        };
      });
      
      completedAppointments.forEach(apt => {
        const dayData = last7Days.find(d => d.date === apt.date);
        if (dayData) {
          dayData.revenue += apt.price;
        }
      });
      
      return last7Days;
    }
    
    if (period === 'month') {
      // Last 12 months
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const today = new Date();
      const last12Months = Array.from({ length: 12 }, (_, i) => {
        const date = new Date(today.getFullYear(), today.getMonth() - (11 - i), 1);
        return {
          month: months[date.getMonth()],
          revenue: 0,
          year: date.getFullYear(),
          monthIndex: date.getMonth(),
        };
      });
      
      completedAppointments.forEach(apt => {
        const aptDate = new Date(apt.date);
        const monthData = last12Months.find(
          m => m.year === aptDate.getFullYear() && m.monthIndex === aptDate.getMonth()
        );
        if (monthData) {
          monthData.revenue += apt.price;
        }
      });
      
      return last12Months;
    }
    
    return [];
  }, [appointments, period]);
}

/**
 * Calculate top services by revenue
 */
export function useTopServices(appointments: Appointment[], limit: number = 5) {
  return useMemo(() => {
    const serviceRevenue = appointments
      .filter(apt => apt.status === 'completed')
      .reduce((acc, apt) => {
        if (!acc[apt.service]) {
          acc[apt.service] = { service: apt.service, revenue: 0, count: 0 };
        }
        acc[apt.service].revenue += apt.price;
        acc[apt.service].count++;
        return acc;
      }, {} as Record<string, { service: string; revenue: number; count: number }>);
    
    return Object.values(serviceRevenue)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  }, [appointments, limit]);
}
