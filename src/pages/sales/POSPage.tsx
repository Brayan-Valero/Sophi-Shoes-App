import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import CustomerSelect from '../../components/sales/CustomerSelect'
import { ProductVariant, PaymentMethod, ShippingType, Customer } from '../../types/database'
import { useAuth } from '../../contexts/AuthContext'
import {
    ArrowLeft,
    ShoppingBag,
    Search,
    Plus,
    Minus,
    Trash2,
    Banknote,
    Smartphone,
    CheckCircle,
    Truck,
    Package,
    Printer
} from 'lucide-react'

interface CartItem {
    variant: ProductVariant & { product?: { name: string } }
    quantity: number
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

    // Electronic Invoicing
    const [isElectronic, setIsElectronic] = useState(false)

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
          id, size, color, sku, price, stock, image_url,
          product:products(id, name, is_active, image_url)
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
                    shipping_cost: shippingCost,
                    // Electronic Fields
                    is_electronic: isElectronic,
                    dian_status: isElectronic ? 'pendiente' : null
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

        // Validation for Electronic Invoicing
        if (isElectronic) {
            if (!selectedCustomer) {
                setError('Debe seleccionar un cliente para facturación electrónica')
                return
            }
            if (!selectedCustomer.email || !selectedCustomer.identification) {
                setError('El cliente seleccionado no tiene datos completos (Documento o Email) para facturación electrónica')
                return
            }
        }

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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Group filtered variants by product+color for display */}
                        {Object.values(filteredVariants.reduce((acc: any, v) => {
                            const key = `${v.product_id}-${v.color}`
                            if (!acc[key]) {
                                acc[key] = {
                                    id: key,
                                    productName: v.product?.name,
                                    color: v.color,
                                    price: v.price,
                                    image_url: v.image_url || v.product?.image_url,
                                    variants: []
                                }
                            }
                            acc[key].variants.push(v)
                            return acc
                        }, {})).map((group: any) => (
                            <div key={group.id} className="card p-0 overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow border border-gray-100">
                                <div className="aspect-[16/9] bg-gray-50 relative group">
                                    {group.image_url ? (
                                        <img src={group.image_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <Package className="text-gray-200" size={48} />
                                        </div>
                                    )}
                                    <div className="absolute top-2 left-2">
                                        <span className="bg-white/90 backdrop-blur px-2 py-0.5 rounded text-[10px] font-bold text-gray-700 shadow-sm border border-gray-100">
                                            {group.color}
                                        </span>
                                    </div>
                                    <div className="absolute top-2 right-2">
                                        <span className="bg-primary-600 text-white px-2 py-0.5 rounded text-[10px] font-bold shadow-sm">
                                            ${group.price.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                                <div className="p-3 flex-1 flex flex-col">
                                    <h3 className="font-bold text-gray-800 text-sm mb-2 truncate">
                                        {group.productName}
                                    </h3>

                                    <p className="text-[10px] text-gray-400 font-medium mb-2">Tallas Disponibles:</p>
                                    <div className="flex flex-wrap gap-1.5 mt-auto">
                                        {group.variants.sort((a: any, b: any) => parseInt(a.size) - parseInt(b.size)).map((v: any) => {
                                            const inCart = cart.find(item => item.variant.id === v.id)
                                            return (
                                                <button
                                                    key={v.id}
                                                    onClick={() => addToCart(v)}
                                                    disabled={v.stock <= (inCart?.quantity || 0)}
                                                    className={`
                                                        min-w-[32px] h-8 flex flex-col items-center justify-center rounded border transition-all
                                                        ${inCart
                                                            ? 'bg-primary-500 border-primary-600 text-white shadow-sm'
                                                            : 'bg-white border-gray-200 text-gray-700 hover:border-primary-400 hover:text-primary-600'}
                                                        ${v.stock <= (inCart?.quantity || 0) ? 'opacity-30 cursor-not-allowed grayscale' : ''}
                                                    `}
                                                    title={`Stock: ${v.stock}`}
                                                >
                                                    <span className="text-xs font-bold leading-none">{v.size}</span>
                                                    {v.stock < 5 && v.stock > 0 && <span className="text-[8px] opacity-70 leading-none mt-0.5">{v.stock}</span>}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        ))}
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
                            <div key={item.variant.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                                <div className="w-10 h-10 rounded border border-gray-200 overflow-hidden flex-shrink-0 bg-white">
                                    {(item.variant.image_url || item.variant.product?.image_url) ? (
                                        <img
                                            src={item.variant.image_url || item.variant.product?.image_url || undefined}
                                            alt=""
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <Package size={16} className="text-gray-300" />
                                        </div>
                                    )}
                                </div>
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

                {/* Invoicing Mode Selector */}
                <div className="mb-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-bold text-gray-800">Facturación Electrónica</label>
                        <div
                            className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors duration-200 ease-in-out ${isElectronic ? 'bg-primary-500' : 'bg-gray-300'}`}
                            onClick={() => setIsElectronic(!isElectronic)}
                        >
                            <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform duration-200 ease-in-out ${isElectronic ? 'translate-x-6' : 'translate-x-0'}`}></div>
                        </div>
                    </div>
                    <p className="text-[10px] text-gray-400">
                        {isElectronic
                            ? 'Se generará XML legal y se enviará a la DIAN. Requiere datos del cliente.'
                            : 'Venta local simplificada sin reporte electrónico inmediato.'}
                    </p>
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
