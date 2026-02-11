-- Migration: Fix Ledger Schema (FK Decoupling)
-- Description: Makes purchase_id optional in purchase_payments and adds direct supplier_id.

-- 1. Make purchase_id optional
ALTER TABLE public.purchase_payments ALTER COLUMN purchase_id DROP NOT NULL;

-- 2. Add supplier_id column
ALTER TABLE public.purchase_payments ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE;

-- 3. Backfill supplier_id from purchases for existing records
UPDATE public.purchase_payments pp
SET supplier_id = p.supplier_id
FROM public.purchases p
WHERE pp.purchase_id = p.id AND pp.supplier_id IS NULL;

-- 4. Create index for performance
CREATE INDEX IF NOT EXISTS idx_purchase_payments_supplier ON public.purchase_payments(supplier_id);
