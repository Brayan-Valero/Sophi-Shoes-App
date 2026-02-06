-- Add client_type column to separate Standard from Shipping clients
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS client_type TEXT CHECK (client_type IN ('standard', 'shipping')) DEFAULT 'standard';
