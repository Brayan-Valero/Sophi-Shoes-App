import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { ProductVariant, PaymentMethod, ShippingType } from '../../types/database'

import { useAuth } from '../../contexts/AuthContext'
import {
    ArrowLeft,

    ShoppingBag,
    Search,
    Plus,
    Minus,
    Trash2,
    CreditCard,
    Banknote,
    Smartphone,
    CheckCircle,
    Truck,
    Package,
    Printer
} from 'lucide-react'



import CustomerSelect from '../../components/sales/CustomerSelect'

interface CartItem {
    variant: ProductVariant & { product?: { name: string } }
    quantity: number
}

interface Customer {
    id: string
    full_name: string
    phone: string | null
    email: string | null
    notes: string | null
}

export default function POSPage() {

    const navigate = useNavigate()
    const location = useLocation()
    const queryClient = useQueryClient()
    const { user } = useAuth()

    const isShippingMode = location.pathname.includes('/shipping/new')

    const [cart, setCart] = useState<CartItem[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(isShippingMode ? 'dropi' : 'efectivo')
    const [discount, setDiscount] = useState(0)
    const [notes, setNotes] = useState('')

    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

    // Shipping State
    const [shippingType, setShippingType] = useState<ShippingType>(isShippingMode ? 'dropi' : 'local')
    const [trackingNumber, setTrackingNumber] = useState('')
    const [shippingCost, setShippingCost] = useState(0)

    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)




    // Fetch product variants with stock > 0
    const { data: variants = [] } = useQuery({
        queryKey: ['product-variants-for-sale'],
        queryFn: async () => {
            if (!isSupabaseConfigured()) return []
            const { data } = await supabase
                .from('product_variants')
                .select(`
          id, size, color, sku, price, stock,
          product:products(id, name, is_active)
        `)
                .gt('stock', 0)
                .order('product_id')
            return (data || []).filter((v: any) => v.product?.is_active) as (ProductVariant & { product: { name: string } })[]
        },
    })

    // Filter variants by search
    const filteredVariants = variants.filter(
        (v) =>
            v.product?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.size.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.color.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // Cart calculations
    const subtotal = cart.reduce((sum, item) => sum + item.variant.price * item.quantity, 0)
    const total = Math.max(0, subtotal - discount)

    // Add to cart
    const addToCart = (variant: ProductVariant & { product?: { name: string } }) => {
        setCart((prev) => {
            const existing = prev.find((item) => item.variant.id === variant.id)
            if (existing) {
                if (existing.quantity < variant.stock) {
                    return prev.map((item) =>
                        item.variant.id === variant.id
                            ? { ...item, quantity: item.quantity + 1 }
                            : item
                    )
                }
                return prev
            }
            return [...prev, { variant, quantity: 1 }]
        })
        setSearchTerm('')
    }

    // Update quantity
    const updateQuantity = (variantId: string, delta: number) => {
        setCart((prev) =>
            prev
                .map((item) => {
                    if (item.variant.id === variantId) {
                        const newQuantity = item.quantity + delta
                        if (newQuantity > 0 && newQuantity <= item.variant.stock) {
                            return { ...item, quantity: newQuantity }
                        }
                        if (newQuantity <= 0) {
                            return null
                        }
                    }
                    return item
                })
                .filter(Boolean) as CartItem[]
        )
    }

    // Remove from cart
    const removeFromCart = (variantId: string) => {
        setCart((prev) => prev.filter((item) => item.variant.id !== variantId))
    }

    // Clear cart
    const clearCart = () => {
        setCart([])
        setDiscount(0)
        setNotes('')
        setSelectedCustomer(null)
        setShippingType(isShippingMode ? 'dropi' : 'local')
        setTrackingNumber('')
        setShippingCost(0)
        setPaymentMethod(isShippingMode ? 'dropi' : 'efectivo')
        setSuccess(false)
    }




    // Save sale mutation
    const saleMutation = useMutation({
        mutationFn: async () => {
            if (!isSupabaseConfigured()) throw new Error('Supabase no configurado')
            if (cart.length === 0) throw new Error('El carrito está vacío')

            // Create sale
            const { data: sale, error: saleError } = await supabase
                .from('sales')
                .insert({
                    sale_date: new Date().toISOString().split('T')[0],
                    total_amount: total,
                    discount_amount: discount,
                    payment_method: paymentMethod,
                    notes: notes || null,
                    created_by: user?.id,
                    customer_id: selectedCustomer?.id,
                    // Shipping fields
                    shipping_type: shippingType,
                    shipping_status: shippingType === 'local' ? 'entregado' : 'pendiente',
                    tracking_number: trackingNumber || null,
                    shipping_cost: shippingCost
                })
                .select('id')


                .single()

            if (saleError) throw saleError

            // Create sale items
            const saleItems = cart.map((item) => ({
                sale_id: sale.id,
                product_variant_id: item.variant.id,
                quantity: item.quantity,
                unit_price: item.variant.price,
                subtotal: item.variant.price * item.quantity,
            }))

            const { error: itemsError } = await supabase
                .from('sale_items')
                .insert(saleItems)

            if (itemsError) throw itemsError

            // Update inventory (decrease stock)
            for (const item of cart) {
                const { data: variant } = await supabase
                    .from('product_variants')
                    .select('stock')
                    .eq('id', item.variant.id)
                    .single()

                if (variant) {
                    await supabase
                        .from('product_variants')
                        .update({
                            stock: variant.stock - item.quantity,
                            updated_at: new Date().toISOString(),
                        })
                        .eq('id', item.variant.id)

                    await supabase.from('inventory_movements').insert({
                        product_variant_id: item.variant.id,
                        movement_type: 'venta',
                        quantity: -item.quantity,
                        reference_id: sale.id,
                        reference_type: 'sale',
                        created_by: user?.id,
                    })
                }
            }

            return sale.id
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sales'] })
            queryClient.invalidateQueries({ queryKey: ['products'] })
            queryClient.invalidateQueries({ queryKey: ['product-variants-for-sale'] })
            setSuccess(true)
        },
        onError: (err: Error) => {
            setError(err.message)
        },
    })

    const handleSubmit = () => {
        setError(null)
        saleMutation.mutate()
    }

    // Handle Enter key for barcode scanner
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && searchTerm) {
            // 1. Try exact SKU match
            const exactMatch = variants.find(v => v.sku?.toLowerCase() === searchTerm.toLowerCase())

            if (exactMatch) {
                if (exactMatch.stock > 0) {
                    addToCart(exactMatch)
                    setSearchTerm('')
                    setError(null)
                } else {
                    setError(`El producto "${exactMatch.product?.name}" no tiene stock`)
                }
                return
            }

            // 2. If only one result in filtered list, add it
            if (filteredVariants.length === 1) {
                const variant = filteredVariants[0]
                if (variant.stock > 0) {
                    addToCart(variant)
                    setSearchTerm('')
                    setError(null)
                } else {
                    setError(`El producto "${variant.product?.name}" no tiene stock`)
                }
            }
        }
    }


    // Success screen
    if (success) {
        return (
            <div className="max-w-md mx-auto text-center py-12">
                <div className="card">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="text-green-600" size={48} />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800 mb-2">¡Venta Registrada!</h1>
                    <p className="text-gray-500 mb-6">
                        La venta se ha guardado correctamente y el inventario ha sido actualizado.
                    </p>
                    <p className="text-3xl font-bold text-green-600 mb-8">
                        ${total.toLocaleString()}
                    </p>
                    <div className="flex gap-3">
                        <button onClick={clearCart} className="btn-primary flex-1">
                            {isShippingMode ? 'Nuevo Envío' : 'Nueva Venta'}
                        </button>
                        <button onClick={() => navigate(isShippingMode ? '/shipping' : '/sales')} className="btn-secondary flex-1">
                            {isShippingMode ? 'Ver Envíos' : 'Ver Ventas'}
                        </button>
                    </div>

                    <button
                        onClick={() => window.open(`/print/sale/${saleMutation.data}`, '_blank')}
                        className="btn-secondary w-full mt-3 flex items-center justify-center gap-2"
                    >
                        <Printer size={20} />
                        Imprimir Recibo
                    </button>
                </div>
            </div>

        )
    }

    return (
        <div className="h-[calc(100vh-120px)] flex flex-col lg:flex-row gap-4">
            {/* Left: Products */}
            <div className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center gap-4 mb-4">
                    <button
                        onClick={() => navigate(isShippingMode ? '/shipping' : '/sales')}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="text-xl font-bold text-gray-800">
                        {isShippingMode ? 'Nuevo Envío' : 'Nueva Venta (Local)'}
                    </h1>
                </div>


                {/* Search */}
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar producto..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="form-input pl-10"
                        autoFocus

                    />
                </div>

                {/* Products grid */}
                <div className="flex-1 overflow-y-auto">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {filteredVariants.map((variant) => {
                            const inCart = cart.find((item) => item.variant.id === variant.id)
                            return (
                                <button
                                    key={variant.id}
                                    onClick={() => addToCart(variant)}
                                    disabled={inCart && inCart.quantity >= variant.stock}
                                    className={`card p-3 text-left hover:shadow-md transition-all ${inCart ? 'ring-2 ring-primary-500' : ''
                                        } ${inCart && inCart.quantity >= variant.stock ? 'opacity-50' : ''}`}
                                >
                                    <p className="font-medium text-gray-800 text-sm truncate">
                                        {variant.product?.name}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {variant.size} - {variant.color}
                                    </p>
                                    <div className="flex justify-between items-center mt-2">
                                        <span className="font-bold text-primary-600">
                                            ${variant.price.toLocaleString()}
                                        </span>
                                        <span className="text-xs text-gray-400">
                                            Stock: {variant.stock}
                                        </span>
                                    </div>
                                    {inCart && (
                                        <div className="mt-2 text-xs bg-primary-100 text-primary-700 rounded-full px-2 py-1 text-center">
                                            {inCart.quantity} en carrito
                                        </div>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                    {filteredVariants.length === 0 && (
                        <div className="text-center py-8">
                            <ShoppingBag className="mx-auto text-gray-300" size={48} />
                            <p className="text-gray-500 mt-2">No se encontraron productos</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Right: Cart */}
            <div className="lg:w-96 flex flex-col card">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <ShoppingBag size={20} />
                    Carrito ({cart.reduce((sum, item) => sum + item.quantity, 0)})
                </h2>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                        {error}
                    </div>
                )}

                {/* Customer Select */}
                <div className="mb-4">
                    <CustomerSelect
                        selectedCustomer={selectedCustomer}
                        onSelect={setSelectedCustomer}
                    />
                </div>


                {/* Shipping Options */}
                <div className="mb-4">
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Tipo de Entrega</label>
                    <div className="grid grid-cols-3 gap-2 mb-2">
                        {isShippingMode ? (
                            <>
                                {[
                                    { value: 'dropi', label: 'Dropi', icon: <Package size={18} /> },
                                    { value: 'contraentrega', label: 'Contraentrega', icon: <Truck size={18} /> },
                                ].map(opt => (
                                    <button
                                        key={opt.value}
                                        onClick={() => setShippingType(opt.value as ShippingType)}
                                        className={`p-2 rounded-lg border text-sm flex flex-col items-center gap-1 transition-all ${shippingType === opt.value
                                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                                            : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        {opt.icon}
                                        <span className="text-xs">{opt.label}</span>
                                    </button>
                                ))}
                            </>
                        ) : (
                            <button
                                onClick={() => setShippingType('local')}
                                className="p-2 rounded-lg border border-blue-500 bg-blue-50 text-blue-700 text-sm flex flex-col items-center gap-1 col-span-3"
                            >
                                <ShoppingBag size={18} />
                                <span className="text-xs">Local</span>
                            </button>
                        )}
                    </div>


                    {shippingType !== 'local' && (
                        <div className="space-y-2 animate-fade-in bg-blue-50 p-3 rounded-lg border border-blue-100">
                            <div>
                                <label className="text-xs font-medium text-blue-800">No. Guía / Tracking</label>
                                <input
                                    value={trackingNumber}
                                    onChange={e => setTrackingNumber(e.target.value)}
                                    className="form-input text-sm h-8"
                                    placeholder="Ej: GUIA-12345"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-blue-800">Costo Envío</label>
                                <div className="relative">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">$</span>
                                    <input
                                        type="number"
                                        value={shippingCost}
                                        onChange={e => setShippingCost(Number(e.target.value))}
                                        className="form-input text-sm h-8 pl-6"
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Cart items */}


                <div className="flex-1 overflow-y-auto min-h-0 space-y-2 mb-4">
                    {cart.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">
                            <ShoppingBag size={32} className="mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Carrito vacío</p>
                        </div>
                    ) : (
                        cart.map((item) => (
                            <div key={item.variant.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">{item.variant.product?.name}</p>
                                    <p className="text-xs text-gray-500">
                                        {item.variant.size} - {item.variant.color}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => updateQuantity(item.variant.id, -1)}
                                        className="p-1 hover:bg-gray-200 rounded"
                                    >
                                        <Minus size={16} />
                                    </button>
                                    <span className="w-8 text-center font-medium">{item.quantity}</span>
                                    <button
                                        onClick={() => updateQuantity(item.variant.id, 1)}
                                        className="p-1 hover:bg-gray-200 rounded"
                                        disabled={item.quantity >= item.variant.stock}
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>
                                <span className="font-medium text-sm w-20 text-right">
                                    ${(item.variant.price * item.quantity).toLocaleString()}
                                </span>
                                <button
                                    onClick={() => removeFromCart(item.variant.id)}
                                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {/* Payment method */}
                <div className="mb-4">
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Forma de Pago</label>
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { value: 'efectivo', label: 'Efectivo', icon: <Banknote size={18} />, hidden: isShippingMode },
                            { value: 'tarjeta', label: 'Tarjeta', icon: <CreditCard size={18} />, hidden: isShippingMode },
                            { value: 'transferencia', label: 'Transf.', icon: <Smartphone size={18} />, hidden: isShippingMode },
                            { value: 'mixto', label: 'Mixto', icon: <Banknote size={18} />, hidden: isShippingMode },
                            { value: 'dropi', label: 'Dropi', icon: <Package size={18} />, hidden: !isShippingMode },
                            { value: 'contraentrega', label: 'Contraentr.', icon: <Truck size={18} />, hidden: !isShippingMode },
                        ].filter(m => !m.hidden).map((method) => (
                            <button
                                key={method.value}
                                type="button"
                                onClick={() => setPaymentMethod(method.value as PaymentMethod)}
                                className={`p-2 rounded-lg border text-sm flex flex-col items-center gap-1 transition-all ${paymentMethod === method.value
                                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                                    : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                {method.icon}
                                {method.label}
                            </button>
                        ))}
                    </div>

                </div>

                {/* Discount */}
                <div className="mb-4">
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Descuento</label>
                    <input
                        type="number"
                        value={discount}
                        onChange={(e) => setDiscount(Number(e.target.value))}
                        className="form-input"
                        min="0"
                        max={subtotal}
                    />
                </div>

                {/* Totals */}
                <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Subtotal</span>
                        <span>${subtotal.toLocaleString()}</span>
                    </div>
                    {discount > 0 && (
                        <div className="flex justify-between text-sm text-red-600">
                            <span>Descuento</span>
                            <span>-${discount.toLocaleString()}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-xl font-bold">
                        <span>Total</span>
                        <span className="text-green-600">${total.toLocaleString()}</span>
                    </div>
                </div>

                {/* Actions */}
                <div className="mt-4 space-y-2">
                    <button
                        onClick={handleSubmit}
                        disabled={cart.length === 0 || saleMutation.isPending}
                        className="w-full btn-success py-3 text-lg flex items-center justify-center gap-2"
                    >
                        {saleMutation.isPending ? (
                            <>
                                <div className="spinner w-5 h-5 border-white/30 border-t-white"></div>
                                Procesando...
                            </>
                        ) : (
                            <>
                                <CheckCircle size={20} />
                                Cobrar ${total.toLocaleString()}
                            </>
                        )}
                    </button>
                    {cart.length > 0 && (
                        <button onClick={clearCart} className="w-full btn-secondary">
                            Vaciar Carrito
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
