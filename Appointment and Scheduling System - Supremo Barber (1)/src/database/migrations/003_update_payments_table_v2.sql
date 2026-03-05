-- ============================================================
-- MIGRATION: Update payments table based on ACTUAL current schema
-- Current schema: id, appointment_id, amount, payment_type, payment_method, transaction_id, created_at
-- ============================================================

-- Add missing columns (keeping transaction_id as is)
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS proof_image_url TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES public.users(id),
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update payment_type check constraint to support underscore format
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_payment_type_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_payment_type_check 
CHECK (payment_type IN ('down_payment', 'downpayment', 'full_payment', 'full', 'remaining_payment', 'remaining'));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON public.payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON public.payments(transaction_id);

-- Add trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS payments_updated_at_trigger ON public.payments;
CREATE TRIGGER payments_updated_at_trigger
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION update_payments_updated_at();

-- Add comments
COMMENT ON TABLE public.payments IS 'Payment records for appointments with proof verification support';
COMMENT ON COLUMN public.payments.customer_id IS 'Customer who made the payment';
COMMENT ON COLUMN public.payments.transaction_id IS 'Payment reference or transaction number (GCash reference, etc.)';
COMMENT ON COLUMN public.payments.proof_image_url IS 'URL to payment proof image (stored in R2)';
COMMENT ON COLUMN public.payments.status IS 'Payment verification status';
COMMENT ON COLUMN public.payments.verified_by IS 'Admin/staff who verified the payment';
COMMENT ON COLUMN public.payments.verified_at IS 'Timestamp when payment was verified';
