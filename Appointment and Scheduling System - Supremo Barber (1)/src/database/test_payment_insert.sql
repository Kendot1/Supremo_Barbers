-- ============================================================
-- TEST PAYMENT INSERT
-- Use this to manually test payment creation after migration
-- ============================================================

-- First, let's see what appointments exist
SELECT id, customer_id, service_id, date, time, total_amount 
FROM public.appointments 
ORDER BY created_at DESC 
LIMIT 5;

-- See what users exist
SELECT id, name, email, role 
FROM public.users 
WHERE role = 'customer'
LIMIT 5;

-- ============================================================
-- INSERT TEST PAYMENT
-- Replace the UUIDs below with actual values from your database
-- ============================================================

-- STEP 1: Copy an appointment_id from the query above
-- STEP 2: Copy a customer_id from the query above
-- STEP 3: Uncomment and run the INSERT below

/*
INSERT INTO public.payments (
  id,
  appointment_id,
  customer_id,
  amount,
  payment_type,
  payment_method,
  reference_number,
  proof_image_url,
  status,
  notes
) VALUES (
  gen_random_uuid(),
  'PASTE_APPOINTMENT_ID_HERE'::uuid,  -- Replace with actual appointment ID
  'PASTE_CUSTOMER_ID_HERE'::uuid,     -- Replace with actual customer ID
  250.00,                              -- Amount (adjust as needed)
  'down_payment',                      -- Payment type
  'gcash',                             -- Payment method
  'TEST-GC-12345',                     -- Reference number
  'https://example.com/proof.jpg',     -- Proof image URL
  'pending',                           -- Status
  'Test payment record'                -- Notes
);
*/

-- ============================================================
-- VERIFY THE INSERT
-- ============================================================

-- Check if payment was created
SELECT 
  p.*,
  u.name as customer_name,
  a.date as appointment_date,
  a.time as appointment_time
FROM public.payments p
LEFT JOIN public.users u ON p.customer_id = u.id
LEFT JOIN public.appointments a ON p.appointment_id = a.id
ORDER BY p.created_at DESC
LIMIT 5;

-- ============================================================
-- CLEANUP (if needed)
-- ============================================================

-- Delete the test payment (uncomment to use)
-- DELETE FROM public.payments WHERE reference_number = 'TEST-GC-12345';
