/**
 * Local Backend Service - In-Browser Database
 * Temporary solution for when Supabase Edge Functions can't deploy
 * Stores all data in localStorage with full CRUD operations
 */

import type { User, Appointment, Notification } from '../App';

// Storage keys
const STORAGE_KEYS = {
  USERS: 'supremo_users',
  SERVICES: 'supremo_services',
  BARBERS: 'supremo_barbers',
  APPOINTMENTS: 'supremo_appointments',
  PAYMENTS: 'supremo_payments',
  REVIEWS: 'supremo_reviews',
  NOTIFICATIONS: 'supremo_notifications',
  SETTINGS: 'supremo_settings',
  AUDIT_LOGS: 'supremo_audit_logs',
  AUTH_TOKEN: 'authToken',
};

// Helper to generate IDs
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Helper to hash passwords (simple client-side hash)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generic storage helpers
function getFromStorage<T>(key: string, defaultValue: T[] = []): T[] {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function saveToStorage<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// Initialize with default data if empty
function initializeDefaultData() {
  // Initialize default super admin if no users exist
  const users = getFromStorage<any>(STORAGE_KEYS.USERS);
  if (users.length === 0) {
    hashPassword('admin123').then(hashedPassword => {
      const superAdmin = {
        id: generateId(),
        email: 'admin@supremobarber.com',
        password: hashedPassword,
        name: 'Super Admin',
        phone: '+1234567890',
        role: 'super_admin',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      saveToStorage(STORAGE_KEYS.USERS, [superAdmin]);
    });
  }

  // Initialize default services
  const services = getFromStorage<any>(STORAGE_KEYS.SERVICES);
  if (services.length === 0) {
    const defaultServices = [
      {
        id: generateId(),
        name: 'Classic Haircut',
        category: 'Haircuts',
        price: 25,
        duration: 30,
        description: 'Professional haircut with styling',
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: generateId(),
        name: 'Beard Trim',
        category: 'Grooming',
        price: 15,
        duration: 20,
        description: 'Beard trimming and shaping',
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: generateId(),
        name: 'Hot Towel Shave',
        category: 'Grooming',
        price: 30,
        duration: 40,
        description: 'Traditional hot towel shave',
        is_active: true,
        created_at: new Date().toISOString(),
      },
    ];
    saveToStorage(STORAGE_KEYS.SERVICES, defaultServices);
  }

  // Initialize default barbers
  const barbers = getFromStorage<any>(STORAGE_KEYS.BARBERS);
  if (barbers.length === 0) {
    const defaultBarbers = [
      {
        id: generateId(),
        name: 'Carlos Martinez',
        specialties: ['Classic Cuts', 'Fades'],
        rating: 4.8,
        total_reviews: 127,
        total_appointments: 543,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: generateId(),
        name: 'Miguel Santos',
        specialties: ['Beard Styling', 'Hot Shaves'],
        rating: 4.9,
        total_reviews: 98,
        total_appointments: 412,
        is_active: true,
        created_at: new Date().toISOString(),
      },
    ];
    saveToStorage(STORAGE_KEYS.BARBERS, defaultBarbers);
  }

  // Initialize default reviews
  const reviews = getFromStorage<any>(STORAGE_KEYS.REVIEWS);
  if (reviews.length === 0) {
    const barbers = getFromStorage<any>(STORAGE_KEYS.BARBERS);
    if (barbers.length > 0) {
      const defaultReviews = [
        {
          id: generateId(),
          customer_id: null,
          barber_id: barbers[0].id,
          appointment_id: null,
          rating: 5,
          comment: 'Best haircut I\'ve ever had! Carlos is amazing.',
          customer_name: 'John Doe',
          show_on_landing: true,
          created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: generateId(),
          customer_id: null,
          barber_id: barbers[1].id,
          appointment_id: null,
          rating: 5,
          comment: 'Miguel gave me the perfect beard trim. Highly recommended!',
          customer_name: 'James Smith',
          show_on_landing: true,
          created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ];
      saveToStorage(STORAGE_KEYS.REVIEWS, defaultReviews);
    }
  }
  
  // Initialize default notifications
  const notifications = getFromStorage<any>(STORAGE_KEYS.NOTIFICATIONS);
  if (notifications.length === 0) {
    const users = getFromStorage<any>(STORAGE_KEYS.USERS);
    if (users.length > 0) {
      const adminUser = users.find(u => u.role === 'super_admin' || u.role === 'admin');
      if (adminUser) {
        const defaultNotifications = [
          {
            id: generateId(),
            user_id: adminUser.id,
            user_role: 'admin',
            type: 'system_alert',
            title: 'Welcome to Supremo Barber',
            message: 'Your barber shop management system is ready to use! Start by managing services and barbers.',
            is_read: false,
            read_at: null,
            action_url: '/admin',
            action_label: 'Go to Dashboard',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: generateId(),
            user_id: adminUser.id,
            user_role: 'admin',
            type: 'new_customer',
            title: 'New Customer Registered',
            message: 'A new customer has registered and is ready to book appointments.',
            is_read: false,
            read_at: null,
            action_url: '/admin/customers',
            action_label: 'View Customers',
            created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          },
        ];
        saveToStorage(STORAGE_KEYS.NOTIFICATIONS, defaultNotifications);
      }
    }
  }

  // Initialize default audit logs
  const auditLogs = getFromStorage<any>(STORAGE_KEYS.AUDIT_LOGS);
  if (auditLogs.length === 0) {
    const users = getFromStorage<any>(STORAGE_KEYS.USERS);
    if (users.length > 0) {
      const adminUser = users.find(u => u.role === 'super_admin' || u.role === 'admin');
      if (adminUser) {
        const defaultAuditLogs = [
          {
            id: generateId(),
            user_id: 'system',
            user_role: 'system',
            user_name: 'System',
            user_email: null,
            action: 'system_backup',
            entity_type: 'system',
            entity_id: 'initial-setup',
            description: 'System initialized with default data',
            changes: null,
            metadata: { 
              tables_created: ['users', 'services', 'barbers', 'reviews', 'notifications', 'audit_logs'],
              default_data: true 
            },
            status: 'success',
            error_message: null,
            ip_address: '127.0.0.1',
            user_agent: 'Local Backend',
            created_at: new Date().toISOString(),
          },
          {
            id: generateId(),
            user_id: adminUser.id,
            user_role: 'admin',
            user_name: adminUser.name,
            user_email: adminUser.email,
            action: 'user_created',
            entity_type: 'user',
            entity_id: adminUser.id,
            description: 'Admin user account created',
            changes: null,
            metadata: { role: 'admin', initial_setup: true },
            status: 'success',
            error_message: null,
            ip_address: '127.0.0.1',
            user_agent: 'Local Backend',
            created_at: new Date(Date.now() - 1000).toISOString(),
          },
        ];
        saveToStorage(STORAGE_KEYS.AUDIT_LOGS, defaultAuditLogs);
      }
    }
  }
}

// Initialize on load
initializeDefaultData();

// Export the local backend API
export const LocalBackend = {
  // Auth endpoints
  auth: {
    async login(email: string, password: string) {
      const hashedPassword = await hashPassword(password);
      const users = getFromStorage<any>(STORAGE_KEYS.USERS);
      const user = users.find(u => u.email === email && u.password === hashedPassword);

      if (!user) {
        throw new Error('Invalid email or password');
      }

      if (user.status !== 'active') {
        throw new Error('Account is inactive');
      }

      const token = `token_${user.id}_${Date.now()}`;
      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);

      return { user, token };
    },

    async register(email: string, password: string, name: string, phone?: string, username?: string) {
      const users = getFromStorage<any>(STORAGE_KEYS.USERS);
      
      if (users.some(u => u.email === email)) {
        throw new Error('User with this email already exists');
      }

      const hashedPassword = await hashPassword(password);
      const newUser = {
        id: generateId(),
        email,
        username: username || email.split('@')[0],
        password: hashedPassword,
        name,
        phone: phone || null,
        role: 'customer',
        status: 'active',
        loyalty_points: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      users.push(newUser);
      saveToStorage(STORAGE_KEYS.USERS, users);

      const token = `token_${newUser.id}_${Date.now()}`;
      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);

      return { user: newUser, token };
    },

    async checkEmail(email: string) {
      const users = getFromStorage<any>(STORAGE_KEYS.USERS);
      return users.some(u => u.email === email);
    },
  },

  // Users endpoints
  users: {
    getAll() {
      return getFromStorage<any>(STORAGE_KEYS.USERS);
    },

    getById(id: string) {
      const users = getFromStorage<any>(STORAGE_KEYS.USERS);
      const user = users.find(u => u.id === id);
      if (!user) throw new Error('User not found');
      return user;
    },

    update(id: string, updates: any) {
      const users = getFromStorage<any>(STORAGE_KEYS.USERS);
      const index = users.findIndex(u => u.id === id);
      if (index === -1) throw new Error('User not found');

      users[index] = { ...users[index], ...updates, updated_at: new Date().toISOString() };
      saveToStorage(STORAGE_KEYS.USERS, users);
      return users[index];
    },

    delete(id: string) {
      const users = getFromStorage<any>(STORAGE_KEYS.USERS);
      const filtered = users.filter(u => u.id !== id);
      saveToStorage(STORAGE_KEYS.USERS, filtered);
    },
  },

  // Services endpoints
  services: {
    getAll() {
      return getFromStorage<any>(STORAGE_KEYS.SERVICES).filter(s => s.is_active !== false);
    },

    getById(id: string) {
      const services = getFromStorage<any>(STORAGE_KEYS.SERVICES);
      const service = services.find(s => s.id === id);
      if (!service) throw new Error('Service not found');
      return service;
    },

    create(data: any) {
      const services = getFromStorage<any>(STORAGE_KEYS.SERVICES);
      const newService = {
        ...data,
        id: generateId(),
        is_active: true,
        created_at: new Date().toISOString(),
      };
      services.push(newService);
      saveToStorage(STORAGE_KEYS.SERVICES, services);
      return newService;
    },

    update(id: string, updates: any) {
      const services = getFromStorage<any>(STORAGE_KEYS.SERVICES);
      const index = services.findIndex(s => s.id === id);
      if (index === -1) throw new Error('Service not found');

      services[index] = { ...services[index], ...updates };
      saveToStorage(STORAGE_KEYS.SERVICES, services);
      return services[index];
    },

    delete(id: string) {
      const services = getFromStorage<any>(STORAGE_KEYS.SERVICES);
      const filtered = services.filter(s => s.id !== id);
      saveToStorage(STORAGE_KEYS.SERVICES, filtered);
    },
  },

  // Barbers endpoints
  barbers: {
    getAll() {
      return getFromStorage<any>(STORAGE_KEYS.BARBERS).filter(b => b.is_active !== false);
    },

    getById(id: string) {
      const barbers = getFromStorage<any>(STORAGE_KEYS.BARBERS);
      const barber = barbers.find(b => b.id === id);
      if (!barber) throw new Error('Barber not found');
      return barber;
    },

    create(data: any) {
      const barbers = getFromStorage<any>(STORAGE_KEYS.BARBERS);
      const newBarber = {
        ...data,
        id: generateId(),
        rating: 0,
        total_reviews: 0,
        total_appointments: 0,
        is_active: true,
        created_at: new Date().toISOString(),
      };
      barbers.push(newBarber);
      saveToStorage(STORAGE_KEYS.BARBERS, barbers);
      return newBarber;
    },

    update(id: string, updates: any) {
      const barbers = getFromStorage<any>(STORAGE_KEYS.BARBERS);
      const index = barbers.findIndex(b => b.id === id);
      if (index === -1) throw new Error('Barber not found');

      barbers[index] = { ...barbers[index], ...updates };
      saveToStorage(STORAGE_KEYS.BARBERS, barbers);
      return barbers[index];
    },

    delete(id: string) {
      const barbers = getFromStorage<any>(STORAGE_KEYS.BARBERS);
      const filtered = barbers.filter(b => b.id !== id);
      saveToStorage(STORAGE_KEYS.BARBERS, filtered);
    },
  },

  // Appointments endpoints
  appointments: {
    getAll() {
      const appointments = getFromStorage<any>(STORAGE_KEYS.APPOINTMENTS);
      const users = getFromStorage<any>(STORAGE_KEYS.USERS);
      const barbers = getFromStorage<any>(STORAGE_KEYS.BARBERS);
      const services = getFromStorage<any>(STORAGE_KEYS.SERVICES);

      return appointments.map(apt => ({
        ...apt,
        customer: users.find(u => u.id === apt.customer_id),
        barber: barbers.find(b => b.id === apt.barber_id),
        service: services.find(s => s.id === apt.service_id),
      }));
    },

    getById(id: string) {
      const appointments = this.getAll();
      const appointment = appointments.find(a => a.id === id);
      if (!appointment) throw new Error('Appointment not found');
      return appointment;
    },

    create(data: any) {
      const appointments = getFromStorage<any>(STORAGE_KEYS.APPOINTMENTS);
      const newAppointment = {
        ...data,
        id: generateId(),
        created_at: new Date().toISOString(),
      };
      appointments.push(newAppointment);
      saveToStorage(STORAGE_KEYS.APPOINTMENTS, appointments);
      return newAppointment;
    },

    update(id: string, updates: any) {
      const appointments = getFromStorage<any>(STORAGE_KEYS.APPOINTMENTS);
      const index = appointments.findIndex(a => a.id === id);
      if (index === -1) throw new Error('Appointment not found');

      appointments[index] = { ...appointments[index], ...updates };
      saveToStorage(STORAGE_KEYS.APPOINTMENTS, appointments);
      return appointments[index];
    },

    delete(id: string) {
      const appointments = getFromStorage<any>(STORAGE_KEYS.APPOINTMENTS);
      const filtered = appointments.filter(a => a.id !== id);
      saveToStorage(STORAGE_KEYS.APPOINTMENTS, filtered);
    },
  },

  // Reviews endpoints
  reviews: {
    getAll() {
      return getFromStorage<any>(STORAGE_KEYS.REVIEWS);
    },

    getRecent(limit: number = 10) {
      const reviews = getFromStorage<any>(STORAGE_KEYS.REVIEWS);
      return reviews
        .filter(r => r.show_on_landing !== false)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, limit);
    },

    create(data: any) {
      const reviews = getFromStorage<any>(STORAGE_KEYS.REVIEWS);
      const newReview = {
        ...data,
        id: generateId(),
        created_at: new Date().toISOString(),
      };
      reviews.push(newReview);
      saveToStorage(STORAGE_KEYS.REVIEWS, reviews);
      return newReview;
    },
  },

  // Payments endpoints
  payments: {
    getAll() {
      return getFromStorage<any>(STORAGE_KEYS.PAYMENTS);
    },

    create(data: any) {
      const payments = getFromStorage<any>(STORAGE_KEYS.PAYMENTS);
      const newPayment = {
        ...data,
        id: generateId(),
        created_at: new Date().toISOString(),
      };
      payments.push(newPayment);
      saveToStorage(STORAGE_KEYS.PAYMENTS, payments);
      return newPayment;
    },
  },

  // Notifications endpoints
  notifications: {
    getAll() {
      return getFromStorage<any>(STORAGE_KEYS.NOTIFICATIONS);
    },

    getByUserId(userId: string) {
      const notifications = getFromStorage<any>(STORAGE_KEYS.NOTIFICATIONS);
      return notifications.filter(n => n.user_id === userId).sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },

    getUnreadCount(userId: string) {
      const notifications = getFromStorage<any>(STORAGE_KEYS.NOTIFICATIONS);
      return notifications.filter(n => n.user_id === userId && !n.is_read).length;
    },

    create(data: any) {
      const notifications = getFromStorage<any>(STORAGE_KEYS.NOTIFICATIONS);
      const newNotification = {
        ...data,
        id: generateId(),
        is_read: false,
        read_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      notifications.push(newNotification);
      saveToStorage(STORAGE_KEYS.NOTIFICATIONS, notifications);
      return newNotification;
    },

    markAsRead(id: string) {
      const notifications = getFromStorage<any>(STORAGE_KEYS.NOTIFICATIONS);
      const index = notifications.findIndex(n => n.id === id);
      if (index !== -1) {
        notifications[index].is_read = true;
        notifications[index].read_at = new Date().toISOString();
        notifications[index].updated_at = new Date().toISOString();
        saveToStorage(STORAGE_KEYS.NOTIFICATIONS, notifications);
        return notifications[index];
      }
      throw new Error('Notification not found');
    },

    markAllAsRead(userId: string) {
      const notifications = getFromStorage<any>(STORAGE_KEYS.NOTIFICATIONS);
      const now = new Date().toISOString();
      notifications.forEach(n => {
        if (n.user_id === userId && !n.is_read) {
          n.is_read = true;
          n.read_at = now;
          n.updated_at = now;
        }
      });
      saveToStorage(STORAGE_KEYS.NOTIFICATIONS, notifications);
    },

    delete(id: string) {
      const notifications = getFromStorage<any>(STORAGE_KEYS.NOTIFICATIONS);
      const filtered = notifications.filter(n => n.id !== id);
      saveToStorage(STORAGE_KEYS.NOTIFICATIONS, filtered);
    },
  },

  // Analytics endpoint
  analytics: {
    getDashboard() {
      const appointments = getFromStorage<any>(STORAGE_KEYS.APPOINTMENTS);
      const payments = getFromStorage<any>(STORAGE_KEYS.PAYMENTS);
      const users = getFromStorage<any>(STORAGE_KEYS.USERS);
      const barbers = getFromStorage<any>(STORAGE_KEYS.BARBERS);

      const totalRevenue = payments
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

      const totalCustomers = users.filter(u => u.role === 'customer').length;

      const averageRating = barbers.length > 0
        ? barbers.reduce((sum, b) => sum + parseFloat(b.rating || 0), 0) / barbers.length
        : 0;

      return {
        totalRevenue,
        totalAppointments: appointments.length,
        totalCustomers,
        averageRating: averageRating.toFixed(1),
        recentBookings: appointments.slice(0, 5),
        topBarbers: barbers.sort((a, b) => b.rating - a.rating).slice(0, 3),
      };
    },
  },

  // Settings endpoints
  settings: {
    getAll() {
      return getFromStorage<any>(STORAGE_KEYS.SETTINGS, []);
    },

    update(key: string, value: any) {
      const settings = getFromStorage<any>(STORAGE_KEYS.SETTINGS, []);
      const index = settings.findIndex(s => s.key === key);
      
      if (index !== -1) {
        settings[index].value = value;
      } else {
        settings.push({ key, value });
      }
      
      saveToStorage(STORAGE_KEYS.SETTINGS, settings);
      return { key, value };
    },
  },

  // Audit logs endpoint
  auditLogs: {
    getAll() {
      const logs = getFromStorage<any>(STORAGE_KEYS.AUDIT_LOGS, []);
      return logs.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },

    getByUserId(userId: string) {
      const logs = getFromStorage<any>(STORAGE_KEYS.AUDIT_LOGS, []);
      return logs
        .filter(l => l.user_id === userId)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },

    getByEntity(entityType: string, entityId: string) {
      const logs = getFromStorage<any>(STORAGE_KEYS.AUDIT_LOGS, []);
      return logs
        .filter(l => l.entity_type === entityType && l.entity_id === entityId)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },

    create(data: any) {
      const logs = getFromStorage<any>(STORAGE_KEYS.AUDIT_LOGS, []);
      const newLog = {
        ...data,
        id: generateId(),
        status: data.status || 'success',
        created_at: new Date().toISOString(),
      };
      logs.push(newLog);
      saveToStorage(STORAGE_KEYS.AUDIT_LOGS, logs);
      return newLog;
    },

    getStatistics() {
      const logs = getFromStorage<any>(STORAGE_KEYS.AUDIT_LOGS, []);
      
      const byAction: Record<string, number> = {};
      const byStatus: Record<string, number> = {};
      const byUserRole: Record<string, number> = {};
      
      logs.forEach((log: any) => {
        byAction[log.action] = (byAction[log.action] || 0) + 1;
        byStatus[log.status] = (byStatus[log.status] || 0) + 1;
        byUserRole[log.user_role] = (byUserRole[log.user_role] || 0) + 1;
      });
      
      return {
        total: logs.length,
        byAction,
        byStatus,
        byUserRole,
      };
    },
  },
};