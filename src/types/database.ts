// Database types for Sophi Shoes App
// These types match the Supabase schema

export type UserRole = 'admin' | 'vendedor'

export type PaymentMethod = 'efectivo' | 'tarjeta' | 'transferencia' | 'mixto' | 'dropi' | 'contraentrega'


export type PurchaseStatus = 'pendiente' | 'pagada'

export type MovementType = 'compra' | 'venta' | 'ajuste' | 'devolucion'

export type ShippingType = 'local' | 'dropi' | 'contraentrega'
export type ShippingStatus = 'orden generada' | 'despachado' | 'recibido' | 'devuelto'
export type ReturnStatus = 'pendiente' | 'completado' | 'rechazado'

// DIAN Colombia specific types
export type DocumentType = '11' | '12' | '13' | '21' | '22' | '31' | '41' | '42' | '50' | '91'
// 11: Registro civil, 13: Cédula de ciudadanía, 31: NIT, etc.

export type PersonType = '1' | '2' // 1: Jurídica, 2: Natural
export type TaxRegime = '48' | '49' // 48: Responsable de IVA, 49: No responsable de IVA


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
    sku: string | null
    supplier_id: string | null
    is_active: boolean
    image_url: string | null
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
    image_url: string | null
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
    paid_amount: number
    is_credit: boolean
    status: PurchaseStatus
    notes: string | null
    created_by: string | null
    created_at: string
    updated_at: string
    // Joined data
    supplier?: Supplier
    items?: PurchaseItem[]
}

export interface PurchaseInsert extends Omit<Purchase, 'id' | 'created_at' | 'updated_at' | 'supplier' | 'items' | 'payments'> { }
export interface PurchaseUpdate extends Partial<PurchaseInsert> { }

// Purchase Payment (Abonos)
export interface PurchasePayment {
    id: string
    purchase_id?: string
    supplier_id?: string
    amount: number
    payment_date: string
    payment_method: 'efectivo' | 'tarjeta' | 'transferencia' | 'otro'
    notes: string | null
    created_by: string | null
    created_at: string
    updated_at: string
}

export interface PurchasePaymentInsert extends Omit<PurchasePayment, 'id' | 'created_at' | 'updated_at'> { }

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
    // Electronic Invoicing (Colombia)
    is_electronic: boolean
    invoice_number_legal: string | null // e.g. SETT 123
    cufe: string | null
    qr_code: string | null
    xml_url: string | null
    pdf_url: string | null
    dian_status: string | null
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

// Customer (Cliente) - Enhanced for Colombia Electronic Invoicing
export type ClientType = 'standard' | 'shipping'

export interface Customer {
    id: string
    full_name: string
    document_type: DocumentType
    identification: string
    verification_digit: string | null // For NIT
    person_type: PersonType
    tax_regime: TaxRegime
    email: string
    phone: string | null
    address: string | null
    municipality_code: string | null // 5 digits (e.g. 05001 for Medellín)
    department_code: string | null // 2 digits (e.g. 05 for Antioquia)
    is_active: boolean
    client_type: ClientType
    created_at: string
    updated_at: string
}

export interface CustomerInsert extends Omit<Customer, 'id' | 'created_at' | 'updated_at'> { }
export interface CustomerUpdate extends Partial<CustomerInsert> { }

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

