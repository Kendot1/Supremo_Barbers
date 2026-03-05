-- Migration: Remove unnecessary columns from payments table
-- Date: 2025-01-11
-- Description: Clean up payments table to only keep essential columns

-- Drop unnecessary columns
ALTER TABLE public.payments
  DROP COLUMN IF EXISTS customer_id,
  DROP COLUMN IF EXISTS proof_image_url,
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS verified_by,
  DROP COLUMN IF EXISTS verified_at,
  DROP COLUMN IF EXISTS notes,
  DROP COLUMN IF EXISTS updated_at,
  DROP COLUMN IF EXISTS transaction_id;

-- Final schema will have only:
-- - id (uuid, primary key)
-- - appointment_id (uuid, foreign key)
-- - amount (numeric)
-- - payment_type (text)
-- - payment_method (text)
-- - created_at (timestamptz)