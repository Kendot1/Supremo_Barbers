-- ==================== CHECK EXISTING USERS ====================

-- See all users in the database
SELECT 
  id,
  email,
  name,
  role,
  phone,
  created_at
FROM public.users
ORDER BY created_at ASC;

-- Count users by role
SELECT 
  role,
  COUNT(*) as user_count
FROM public.users
GROUP BY role;

-- Check which user is the admin (first user)
SELECT 
  email,
  name,
  role,
  created_at,
  CASE 
    WHEN role = 'admin' THEN '👑 ADMIN'
    WHEN role = 'barber' THEN '💈 BARBER'
    WHEN role = 'customer' THEN '👤 CUSTOMER'
  END as role_badge
FROM public.users
ORDER BY created_at ASC
LIMIT 1;

-- ==================== CHECK AUTH USERS ====================
-- To see users in Supabase Auth:
-- 1. Go to Supabase Dashboard
-- 2. Click "Authentication" in sidebar
-- 3. Click "Users" tab
-- 4. You'll see all registered users there
