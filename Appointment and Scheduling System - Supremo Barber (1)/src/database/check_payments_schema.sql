-- ============================================================
-- CHECK PAYMENTS TABLE SCHEMA
-- Run this in Supabase SQL Editor to see current table structure
-- ============================================================

-- Show all columns in payments table
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'payments'
ORDER BY ordinal_position;

-- Show constraints on payments table
SELECT
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.check_constraints cc
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'payments'
ORDER BY tc.constraint_type, tc.constraint_name;

-- Count existing payment records
SELECT COUNT(*) as total_payments FROM public.payments;

-- Show sample of existing payments (if any)
SELECT * FROM public.payments LIMIT 5;
