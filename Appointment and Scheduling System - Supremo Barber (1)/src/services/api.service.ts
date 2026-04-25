/**
 * API Service - Supabase PostgreSQL Edition with Local Fallback
 * Handles all communication with Supabase backend
 * Falls back to local storage if Supabase is unavailable
 * 
 * Performance Optimizations:
 * - In-memory caching for frequently accessed data
 * - Automatic cache invalidation on mutations
 * - Reduced redundant API calls
 */

import type { User, Appointment, Notification } from '../App';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { LocalBackend } from './local-backend.service';
import { cachedAPICall, apiCache } from '../utils/apiCache';
import { normalizeR2Url } from '../utils/avatarUrl';

// Supabase Configuration
const SUPABASE_URL = `https://${projectId}.supabase.co`;

// Edge Functions URL (Supabase backend)
const EDGE_FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1/make-server-70e1fc66/api`;
const API_BASE_URL = EDGE_FUNCTIONS_URL; // Use Supabase Edge Functions

// Use Supabase backend (set to false to use local backend)
const USE_LOCAL_BACKEND = false; // Using Supabase for all operations including notifications



// Get auth token from localStorage
function getAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('authToken');

    // Validate JWT format - should have 3 parts separated by dots
    if (token) {
      const parts = token.split('.');
      if (parts.length !== 3) {
        console.warn('⚠️ Invalid JWT token format detected (should have 3 parts), clearing...');
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        return null;
      }

      // Check if token is too short (likely invalid)
      if (token.length < 20) {
        console.warn('⚠️ Invalid token detected in localStorage (too short), clearing...');
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        return null;
      }

      // Try to decode and check expiration
      try {
        const payload = JSON.parse(atob(parts[1]));
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          console.warn('⚠️ JWT token expired, clearing...');
          localStorage.removeItem('authToken');
          localStorage.removeItem('currentUser');
          return null;
        }
      } catch (e) {
        console.warn('⚠️ Could not decode JWT token, clearing...', e);
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        return null;
      }
    }

    return token;
  }
  return null;
}

// Helper function to convert camelCase to snake_case
function toSnakeCase(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => toSnakeCase(item));
  }

  const snakeCaseObj: any = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      snakeCaseObj[snakeKey] = toSnakeCase(obj[key]);
    }
  }
  return snakeCaseObj;
}

// Helper function to convert snake_case to camelCase
function toCamelCase(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => toCamelCase(item));
  }

  const camelCaseObj: any = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      camelCaseObj[camelKey] = toCamelCase(obj[key]);
    }
  }
  return camelCaseObj;
}

// Helper function for API calls
async function apiCall<T>(
  endpoint: string,
  options?: RequestInit,
  requiresAuth: boolean = false
): Promise<T> {
  try {
    const token = getAuthToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'apikey': publicAnonKey,
      ...options?.headers,
    };

    // IMPORTANT: Supabase Edge Functions require Authorization header
    // Use user token if available, otherwise use anon key
    if (token && token.trim() !== '' && token !== publicAnonKey) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      // For anonymous/public requests, use the anon key
      headers['Authorization'] = `Bearer ${publicAnonKey}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      // Try to parse error response
      let errorMessage = 'API request failed';
      try {
        const error = await response.json();
        errorMessage = error.error || error.message || errorMessage;
      } catch {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }

      throw new Error(errorMessage);
    }

    const json = await response.json();

    // If response has the standardized format { success, data }, extract data
    if (json && typeof json === 'object' && 'success' in json && 'data' in json) {
      return json.data as T;
    }

    // Otherwise return the raw response
    return json as T;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ API Call Error:', error);
    }
    throw error;
  }
}

// ==================== API EXPORTS ====================

const API = {
  // ==================== AUTHENTICATION ====================
  auth: {
    login: async (email: string, password: string) => {
      if (USE_LOCAL_BACKEND) {
        return LocalBackend.auth.login(email, password);
      }

      const result = await apiCall<{ user: User; token: string }>(
        '/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        },
        false
      );

      // DO NOT store in localStorage here - let LoginPage handle it after OTP verification
      // This prevents auto-login on refresh during OTP step

      return result;
    },

    loginWithUsername: async (username: string, password: string) => {
      if (USE_LOCAL_BACKEND) {
        // Fallback to email-based login for local backend
        return LocalBackend.auth.login(username, password);
      }

      const result = await apiCall<{ user: User; token: string }>(
        '/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ username, password }),
        },
        false
      );

      // DO NOT store in localStorage here - let LoginPage handle it after OTP verification
      // This prevents auto-login on refresh during OTP step

      return result;
    },

    register: async (data: { email: string; username: string; password: string; name: string; phone?: string; role?: string }) => {
      if (USE_LOCAL_BACKEND) {
        return LocalBackend.auth.register(data.email, data.password, data.name, data.phone);
      }

      const result = await apiCall<{ user: User; token: string }>(
        '/auth/register',
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
        false
      );

      // DO NOT store in localStorage here - let LoginPage handle it after OTP verification
      // Registration is called after OTP is verified, so LoginPage manages the storage

      return result;
    },

    checkEmailExists: async (email: string) => {
      if (USE_LOCAL_BACKEND) {
        const exists = await LocalBackend.auth.checkEmail(email);
        return { exists };
      }

      return apiCall<{ exists: boolean }>(
        '/auth/check-email',
        {
          method: 'POST',
          body: JSON.stringify({ email }),
        },
        false
      );
    },

    checkUsernameExists: async (username: string) => {


      if (USE_LOCAL_BACKEND) {
        // For local backend, always return false (username not taken)
        return { exists: false };
      }

      return apiCall<{ exists: boolean }>(
        '/auth/check-username',
        {
          method: 'POST',
          body: JSON.stringify({ username }),
        },
        false
      );
    },

    verify: async () => {
      return apiCall<{ user: User }>(
        '/auth/verify',
        {
          method: 'POST',
        },
        true
      );
    },

    verifyPassword: async (password: string) => {
      return apiCall<{ verified: boolean }>(
        '/auth/verify-password',
        {
          method: 'POST',
          body: JSON.stringify({ password }),
        },
        true
      );
    },

    logout: async () => {
      // Clear local storage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
      }
      return Promise.resolve();
    },
  },

  // ==================== USERS ====================
  users: {
    getAll: async () => {
      if (USE_LOCAL_BACKEND) return LocalBackend.users.getAll();

      // Use frontend cache for users (5 min TTL)
      return cachedAPICall(
        'users:all',
        () => apiCall<any>('/users', undefined, false).then(res => res.data || res),
        5 * 60 * 1000 // 5 minutes cache
      );
    },

    getById: async (id: string) => {
      if (USE_LOCAL_BACKEND) return LocalBackend.users.getById(id);
      return apiCall<User>(`/users/${id}`, undefined, false);
    },

    create: async (data: { name: string; email: string; username?: string; phone: string; password: string; role: string }) => {
      apiCache.invalidate('users:all');
      if (USE_LOCAL_BACKEND) {
        // Use the register endpoint which creates users
        return LocalBackend.auth.register(data.email, data.password, data.name, data.phone, data.username);
      }
      // Use the register endpoint to create users
      return apiCall<{ user: User; token: string }>(
        '/auth/register',
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
        false
      );
    },

    update: async (id: string, data: Partial<User>) => {
      apiCache.invalidate('users:all');
      if (USE_LOCAL_BACKEND) return LocalBackend.users.update(id, data);
      return apiCall<User>(
        `/users/${id}`,
        {
          method: 'PUT',
          body: JSON.stringify(data),
        },
        false
      );
    },

    changePassword: async (id: string, data: { currentPassword: string; newPassword: string }) => {


      if (USE_LOCAL_BACKEND) {
        // For local backend, just update the password (simplified)
        return LocalBackend.users.update(id, { password: data.newPassword });
      }
      return apiCall<{ message: string }>(
        `/users/${id}/change-password`,
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
        false
      );
    },

    changeEmail: async (id: string, data: { newEmail: string; password: string }) => {


      if (USE_LOCAL_BACKEND) {
        // For local backend, just update the email (simplified)
        return LocalBackend.users.update(id, { email: data.newEmail });
      }
      return apiCall<{ message: string; newEmail: string }>(
        `/users/${id}/change-email`,
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
        false
      );
    },

    suspend: async (id: string) => {
      apiCache.invalidate('users:all');
      if (USE_LOCAL_BACKEND) {
        return LocalBackend.users.update(id, { isActive: false });
      }
      // Use direct Supabase REST API (PostgREST) to update is_active column
      // Also set device_revocation_ts to force-logout all active sessions
      const token = getAuthToken();
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/users?id=eq.${id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': publicAnonKey,
            'Authorization': `Bearer ${token || publicAnonKey}`,
            'Prefer': 'return=representation',
          },
          body: JSON.stringify({
            is_active: false,
            device_revocation_ts: new Date().toISOString(),
          }),
        }
      );
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to suspend user:', errorText);
        throw new Error(`Failed to deactivate user: ${errorText}`);
      }
      const result = await response.json();

      // Also delete all device records for this user (force logout everywhere)
      try {
        await fetch(
          `${SUPABASE_URL}/rest/v1/user_devices?user_id=eq.${id}`,
          {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'apikey': publicAnonKey,
              'Authorization': `Bearer ${token || publicAnonKey}`,
            },
          }
        );
      } catch (e) {
        console.warn('Could not clear user devices on suspend:', e);
      }

      // Invalidate users cache so fetchUsers returns fresh data
      apiCache.invalidate('users:all');
      return result[0] || result;
    },

    unsuspend: async (id: string) => {
      apiCache.invalidate('users:all');
      if (USE_LOCAL_BACKEND) {
        return LocalBackend.users.update(id, { isActive: true });
      }
      // Use direct Supabase REST API (PostgREST) to update is_active column
      const token = getAuthToken();
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/users?id=eq.${id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': publicAnonKey,
            'Authorization': `Bearer ${token || publicAnonKey}`,
            'Prefer': 'return=representation',
          },
          body: JSON.stringify({ is_active: true }),
        }
      );
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to unsuspend user:', errorText);
        throw new Error(`Failed to reactivate user: ${errorText}`);
      }
      const result = await response.json();
      // Invalidate users cache so fetchUsers returns fresh data
      apiCache.invalidate('users:all');
      return result[0] || result;
    },

    delete: async (id: string) => {
      apiCache.invalidate('users:all');
      if (USE_LOCAL_BACKEND) {
        LocalBackend.users.delete(id);
        return { message: 'User deleted successfully' };
      }

      // First, revoke all devices and set revocation timestamp to force-logout active sessions
      const token = getAuthToken();
      try {
        // Set device_revocation_ts so any active sessions get force-logged-out
        await fetch(
          `${SUPABASE_URL}/rest/v1/users?id=eq.${id}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'apikey': publicAnonKey,
              'Authorization': `Bearer ${token || publicAnonKey}`,
            },
            body: JSON.stringify({ device_revocation_ts: new Date().toISOString() }),
          }
        );
        // Delete all device records for this user
        await fetch(
          `${SUPABASE_URL}/rest/v1/user_devices?user_id=eq.${id}`,
          {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'apikey': publicAnonKey,
              'Authorization': `Bearer ${token || publicAnonKey}`,
            },
          }
        );
      } catch (e) {
        console.warn('Could not revoke devices before user deletion:', e);
      }

      // Then delete the user
      return apiCall<{ message: string }>(
        `/users/${id}`,
        {
          method: 'DELETE',
        },
        false
      );
    },

    // Device management
    getDevices: async (userId: string) => {
      return apiCall<any[]>(`/users/${userId}/devices`, undefined, false);
    },

    registerDevice: async (userId: string, deviceInfo: {
      deviceName: string;
      browser: string;
      os: string;
      deviceType: string;
      userAgent: string;
      ipAddress?: string;
      isTrusted: boolean;
    }) => {
      return apiCall<any>(
        `/users/${userId}/devices`,
        {
          method: 'POST',
          body: JSON.stringify(deviceInfo),
        },
        false
      );
    },

    removeDevice: async (userId: string, deviceId: string) => {
      return apiCall<{ message: string }>(
        `/users/${userId}/devices/${deviceId}`,
        {
          method: 'DELETE',
        },
        false
      );
    },

    signOutAllDevices: async (userId: string, currentUserAgent: string) => {
      return apiCall<{ message: string; deviceRevocationTs: string }>(
        `/users/${userId}/devices/sign-out-all`,
        {
          method: 'POST',
          body: JSON.stringify({ currentUserAgent }),
        },
        false
      );
    },
  },

  // ==================== BARBERS ====================
  barbers: {
    getAll: async () => {
      if (USE_LOCAL_BACKEND) return LocalBackend.barbers.getAll();

      // Use cache for barbers list (changes infrequently)
      return cachedAPICall(
        'barbers:all',
        async () => {
          return apiCall<any[]>('/barbers', undefined, false);
        },
        5 * 60 * 1000 // Cache for 5 minutes
      );
    },

    getById: async (id: string) => {
      if (USE_LOCAL_BACKEND) return LocalBackend.barbers.getById(id);
      return apiCall<any>(`/barbers/${id}`, undefined, false);
    },

    getByUserId: async (userId: string) => {
      if (USE_LOCAL_BACKEND) {
        // For local backend, find barber where user_id matches
        const all = LocalBackend.barbers.getAll();
        return all.find((b: any) => b.user_id === userId) || null;
      }
      return apiCall<any>(`/barbers/user/${userId}`, undefined, false);
    },

    getEarnings: async (id: string, params?: { startDate?: string; endDate?: string }) => {
      if (USE_LOCAL_BACKEND) {
        // For local backend, calculate from appointments
        const appointments = LocalBackend.appointments.getAll();
        const barberAppointments = appointments.filter((apt: any) =>
          apt.barberId === id && apt.status === 'completed'
        );

        const totalEarnings = barberAppointments.reduce((sum: number, apt: any) => sum + apt.price, 0);
        const totalAppointments = barberAppointments.length;
        const averageEarningPerAppointment = totalAppointments > 0 ? totalEarnings / totalAppointments : 0;

        // Group by date
        const earningsByDate = barberAppointments.reduce((acc: any, apt: any) => {
          if (!acc[apt.date]) {
            acc[apt.date] = { date: apt.date, amount: 0, count: 0 };
          }
          acc[apt.date].amount += apt.price;
          acc[apt.date].count += 1;
          return acc;
        }, {});

        return {
          totalEarnings,
          totalAppointments,
          averageEarningPerAppointment,
          earningsByDate: Object.values(earningsByDate),
        };
      }

      const queryParams = params ? '?' + new URLSearchParams(params as any).toString() : '';
      return apiCall<any>(`/barbers/${id}/earnings${queryParams}`, undefined, false);
    },

    getAvailability: async (id: string) => {
      if (USE_LOCAL_BACKEND) {
        // Return default availability for local backend
        return [
          { dayOfWeek: 0, isAvailable: false, startTime: "09:00", endTime: "17:00" },
          { dayOfWeek: 1, isAvailable: true, startTime: "09:00", endTime: "17:00" },
          { dayOfWeek: 2, isAvailable: true, startTime: "09:00", endTime: "17:00" },
          { dayOfWeek: 3, isAvailable: true, startTime: "09:00", endTime: "17:00" },
          { dayOfWeek: 4, isAvailable: true, startTime: "09:00", endTime: "17:00" },
          { dayOfWeek: 5, isAvailable: true, startTime: "09:00", endTime: "17:00" },
          { dayOfWeek: 6, isAvailable: true, startTime: "09:00", endTime: "17:00" },
        ];
      }
      try {
        const result = await apiCall<any>(`/barbers/${id}/availability`, undefined, false);
        // Backend returns default availability if none set, so we'll always get data
        return result || [];
      } catch (error) {
        console.warn(`Failed to fetch availability for barber ${id}, using defaults:`, error);
        // Return default availability on error
        return [
          { dayOfWeek: 0, isAvailable: false, startTime: "09:00", endTime: "17:00" },
          { dayOfWeek: 1, isAvailable: true, startTime: "09:00", endTime: "17:00" },
          { dayOfWeek: 2, isAvailable: true, startTime: "09:00", endTime: "17:00" },
          { dayOfWeek: 3, isAvailable: true, startTime: "09:00", endTime: "17:00" },
          { dayOfWeek: 4, isAvailable: true, startTime: "09:00", endTime: "17:00" },
          { dayOfWeek: 5, isAvailable: true, startTime: "09:00", endTime: "17:00" },
          { dayOfWeek: 6, isAvailable: true, startTime: "09:00", endTime: "17:00" },
        ];
      }
    },

    create: async (data: any) => {
      if (USE_LOCAL_BACKEND) return LocalBackend.barbers.create(data);
      const result = await apiCall<any>(
        '/barbers',
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
        false
      );
      // Invalidate barbers cache
      apiCache.invalidate('barbers:all');
      return result;
    },

    update: async (id: string, data: any) => {
      if (USE_LOCAL_BACKEND) return LocalBackend.barbers.update(id, data);
      const result = await apiCall<any>(
        `/barbers/${id}`,
        {
          method: 'PUT',
          body: JSON.stringify(data),
        },
        false
      );
      // Invalidate barbers cache
      apiCache.invalidate('barbers:all');
      apiCache.invalidatePattern(/^barbers:/);
      return result;
    },

    delete: async (id: string) => {
      if (USE_LOCAL_BACKEND) {
        LocalBackend.barbers.delete(id);
        return { message: 'Barber deleted successfully' };
      }
      const result = await apiCall<{ message: string }>(
        `/barbers/${id}`,
        {
          method: 'DELETE',
        },
        false
      );
      // Invalidate barbers cache
      apiCache.invalidate('barbers:all');
      apiCache.invalidatePattern(/^barbers:/);
      return result;
    },
  },

  // ==================== SERVICES ====================
  services: {
    getAll: async () => {
      if (USE_LOCAL_BACKEND) return LocalBackend.services.getAll();

      // Use cache for services (they rarely change)
      return cachedAPICall(
        'services:all',
        async () => {
          const data = await apiCall<any[]>('/services', undefined, false);
          return toCamelCase(data);
        },
        10 * 60 * 1000 // Cache for 10 minutes
      );
    },

    getById: async (id: string) => {
      if (USE_LOCAL_BACKEND) return LocalBackend.services.getById(id);
      const data = await apiCall<any>(`/services/${id}`, undefined, false);
      // Convert snake_case to camelCase
      return toCamelCase(data);
    },

    create: async (data: any) => {
      if (USE_LOCAL_BACKEND) return LocalBackend.services.create(data);
      // Convert camelCase to snake_case before sending
      const snakeCaseData = toSnakeCase(data);
      const result = await apiCall<any>(
        '/services',
        {
          method: 'POST',
          body: JSON.stringify(snakeCaseData),
        },
        false
      );
      // Invalidate services cache when creating
      apiCache.invalidate('services:all');
      // Convert response back to camelCase
      return toCamelCase(result);
    },

    update: async (id: string, data: any) => {
      if (USE_LOCAL_BACKEND) return LocalBackend.services.update(id, data);
      // Convert camelCase to snake_case before sending
      const snakeCaseData = toSnakeCase(data);
      const result = await apiCall<any>(
        `/services/${id}`,
        {
          method: 'PUT',
          body: JSON.stringify(snakeCaseData),
        },
        false
      );
      // Invalidate services cache when updating
      apiCache.invalidate('services:all');
      apiCache.invalidate(`services:${id}`);
      // Convert response back to camelCase
      return toCamelCase(result);
    },

    delete: async (id: string) => {
      if (USE_LOCAL_BACKEND) {
        LocalBackend.services.delete(id);
        return { message: 'Service deleted successfully' };
      }
      const result = await apiCall<{ message: string }>(
        `/services/${id}`,
        {
          method: 'DELETE',
        },
        false
      );
      // Invalidate services cache when deleting
      apiCache.invalidate('services:all');
      apiCache.invalidate(`services:${id}`);
      return result;
    },
  },

  // ==================== APPOINTMENTS ====================
  appointments: {
    getAll: async (filters?: any) => {
      if (USE_LOCAL_BACKEND) return LocalBackend.appointments.getAll();
      const queryParams = filters ? '?' + new URLSearchParams(filters).toString() : '';

      // Use frontend cache for appointments (2 min TTL)
      const cacheKey = `appointments${queryParams}`;
      return cachedAPICall(
        cacheKey,
        () => apiCall<any>(`/appointments${queryParams}`, undefined, false).then(res => res.data || res),
        2 * 60 * 1000 // 2 minutes cache
      );
    },

    getById: async (id: string) => {
      if (USE_LOCAL_BACKEND) return LocalBackend.appointments.getById(id);
      return apiCall<Appointment>(`/appointments/${id}`, undefined, false);
    },

    getByCustomerId: async (customerId: string) => {
      if (USE_LOCAL_BACKEND) {
        const all = LocalBackend.appointments.getAll();
        return all.filter(a => a.customer_id === customerId);
      }
      return apiCall<Appointment[]>(`/appointments/customer/${customerId}`, undefined, false);
    },

    getByBarberId: async (barberId: string) => {
      if (USE_LOCAL_BACKEND) {
        const all = LocalBackend.appointments.getAll();
        return all.filter(a => a.barber_id === barberId);
      }
      return apiCall<Appointment[]>(`/appointments/barber/${barberId}`, undefined, false);
    },

    getByDate: async (date: string) => {
      if (USE_LOCAL_BACKEND) {
        const all = LocalBackend.appointments.getAll();
        return all.filter(a => a.appointment_date === date);
      }
      return apiCall<Appointment[]>(`/appointments/date/${date}`, undefined, false);
    },

    create: async (data: any) => {
      if (USE_LOCAL_BACKEND) return LocalBackend.appointments.create(data);

      const result = await apiCall<Appointment>(
        '/appointments',
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
        false
      );

      // Invalidate appointments cache
      apiCache.invalidatePattern(/^appointments/);
      return result;
    },

    update: async (id: string, data: any) => {
      if (USE_LOCAL_BACKEND) return LocalBackend.appointments.update(id, data);

      const result = await apiCall<Appointment>(
        `/appointments/${id}`,
        {
          method: 'PUT',
          body: JSON.stringify(data),
        },
        false
      );

      // Invalidate appointments cache
      apiCache.invalidatePattern(/^appointments/);
      return result;
    },

    delete: async (id: string) => {
      if (USE_LOCAL_BACKEND) {
        LocalBackend.appointments.delete(id);
        return { message: 'Appointment deleted successfully' };
      }

      const result = await apiCall<{ message: string }>(
        `/appointments/${id}`,
        {
          method: 'DELETE',
        },
        false
      );

      // Invalidate appointments cache
      apiCache.invalidatePattern(/^appointments/);
      return result;
    },

    cancel: async (customerId: string, appointmentId: string, reason?: string) => {
      if (USE_LOCAL_BACKEND) {
        return LocalBackend.appointments.update(appointmentId, { status: 'cancelled' });
      }
      return apiCall<Appointment>(
        `/customers/${customerId}/appointments/${appointmentId}/cancel`,
        {
          method: 'POST',
          body: JSON.stringify({ reason: reason || 'Cancelled by customer' }),
        },
        false
      );
    },
  },

  // ==================== ANALYTICS ====================
  analytics: {
    getDashboard: async () => {
      if (USE_LOCAL_BACKEND) return LocalBackend.analytics.getDashboard();
      return apiCall<any>('/analytics/dashboard', undefined, false);
    },

    getRevenue: async (params?: { period?: 'day' | 'week' | 'month' | 'year' }) => {
      if (USE_LOCAL_BACKEND) {
        // Return empty predictions for local backend
        return {
          predictions: {
            predictedRevenue: 0,
            expectedBookings: 0,
            peakDay: 'N/A',
            trend: 'No Data',
            growthRate: 0,
          }
        };
      }
      const queryParams = params ? '?' + new URLSearchParams(params as any).toString() : '';
      return apiCall<any>(`/analytics/revenue${queryParams}`, undefined, false);
    },
  },

  // ==================== REVIEWS ====================
  reviews: {
    testConnection: async () => {

      const data = await apiCall<any>('/reviews/debug/test-connection', undefined, false);

      return data;
    },

    getAll: async () => {
      if (USE_LOCAL_BACKEND) return LocalBackend.reviews.getAll();

      try {
        const data = await apiCall<any[]>('/reviews', undefined, false);

        // Check if data is valid
        if (!data) {
          console.warn('⚠️ API: Received null/undefined data');
          return [];
        }

        if (!Array.isArray(data)) {
          console.error('❌ API: Data is not an array!');
          throw new Error('Invalid response format: expected array of reviews');
        }

        const camelData = toCamelCase(data);

        return camelData;
      } catch (error: any) {
        console.error('❌ API: Failed to fetch reviews:', error.message);

        // Re-throw with better context
        const errorMessage = error.message || 'Unknown error fetching reviews';
        throw new Error(`Backend error: ${errorMessage}`);
      }
    },

    getRecent: async (limit: number = 10) => {
      if (USE_LOCAL_BACKEND) return LocalBackend.reviews.getRecent(limit);
      const data = await apiCall<any[]>(`/reviews?limit=${limit}`, undefined, false);
      return toCamelCase(data);
    },

    getByBarberId: async (barberId: string) => {
      if (USE_LOCAL_BACKEND) {
        const all = LocalBackend.reviews.getAll();
        return all.filter(r => r.barber_id === barberId);
      }

      try {
        const data = await apiCall<any[]>(`/reviews?barber_id=${barberId}`, undefined, false);

        if (!data) {
          console.warn('⚠️ API: Received null/undefined data for barber reviews');
          return [];
        }

        const camelData = toCamelCase(data);

        return camelData;
      } catch (error: any) {
        console.error('❌ API: Failed to fetch barber reviews');
        throw error;
      }
    },

    getByCustomerId: async (customerId: string) => {
      if (USE_LOCAL_BACKEND) {
        const all = LocalBackend.reviews.getAll();
        return all.filter(r => r.customer_id === customerId);
      }
      const data = await apiCall<any[]>(`/reviews?customer_id=${customerId}`, undefined, false);
      return toCamelCase(data);
    },

    create: async (data: any) => {
      if (USE_LOCAL_BACKEND) return LocalBackend.reviews.create(data);
      const snakeCaseData = toSnakeCase(data);
      const result = await apiCall<any>(
        '/reviews',
        {
          method: 'POST',
          body: JSON.stringify(snakeCaseData),
        },
        false
      );
      return toCamelCase(result);
    },

    update: async (id: string, data: any) => {
      const snakeCaseData = toSnakeCase(data);
      const result = await apiCall<any>(
        `/reviews/${id}`,
        {
          method: 'PUT',
          body: JSON.stringify(snakeCaseData),
        },
        false
      );
      return toCamelCase(result);
    },

    toggleShowOnLanding: async (id: string) => {
      const result = await apiCall<any>(
        `/reviews/${id}/toggle-landing`,
        {
          method: 'PUT',
        },
        false
      );
      return toCamelCase(result);
    },

    delete: async (id: string) => {
      return apiCall<{ message: string }>(
        `/reviews/${id}`,
        {
          method: 'DELETE',
        },
        false
      );
    },
  },

  // ==================== PAYMENTS ====================
  payments: {
    getAll: async () => {
      if (USE_LOCAL_BACKEND) return LocalBackend.payments.getAll();
      return apiCall<any[]>('/payments', undefined, false);
    },

    create: async (data: any) => {
      if (USE_LOCAL_BACKEND) return LocalBackend.payments.create(data);
      return apiCall<any>(
        '/payments',
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
        false
      );
    },

    update: async (id: string, data: any) => {
      return apiCall<any>(
        `/payments/${id}`,
        {
          method: 'PUT',
          body: JSON.stringify(data),
        },
        false
      );
    },

    delete: async (id: string) => {
      return apiCall<{ message: string }>(
        `/payments/${id}`,
        {
          method: 'DELETE',
        },
        false
      );
    },
  },

  // ==================== SETTINGS ====================
  settings: {
    get: async () => {
      if (USE_LOCAL_BACKEND) return LocalBackend.settings.getAll();
      return apiCall<any>('/settings', undefined, false);
    },

    update: async (data: any) => {
      if (USE_LOCAL_BACKEND) {
        Object.entries(data).forEach(([key, value]) => {
          LocalBackend.settings.update(key, value);
        });
        return data;
      }
      return apiCall<any>(
        '/settings',
        {
          method: 'PUT',
          body: JSON.stringify(data),
        },
        false
      );
    },
  },

  // ==================== FAVORITES ====================
  favorites: {
    getAll: async (userId: string) => {
      try {
        // Use cache for favorites list (frequently accessed)
        return cachedAPICall(
          `favorites:${userId}`,
          async () => {
            const data = await apiCall<any[]>(`/favorites?user_id=${userId}`, undefined, false);
            return toCamelCase(data || []);
          },
          2 * 60 * 1000 // Cache for 2 minutes
        );
      } catch (error) {
        console.error('❌ API: Failed to fetch favorites', error);
        return [];
      }
    },

    add: async (userId: string, serviceId: string) => {
      const result = await apiCall<any>(
        '/favorites',
        {
          method: 'POST',
          body: JSON.stringify({ user_id: userId, service_id: serviceId }),
        },
        false
      );
      // Invalidate favorites cache for instant re-fetch
      apiCache.invalidate(`favorites:${userId}`);
      return toCamelCase(result);
    },

    remove: async (userId: string, serviceId: string) => {
      return apiCall<{ message: string }>(
        `/favorites/${userId}/${serviceId}`,
        {
          method: 'DELETE',
        },
        false
      );
    },

    removeMultiple: async (userId: string, serviceIds: string[]) => {
      // Remove favorites one by one
      const results = await Promise.all(
        serviceIds.map(serviceId =>
          apiCall<{ message: string }>(
            `/favorites/${userId}/${serviceId}`,
            {
              method: 'DELETE',
            },
            false
          )
        )
      );
      return results;
    },

    check: async (userId: string, serviceId: string) => {
      try {
        const result = await apiCall<{ isFavorite: boolean }>(
          `/favorites/check?user_id=${userId}&service_id=${serviceId}`,
          undefined,
          false
        );
        return result.isFavorite;
      } catch (error) {
        return false;
      }
    },
  },

  // ==================== IMAGE UPLOAD ====================
  uploadImage: async (formData: FormData): Promise<{ url: string; fileName: string }> => {
    try {
      const token = getAuthToken();
      const headers: HeadersInit = {
        'apikey': publicAnonKey,
      };

      // IMPORTANT: Supabase Edge Functions require Authorization header
      // Use user token if available, otherwise use anon key
      if (token && token.trim() !== '' && token !== publicAnonKey) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        // For anonymous/public requests, use the anon key
        headers['Authorization'] = `Bearer ${publicAnonKey}`;
      }



      const response = await fetch(`${API_BASE_URL}/upload-image`, {
        method: 'POST',
        headers,
        body: formData,
      });


      if (!response.ok) {
        let errorMessage = 'Image upload failed';
        try {
          const error = await response.json();
          console.error('❌ Error response body:', error);
          errorMessage = error.error || error.message || errorMessage;
        } catch {
          const textError = await response.text();
          console.error('❌ Error response text:', textError);
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const responseText = await response.text();


      let json;
      try {
        json = JSON.parse(responseText);

      } catch (parseError) {
        console.error('❌ Failed to parse response as JSON:', parseError);
        throw new Error('Invalid response format from server');
      }

      // If response has the standardized format { success, data }, extract data
      if (json && typeof json === 'object' && 'success' in json && 'data' in json) {

        const data = json.data;
        // Normalize the URL to always be the public R2 CDN URL
        if (data && data.url) data.url = normalizeR2Url(data.url);
        return data;
      }

      // Check if response has url directly
      if (json && typeof json === 'object' && 'url' in json) {

        json.url = normalizeR2Url(json.url);
        return json;
      }

      console.error('❌ Response missing expected fields. Full response:', json);
      throw new Error('Invalid response format: missing url field');
    } catch (error) {
      console.error('❌ Image upload error:', error);
      throw error;
    }
  },

  // ==================== NOTIFICATIONS ====================
  notifications: {
    getAll: async (limit?: number) => {
      if (USE_LOCAL_BACKEND) return LocalBackend.notifications.getAll();

      const query = limit ? `?limit=${limit}` : '';
      const data = await apiCall<any[]>(`/notifications${query}`, undefined, false);
      return toCamelCase(data);
    },

    getByUserId: async (userId: string, role?: string, limit?: number, offset?: number) => {
      if (USE_LOCAL_BACKEND) return LocalBackend.notifications.getByUserId(userId);


      const params = new URLSearchParams();
      if (role) params.append('role', role);
      if (limit) params.append('limit', limit.toString());
      if (offset) params.append('offset', offset.toString());
      const query = params.toString() ? `?${params.toString()}` : '';
      const fullUrl = `/notifications/user/${userId}${query}`;

      const data = await apiCall<any[]>(fullUrl, undefined, false);

      const camelData = toCamelCase(data);

      return camelData;
    },

    getUnreadCount: async (userId: string, role?: string) => {
      if (USE_LOCAL_BACKEND) return LocalBackend.notifications.getUnreadCount(userId);


      const query = role ? `?role=${role}` : '';
      const result = await apiCall<{ count: number }>(`/notifications/user/${userId}/unread-count${query}`, undefined, false);
      return result.count;
    },

    create: async (notification: any) => {
      if (USE_LOCAL_BACKEND) return LocalBackend.notifications.create(notification);


      const snakeData = toSnakeCase(notification);
      const data = await apiCall<any>('/notifications', {
        method: 'POST',
        body: JSON.stringify(snakeData),
      }, false);
      return toCamelCase(data);
    },

    markAsRead: async (id: string) => {
      if (USE_LOCAL_BACKEND) return LocalBackend.notifications.markAsRead(id);



      const data = await apiCall<any>(`/notifications/${id}/read`, {
        method: 'PATCH',
      }, false);


      const result = toCamelCase(data);


      return result;
    },

    markAllAsRead: async (userId: string, role?: string) => {
      if (USE_LOCAL_BACKEND) return LocalBackend.notifications.markAllAsRead(userId);


      const query = role ? `?role=${role}` : '';
      await apiCall<void>(`/notifications/user/${userId}/read-all${query}`, {
        method: 'PATCH',
      }, false);
    },

    delete: async (id: string) => {
      if (USE_LOCAL_BACKEND) return LocalBackend.notifications.delete(id);


      await apiCall<void>(`/notifications/${id}`, {
        method: 'DELETE',
      }, false);
    },
  },

  // ==================== AUDIT LOGS ====================
  auditLogs: {
    getAll: async (limit?: number, action?: string, userId?: string) => {
      if (USE_LOCAL_BACKEND) return LocalBackend.auditLogs.getAll();


      const params = new URLSearchParams();
      if (limit) params.append('limit', limit.toString());
      if (action) params.append('action', action);
      if (userId) params.append('userId', userId);

      const query = params.toString() ? `?${params.toString()}` : '';
      const data = await apiCall<any[]>(`/audit-logs${query}`, undefined, false);
      return toCamelCase(data);
    },

    getByUserId: async (userId: string, limit?: number) => {
      if (USE_LOCAL_BACKEND) return LocalBackend.auditLogs.getByUserId(userId);


      const query = limit ? `?limit=${limit}` : '';
      const data = await apiCall<any[]>(`/audit-logs/user/${userId}${query}`, undefined, false);
      return toCamelCase(data);
    },

    getByEntity: async (entityType: string, entityId: string, limit?: number) => {
      if (USE_LOCAL_BACKEND) return LocalBackend.auditLogs.getByEntity(entityType, entityId);


      const query = limit ? `?limit=${limit}` : '';
      const data = await apiCall<any[]>(`/audit-logs/entity/${entityType}/${entityId}${query}`, undefined, false);
      return toCamelCase(data);
    },

    create: async (log: any) => {
      if (USE_LOCAL_BACKEND) return LocalBackend.auditLogs.create(log);


      const snakeData = toSnakeCase(log);
      const data = await apiCall<any>('/audit-logs', {
        method: 'POST',
        body: JSON.stringify(snakeData),
      }, false);
      return toCamelCase(data);
    },

    getStatistics: async () => {
      if (USE_LOCAL_BACKEND) return LocalBackend.auditLogs.getStatistics();


      const data = await apiCall<any>('/audit-logs/statistics', undefined, false);
      return toCamelCase(data);
    },
  },

};

export default API;