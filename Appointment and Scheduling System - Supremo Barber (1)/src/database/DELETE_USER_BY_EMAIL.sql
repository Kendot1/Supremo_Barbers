-- ==================== DELETE SPECIFIC USER BY EMAIL ====================
-- Replace 'user@example.com' with the actual email you want to delete

-- Step 1: Check if user exists and get their ID
SELECT 
  id,
  email,
  name,
  role,
  created_at
FROM public.users
WHERE email = 'user@example.com';  -- ⚠️ CHANGE THIS EMAIL

-- Step 2: Delete user from database
-- (This will cascade delete their barber profile, appointments, etc.)
DELETE FROM public.users
WHERE email = 'user@example.com';  -- ⚠️ CHANGE THIS EMAIL

-- Step 3: IMPORTANT - Delete from Supabase Auth manually!
-- Go to Supabase Dashboard → Authentication → Users
-- Find the user by email and click Delete
-- OR use this if you have their auth ID:

-- DELETE FROM auth.users WHERE email = 'user@example.com';  -- Requires admin access

-- Verify deletion
SELECT 
  COUNT(*) as remaining_users,
  ARRAY_AGG(email) as emails
FROM public.users;

-- ==================== NOTES ====================
-- ⚠️ IMPORTANT: You MUST also delete the user from Supabase Auth!
-- Otherwise they'll exist in auth but not in your database, causing issues.
--
-- The safest way:
-- 1. Run the DELETE query above
-- 2. Go to Supabase Dashboard → Authentication → Users
-- 3. Find the user and delete them manually
