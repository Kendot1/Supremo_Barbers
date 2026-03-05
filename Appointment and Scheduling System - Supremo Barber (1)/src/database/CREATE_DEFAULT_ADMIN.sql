-- ==================== CREATE DEFAULT ADMIN USER ====================
-- This script creates a default admin user if no users exist in the database
-- Run this in Supabase SQL Editor if you need to reset to a fresh admin account
-- 
-- IMPORTANT: After running this, you need to manually create the auth user in Supabase:
-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Click "Add User"
-- 3. Email: admin@supremobarber.com
-- 4. Password: admin123
-- 5. Auto Confirm User: YES (checked)
-- 6. The user ID will auto-generate (UUID)
-- 7. Then run the UPDATE statement below with that user ID

-- ==================== OPTION 1: MANUAL CREATION ====================
-- Step 1: First check if any users exist
SELECT COUNT(*) as user_count FROM public.users;

-- Step 2: If no users exist, go to Authentication > Users and create:
-- Email: admin@supremobarber.com
-- Password: admin123
-- Auto Confirm User: ✓ (checked)
-- Note the generated user ID (UUID)

-- Step 3: After creating the auth user, insert the profile with that user ID:
-- REPLACE 'YOUR_AUTH_USER_ID_HERE' with the actual UUID from step 2
/*
INSERT INTO public.users (id, email, name, phone, role, created_at)
VALUES (
  'YOUR_AUTH_USER_ID_HERE', -- Replace with actual UUID from Supabase Auth
  'admin@supremobarber.com',
  'Admin User',
  '09123456789',
  'admin',
  NOW()
);
*/

-- ==================== OPTION 2: USING THE APP ====================
-- The easiest way is to just register through the app:
-- 1. Go to your app's login page
-- 2. Click "Don't have an account? Register"
-- 3. Register with ANY email you want
-- 4. The FIRST user to register automatically becomes ADMIN
-- 5. All subsequent users become CUSTOMERS (unless registered by admin as barbers)

-- ==================== VERIFY ADMIN EXISTS ====================
-- Run this to verify your admin user was created:
SELECT 
  id,
  email,
  name,
  role,
  created_at,
  CASE 
    WHEN role = 'admin' THEN '👑 THIS IS YOUR ADMIN ACCOUNT'
    ELSE role
  END as status
FROM public.users
WHERE role = 'admin'
ORDER BY created_at ASC
LIMIT 1;

-- ==================== RESET PASSWORD FOR ADMIN ====================
-- If you forgot your admin password, go to:
-- Supabase Dashboard > Authentication > Users > Find your admin user > Click "..." menu > "Send Password Recovery"
-- Or use the app's "Forgot Password" feature

-- ==================== CHECK ALL USERS ====================
SELECT 
  email,
  name,
  role,
  created_at,
  CASE 
    WHEN role = 'admin' THEN '👑 ADMIN'
    WHEN role = 'barber' THEN '💈 BARBER'
    WHEN role = 'customer' THEN '👤 CUSTOMER'
  END as badge
FROM public.users
ORDER BY created_at ASC;
