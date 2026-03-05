# Supabase Migration Guide

## How to Run Migrations

### Option 1: Using Supabase Dashboard (Recommended)

1. **Go to your Supabase Project Dashboard**
2. Navigate to **SQL Editor** in the left sidebar
3. Click **+ New Query**
4. Copy the contents of the migration file from `/supabase/migrations/006_add_avatar_and_bio_to_users.sql`
5. Paste into the SQL Editor
6. Click **Run** or press `Ctrl+Enter`

### Option 2: Using Supabase CLI

If you have Supabase CLI installed:

```bash
# Link to your project (first time only)
supabase link --project-ref your-project-ref

# Run all pending migrations
supabase db push

# Or run a specific migration
supabase db execute --file supabase/migrations/006_add_avatar_and_bio_to_users.sql
```

---

## Current Migration: 006_add_avatar_and_bio_to_users.sql

**Purpose:** Add avatar URL and bio columns to users table

**Changes:**
- ✅ Adds `avatarUrl` column (TEXT) - stores Cloudflare R2 image URLs
- ✅ Adds `bio` column (TEXT) - stores professional bio for barbers
- ✅ Adds index on `avatarUrl` for performance
- ✅ Adds column comments for documentation

**Impact:** 
- Non-breaking change (adds optional columns)
- No data loss
- Existing records will have NULL values for new columns
- Can run safely on production database

---

## After Running Migration

**Verify the changes:**

1. Go to **Table Editor** → **users** table
2. You should see two new columns:
   - `avatarUrl` (text, nullable)
   - `bio` (text, nullable)

**Test the functionality:**

1. Go to Customer Profile or Barber Dashboard
2. Upload a profile picture - should save to `avatarUrl` column
3. Update bio (barbers) - should save to `bio` column
4. Check the database to confirm values are saved

---

## Rollback (if needed)

If you need to undo this migration:

```sql
-- Remove the columns
ALTER TABLE public.users DROP COLUMN IF EXISTS "avatarUrl";
ALTER TABLE public.users DROP COLUMN IF EXISTS bio;

-- Remove the index
DROP INDEX IF EXISTS idx_users_avatar_url;
```

⚠️ **Warning:** Rolling back will delete all avatar URLs and bios!

---

## Migration History

1. `004_notifications_and_audit_logs.sql` - Added notifications and audit logs tables
2. `005_add_proof_url_to_payments.sql` - Added proofUrl to payments table
3. `006_add_avatar_and_bio_to_users.sql` - **[CURRENT]** Added avatarUrl and bio to users table

---

## Need Help?

If you encounter any issues:
1. Check Supabase logs in the Dashboard
2. Verify your database connection
3. Make sure you have the necessary permissions
4. Contact support if the issue persists
