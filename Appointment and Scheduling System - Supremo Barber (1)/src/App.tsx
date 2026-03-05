import { useState, useEffect, lazy, Suspense, useCallback, useMemo } from "react";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";
import { createNotification, type Notification } from "./components/NotificationCenter";
import API from "./services/api.service";
import { logUserLogin, logUserLogout } from "./services/audit-notification.service";
import { LoadingFallback } from "./components/LoadingFallback";
import "./utils/clearTokens"; // Load debug helper

// Lazy load heavy components for code splitting
// Note: These components use named exports, so we need to wrap them for lazy loading
const LandingPage = lazy(() => import("./components/LandingPage").then(module => ({ default: module.LandingPage })));
const LoginPage = lazy(() => import("./components/LoginPage").then(module => ({ default: module.LoginPage })));
const ImprovedSuperAdminDashboard = lazy(() => import("./components/ImprovedSuperAdminDashboard").then(module => ({ default: module.ImprovedSuperAdminDashboard })));
const BarberDashboard = lazy(() => import("./components/EnhancedBarberDashboard").then(module => ({ default: module.EnhancedBarberDashboard })));
const CustomerDashboard = lazy(() => import("./components/CustomerDashboard").then(module => ({ default: module.CustomerDashboard })));
const TermsAndConditions = lazy(() => import("./components/TermsAndConditions").then(module => ({ default: module.TermsAndConditions })));
const PrivacyPolicy = lazy(() => import("./components/PrivacyPolicy").then(module => ({ default: module.PrivacyPolicy })));

export type UserRole =
  | "admin"
  | "barber"
  | "staff"
  | "customer"
  | null;

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  isActive?: boolean;
  avatarUrl?: string;
  bio?: string;
  createdAt?: string;
}

export interface Appointment {
  id: string;
  userId: string;
  service: string;
  barber: string;
  date: string;
  time: string;
  price: number;
  duration?: number; // Service duration in minutes
  status: 'pending' | 'confirmed' | 'upcoming' | 'completed' | 'cancelled' | 'rejected';
  canCancel: boolean;
  paymentProof?: string;
  paymentStatus?: 'pending' | 'verified' | 'rejected';
  paymentVerifiedAt?: string;
  paymentVerifiedBy?: string;
  downPaymentPaid?: boolean;
  remainingBalance?: number;
  customerName?: string;
  customer?: string; // For display purposes
  rescheduledCount?: number; // Track number of times rescheduled (max 1)
  cancellationReason?: string; // Reason for cancellation (from barber or customer)
  cancelledBy?: string; // Who cancelled the appointment (barber name or customer name)
  cancelledAt?: string; // Timestamp of cancellation
  // Database fields (from Supabase backend)
  customerId?: string;
  customer_id?: string;
  barberId?: string;
  barber_id?: string;
  serviceId?: string;
  service_id?: string;
  appointment_date?: string;
  appointment_time?: string;
  total_amount?: number;
  down_payment?: number;
  remaining_amount?: number;
  payment_status?: 'pending' | 'verified' | 'rejected';
  // Additional fields from backend
  customer_name?: string;
  barber_name?: string;
  service_name?: string;
  service_price?: number;
  service_duration?: number;
  notes?: string;
  created_at?: string;
}

export type { Notification };

type View = "landingpage" | "login" | "register" | "terms" | "privacy";

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<View>("landingpage");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [preSelectedServiceId, setPreSelectedServiceId] = useState<string | null>(null);

  // Load user from localStorage on mount
  useEffect(() => {
    const validateAndLoadUser = async () => {
      const storedUser = localStorage.getItem('currentUser');
      const storedToken = localStorage.getItem('authToken');
      
      // IMPORTANT: Clear invalid tokens immediately
      if (storedToken) {
        // Check if token is obviously invalid (too short, malformed, etc.)
        if (storedToken.length < 100) {
          console.warn('⚠️ Invalid/corrupted token detected during app init, clearing...');
          localStorage.removeItem('authToken');
          localStorage.removeItem('currentUser');
          setIsLoading(false);
          return;
        }
      }
      
      if (storedUser && storedToken) {
        try {
          const user = JSON.parse(storedUser);
          
          // Check if login was recent (within last 5 minutes)
          const loginTime = localStorage.getItem('loginTime');
          const isRecentLogin = loginTime && (Date.now() - parseInt(loginTime)) < 5 * 60 * 1000;
          
          if (isRecentLogin) {
            // Trust the token for recent logins (faster)
            setCurrentUser(user);
            setAuthToken(storedToken);
            fetchUserData(user.id, user.role);
          } else {
            // Validate token for older sessions
            try {
              const verifyResult = await API.auth.verify();
              if (verifyResult && verifyResult.user) {
                // Token is valid, update user data
                setCurrentUser(verifyResult.user);
                setAuthToken(storedToken);
                // Fetch data in background, don't block initial render
                fetchUserData(verifyResult.user.id, verifyResult.user.role);
              } else {
                // Token invalid, clear storage silently
                localStorage.removeItem('currentUser');
                localStorage.removeItem('authToken');
                localStorage.removeItem('loginTime');
              }
            } catch (verifyError) {
              // If verification fails, clear the stored data silently
              // This handles expired or invalid tokens gracefully
              console.warn('⚠️ Token verification failed, clearing stored credentials');
              localStorage.removeItem('currentUser');
              localStorage.removeItem('authToken');
              localStorage.removeItem('loginTime');
            }
          }
        } catch (error) {
          console.error('Error parsing stored user:', error);
          localStorage.removeItem('currentUser');
          localStorage.removeItem('authToken');
          localStorage.removeItem('loginTime');
        }
      }
      
      setIsLoading(false);
    };
    
    validateAndLoadUser();
  }, []);

  // Helper function to transform appointment data from API to UI format
  // Memoized to prevent recreation on every render
  const transformAppointment = useCallback((apt: any): Appointment => {
    // Map database payment_status to UI paymentStatus
    // Database: pending, partial, paid, refunded
    // UI: pending, verified, rejected
    let uiPaymentStatus = 'pending';
    const dbPaymentStatus = apt.payment_status || apt.paymentStatus || 'pending';
    
    if (dbPaymentStatus === 'paid') {
      uiPaymentStatus = 'verified';
    } else if (dbPaymentStatus === 'refunded') {
      uiPaymentStatus = 'rejected';
    } else if (dbPaymentStatus === 'partial') {
      uiPaymentStatus = 'pending';
    } else {
      uiPaymentStatus = dbPaymentStatus; // pending or any other status
    }

    return {
      // Legacy fields for UI display
      id: apt.id,
      userId: apt.customer_id || apt.userId || '',
      service: apt.service_name || apt.service || '',
      barber: apt.barber_name || apt.barber || '',
      date: apt.appointment_date || apt.date || '',
      time: apt.appointment_time || apt.time || '',
      price: apt.total_amount || apt.service_price || apt.price || 0,
      duration: apt.service_duration || apt.duration || 0,
      status: apt.status || 'pending',
      canCancel: apt.canCancel !== undefined ? apt.canCancel : apt.status === 'pending' || apt.status === 'confirmed',
      customerName: apt.customer_name || apt.customerName || '',
      paymentProof: apt.paymentProof,
      paymentStatus: uiPaymentStatus,
      downPaymentPaid: apt.downPaymentPaid !== undefined ? apt.downPaymentPaid : apt.down_payment > 0,
      remainingBalance: apt.remaining_amount || apt.remainingBalance || 0,
      rescheduledCount: apt.rescheduledCount || 0,
      // Database fields
      customerId: apt.customer_id,
      customer_id: apt.customer_id,
      barberId: apt.barber_id,
      barber_id: apt.barber_id,
      serviceId: apt.service_id,
      service_id: apt.service_id,
      appointment_date: apt.appointment_date || apt.date,
      appointment_time: apt.appointment_time || apt.time,
      total_amount: apt.total_amount || apt.price,
      down_payment: apt.down_payment,
      remaining_amount: apt.remaining_amount,
      payment_status: apt.payment_status || apt.paymentStatus,
      // Additional fields
      customer_name: apt.customer_name,
      barber_name: apt.barber_name,
      service_name: apt.service_name,
      service_price: apt.service_price,
      service_duration: apt.service_duration,
      notes: apt.notes,
      created_at: apt.created_at,
      paymentVerifiedAt: apt.paymentVerifiedAt,
      paymentVerifiedBy: apt.paymentVerifiedBy,
      cancellationReason: apt.cancellationReason,
      cancelledBy: apt.cancelledBy,
      cancelledAt: apt.cancelledAt,
    };
  }, []);

  // Helper function to transform UI appointment back to database format
  // Memoized to prevent recreation on every render
  const transformAppointmentToDatabase = useCallback((apt: Appointment): any => {
    // Map UI paymentStatus back to database payment_status
    // UI: pending, verified, rejected
    // Database: pending, partial, paid, refunded
    let dbPaymentStatus = 'pending';
    if (apt.paymentStatus === 'verified') {
      dbPaymentStatus = 'paid';
    } else if (apt.paymentStatus === 'rejected') {
      dbPaymentStatus = 'refunded';
    } else if (apt.paymentStatus === 'pending') {
      dbPaymentStatus = 'pending';
    }

    // Only include database fields, not UI-only fields
    const dbData: any = {};
    
    // Map fields to database column names
    if (apt.appointment_date !== undefined) dbData.appointment_date = apt.appointment_date;
    if (apt.appointment_time !== undefined) dbData.appointment_time = apt.appointment_time;
    if (apt.status !== undefined) dbData.status = apt.status;
    if (apt.paymentStatus !== undefined) dbData.payment_status = dbPaymentStatus;
    if (apt.total_amount !== undefined) dbData.total_amount = apt.total_amount;
    if (apt.down_payment !== undefined) dbData.down_payment = apt.down_payment;
    if (apt.remaining_amount !== undefined) dbData.remaining_amount = apt.remaining_amount;
    if (apt.notes !== undefined) dbData.notes = apt.notes;
    if (apt.barber_id !== undefined) dbData.barber_id = apt.barber_id;
    if (apt.service_id !== undefined) dbData.service_id = apt.service_id;
    if (apt.customer_id !== undefined) dbData.customer_id = apt.customer_id;
    
    return dbData;
  }, []);

  // Fetch all appointments when user logs in
  // Memoized to prevent recreation on every render
  const fetchAppointments = useCallback(async (userId?: string, userRole?: UserRole) => {
    try {
      let fetchedAppointments: any[];
      
      if (userRole === 'admin') {
        // Admin sees all appointments
        fetchedAppointments = await API.appointments.getAll();
      } else if (userRole === 'barber') {
        // Barbers now see ALL appointments (for bookings management)
        console.log('📅 Fetching ALL appointments for barber...');
        fetchedAppointments = await API.appointments.getAll();
      } else if (userRole === 'customer' && userId) {
        // Customer sees only their appointments - use customer ID endpoint
        fetchedAppointments = await API.appointments.getByCustomerId(userId);
      } else {
        fetchedAppointments = [];
      }
      
      // Transform appointments to include both database and legacy fields
      // Filter out appointments with invalid UUID format (legacy data cleanup)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const validAppointments = fetchedAppointments.filter((apt: any) => {
        if (!apt.id || !uuidRegex.test(apt.id)) {
          console.warn('Filtering out appointment with invalid UUID:', apt.id);
          return false;
        }
        return true;
      });
      
      const transformedAppointments = validAppointments.map(transformAppointment);
      
      console.log(`✅ Fetched ${transformedAppointments.length} appointments for ${userRole}`);
      setAppointments(transformedAppointments);
    } catch (error) {
      console.error('❌ Error fetching appointments:', error);
      // Don't show toast on initial load - just set empty array
      setAppointments([]);
    }
  }, [currentUser, transformAppointment]);

  // Fetch notifications for the current user
  // Memoized to prevent recreation on every render
  const fetchNotifications = useCallback(async (userId: string) => {
    try {
      const fetchedNotifications = await API.notifications.getByUserId(userId);
      
      // Filter out old test/demo notifications with specific service names
      const filteredNotifications = fetchedNotifications.filter((notif: any) => {
        const message = notif.message || '';
        // Remove old payment verified notifications for test services
        if (notif.title?.includes('Payment Verified') && 
            (message.includes('Beard Trim') || 
             message.includes('Premium Cut') || 
             message.includes('Gupit Supremo'))) {
          return false;
        }
        return true;
      });
      
      setNotifications(filteredNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // Don't show error toast - notifications are optional and might not be set up yet
      // Just set empty array and continue
      setNotifications([]);
    }
  }, []);

  // Refresh user profile from database to get latest data (including avatarUrl)
  const refreshUserProfile = useCallback(async (userId: string) => {
    try {
      console.log('🔄 Refreshing user profile from database...');
      const freshUserData = await API.users.getById(userId);
      console.log('✅ Fresh user data received:', freshUserData);
      
      // Update current user state with fresh data
      setCurrentUser(freshUserData);
      
      // Update localStorage with fresh data
      localStorage.setItem('currentUser', JSON.stringify(freshUserData));
      
      console.log('✅ User profile refreshed successfully');
    } catch (error) {
      console.error('❌ Error refreshing user profile:', error);
    }
  }, []);

  // Fetch all user data
  // Memoized to prevent recreation on every render
  const fetchUserData = useCallback(async (userId: string, userRole: UserRole) => {
    try {
      // Refresh user profile first to get latest data (including avatarUrl)
      refreshUserProfile(userId).catch(err => 
        console.error('Error refreshing user profile:', err)
      );
      
      // Fetch appointments (priority), then notifications in background
      // This speeds up perceived load time
      fetchAppointments(userId, userRole).catch(err => 
        console.error('Error fetching appointments:', err)
      );
      
      // Fetch notifications after a small delay to not block UI
      setTimeout(() => {
        fetchNotifications(userId).catch(err => 
          console.error('Error fetching notifications:', err)
        );
      }, 100);
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  }, [refreshUserProfile, fetchAppointments, fetchNotifications]);

  // Handle login - Memoized to prevent recreation
  const handleLogin = useCallback(async (user: User) => {
    setCurrentUser(user);
    // Store user in localStorage for session persistence
    localStorage.setItem('currentUser', JSON.stringify(user));
    localStorage.setItem('loginTime', Date.now().toString());
    
    // Fetch user's data from database in background (don't wait)
    // This makes login instant while data loads in the background
    fetchUserData(user.id, user.role);
    
    // Log user login in background (don't block UI)
    logUserLogin(user.id, user.role, user.name, user.email);
  }, [fetchUserData]);

  // Handle logout - Memoized to prevent recreation - Optimized for instant response
  const handleLogout = useCallback(async () => {
    // Store user info for background logging before clearing
    const userToLog = currentUser;
    
    // IMMEDIATELY clear UI state first (instant response < 0.1s)
    setCurrentUser(null);
    setCurrentView("landingpage");
    setAppointments([]);
    setNotifications([]);
    setAuthToken(null);
    
    // Clear localStorage immediately
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authToken');
    localStorage.removeItem('loginTime');
    
    // Background operations (don't await - fire and forget)
    Promise.all([
      // Log user logout in background
      userToLog ? logUserLogout(userToLog.id, userToLog.role, userToLog.name, userToLog.email).catch(err => {
        console.error('Failed to log logout:', err);
      }) : Promise.resolve(),
      // Logout API call in background
      authToken ? API.auth.logout().catch(err => {
        console.error('Logout API error:', err);
      }) : Promise.resolve()
    ]);
  }, [currentUser, authToken]);

  // Handle user updates - Memoized to prevent recreation
  const handleUserUpdate = useCallback((updatedUser: User) => {
    setCurrentUser(updatedUser);
    localStorage.setItem('currentUser', JSON.stringify(updatedUser));
  }, []);

  // Handle adding a new appointment
  // Memoized to prevent recreation on every render
  const handleAddAppointment = useCallback(async (appointment: Appointment) => {
    try {
      // Create appointment (main operation)
      const createdAppointment = await API.appointments.create(appointment);
      
      // Transform the returned appointment to include legacy fields for display
      const transformedAppointment = transformAppointment(createdAppointment);
      
      // OPTIMISTIC UPDATE: Add to state immediately instead of refetching all
      setAppointments(prev => [...prev, transformedAppointment]);
      
      // Create notifications in parallel (don't wait for them)
      if (currentUser?.role === 'customer') {
        Promise.all([
          API.notifications.create(createNotification(
            'super-admin',
            'New Booking Received',
            `${currentUser.name} booked ${appointment.service} with ${appointment.barber} for ${new Date(appointment.date).toLocaleDateString()}.`,
            'normal',
            { appointmentId: createdAppointment.id, customerId: currentUser.id }
          )),
          API.notifications.create(createNotification(
            appointment.barber,
            'New Appointment Assigned',
            `${currentUser.name} booked ${appointment.service} on ${new Date(appointment.date).toLocaleDateString()} at ${appointment.time}.`,
            'normal',
            { appointmentId: createdAppointment.id, customerId: currentUser.id }
          ))
        ]).catch(error => {
          console.error('Failed to create notifications:', error);
          // Don't fail the booking if notifications fail
        });
      }
      
      // Return the created appointment with database ID
      return createdAppointment;
    } catch (error) {
      console.error('Error adding appointment:', error);
      throw error;
    }
  }, [currentUser, transformAppointment]);

  // Handle updating appointments
  // Memoized to prevent recreation on every render
  const handleUpdateAppointments = useCallback(async (updatedAppointments: Appointment[]) => {
    try {
      // Find the appointment that was updated
      const changedAppointments = updatedAppointments.filter(apt => {
        const existing = appointments.find(a => a.id === apt.id);
        return !existing || JSON.stringify(existing) !== JSON.stringify(apt);
      });

      // Update each changed appointment in the database
      for (const apt of changedAppointments) {
        // Validate UUID format before updating
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(apt.id)) {
          console.warn(`Skipping update for appointment with invalid UUID: ${apt.id}`);
          continue;
        }
        
        const dbData = transformAppointmentToDatabase(apt);
        await API.appointments.update(apt.id, dbData);
      }

      // Refresh appointments from database to ensure sync
      if (currentUser) {
        await fetchAppointments(currentUser.id, currentUser.role);
      }
      
      toast.success('Appointments updated successfully');
    } catch (error) {
      console.error('Error updating appointments:', error);
      toast.error('Failed to update appointments');
      throw error;
    }
  }, [appointments, currentUser, fetchAppointments, transformAppointmentToDatabase]);

  // Simple refresh function for appointment list
  // Memoized to prevent recreation on every render
  const handleRefreshAppointments = useCallback(async () => {
    if (currentUser) {
      await fetchAppointments(currentUser.id, currentUser.role);
    }
  }, [currentUser, fetchAppointments]);

  // Handle adding a notification
  // Memoized to prevent recreation on every render
  const handleAddNotification = useCallback(async (notification: Notification) => {
    try {
      const createdNotification = await API.notifications.create(notification);
      setNotifications(prev => [...prev, createdNotification]);
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  }, []);

  // Handle marking notification as read
  // Memoized to prevent recreation on every render
  const handleMarkNotificationAsRead = useCallback(async (notificationId: string) => {
    try {
      await API.notifications.markAsRead(notificationId);
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  // Handle marking all notifications as read
  // Memoized to prevent recreation on every render
  const handleMarkAllNotificationsAsRead = useCallback(async (userId: string) => {
    try {
      await API.notifications.markAllAsRead(userId);
      setNotifications(prev =>
        prev.map(n => n.userId === userId ? { ...n, read: true } : n)
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast.error('Failed to mark all as read');
    }
  }, []);

  // Handle deleting a notification
  // Memoized to prevent recreation on every render
  const handleDeleteNotification = useCallback(async (notificationId: string) => {
    try {
      await API.notifications.delete(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    }
  }, []);

  // Handle clearing all notifications
  // Memoized to prevent recreation on every render
  const handleClearAllNotifications = useCallback(async (userId: string) => {
    try {
      await API.notifications.clearAll(userId);
      setNotifications(prev => prev.filter(n => n.userId !== userId));
    } catch (error) {
      console.error('Error clearing notifications:', error);
      toast.error('Failed to clear notifications');
    }
  }, []);

  // Filter notifications for current user - Memoized to prevent re-computation
  // IMPORTANT: This must be called before any conditional returns (Rules of Hooks)
  const userNotifications = useMemo(() => {
    if (!currentUser) return [];
    
    return notifications.filter(n => {
      if (currentUser.role === 'admin') {
        return n.userId === 'admin' || n.userId === currentUser.id;
      }
      if (currentUser.role === 'barber') {
        return n.userId === currentUser.name || n.userId === currentUser.id;
      }
      return n.userId === currentUser.id;
    });
  }, [notifications, currentUser]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FBF7EF]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#DB9D47] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-[#5C4A3A]">Loading...</p>
        </div>
      </div>
    );
  }

  // Show landing/login pages when no user is logged in
  if (!currentUser) {
    if (currentView === "landingpage") {
      return (
        <>
          <Suspense fallback={<LoadingFallback />}>
            <LandingPage
              onGetStarted={() => setCurrentView("register")}
              onLogin={() => setCurrentView("login")}
              onServiceClick={(serviceId) => {
                setPreSelectedServiceId(serviceId);
                setCurrentView("register");
              }}
              onNavigateToTerms={() => setCurrentView("terms")}
              onNavigateToPrivacy={() => setCurrentView("privacy")}
            />
          </Suspense>
          <Toaster />
        </>
      );
    }

    if (currentView === "terms") {
      return (
        <>
          <Suspense fallback={<LoadingFallback />}>
            <TermsAndConditions onBack={() => setCurrentView("landingpage")} />
          </Suspense>
          <Toaster />
        </>
      );
    }

    if (currentView === "privacy") {
      return (
        <>
          <Suspense fallback={<LoadingFallback />}>
            <PrivacyPolicy onBack={() => setCurrentView("landingpage")} />
          </Suspense>
          <Toaster />
        </>
      );
    }

    return (
      <>
        <Suspense fallback={<LoadingFallback />}>
          <LoginPage
            onLogin={handleLogin}
            onBack={() => setCurrentView("landingpage")}
            defaultTab={
              currentView === "register" ? "register" : "login"
            }
          />
        </Suspense>
        <Toaster />
      </>
    );
  }

  // Render dashboard based on user role
  const renderDashboard = () => {
    if (currentUser.role === "admin") {
      return (
        <Suspense fallback={<LoadingFallback />}>
          <ImprovedSuperAdminDashboard
            user={currentUser}
            onLogout={handleLogout}
            appointments={appointments}
            onUpdateAppointments={handleUpdateAppointments}
            onRefreshAppointments={handleRefreshAppointments}
            notifications={userNotifications}
            onMarkNotificationAsRead={handleMarkNotificationAsRead}
            onMarkAllNotificationsAsRead={() => handleMarkAllNotificationsAsRead(currentUser.id)}
            onDeleteNotification={handleDeleteNotification}
            onClearAllNotifications={() => handleClearAllNotifications(currentUser.id)}
            onAddNotification={handleAddNotification}
          />
        </Suspense>
      );
    }

    if (currentUser.role === "barber") {
      return (
        <Suspense fallback={<LoadingFallback />}>
          <BarberDashboard
            user={currentUser}
            onLogout={handleLogout}
            appointments={appointments}
            onUpdateAppointments={handleUpdateAppointments}
            onUserUpdate={handleUserUpdate}
          />
        </Suspense>
      );
    }

    if (currentUser.role === "customer") {
      return (
        <Suspense fallback={<LoadingFallback />}>
          <CustomerDashboard
            user={currentUser}
            onLogout={handleLogout}
            appointments={appointments}
            onAddAppointment={handleAddAppointment}
            onUpdateAppointments={handleUpdateAppointments}
            onUserUpdate={handleUserUpdate}
            notifications={userNotifications}
            onMarkNotificationAsRead={handleMarkNotificationAsRead}
            onMarkAllNotificationsAsRead={() => handleMarkAllNotificationsAsRead(currentUser.id)}
            onDeleteNotification={handleDeleteNotification}
            onClearAllNotifications={() => handleClearAllNotifications(currentUser.id)}
            onAddNotification={handleAddNotification}
            preSelectedServiceId={preSelectedServiceId}
            onClearPreSelectedService={() => setPreSelectedServiceId(null)}
            onSetPreSelectedService={(serviceId) => setPreSelectedServiceId(serviceId)}
          />
        </Suspense>
      );
    }

    // Fallback for unknown roles
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FBF7EF]">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
          <h2 className="text-2xl font-bold text-[#5C4A3A] mb-4">Unknown User Role</h2>
          <p className="text-gray-600 mb-6">
            Your account role ({currentUser.role || 'undefined'}) is not recognized.
            Please contact support for assistance.
          </p>
          <button
            onClick={handleLogout}
            className="px-6 py-2 bg-[#DB9D47] text-white rounded-lg hover:bg-[#c58a3a] transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      {renderDashboard()}
      <Toaster />
    </>
  );
}

export default App;