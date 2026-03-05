# How to Apply Migration 003 - Update Payments Table

## Problem
The payments table in Supabase is missing required columns that the application needs:
- `customer_id`
- `reference_number` 
- `proof_image_url`
- `status`
- `verified_by`
- `verified_at`
- `notes`
- `updated_at`

## Solution
Run the migration SQL file to add these columns to your Supabase database.

## Steps to Apply

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard: https://supabase.com/dashboard/project/soqbkzwdfsuuziwdpnls
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the entire contents of `/database/migrations/003_update_payments_table.sql`
5. Paste it into the SQL editor
6. Click **Run** button
7. You should see "Success. No rows returned" message

### Option 2: Using Supabase CLI

```bash
# Make sure you're logged in
supabase login

# Link your project (if not already linked)
supabase link --project-ref soqbkzwdfsuuziwdpnls

# Apply the migration
supabase db push
```

## Verification

After applying the migration, verify the changes:

1. Go to **Table Editor** in Supabase dashboard
2. Select the **payments** table
3. Check that these columns now exist:
   - ✅ customer_id (uuid)
   - ✅ reference_number (text)
   - ✅ proof_image_url (text)
   - ✅ status (text) - with values: pending, verified, rejected
   - ✅ verified_by (uuid)
   - ✅ verified_at (timestamp)
   - ✅ notes (text)
   - ✅ updated_at (timestamp)

## What This Fixes

After applying this migration:
1. ✅ Payment records will be successfully created when customers book appointments
2. ✅ Payment proof images can be stored and verified
3. ✅ Admin can verify/reject payments with proper status tracking
4. ✅ Reference numbers are properly stored
5. ✅ Customer relationship is maintained for payment history

## Next Steps

After migration:
1. The payment creation should work immediately
2. Create a test booking with payment proof
3. Check the `payments` table in Supabase - you should see the new record
4. Admin can now verify the payment in the Payment Verification tab
