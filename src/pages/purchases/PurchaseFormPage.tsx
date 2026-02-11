import React, { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { Supplier, ProductVariant } from '../../types/database'
import { useAuth } from '../../contexts/AuthContext'
import { ArrowLeft, Save, ShoppingCart, Plus, Trash2, Search, AlertTriangle } from 'lucide-react'

interface PurchaseItemForm {
    id?: string // for existing items
    product_variant_id: string
    quantity: number
    unit_cost: number
    variant?: ProductVariant & { product?: { name: string } }
}

export default function PurchaseFormPage() {
    const navigate = useNavigate()
    const { id } = useParams()
    const queryClient = useQueryClient()
    const { user } = useAuth()
    const isEditing = !!id

    const [supplierId, setSupplierId] = useState<string>('')
    const [invoiceNumber, setInvoiceNumber] = useState('')
    const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0])
    const [isCredit, setIsCredit] = useState(false)
    const [initialPayment, setInitialPayment] = useState<number>(0)
    const [newAbono, setNewAbono] = useState<number>(0)
    const [notes, setNotes] = useState('')
    const [items, setItems] = useState<PurchaseItemForm[]>([])
    const [originalItems, setOriginalItems] = useState<PurchaseItemForm[]>([]) // To track stock changes
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedGroup, setSelectedGroup] = useState<any>(null)
    const [tempQtys, setTempQtys] = useState<{ [variantId: string]: number }>({})
    const [error, setError] = useState<string | null>(null)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

    // Fetch purchase for editing
    const { isLoading: isLoadingPurchase } = useQuery({
        queryKey: ['purchase', id],
        queryFn: async () => {
            if (!id || !isSupabaseConfigured()) return null
            const { data, error } = await supabase
                .from('purchases')
                .select(`
                    *,
                    items:purchase_items(
                        *,
                        variant:product_variants(
                            id, size, color, sku, cost, price, stock,
                            product:products(id, name)
                        )
                    ),
                    payments:purchase_payments(amount)
                `)
                .eq('id', id)
                .single()

            if (error) throw error

            setSupplierId(data.supplier_id || '')
            setInvoiceNumber(data.invoice_number || '')
            setPurchaseDate(data.purchase_date)
            setIsCredit(data.is_credit || false)

            // SUM accurate history for the initialPayment
            const totalPaidInHistory = (data.payments || []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0)
            setInitialPayment(totalPaidInHistory)
            setNotes(data.notes || '')

            const loadedItems = data.items.map((item: any) => ({
                id: item.id,
                product_variant_id: item.product_variant_id,
                quantity: item.quantity,
                unit_cost: item.unit_cost,
                variant: item.variant
            }))
            setItems(loadedItems)
            setOriginalItems(JSON.parse(JSON.stringify(loadedItems))) // Deep clone for comparison

            return data
        },
        enabled: isEditing,
    })

    // Fetch suppliers
    const { data: suppliers = [] } = useQuery({
        queryKey: ['suppliers-active'],
        queryFn: async () => {
            if (!isSupabaseConfigured()) return []
            const { data } = await supabase
                .from('suppliers')
                .select('id, name')
                .eq('is_active', true)
                .order('name')
            return data as Supplier[]
        },
    })

    // Fetch product variants for selection
    const { data: variants = [] } = useQuery({
        queryKey: ['product-variants-for-purchase'],
        queryFn: async () => {
            if (!isSupabaseConfigured()) return []
            const { data } = await supabase
                .from('product_variants')
                .select(`
          id, size, color, sku, cost, price, stock,
          product:products(id, name, is_active)
        `)
                .order('product_id')
            return (data || []).filter((v: any) => v.product?.is_active) as (ProductVariant & { product: { name: string } })[]
        },
    })

    // Group filtered variants by product + color
    const groupedResults = Object.values(variants.filter(v =>
        !items.some(item => item.product_variant_id === v.id) &&
        (v.product?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.color.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.sku?.toLowerCase().includes(searchTerm.toLowerCase()))
    ).reduce((acc: any, v) => {
        const key = `${v.product.id}-${v.color}`
        if (!acc[key]) {
            acc[key] = {
                id: key,
                productName: v.product.name,
                color: v.color,
                image_url: v.image_url || v.product?.image_url,
                variants: []
            }
        }
        acc[key].variants.push(v)
        return acc
    }, {}))

    // Calculate total
    const total = items.reduce((sum, item) => sum + item.quantity * item.unit_cost, 0)

    // Add multiple items at once
    const addGroupItems = () => {
        const newItems: PurchaseItemForm[] = []
        Object.entries(tempQtys).forEach(([variantId, qty]) => {
            if (qty > 0) {
                const variant = variants.find(v => v.id === variantId)
                if (variant) {
                    newItems.push({
                        product_variant_id: variant.id,
                        quantity: qty,
                        unit_cost: variant.cost,
                        variant
                    })
                }
            }
        })

        if (newItems.length > 0) {
            setItems(prev => [...prev, ...newItems])
            setSearchTerm('')
            setSelectedGroup(null)
            setTempQtys({})
        }
    }

    // Update item
    const updateItem = (index: number, field: 'quantity' | 'unit_cost', value: number) => {
        setItems((prev) =>
            prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
        )
    }

    // Remove item
    const removeItem = (index: number) => {
        setItems((prev) => prev.filter((_, i) => i !== index))
    }

    // Group items for display in table
    const displayGroups = Object.values(items.reduce((acc: any, item, idx) => {
        const key = `${item.variant?.product?.id || item.variant?.product_id}-${item.variant?.color}`
        if (!acc[key]) {
            acc[key] = {
                id: key,
                productName: item.variant?.product?.name,
                color: item.variant?.color,
                items: []
            }
        }
        acc[key].items.push({ ...item, idx })
        return acc
    }, {}))

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: async () => {
            if (!id || !isSupabaseConfigured()) return

            // 1. Revert inventory (decrease stock)
            for (const item of items) {
                const { data: variant } = await supabase
                    .from('product_variants')
                    .select('stock')
                    .eq('id', item.product_variant_id)
                    .single()

                if (variant) {
                    await supabase
                        .from('product_variants')
                        .update({
                            stock: Math.max(0, variant.stock - item.quantity),
                            updated_at: new Date().toISOString(),
                        })
                        .eq('id', item.product_variant_id)
                }
            }

            // 2. Delete payments (foreign key will handle it if cascade, but let's be safe)
            await supabase.from('purchase_payments').delete().eq('purchase_id', id)

            // 3. Delete purchase items
            await supabase.from('purchase_items').delete().eq('purchase_id', id)

            // 4. Delete purchase
            const { error } = await supabase.from('purchases').delete().eq('id', id)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['purchases'] })
            queryClient.invalidateQueries({ queryKey: ['products'] })
            navigate('/purchases')
        },
        onError: (err: Error) => {
            setError(err.message)
            setShowDeleteConfirm(false)
        },
    })

    // Save mutation
    const saveMutation = useMutation({
        mutationFn: async () => {
            if (!isSupabaseConfigured()) throw new Error('Supabase no configurado')
            if (items.length === 0) throw new Error('Agrega al menos un producto')

            const finalInvoiceNumber = invoiceNumber || `COMP-${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12)}`
            const finalPaidAmount = initialPayment + newAbono
            const finalStatus = isCredit ? (finalPaidAmount >= total ? 'pagada' : 'pendiente') : 'pagada'
            const paidAmount = isCredit ? finalPaidAmount : total

            let purchaseId = id
            let currentPaidInDb = 0

            if (isEditing) {
                // 1. Insert new payment if any
                if (newAbono !== 0) {
                    const { error: payError } = await supabase.from('purchase_payments').insert({
                        supplier_id: supplierId || null,
                        purchase_id: id,
                        amount: newAbono,
                        payment_date: new Date().toISOString().split('T')[0],
                        payment_method: 'efectivo',
                        notes: `Abono registrado en edición de factura`,
                        created_by: user?.id,
                    })
                    if (payError) throw payError
                }


                // 2. RE-CALCULATE strictly from history sum (Source of Truth)
                const { data: historyData } = await supabase
                    .from('purchase_payments')
                    .select('amount')
                    .eq('purchase_id', id)

                const verifiedPaidAmount = (historyData || []).reduce((acc: number, p: any) => acc + (p.amount || 0), 0)
                const verifiedStatus = verifiedPaidAmount >= total ? 'pagada' : 'pendiente'

                // 3. Update purchase header with verified sum
                const { error: updateError } = await supabase
                    .from('purchases')
                    .update({
                        supplier_id: supplierId || null,
                        invoice_number: finalInvoiceNumber,
                        purchase_date: purchaseDate,
                        total_amount: total,
                        paid_amount: verifiedPaidAmount,
                        is_credit: isCredit,
                        status: verifiedStatus,
                        notes: notes || null,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', id)

                if (updateError) throw updateError

                // 4. Manage items and stock (RECORDING ONLY DIFFS)
                // First, identify removed items
                for (const oldItem of originalItems) {
                    const stillExists = items.find(item => item.product_variant_id === oldItem.product_variant_id)
                    if (!stillExists) {
                        // REVERT STOCK for removed item
                        const { data: v } = await supabase.from('product_variants').select('stock').eq('id', oldItem.product_variant_id).single()
                        if (v) {
                            await supabase.from('product_variants').update({ stock: Math.max(0, v.stock - oldItem.quantity) }).eq('id', oldItem.product_variant_id)
                            // Record removal movement
                            await supabase.from('inventory_movements').insert({
                                product_variant_id: oldItem.product_variant_id,
                                movement_type: 'ajuste',
                                quantity: -oldItem.quantity,
                                reference_id: id,
                                reference_type: 'purchase',
                                notes: 'Item eliminado en edición de compra',
                                created_by: user?.id,
                            })
                        }
                    }
                }

                // Process updated or new items
                for (const item of items) {
                    const oldItem = originalItems.find(oi => oi.product_variant_id === item.product_variant_id)
                    const diffQty = item.quantity - (oldItem?.quantity || 0)

                    if (diffQty !== 0 || !oldItem) {
                        const { data: v } = await supabase.from('product_variants').select('stock').eq('id', item.product_variant_id).single()
                        if (v) {
                            await supabase.from('product_variants').update({
                                stock: Math.max(0, v.stock + diffQty),
                                updated_at: new Date().toISOString()
                            }).eq('id', item.product_variant_id)

                            // Record only the difference
                            await supabase.from('inventory_movements').insert({
                                product_variant_id: item.product_variant_id,
                                movement_type: diffQty > 0 ? 'compra' : 'ajuste',
                                quantity: diffQty,
                                reference_id: id,
                                reference_type: 'purchase',
                                notes: oldItem ? `Ajuste cantidad en edición (Dif: ${diffQty > 0 ? '+' : ''}${diffQty})` : 'Nuevo item agregado en edición',
                                created_by: user?.id,
                            })
                        }
                    }
                }

                // Delete and re-insert items for the purchase structure (cascade delete not used here to be safer with records)
                await supabase.from('purchase_items').delete().eq('purchase_id', id)

            } else {
                // Create purchase
                const { data: purchase, error: purchaseError } = await supabase
                    .from('purchases')
                    .insert({
                        supplier_id: supplierId || null,
                        invoice_number: finalInvoiceNumber,
                        purchase_date: purchaseDate,
                        total_amount: total,
                        paid_amount: paidAmount,
                        is_credit: isCredit,
                        status: finalStatus,
                        notes: notes || null,
                        created_by: user?.id,
                    })
                    .select('id')
                    .single()

                if (purchaseError) throw purchaseError
                purchaseId = purchase.id

                // Record initial payment ONLY for new purchases
                if (paidAmount > 0) {
                    await supabase.from('purchase_payments').insert({
                        purchase_id: purchaseId,
                        amount: paidAmount,
                        payment_date: purchaseDate,
                        payment_method: 'efectivo',
                        notes: isCredit ? 'Abono inicial' : 'Pago total al contado',
                        created_by: user?.id
                    })
                }

                // Stock for NEW items
                for (const item of items) {
                    const { data: v } = await supabase.from('product_variants').select('stock').eq('id', item.product_variant_id).single()
                    if (v) {
                        await supabase.from('product_variants').update({ stock: v.stock + item.quantity }).eq('id', item.product_variant_id)

                        await supabase.from('inventory_movements').insert({
                            product_variant_id: item.product_variant_id,
                            movement_type: 'compra',
                            quantity: item.quantity,
                            reference_id: purchaseId,
                            reference_type: 'purchase',
                            notes: 'Compra inicial',
                            created_by: user?.id,
                        })
                    }
                }
            }

            // Create new/updated items records (the structure link)
            const purchaseItems = items.map((item) => ({
                purchase_id: purchaseId,
                product_variant_id: item.product_variant_id,
                quantity: item.quantity,
                unit_cost: item.unit_cost,
                subtotal: item.quantity * item.unit_cost,
            }))

            const { error: itemsError } = await supabase
                .from('purchase_items')
                .insert(purchaseItems)

            if (itemsError) throw itemsError
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['purchases'] })
            queryClient.invalidateQueries({ queryKey: ['suppliers'] })
            queryClient.invalidateQueries({ queryKey: ['products'] })
            queryClient.invalidateQueries({ queryKey: ['pending-purchases'] })
            navigate('/purchases')
        },
        onError: (err: Error) => {
            setError(err.message)
        },
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        saveMutation.mutate()
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/purchases')}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">
                            {isEditing ? 'Editar Compra' : 'Nueva Compra'}
                        </h1>
                        <p className="text-gray-500">
                            {isEditing ? 'Modifica los datos de la factura' : 'Registra una factura de compra y actualiza el inventario'}
                        </p>
                    </div>
                </div>

                {isEditing && (
                    <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(true)}
                        className="btn-secondary text-red-600 hover:bg-red-50 border-red-100 flex items-center gap-2"
                    >
                        <Trash2 size={18} />
                        Eliminar Compra
                    </button>
                )}
            </div>

            {isLoadingPurchase && (
                <div className="card text-center py-12">
                    <div className="spinner mx-auto"></div>
                    <p className="text-gray-500 mt-4">Cargando datos de la compra...</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Purchase info card */}
                <div className="card space-y-4">
                    <div className="flex justify-center">
                        <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center">
                            <ShoppingCart className="text-purple-600" size={32} />
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="form-group">
                            <label className="form-label">Proveedor</label>
                            <select
                                value={supplierId}
                                onChange={(e) => setSupplierId(e.target.value)}
                                className="form-select"
                            >
                                <option value="">Seleccionar proveedor...</option>
                                {suppliers.map((s) => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Número de Factura</label>
                            <input
                                type="text"
                                value={invoiceNumber}
                                onChange={(e) => setInvoiceNumber(e.target.value)}
                                className="form-input"
                                placeholder="FAC-001"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Fecha de Compra</label>
                            <input
                                type="date"
                                value={purchaseDate}
                                onChange={(e) => setPurchaseDate(e.target.value)}
                                className="form-input"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Tipo de Pago</label>
                            <div className="flex gap-4 mt-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        checked={!isCredit}
                                        onChange={() => setIsCredit(false)}
                                        className="w-4 h-4 text-primary-600"
                                    />
                                    <span className="text-sm font-medium">Contado</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        checked={isCredit}
                                        onChange={() => setIsCredit(true)}
                                        className="w-4 h-4 text-primary-600"
                                    />
                                    <span className="text-sm font-medium">Crédito</span>
                                </label>
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-amber-100">
                            <div className="max-w-md mx-auto">
                                <label className="form-label text-primary-800 font-black uppercase text-[10px] tracking-widest text-center">Abono Realizado Hoy $</label>
                                <input
                                    type="number"
                                    value={newAbono}
                                    onChange={(e) => {
                                        const val = Math.abs(Number(e.target.value))
                                        setNewAbono(val)
                                    }}
                                    className="form-input border-primary-300 bg-primary-50/30 ring-2 ring-primary-50 text-center text-2xl font-black text-primary-700 h-14"
                                    placeholder="0"
                                    min="0"
                                    step="any"
                                />
                                <p className="text-[10px] text-primary-600 mt-2 text-center font-bold italic leading-tight">
                                    Este monto se registrará como un abono a tu cuenta con el proveedor.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Notas</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="form-input min-h-[60px]"
                            placeholder="Notas adicionales..."
                        />
                    </div>
                </div>

                {/* Items card */}
                <div className="card">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Productos a Comprar</h2>

                    {/* Product search */}
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar producto para agregar..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="form-input pl-10"
                        />
                    </div>

                    {/* Search results grouped by color */}
                    {searchTerm && groupedResults.length > 0 && (
                        <div className="mb-4 max-h-60 overflow-y-auto border rounded-xl divide-y">
                            {groupedResults.slice(0, 10).map((group: any) => (
                                <div key={group.id} className="p-3">
                                    <div
                                        className="flex justify-between items-center cursor-pointer hover:text-primary-600 transition-colors"
                                        onClick={() => {
                                            if (selectedGroup?.id === group.id) {
                                                setSelectedGroup(null)
                                                setTempQtys({})
                                            } else {
                                                setSelectedGroup(group)
                                                // Initialize temp qtys to 0
                                                const initQtys: any = {}
                                                group.variants.forEach((v: any) => initQtys[v.id] = '')
                                                setTempQtys(initQtys)
                                            }
                                        }}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-gray-50 rounded flex items-center justify-center border font-bold text-xs">
                                                {group.color[0]}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-800">{group.productName}</p>
                                                <p className="text-xs text-secondary-600 font-medium uppercase tracking-wider">{group.color}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full text-gray-500 font-bold">
                                                {group.variants.length} Tallas
                                            </span>
                                            <Plus
                                                size={20}
                                                className={`text-primary-600 transition-transform ${selectedGroup?.id === group.id ? 'rotate-45' : ''}`}
                                            />
                                        </div>
                                    </div>

                                    {/* Expandable size entry grid */}
                                    {selectedGroup?.id === group.id && (
                                        <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100 animate-fade-in">
                                            <p className="text-[10px] text-gray-400 font-bold uppercase mb-3 px-1">Indicar cantidades por talla:</p>
                                            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 mb-4">
                                                {group.variants.sort((a: any, b: any) => parseInt(a.size) - parseInt(b.size)).map((v: any) => (
                                                    <div key={v.id} className="flex flex-col gap-1">
                                                        <label className="text-[10px] font-bold text-center text-gray-500">{v.size}</label>
                                                        <input
                                                            type="number"
                                                            placeholder="0"
                                                            className="form-input p-1 text-center text-sm font-bold h-9"
                                                            value={tempQtys[v.id] || ''}
                                                            onChange={(e) => {
                                                                const val = e.target.value === '' ? '' : parseInt(e.target.value)
                                                                setTempQtys(prev => ({ ...prev, [v.id]: val as any }))
                                                            }}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex justify-end pt-2 border-t border-gray-200">
                                                <button
                                                    type="button"
                                                    onClick={addGroupItems}
                                                    disabled={!Object.values(tempQtys).some(q => (q as any) > 0)}
                                                    className="btn-primary py-2 px-4 text-xs flex items-center gap-2"
                                                >
                                                    <Plus size={16} />
                                                    Agregar Seleccionados
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Selected items */}
                    {items.length === 0 ? (
                        <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
                            <ShoppingCart className="mx-auto text-gray-300" size={40} />
                            <p className="text-gray-500 mt-2">Busca y agrega productos</p>
                        </div>
                    ) : (
                        <>
                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Producto</th>
                                            <th>Variante</th>
                                            <th className="text-center">Cantidad</th>
                                            <th className="text-right">Costo Unit.</th>
                                            <th className="text-right">Subtotal</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {displayGroups.map((group: any) => (
                                            <React.Fragment key={group.id}>
                                                <tr className="bg-gray-50/50">
                                                    <td colSpan={6} className="py-2 px-4 border-b">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-gray-800 text-sm">{group.productName}</span>
                                                            <span className="text-[10px] bg-primary-100 text-primary-700 px-2 py-0.5 rounded font-bold uppercase tracking-wider">{group.color}</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                                {group.items.sort((a: any, b: any) => parseInt(a.variant.size) - parseInt(b.variant.size)).map((item: any) => (
                                                    <tr key={item.idx} className="hover:bg-gray-50/30 transition-colors">
                                                        <td className="pl-8 text-gray-400 text-xs italic">Talla {item.variant?.size}</td>
                                                        <td className="text-gray-500 text-xs">{item.variant?.sku || '-'}</td>
                                                        <td>
                                                            <input
                                                                type="number"
                                                                value={item.quantity}
                                                                onChange={(e) => updateItem(item.idx, 'quantity', Number(e.target.value))}
                                                                className="form-input w-20 text-center mx-auto h-8 text-sm"
                                                                min="1"
                                                            />
                                                        </td>
                                                        <td>
                                                            <div className="flex items-center gap-1 max-w-[120px] ml-auto">
                                                                <span className="text-gray-400 text-xs">$</span>
                                                                <input
                                                                    type="number"
                                                                    value={item.unit_cost}
                                                                    onChange={(e) => updateItem(item.idx, 'unit_cost', Number(e.target.value))}
                                                                    className="form-input w-full text-right h-8 text-sm"
                                                                    min="0"
                                                                    step="0.01"
                                                                />
                                                            </div>
                                                        </td>
                                                        <td className="text-right font-medium text-sm text-gray-700">
                                                            ${(item.quantity * item.unit_cost).toLocaleString()}
                                                        </td>
                                                        <td className="text-right">
                                                            <button
                                                                type="button"
                                                                onClick={() => removeItem(item.idx)}
                                                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </React.Fragment>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="border-t-2">
                                            <td colSpan={4} className="text-right font-semibold text-lg">Total:</td>
                                            <td className="text-right font-bold text-xl text-primary-600">
                                                ${total.toLocaleString()}
                                            </td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </>
                    )}
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3">
                    <button type="button" onClick={() => navigate('/purchases')} className="btn-secondary">
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={saveMutation.isPending || items.length === 0 || isLoadingPurchase}
                        className="btn-primary flex items-center gap-2"
                    >
                        {saveMutation.isPending ? (
                            <>
                                <div className="spinner w-4 h-4 border-white/30 border-t-white"></div>
                                Guardando...
                            </>
                        ) : (
                            <>
                                <Save size={20} />
                                {isEditing ? 'Guardar Cambios' : 'Registrar Compra'}
                            </>
                        )}
                    </button>
                </div>
            </form>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl animate-scale-in">
                        <div className="flex items-center gap-3 text-red-600 mb-4">
                            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                                <AlertTriangle size={24} />
                            </div>
                            <h3 className="text-xl font-bold">¿Eliminar Compra?</h3>
                        </div>
                        <p className="text-gray-600 mb-6">
                            Esta acción revertirá el stock de los productos comprados y eliminará definitivamente el registro de la compra y sus pagos asociados. Esta acción no se puede deshacer.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="btn-secondary flex-1"
                                disabled={deleteMutation.isPending}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => deleteMutation.mutate()}
                                className="btn-primary bg-red-600 hover:bg-red-700 flex-1 flex items-center justify-center gap-2"
                                disabled={deleteMutation.isPending}
                            >
                                {deleteMutation.isPending ? (
                                    <>
                                        <div className="spinner w-4 h-4 border-white/30 border-t-white"></div>
                                        Eliminando...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 size={18} />
                                        Confirmar Eliminación
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
