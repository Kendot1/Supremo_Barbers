-- ==================== CLEAR ALL DATA - SUPREMO BARBER ====================
-- ⚠️ WARNING: This will delete ALL users, appointments, payments, etc.
-- ⚠️ Only use this if you want to completely reset the system!

-- Delete all data from tables (in correct order due to foreign keys)
DELETE FROM public.payments;
DELETE FROM public.appointments;
DELETE FROM public.barbers;
DELETE FROM public.services;
DELETE FROM public.users;

-- Also delete from Supabase Auth (this is important!)
-- Note: You'll need to do this manually in Supabase Dashboard
-- Go to: Authentication > Users > Select all > Delete

-- Verify all tables are empty
SELECT 
  'users' as table_name, COUNT(*) as count FROM public.users
UNION ALL
SELECT 'services', COUNT(*) FROM public.services
UNION ALL
SELECT 'barbers', COUNT(*) FROM public.barbers
UNION ALL
SELECT 'appointments', COUNT(*) FROM public.appointments
UNION ALL
SELECT 'payments', COUNT(*) FROM public.payments;

-- Re-insert sample services (optional)
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

-- ==================== NEXT STEPS ====================
-- 1. Run this script in Supabase SQL Editor
-- 2. Go to Supabase Dashboard → Authentication → Users
-- 3. Delete all users manually (click each user → Delete)
-- 4. Clear browser localStorage (F12 → Application → Local Storage → Clear)
-- 5. Refresh your app
-- 6. Register again - you'll be the first user (becomes ADMIN automatically!)
