// Database types for Sophi Shoes App
// These types match the Supabase schema

export type UserRole = 'admin' | 'vendedor'

export type PaymentMethod = 'efectivo' | 'tarjeta' | 'transferencia' | 'mixto' | 'dropi' | 'contraentrega'


export type PurchaseStatus = 'pendiente' | 'pagada'

export type MovementType = 'compra' | 'venta' | 'ajuste' | 'devolucion'

export type ShippingType = 'local' | 'dropi' | 'contraentrega'
export type ShippingStatus = 'pendiente' | 'enviado' | 'entregado' | 'devuelto'
export type ReturnStatus = 'pendiente' | 'completado' | 'rechazado'


// Profile (extension of auth.users)
export interface Profile {
    id: string
    email: string
    full_name: string | null
    role: UserRole
    created_at: string
    updated_at: string
}

// Supplier (Proveedor/Fabricante)
export interface Supplier {
    id: string
    name: string
    contact_name: string | null
    phone: string | null
    email: string | null
    address: string | null
    notes: string | null
    is_active: boolean
    created_at: string
    updated_at: string
}

export interface SupplierInsert extends Omit<Supplier, 'id' | 'created_at' | 'updated_at'> { }
export interface SupplierUpdate extends Partial<SupplierInsert> { }

// Product (Modelo de calzado)
export interface Product {
    id: string
    name: string
    description: string | null
    category: string | null
    supplier_id: string | null
    is_active: boolean
    created_at: string
    updated_at: string
    // Joined data
    supplier?: Supplier
    variants?: ProductVariant[]
}

export interface ProductInsert extends Omit<Product, 'id' | 'created_at' | 'updated_at' | 'supplier' | 'variants'> { }
export interface ProductUpdate extends Partial<ProductInsert> { }

// Product Variant (Variante por talla y color)
export interface ProductVariant {
    id: string
    product_id: string
    size: string
    color: string
    sku: string | null
    cost: number
    price: number
    stock: number
    min_stock: number
    created_at: string
    updated_at: string
    // Joined data
    product?: Product
}

export interface ProductVariantInsert extends Omit<ProductVariant, 'id' | 'created_at' | 'updated_at' | 'product'> { }
export interface ProductVariantUpdate extends Partial<ProductVariantInsert> { }

// Purchase (Factura de compra)
export interface Purchase {
    id: string
    supplier_id: string | null
    invoice_number: string | null
    purchase_date: string
    total_amount: number
    status: PurchaseStatus
    notes: string | null
    created_by: string | null
    created_at: string
    updated_at: string
    // Joined data
    supplier?: Supplier
    items?: PurchaseItem[]
}

export interface PurchaseInsert extends Omit<Purchase, 'id' | 'created_at' | 'updated_at' | 'supplier' | 'items'> { }
export interface PurchaseUpdate extends Partial<PurchaseInsert> { }

// Purchase Item (Detalle de compra)
export interface PurchaseItem {
    id: string
    purchase_id: string
    product_variant_id: string
    quantity: number
    unit_cost: number
    subtotal: number
    created_at: string
    // Joined data
    product_variant?: ProductVariant
}

export interface PurchaseItemInsert extends Omit<PurchaseItem, 'id' | 'created_at' | 'product_variant'> { }

// Sale (Venta local / Envíos)
export interface Sale {
    id: string
    sale_date: string
    total_amount: number
    discount_amount: number
    payment_method: PaymentMethod
    notes: string | null
    created_by: string | null
    customer_id: string | null
    // Shipping fields
    shipping_type: ShippingType
    shipping_status: ShippingStatus
    tracking_number: string | null
    shipping_cost: number
    created_at: string
    updated_at: string
    // Joined data
    items?: SaleItem[]
    customer?: any // using any to avoid circular dep or just simplify for now
}


export interface SaleInsert extends Omit<Sale, 'id' | 'created_at' | 'updated_at' | 'items'> { }
export interface SaleUpdate extends Partial<SaleInsert> { }

// Sale Item (Detalle de venta)
export interface SaleItem {
    id: string
    sale_id: string
    product_variant_id: string
    quantity: number
    unit_price: number
    subtotal: number
    created_at: string
    // Joined data
    product_variant?: ProductVariant
}

export interface SaleItemInsert extends Omit<SaleItem, 'id' | 'created_at' | 'product_variant'> { }

// Inventory Movement (Movimiento de inventario)
export interface InventoryMovement {
    id: string
    product_variant_id: string
    movement_type: MovementType
    quantity: number
    reference_id: string | null
    reference_type: string | null
    notes: string | null
    created_by: string | null
    created_at: string
    // Joined data
    product_variant?: ProductVariant
}

export interface InventoryMovementInsert extends Omit<InventoryMovement, 'id' | 'created_at' | 'product_variant'> { }

// Daily Cash Summary (for reports)
export interface DailyCashSummary {
    date: string
    total_sales: number
    total_transactions: number
    by_payment_method: {
        efectivo: number
        tarjeta: number
        transferencia: number
        mixto: number
    }
}

// Returns (Devoluciones)
export interface Return {
    id: string
    sale_id: string
    reason: string
    refund_amount: number
    status: ReturnStatus
    created_at: string
    items?: ReturnItem[]
}

export interface ReturnItem {
    id: string
    return_id: string
    product_variant_id: string
    quantity: number
    created_at: string
}

