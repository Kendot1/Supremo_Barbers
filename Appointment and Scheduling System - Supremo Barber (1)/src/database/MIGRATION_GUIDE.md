# 🔄 Supremo Barber - Database Migration Guide

## Quick Start (New Installation)

If you're setting up Supremo Barber for the **first time**, simply:

1. Open Supabase Dashboard → SQL Editor
2. Copy the entire contents of `/database/supremo-barber-setup.sql`
3. Paste into SQL Editor
4. Click **RUN**
5. Done! ✅

---

## 🔄 Migration from Old Schema

If you already have an existing database with the old schema (super-admin, loyalty_points, etc.), follow this migration guide:

### Step 1: Backup Your Data

**⚠️ CRITICAL: Always backup before migration!**

```sql
-- Backup existing users
CREATE TABLE users_backup AS SELECT * FROM public.users;

-- Backup existing appointments
CREATE TABLE appointments_backup AS SELECT * FROM public.appointments;

-- Backup existing payments
CREATE TABLE payments_backup AS SELECT * FROM public.payments;

-- Backup existing services
CREATE TABLE services_backup AS SELECT * FROM public.services;

-- Backup existing barbers
CREATE TABLE barbers_backup AS SELECT * FROM public.barbers;
```

### Step 2: Export User Role Mapping

```sql
-- Create a mapping of old roles to new roles
CREATE TABLE role_migration_map AS
SELECT 
  id,
  email,
  name,
  role as old_role,
  CASE 
    WHEN role = 'super-admin' THEN 'admin'
    WHEN role = 'admin' THEN 'admin'
    WHEN role = 'staff' THEN 'barber'
    WHEN role = 'barber' THEN 'barber'
    WHEN role = 'customer' THEN 'customer'
    ELSE 'customer'
  END as new_role
FROM public.users;

-- Verify the mapping
SELECT old_role, new_role, COUNT(*) as user_count
FROM role_migration_map
GROUP BY old_role, new_role;
```

### Step 3: Run the New Schema

1. Copy `/database/supremo-barber-setup.sql`
2. Paste into Supabase SQL Editor
3. Click **RUN**

This will:
- Drop all existing tables
- Create new tables with updated schema
- Insert sample services

### Step 4: Restore User Data

```sql
-- Restore users with new roles (without loyalty_points)
INSERT INTO public.users (id, email, name, role, phone, created_at)
SELECT 
  ub.id,
  ub.email,
  ub.name,
  rmm.new_role,
  ub.phone,
  ub.created_at
FROM users_backup ub
JOIN role_migration_map rmm ON ub.id = rmm.id;

-- Verify users restored correctly
SELECT role, COUNT(*) as count FROM public.users GROUP BY role;
```

### Step 5: Restore Barbers Data

```sql
-- Restore barbers with is_active field
INSERT INTO public.barbers (id, user_id, specialties, rating, available_hours, is_active, created_at)
SELECT 
  id,
  user_id,
  specialties,
  rating,
  available_hours,
  true as is_active,  -- Default to active
  created_at
FROM barbers_backup;

-- Verify barbers restored
SELECT COUNT(*) as barber_count FROM public.barbers;
```

### Step 6: Restore Appointments Data

```sql
-- Restore appointments with new payment fields
INSERT INTO public.appointments (
  id, customer_id, barber_id, service_id, date, time, 
  status, payment_status, total_amount, down_payment, remaining_amount, 
  notes, created_at
)
SELECT 
  id,
  customer_id,
  barber_id,
  service_id,
  date,
  time,
  status,
  payment_status,
  COALESCE(payment_amount, 0) as total_amount,
  COALESCE(payment_amount * 0.5, 0) as down_payment,  -- Assume 50% down
  COALESCE(payment_amount * 0.5, 0) as remaining_amount,  -- Assume 50% remaining
  notes,
  created_at
FROM appointments_backup;

-- Verify appointments restored
SELECT COUNT(*) as appointment_count FROM public.appointments;
```

### Step 7: Restore Payments Data

```sql
-- Restore payments with payment_type
INSERT INTO public.payments (
  id, appointment_id, amount, payment_type, payment_method, 
  transaction_id, created_at
)
SELECT 
  id,
  appointment_id,
  amount,
  'full_payment' as payment_type,  -- Default type
  payment_method,
  transaction_id,
  created_at
FROM payments_backup;

-- Verify payments restored
SELECT COUNT(*) as payment_count FROM public.payments;
```

### Step 8: Update Services (if not using new sample data)

```sql
-- If you want to keep your old services, add is_active field
INSERT INTO public.services (id, name, description, duration, price, category, is_active, created_at)
SELECT 
  id,
  name,
  description,
  duration,
  price,
  category,
  true as is_active,
  created_at
FROM services_backup
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  duration = EXCLUDED.duration,
  price = EXCLUDED.price,
  category = EXCLUDED.category,
  is_active = EXCLUDED.is_active;

-- Verify services
SELECT COUNT(*) as service_count FROM public.services;
```

### Step 9: Verify Migration

```sql
-- 1. Check all users have valid roles
SELECT role, COUNT(*) FROM public.users GROUP BY role;
-- Should only show: admin, barber, customer

-- 2. Check no loyalty_points field exists
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'loyalty_points';
-- Should return 0 rows

-- 3. Check appointments have payment split
SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN total_amount > 0 THEN 1 ELSE 0 END) as with_total,
  SUM(CASE WHEN down_payment > 0 THEN 1 ELSE 0 END) as with_down,
  SUM(CASE WHEN remaining_amount > 0 THEN 1 ELSE 0 END) as with_remaining
FROM public.appointments;

-- 4. Check services have is_active
SELECT is_active, COUNT(*) FROM public.services GROUP BY is_active;

-- 5. Check barbers have is_active
SELECT is_active, COUNT(*) FROM public.barbers GROUP BY is_active;

-- 6. Verify indexes created
SELECT tablename, indexname 
FROM pg_indexes 
WHERE tablename IN ('users', 'appointments', 'payments', 'barbers')
ORDER BY tablename;
-- Should show 9 indexes
```

### Step 10: Cleanup Backup Tables (Optional)

**⚠️ Only do this after verifying everything works!**

```sql
-- DANGER: Only run after confirming migration success
DROP TABLE IF EXISTS users_backup;
DROP TABLE IF EXISTS appointments_backup;
DROP TABLE IF EXISTS payments_backup;
DROP TABLE IF EXISTS services_backup;
DROP TABLE IF EXISTS barbers_backup;
DROP TABLE IF EXISTS role_migration_map;
```

---

## 🔧 Post-Migration Steps

### 1. Clear Application Cache
```
F12 > Application > Local Storage > Clear All
```

### 2. Update Environment Variables (if needed)
```env
SUPABASE_URL=your_project_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Test User Roles

**Test Admin Login:**
```typescript
// Should have access to:
- All analytics
- All earnings
- User management
- Barber management
- Service management
```

**Test Barber Login:**
```typescript
// Should have access to:
- Personal dashboard
- Own appointments
- Own earnings only
- Schedule management
```

**Test Customer Login:**
```typescript
// Should have access to:
- Book appointments
- View booking history
- Make payments
- Leave reviews
```

### 4. Verify Data Integrity

Run these verification queries:

```sql
-- Count records in each table
SELECT 
  (SELECT COUNT(*) FROM public.users) as users,
  (SELECT COUNT(*) FROM public.services) as services,
  (SELECT COUNT(*) FROM public.barbers) as barbers,
  (SELECT COUNT(*) FROM public.appointments) as appointments,
  (SELECT COUNT(*) FROM public.payments) as payments;

-- Check foreign key relationships
SELECT 
  a.id as appointment_id,
  u.name as customer_name,
  b.id as barber_id,
  s.name as service_name
FROM public.appointments a
LEFT JOIN public.users u ON a.customer_id = u.id
LEFT JOIN public.barbers b ON a.barber_id = b.id
LEFT JOIN public.services s ON a.service_id = s.id
LIMIT 10;
```

---

## 🐛 Common Migration Issues

### Issue 1: Foreign Key Violations

**Error:** `violates foreign key constraint`

**Solution:**
```sql
-- Check for orphaned records
SELECT * FROM appointments WHERE customer_id NOT IN (SELECT id FROM users);
SELECT * FROM appointments WHERE barber_id NOT IN (SELECT id FROM barbers);
SELECT * FROM appointments WHERE service_id NOT IN (SELECT id FROM services);

-- Remove orphaned records
DELETE FROM appointments WHERE customer_id NOT IN (SELECT id FROM users);
DELETE FROM appointments WHERE barber_id NOT IN (SELECT id FROM barbers);
DELETE FROM appointments WHERE service_id NOT IN (SELECT id FROM services);
```

### Issue 2: Role Names Not Matching

**Error:** `new row violates check constraint "users_role_check"`

**Solution:**
```sql
-- Check for invalid roles in backup
SELECT DISTINCT role FROM users_backup;

-- Update role_migration_map if needed
UPDATE role_migration_map
SET new_role = 'customer'
WHERE new_role NOT IN ('admin', 'barber', 'customer');
```

### Issue 3: NULL Values in Required Fields

**Error:** `null value in column violates not-null constraint`

**Solution:**
```sql
-- Check for NULL values
SELECT * FROM appointments_backup WHERE payment_amount IS NULL;

-- Update NULLs before migration
UPDATE appointments_backup SET payment_amount = 0 WHERE payment_amount IS NULL;
```

### Issue 4: Payment Amounts Not Splitting Correctly

**Problem:** Down payment and remaining amount not calculating properly

**Solution:**
```sql
-- After migration, recalculate payment splits
UPDATE public.appointments
SET 
  down_payment = total_amount * 0.5,
  remaining_amount = total_amount * 0.5
WHERE down_payment = 0 AND total_amount > 0;

-- Verify
SELECT 
  id,
  total_amount,
  down_payment,
  remaining_amount,
  (total_amount = down_payment + remaining_amount) as amounts_match
FROM public.appointments
LIMIT 10;
```

---

## 📊 Migration Checklist

Before declaring migration complete, verify:

- [ ] All tables created successfully
- [ ] All users migrated with new roles
- [ ] No users have 'super-admin', 'admin', or 'staff' roles
- [ ] Only 'admin', 'barber', 'customer' roles exist
- [ ] loyalty_points column removed from users
- [ ] All appointments have total_amount, down_payment, remaining_amount
- [ ] All payments have payment_type field
- [ ] All services have is_active field
- [ ] All barbers have is_active field
- [ ] All 9 indexes created
- [ ] No orphaned records (foreign key violations)
- [ ] Sample services loaded (if desired)
- [ ] Application connects successfully
- [ ] Login works for all roles
- [ ] Role permissions work correctly
- [ ] Backup tables reviewed and can be deleted

---

## 🆘 Rollback Plan

If migration fails, rollback:

```sql
-- Drop new tables
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.appointments CASCADE;
DROP TABLE IF EXISTS public.barbers CASCADE;
DROP TABLE IF EXISTS public.services CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Restore from backup
ALTER TABLE users_backup RENAME TO users;
ALTER TABLE services_backup RENAME TO services;
ALTER TABLE barbers_backup RENAME TO barbers;
ALTER TABLE appointments_backup RENAME TO appointments;
ALTER TABLE payments_backup RENAME TO payments;

-- Re-enable RLS
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.services DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.barbers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments DISABLE ROW LEVEL SECURITY;
```

---

## 📞 Need Help?

If you encounter issues during migration:

1. **Check the error message carefully**
2. **Look for similar issues in Common Migration Issues section**
3. **Verify your backup tables are intact**
4. **Review the verification queries**
5. **Use the rollback plan if needed**

---

**Migration Guide Version:** 1.0
**Last Updated:** December 10, 2024
**Compatible with:** Supremo Barber System v2.0
