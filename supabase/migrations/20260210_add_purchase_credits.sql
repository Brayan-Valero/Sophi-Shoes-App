-- Migration: Add Purchase Credits and Payments
-- Description: Adds tracking for partial payments and a new table for abonos.

-- Update purchases table
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(12,2) DEFAULT 0;
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS is_credit BOOLEAN DEFAULT false;

-- Create purchase_payments table
CREATE TABLE IF NOT EXISTS public.purchase_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID REFERENCES public.purchases(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT CHECK (payment_method IN ('efectivo', 'tarjeta', 'transferencia', 'otro')) DEFAULT 'efectivo',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for purchase_payments
ALTER TABLE public.purchase_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access to purchase_payments" ON public.purchase_payments;
CREATE POLICY "Admin full access to purchase_payments" ON public.purchase_payments
  FOR ALL USING (public.get_user_role() = 'admin');

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_purchase_payments_purchase ON public.purchase_payments(purchase_id);
