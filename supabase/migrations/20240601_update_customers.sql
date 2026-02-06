-- ==============================================
-- MIGRATION: Update customers table for Sophi Shoes
-- Run this in Supabase SQL Editor
-- ==============================================

-- 1. Add missing columns for customer fields
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS document_type TEXT DEFAULT '13';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS identification TEXT DEFAULT '';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS verification_digit TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS person_type TEXT DEFAULT '2';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS tax_regime TEXT DEFAULT '49';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS municipality_code TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS department_code TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 2. Add client_type to separate Standard from Shipping clients
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS client_type TEXT DEFAULT 'standard';

-- 3. Set defaults for existing records
UPDATE public.customers SET is_active = true WHERE is_active IS NULL;
UPDATE public.customers SET client_type = 'standard' WHERE client_type IS NULL;
