# Database Schema Changes - Supremo Barber System

## 📋 Summary of Changes

This document outlines all changes made to the Supabase database schema to align with the cleaned backend system.

---

## 🔄 **ROLE STRUCTURE CHANGES**

### ❌ **OLD ROLES (Removed)**
```sql
role TEXT NOT NULL CHECK (role IN ('super-admin', 'admin', 'staff', 'customer'))
```

**Problems with old structure:**
- 4 roles: 'super-admin', 'admin', 'staff', 'customer'
- Unclear distinction between super-admin and admin
- 'staff' role was unused in the system
- Role names used hyphens (super-admin)

### ✅ **NEW ROLES (Current)**
```sql
role TEXT NOT NULL CHECK (role IN ('admin', 'barber', 'customer'))
```

**Benefits of new structure:**
- Clean 3-tier system: admin, barber, customer
- Clear role separation and permissions
- Matches backend role enum exactly
- No unused roles

---

## 🗑️ **LOYALTY POINTS REMOVED**

### ❌ **OLD users TABLE**
```sql
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super-admin', 'admin', 'staff', 'customer')),
  phone TEXT,
  loyalty_points INTEGER DEFAULT 0,  -- ❌ REMOVED
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### ✅ **NEW users TABLE**
```sql
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'barber', 'customer')),  -- ✅ Updated
  phone TEXT,
  -- loyalty_points field REMOVED
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Why removed:**
- Loyalty system was not being used
- Simplified customer management
- Reduced database complexity
- Focus on core booking functionality

---

## 📊 **APPOINTMENTS TABLE ENHANCEMENTS**

### ❌ **OLD appointments TABLE**
```sql
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  barber_id UUID REFERENCES public.barbers(id),
  service_id UUID REFERENCES public.services(id),
  date DATE NOT NULL,
  time TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')),
  payment_status TEXT CHECK (payment_status IN ('pending', 'partial', 'paid', 'refunded')),
  payment_amount DECIMAL(10,2),  -- ❌ Single field
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### ✅ **NEW appointments TABLE**
```sql
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  barber_id UUID REFERENCES public.barbers(id),
  service_id UUID REFERENCES public.services(id),
  date DATE NOT NULL,
  time TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'upcoming', 'completed', 'cancelled', 'no_show')),  -- ✅ Added 'upcoming'
  payment_status TEXT CHECK (payment_status IN ('pending', 'partial', 'paid', 'refunded')),
  total_amount DECIMAL(10,2) NOT NULL,        -- ✅ New: Total service price
  down_payment DECIMAL(10,2) DEFAULT 0,       -- ✅ New: 50% down payment
  remaining_amount DECIMAL(10,2) DEFAULT 0,   -- ✅ New: Remaining 50%
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Changes:**
1. Added `'upcoming'` status for better appointment tracking
2. Split `payment_amount` into three fields:
   - `total_amount` - Full service price
   - `down_payment` - 50% paid upfront
   - `remaining_amount` - 50% to pay at shop
3. Made `total_amount` NOT NULL for data integrity

---

## 💳 **PAYMENTS TABLE ENHANCEMENTS**

### ❌ **OLD payments TABLE**
```sql
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT,
  transaction_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### ✅ **NEW payments TABLE**
```sql
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  payment_type TEXT CHECK (payment_type IN ('down_payment', 'full_payment', 'remaining_payment')),  -- ✅ New field
  payment_method TEXT,
  transaction_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Changes:**
1. Added `payment_type` field to distinguish:
   - `down_payment` - Initial 50% payment
   - `remaining_payment` - Final 50% payment
   - `full_payment` - Complete payment (if paid in full)

---

## 🛠️ **SERVICES TABLE ENHANCEMENTS**

### ❌ **OLD services TABLE**
```sql
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  duration INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### ✅ **NEW services TABLE**
```sql
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  duration INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  category TEXT,
  is_active BOOLEAN DEFAULT true,  -- ✅ New field
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Changes:**
1. Added `is_active` field to soft-delete/archive services
2. Allows hiding services without deleting them

---

## 🎯 **BARBERS TABLE ENHANCEMENTS**

### ❌ **OLD barbers TABLE**
```sql
CREATE TABLE public.barbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  specialties TEXT[],
  rating DECIMAL(3,2) DEFAULT 5.00,
  available_hours JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### ✅ **NEW barbers TABLE**
```sql
CREATE TABLE public.barbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  specialties TEXT[],
  rating DECIMAL(3,2) DEFAULT 5.00,
  available_hours JSONB,
  is_active BOOLEAN DEFAULT true,  -- ✅ New field
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Changes:**
1. Added `is_active` field to manage barber availability
2. Allows temporarily disabling barbers without deletion

---

## ⚡ **PERFORMANCE INDEXES (NEW)**

Added indexes for faster query performance:

```sql
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_appointments_customer_id ON public.appointments(customer_id);
CREATE INDEX idx_appointments_barber_id ON public.appointments(barber_id);
CREATE INDEX idx_appointments_date ON public.appointments(date);
CREATE INDEX idx_appointments_status ON public.appointments(status);
CREATE INDEX idx_appointments_payment_status ON public.appointments(payment_status);
CREATE INDEX idx_payments_appointment_id ON public.payments(appointment_id);
CREATE INDEX idx_barbers_user_id ON public.barbers(user_id);
```

**Benefits:**
- Faster user lookups by email
- Quick filtering by role
- Optimized appointment queries
- Improved analytics performance
- Better join operations

---

## 📦 **SAMPLE DATA UPDATES**

### ❌ **OLD Sample Services**
```sql
INSERT INTO public.services (name, description, duration, price, category) VALUES
  ('Classic Haircut', 'Traditional haircut with scissors and clippers', 30, 25.00, 'Haircut'),
  ('Premium Haircut', 'Haircut with styling and consultation', 45, 35.00, 'Haircut'),
  ('Beard Trim', 'Professional beard shaping and trimming', 20, 15.00, 'Grooming'),
  ('Hot Towel Shave', 'Classic straight razor shave with hot towel', 40, 30.00, 'Grooming'),
  ('Hair & Beard Combo', 'Complete haircut and beard service', 60, 45.00, 'Combo'),
  ('Kids Haircut', 'Haircut for children under 12', 25, 18.00, 'Haircut'),
  ('Luxury Package', 'Haircut, beard trim, and hot towel treatment', 90, 70.00, 'Package');
```

### ✅ **NEW Sample Services (Supremo Barber)**
```sql
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
```

**Changes:**
- Filipino service names (Gupit Supremo, Banlaw, Kulot)
- Philippine peso pricing (₱250-₱2500)
- More comprehensive service offerings
- Professional treatments and coloring services
- Added `is_active` field

---

## 🔐 **SECURITY & RLS**

No changes to Row Level Security settings:

```sql
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.services DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.barbers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments DISABLE ROW LEVEL SECURITY;
```

**Reason:** Server uses service role key which bypasses RLS. This simplifies security and avoids recursion issues.

---

## 📝 **COMPLETE SCHEMA COMPARISON**

### Database Tables: 5 (No Change)
1. ✅ `users` - Updated (removed loyalty_points, changed roles)
2. ✅ `services` - Enhanced (added is_active)
3. ✅ `barbers` - Enhanced (added is_active)
4. ✅ `appointments` - Enhanced (split payment fields, added upcoming status)
5. ✅ `payments` - Enhanced (added payment_type)

### Total Fields by Table:

**users:**
- Before: 6 fields (id, email, name, role, phone, loyalty_points, created_at)
- After: 5 fields (removed loyalty_points) ✅

**services:**
- Before: 7 fields
- After: 8 fields (added is_active) ✅

**barbers:**
- Before: 6 fields
- After: 7 fields (added is_active) ✅

**appointments:**
- Before: 10 fields
- After: 12 fields (split payment_amount into 3 fields, added upcoming status) ✅

**payments:**
- Before: 6 fields
- After: 7 fields (added payment_type) ✅

---

## 🎯 **ROLE PERMISSIONS (Documentation)**

### **ADMIN** (First User)
```
✅ Full access to ALL features
✅ See ALL revenue and earnings (entire shop)
✅ Manage barbers, services, appointments, customers
✅ Access comprehensive analytics and AI predictions
✅ Export reports and system settings
✅ Create and manage barber accounts
✅ View all barber earnings individually
```

### **BARBER** (Created by Admin)
```
✅ Personal dashboard with own schedule
✅ View and manage own appointments
✅ See ONLY personal earnings history
✅ Update availability and schedule
❌ Cannot see other barbers' earnings
❌ Cannot see shop-wide revenue
❌ Cannot manage other users
```

### **CUSTOMER** (Self-registration or Admin-created)
```
✅ Book appointments with 50% down payment
✅ View booking history
✅ Make payments and track status
✅ Submit reviews after services
✅ Receive appointment notifications
❌ No admin or management access
```

---

## 🚀 **MIGRATION STEPS**

If you have an existing database:

1. **Backup current data:**
   ```sql
   -- Export your existing data before running the new schema
   ```

2. **Run the new setup script:**
   - Copy `/database/supremo-barber-setup.sql`
   - Paste into Supabase SQL Editor
   - Click RUN

3. **Clear application cache:**
   - Clear localStorage in browser (F12 > Application > Local Storage > Clear)
   - Refresh the application

4. **Register first user:**
   - First user automatically becomes ADMIN
   - Login with admin credentials

5. **Create barbers:**
   - Use Barber Management module
   - Admin creates barber accounts
   - Barbers can login and manage their schedule

---

## ✅ **VERIFICATION QUERIES**

After running the setup, verify with these queries:

```sql
-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'services', 'barbers', 'appointments', 'payments');

-- Check roles are correct
SELECT DISTINCT role FROM public.users;
-- Should return: 'admin', 'barber', 'customer' only

-- Check services loaded
SELECT COUNT(*) as service_count FROM public.services;
-- Should return: 10

-- Check payment structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'appointments' 
AND column_name IN ('total_amount', 'down_payment', 'remaining_amount');
-- Should return all 3 fields

-- Verify loyalty_points removed
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'loyalty_points';
-- Should return 0 rows

-- Check indexes created
SELECT indexname FROM pg_indexes WHERE tablename IN ('users', 'appointments', 'payments', 'barbers');
-- Should return 9 indexes
```

---

## 📊 **SUMMARY OF IMPROVEMENTS**

### Data Integrity ✅
- Removed unused `loyalty_points` field
- Added NOT NULL constraints where needed
- Proper CHECK constraints on enums
- Foreign key relationships maintained

### Performance ✅
- Added 9 strategic indexes
- Optimized for common query patterns
- Faster joins and lookups
- Better analytics performance

### Clarity ✅
- Simplified role structure (3 roles instead of 4)
- Clear payment tracking (split into 3 fields)
- Better status management (added 'upcoming')
- Soft delete capability (is_active fields)

### Scalability ✅
- Clean schema for future enhancements
- Flexible JSONB for barber hours
- Proper audit trails (created_at)
- Room for additional features

---

**Last Updated:** December 10, 2024
**Schema Version:** 2.0 (Cleaned & Enhanced)
**Status:** ✅ Production Ready
