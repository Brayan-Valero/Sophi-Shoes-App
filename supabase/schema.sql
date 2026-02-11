-- =============================================
-- SOPHI SHOES - DATABASE SCHEMA
-- =============================================
-- Execute this SQL in your Supabase SQL Editor
-- =============================================

-- 1. PROFILES TABLE (extends auth.users)
-- =============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'vendedor')) DEFAULT 'vendedor',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'vendedor')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. SUPPLIERS TABLE (Proveedores/Fabricantes)
-- =============================================
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PRODUCTS TABLE (Modelos de calzado)
-- =============================================
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  sku TEXT UNIQUE,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. PRODUCT VARIANTS TABLE (Variantes por talla/color)
-- =============================================
CREATE TABLE IF NOT EXISTS public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  size TEXT NOT NULL,
  color TEXT NOT NULL,
  sku TEXT UNIQUE,
  cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, size, color)
);

-- 5. PURCHASES TABLE (Facturas de compra)
-- =============================================
CREATE TABLE IF NOT EXISTS public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  invoice_number TEXT,
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  status TEXT CHECK (status IN ('pendiente', 'pagada')) DEFAULT 'pendiente',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. PURCHASE ITEMS TABLE (Detalle de compras)
-- =============================================
CREATE TABLE IF NOT EXISTS public.purchase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID REFERENCES public.purchases(id) ON DELETE CASCADE NOT NULL,
  product_variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL,
  unit_cost DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. SALES TABLE (Ventas locales)
-- =============================================
CREATE TABLE IF NOT EXISTS public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  payment_method TEXT CHECK (payment_method IN ('efectivo', 'tarjeta', 'transferencia', 'mixto')) DEFAULT 'efectivo',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. SALE ITEMS TABLE (Detalle de ventas)
-- =============================================
CREATE TABLE IF NOT EXISTS public.sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
  product_variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. INVENTORY MOVEMENTS TABLE (Auditoría de movimientos)
-- =============================================
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  movement_type TEXT CHECK (movement_type IN ('compra', 'venta', 'ajuste', 'devolucion')) NOT NULL,
  quantity INTEGER NOT NULL,
  reference_id UUID,
  reference_type TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_products_supplier ON public.products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_product_variants_product ON public.product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON public.product_variants(sku);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON public.purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchases_date ON public.purchases(purchase_date);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON public.purchases(status);
CREATE INDEX IF NOT EXISTS idx_sales_date ON public.sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_payment_method ON public.sales(payment_method);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_variant ON public.inventory_movements(product_variant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_type ON public.inventory_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_date ON public.inventory_movements(created_at);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

-- Helper function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- =============================================
-- POLICIES FOR PROFILES
-- =============================================
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS "Admin full access to profiles" ON public.profiles;
CREATE POLICY "Admin full access to profiles" ON public.profiles
  FOR ALL USING (public.get_user_role() = 'admin');

-- =============================================
-- POLICIES FOR SUPPLIERS
-- =============================================
DROP POLICY IF EXISTS "Admin full access to suppliers" ON public.suppliers;
CREATE POLICY "Admin full access to suppliers" ON public.suppliers
  FOR ALL USING (public.get_user_role() = 'admin');

DROP POLICY IF EXISTS "Vendedor can read suppliers" ON public.suppliers;
CREATE POLICY "Vendedor can read suppliers" ON public.suppliers
  FOR SELECT USING (public.get_user_role() = 'vendedor');

-- =============================================
-- POLICIES FOR PRODUCTS
-- =============================================
DROP POLICY IF EXISTS "Admin full access to products" ON public.products;
CREATE POLICY "Admin full access to products" ON public.products
  FOR ALL USING (public.get_user_role() = 'admin');

DROP POLICY IF EXISTS "Vendedor can read products" ON public.products;
CREATE POLICY "Vendedor can read products" ON public.products
  FOR SELECT USING (public.get_user_role() = 'vendedor');

-- =============================================
-- POLICIES FOR PRODUCT VARIANTS
-- =============================================
DROP POLICY IF EXISTS "Admin full access to product_variants" ON public.product_variants;
CREATE POLICY "Admin full access to product_variants" ON public.product_variants
  FOR ALL USING (public.get_user_role() = 'admin');

DROP POLICY IF EXISTS "Vendedor can read product_variants" ON public.product_variants;
CREATE POLICY "Vendedor can read product_variants" ON public.product_variants
  FOR SELECT USING (public.get_user_role() = 'vendedor');

-- Vendedor can update stock (for sales)
DROP POLICY IF EXISTS "Vendedor can update variant stock" ON public.product_variants;
CREATE POLICY "Vendedor can update variant stock" ON public.product_variants
  FOR UPDATE USING (public.get_user_role() = 'vendedor')
  WITH CHECK (public.get_user_role() = 'vendedor');

-- =============================================
-- POLICIES FOR PURCHASES (Admin only)
-- =============================================
DROP POLICY IF EXISTS "Admin full access to purchases" ON public.purchases;
CREATE POLICY "Admin full access to purchases" ON public.purchases
  FOR ALL USING (public.get_user_role() = 'admin');

DROP POLICY IF EXISTS "Admin full access to purchase_items" ON public.purchase_items;
CREATE POLICY "Admin full access to purchase_items" ON public.purchase_items
  FOR ALL USING (public.get_user_role() = 'admin');

-- =============================================
-- POLICIES FOR SALES (Admin + Vendedor)
-- =============================================
DROP POLICY IF EXISTS "Admin full access to sales" ON public.sales;
CREATE POLICY "Admin full access to sales" ON public.sales
  FOR ALL USING (public.get_user_role() = 'admin');

DROP POLICY IF EXISTS "Vendedor can create and read sales" ON public.sales;
CREATE POLICY "Vendedor can create and read sales" ON public.sales
  FOR SELECT USING (public.get_user_role() = 'vendedor');

DROP POLICY IF EXISTS "Vendedor can insert sales" ON public.sales;
CREATE POLICY "Vendedor can insert sales" ON public.sales
  FOR INSERT WITH CHECK (public.get_user_role() = 'vendedor');

DROP POLICY IF EXISTS "Admin full access to sale_items" ON public.sale_items;
CREATE POLICY "Admin full access to sale_items" ON public.sale_items
  FOR ALL USING (public.get_user_role() = 'admin');

DROP POLICY IF EXISTS "Vendedor can read sale_items" ON public.sale_items;
CREATE POLICY "Vendedor can read sale_items" ON public.sale_items
  FOR SELECT USING (public.get_user_role() = 'vendedor');

DROP POLICY IF EXISTS "Vendedor can insert sale_items" ON public.sale_items;
CREATE POLICY "Vendedor can insert sale_items" ON public.sale_items
  FOR INSERT WITH CHECK (public.get_user_role() = 'vendedor');

-- =============================================
-- POLICIES FOR INVENTORY MOVEMENTS
-- =============================================
DROP POLICY IF EXISTS "Admin full access to inventory_movements" ON public.inventory_movements;
CREATE POLICY "Admin full access to inventory_movements" ON public.inventory_movements
  FOR ALL USING (public.get_user_role() = 'admin');

DROP POLICY IF EXISTS "Vendedor can insert inventory_movements" ON public.inventory_movements;
CREATE POLICY "Vendedor can insert inventory_movements" ON public.inventory_movements
  FOR INSERT WITH CHECK (public.get_user_role() = 'vendedor');

DROP POLICY IF EXISTS "Vendedor can read inventory_movements" ON public.inventory_movements;
CREATE POLICY "Vendedor can read inventory_movements" ON public.inventory_movements
  FOR SELECT USING (public.get_user_role() = 'vendedor');

-- =============================================
-- 10. CASH REGISTERS TABLE (Control de Caja)
-- =============================================
CREATE TABLE IF NOT EXISTS public.cash_registers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opening_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  closing_amount DECIMAL(12,2),
  expected_amount DECIMAL(12,2),
  notes TEXT,
  status TEXT CHECK (status IN ('open', 'closed')) DEFAULT 'open',
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  opened_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.cash_registers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access to cash_registers" ON public.cash_registers;
CREATE POLICY "Admin full access to cash_registers" ON public.cash_registers
  FOR ALL USING (public.get_user_role() = 'admin');

DROP POLICY IF EXISTS "Vendedor can view own cash_registers" ON public.cash_registers;
CREATE POLICY "Vendedor can view own cash_registers" ON public.cash_registers
  FOR ALL USING (public.get_user_role() = 'vendedor');

-- =============================================
-- 11. EXPENSES TABLE (Gastos/Retiros)
-- =============================================
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  category TEXT CHECK (category IN ('proveedor', 'servicios', 'personal', 'otros')) DEFAULT 'otros',
  expense_date TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  cash_register_id UUID REFERENCES public.cash_registers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access to expenses" ON public.expenses FOR ALL USING (public.get_user_role() = 'admin');
CREATE POLICY "Vendedor can insert expenses" ON public.expenses FOR INSERT WITH CHECK (public.get_user_role() = 'vendedor');
CREATE POLICY "Vendedor can view expenses" ON public.expenses FOR SELECT USING (public.get_user_role() = 'vendedor');


-- =============================================
-- 12. CUSTOMERS TABLE (Clientes)
-- =============================================
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  document_type TEXT DEFAULT '13',
  identification TEXT,
  verification_digit TEXT,
  person_type TEXT DEFAULT '2',
  tax_regime TEXT DEFAULT '49',
  email TEXT,
  phone TEXT,
  address TEXT,
  municipality_code TEXT,
  department_code TEXT,
  is_active BOOLEAN DEFAULT true,
  client_type TEXT CHECK (client_type IN ('standard', 'shipping')) DEFAULT 'standard',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can read customers" ON public.customers FOR SELECT USING (true);
CREATE POLICY "Everyone can insert customers" ON public.customers FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin full access to customers" ON public.customers FOR ALL USING (public.get_user_role() = 'admin');

-- Add customer_id to sales
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL;


-- Add Customer and Shipping columns to Sales (if not exists)
-- customer_id was added in previous step, ensuring it's there.
-- Now adding shipping fields:
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS shipping_type TEXT CHECK (shipping_type IN ('local', 'dropi', 'contraentrega')) DEFAULT 'local';
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS shipping_status TEXT CHECK (shipping_status IN ('orden generada', 'despachado', 'recibido', 'devuelto')) DEFAULT 'orden generada';
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS tracking_number TEXT;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS shipping_cost DECIMAL(12,2) DEFAULT 0;

-- Update Product Variants
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS min_stock INTEGER DEFAULT 5;


-- =============================================
-- 13. RETURNS TABLE (Devoluciones)
-- =============================================
CREATE TABLE IF NOT EXISTS public.returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES public.sales(id),
  reason TEXT,
  refund_amount DECIMAL(12,2) DEFAULT 0,
  status TEXT CHECK (status IN ('pendiente', 'completado', 'rechazado')) DEFAULT 'pendiente',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.return_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID REFERENCES public.returns(id) ON DELETE CASCADE,
  product_variant_id UUID REFERENCES public.product_variants(id),
  quantity INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to returns" ON public.returns FOR ALL USING (public.get_user_role() = 'admin');
CREATE POLICY "Vendedor can view/create returns" ON public.returns FOR ALL USING (public.get_user_role() = 'vendedor');

CREATE POLICY "Admin full access to return_items" ON public.return_items FOR ALL USING (public.get_user_role() = 'admin');
CREATE POLICY "Vendedor can view/create return_items" ON public.return_items FOR ALL USING (public.get_user_role() = 'vendedor');


-- =============================================
-- CREATE INITIAL ADMIN USER
-- =============================================
-- Run this AFTER creating a user in Supabase Auth:
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'tu-email@ejemplo.com';
