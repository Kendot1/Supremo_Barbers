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
  username: string;
  role: UserRole;
  phone?: string;
  isActive?: boolean;
  avatarUrl?: string;
  bio?: string;
  createdAt?: string;
  emailVerified?: boolean;
  pendingEmail?: string;
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
  status: 'pending' | 'confirmed' | 'upcoming' | 'completed' | 'cancelled' | 'rejected' | 'verified';
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
  cancellation_reason?: string; // Database column for cancellation reason
  created_at?: string;
}

export interface Notification {
  id: string;
  userId: string;
  userRole: 'customer' | 'barber' | 'admin';
  type: string;
  title: string;
  message: string;
  relatedId?: string;
  relatedType?: string;
  isRead: boolean;
  readAt?: string;
  actionUrl?: string;
  actionLabel?: string;
  createdAt: string;
  updatedAt: string;
  read?: boolean; // Backwards compatibility
}
