-- Migration: Add cancellation_reason column to appointments table
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- Add the cancellation_reason column
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT DEFAULT NULL;

-- Add a comment for documentation
COMMENT ON COLUMN appointments.cancellation_reason IS 'Stores the customer or admin reason for cancelling the appointment';

-- Backfill existing cancelled appointments from the notes field
-- This extracts the reason from notes that start with "Customer cancelled: "
UPDATE appointments
SET cancellation_reason = REPLACE(notes, 'Customer cancelled: ', '')
WHERE status = 'cancelled'
  AND notes LIKE 'Customer cancelled: %'
  AND cancellation_reason IS NULL;
