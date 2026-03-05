-- ==================== SUPREMO BARBER DATABASE SETUP ====================
-- Copy and paste this entire script into Supabase SQL Editor and click RUN

-- ==================== DROP EXISTING TABLES (IF ANY) ====================
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.appointments CASCADE;
DROP TABLE IF EXISTS public.barbers CASCADE;
DROP TABLE IF EXISTS public.services CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- ==================== CREATE TABLES ====================

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'barber', 'customer')),
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Services table
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  duration INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  category TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Barbers table
CREATE TABLE public.barbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  specialties TEXT[],
  rating DECIMAL(3,2) DEFAULT 5.00,
  available_hours JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Appointments table
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  barber_id UUID REFERENCES public.barbers(id),
  service_id UUID REFERENCES public.services(id),
  date DATE NOT NULL,
  time TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'upcoming', 'completed', 'cancelled', 'no_show')),
  payment_status TEXT CHECK (payment_status IN ('pending', 'partial', 'paid', 'refunded')),
  total_amount DECIMAL(10,2) NOT NULL,
  down_payment DECIMAL(10,2) DEFAULT 0,
  remaining_amount DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payments table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  payment_type TEXT CHECK (payment_type IN ('down_payment', 'full_payment', 'remaining_payment')),
  payment_method TEXT,
  transaction_id TEXT,
  proof_url TEXT, -- Cloudflare R2 URL for payment proof image
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==================== DISABLE RLS (Server uses service role key) ====================
-- The server uses the service role key which bypasses RLS
-- This is simpler and avoids infinite recursion issues

ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.services DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.barbers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments DISABLE ROW LEVEL SECURITY;

-- ==================== CREATE INDEXES FOR PERFORMANCE ====================

CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_appointments_customer_id ON public.appointments(customer_id);
CREATE INDEX idx_appointments_barber_id ON public.appointments(barber_id);
CREATE INDEX idx_appointments_date ON public.appointments(date);
CREATE INDEX idx_appointments_status ON public.appointments(status);
CREATE INDEX idx_appointments_payment_status ON public.appointments(payment_status);
CREATE INDEX idx_payments_appointment_id ON public.payments(appointment_id);
CREATE INDEX idx_barbers_user_id ON public.barbers(user_id);

-- ==================== INSERT SAMPLE DATA ====================

-- Sample Services (Supremo Barber Services)
INSERT INTO public.services (name, description, duration, price, category, is_active) VALUES
  ('Gupit Supremo', 'Classic haircut with premium styling', 30, 250.00, 'Haircut', true),
  ('Gupit Supremo w/ Banlaw', 'Haircut with shampoo treatment', 40, 300.00, 'Haircut', true),
  ('Hair Relax', 'Hair relaxing and straightening treatment', 120, 1500.00, 'Treatment', true),
  ('Hair Rebond', 'Professional hair rebonding service', 180, 2500.00, 'Treatment', true),
  ('Kulot / Perm', 'Perming and curling service', 150, 2000.00, 'Treatment', true),
  ('Hair Color', 'Full hair coloring service', 120, 1800.00, 'Color', true),
  ('Hair Highlights', 'Professional hair highlighting', 90, 1200.00, 'Color', true),
  ('Beard Trim', 'Professional beard shaping and trimming', 20, 150.00, 'Grooming', true),
  ('Hair & Beard Combo', 'Complete haircut and beard service', 50, 350.00, 'Combo', true),
  ('Kids Haircut', 'Special haircut for children', 25, 200.00, 'Haircut', true);

-- ==================== VERIFICATION ====================

-- Verify tables were created
SELECT 
  'Tables created successfully!' as status,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('users', 'services', 'barbers', 'appointments', 'payments')) as table_count,
  (SELECT COUNT(*) FROM public.services) as services_count;

-- ==================== ROLE STRUCTURE ====================
-- 
-- ADMIN (First User)
-- └── Full access to ALL shop features
-- └── See ALL revenue and earnings analytics
-- └── Manage barbers, services, appointments, customers
-- └── Access to comprehensive analytics and AI predictions
-- └── Export reports and manage system settings
--
-- BARBER (Created by Admin)
-- └── Personal dashboard with own schedule
-- └── View and manage own appointments
-- └── See ONLY personal earnings history
-- └── Update availability and schedule
-- └── Cannot see other barbers' earnings or shop-wide revenue
--
-- CUSTOMER (Self-registration or Admin-created)
-- └── Book appointments with 50% down payment
-- └── View booking history and upcoming appointments
-- └── Make payments and track payment status
-- └── Submit reviews after completed services
-- └── Receive notifications about appointments
--
-- ==================== NEXT STEPS ====================
-- 1. Refresh your app
-- 2. Clear localStorage (F12 > Application > Local Storage > Clear)
-- 3. Register - THE FIRST USER YOU CREATE WILL AUTOMATICALLY BE AN ADMIN! 👑
-- 4. Admin has full access to:
--    ✅ ALL earnings and revenue tracking (entire shop)
--    ✅ Complete financial analytics (daily/weekly/monthly)
--    ✅ ALL barber performance metrics
--    ✅ Customer management and analytics
--    ✅ Service management and pricing
--    ✅ User management (create barbers and customers)
--    ✅ AI-driven predictions and business insights
--    ✅ Comprehensive reports and exports
-- 5. Create barbers through the Barber Management page
-- 6. Barbers will only see their own earnings and appointments
-- 7. Customers can self-register or be created by admin
-- 8. Start managing your barber shop!

-- ==================== IMPORTANT NOTES ====================
-- 
-- ⚡ ROLE ASSIGNMENT:
-- - First registered user → ADMIN (automatic)
-- - All subsequent registrations → CUSTOMER (automatic)
-- - Admin can create BARBER accounts through Barber Management
--
-- 💰 PAYMENT SYSTEM:
-- - All bookings require 50% down payment
-- - Remaining 50% paid at the shop
-- - Down payment tracked in appointments table
-- - Full payment history in payments table
--
-- 📊 EARNINGS TRACKING:
-- - Admin sees: ALL shop revenue + individual barber earnings
-- - Barber sees: ONLY their personal earnings
-- - Earnings automatically calculated from completed appointments
-- - Real-time dashboard updates
--
-- 🔒 NO LOYALTY POINTS:
-- - System does NOT track loyalty points
-- - Removed from database schema
-- - Simple transactional booking system
-- - Focus on core barber shop operations
--
-- ==================== END OF SETUP ====================