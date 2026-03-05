-- ==================== MIGRATION: Add Missing Columns to Services Table ====================
-- Run this in Supabase SQL Editor to add missing columns WITHOUT losing data
-- This fixes the "isActive column not found" error

-- Add image_url column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'services' 
        AND column_name = 'image_url'
    ) THEN
        ALTER TABLE public.services ADD COLUMN image_url TEXT;
        RAISE NOTICE 'Added image_url column';
    ELSE
        RAISE NOTICE 'image_url column already exists';
    END IF;
END $$;

-- Add updated_at column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'services' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.services ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added updated_at column';
    ELSE
        RAISE NOTICE 'updated_at column already exists';
    END IF;
END $$;

-- Verify the migration
SELECT 
    'Migration completed!' as status,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'services'
ORDER BY ordinal_position;

-- ==================== INSTRUCTIONS ====================
-- 1. Copy this entire script
-- 2. Open Supabase Dashboard → SQL Editor
-- 3. Paste and click "RUN"
-- 4. Refresh your Supremo Barber app
-- 5. Status toggle and image upload should now work!
