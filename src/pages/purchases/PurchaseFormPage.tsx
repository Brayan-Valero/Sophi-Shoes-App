import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { Supplier, ProductVariant, PurchaseStatus } from '../../types/database'
import { useAuth } from '../../contexts/AuthContext'
import { ArrowLeft, Save, ShoppingCart, Plus, Trash2, Search } from 'lucide-react'

interface PurchaseItemForm {
    product_variant_id: string
    quantity: number
    unit_cost: number
    variant?: ProductVariant & { product?: { name: string } }
}

export default function PurchaseFormPage() {
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const { user } = useAuth()

    const [supplierId, setSupplierId] = useState<string>('')
    const [invoiceNumber, setInvoiceNumber] = useState('')
    const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0])
    const [status, setStatus] = useState<PurchaseStatus>('pendiente')
    const [notes, setNotes] = useState('')
    const [items, setItems] = useState<PurchaseItemForm[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [error, setError] = useState<string | null>(null)

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

    // Filter variants by search
    const filteredVariants = variants.filter(
        (v) =>
            !items.some((item) => item.product_variant_id === v.id) &&
            (v.product?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                v.size.toLowerCase().includes(searchTerm.toLowerCase()) ||
                v.color.toLowerCase().includes(searchTerm.toLowerCase()) ||
                v.sku?.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    // Calculate total
    const total = items.reduce((sum, item) => sum + item.quantity * item.unit_cost, 0)

    // Add item
    const addItem = (variant: ProductVariant & { product?: { name: string } }) => {
        setItems((prev) => [
            ...prev,
            {
                product_variant_id: variant.id,
                quantity: 1,
                unit_cost: variant.cost,
                variant,
            },
        ])
        setSearchTerm('')
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

    // Save mutation
    const saveMutation = useMutation({
        mutationFn: async () => {
            if (!isSupabaseConfigured()) throw new Error('Supabase no configurado')
            if (items.length === 0) throw new Error('Agrega al menos un producto')

            // Create purchase
            const { data: purchase, error: purchaseError } = await supabase
                .from('purchases')
                .insert({
                    supplier_id: supplierId || null,
                    invoice_number: invoiceNumber || null,
                    purchase_date: purchaseDate,
                    total_amount: total,
                    status,
                    notes: notes || null,
                    created_by: user?.id,
                })
                .select('id')
                .single()

            if (purchaseError) throw purchaseError

            // Create purchase items
            const purchaseItems = items.map((item) => ({
                purchase_id: purchase.id,
                product_variant_id: item.product_variant_id,
                quantity: item.quantity,
                unit_cost: item.unit_cost,
                subtotal: item.quantity * item.unit_cost,
            }))

            const { error: itemsError } = await supabase
                .from('purchase_items')
                .insert(purchaseItems)

            if (itemsError) throw itemsError

            // Update inventory (increase stock)
            for (const item of items) {
                // Get current stock
                const { data: variant } = await supabase
                    .from('product_variants')
                    .select('stock')
                    .eq('id', item.product_variant_id)
                    .single()

                if (variant) {
                    // Update stock
                    await supabase
                        .from('product_variants')
                        .update({
                            stock: variant.stock + item.quantity,
                            updated_at: new Date().toISOString(),
                        })
                        .eq('id', item.product_variant_id)

                    // Record movement
                    await supabase.from('inventory_movements').insert({
                        product_variant_id: item.product_variant_id,
                        movement_type: 'compra',
                        quantity: item.quantity,
                        reference_id: purchase.id,
                        reference_type: 'purchase',
                        created_by: user?.id,
                    })
                }
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['purchases'] })
            queryClient.invalidateQueries({ queryKey: ['products'] })
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
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/purchases')}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <ArrowLeft size={24} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Nueva Compra</h1>
                    <p className="text-gray-500">Registra una factura de compra y actualiza el inventario</p>
                </div>
            </div>

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
                            <label className="form-label">Estado de Pago</label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value as PurchaseStatus)}
                                className="form-select"
                            >
                                <option value="pendiente">Pendiente</option>
                                <option value="pagada">Pagada</option>
                            </select>
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

                    {/* Search results */}
                    {searchTerm && filteredVariants.length > 0 && (
                        <div className="mb-4 max-h-48 overflow-y-auto border rounded-lg">
                            {filteredVariants.slice(0, 10).map((variant) => (
                                <button
                                    key={variant.id}
                                    type="button"
                                    onClick={() => addItem(variant)}
                                    className="w-full p-3 text-left hover:bg-gray-50 border-b last:border-b-0 flex justify-between items-center"
                                >
                                    <div>
                                        <span className="font-medium">{variant.product?.name}</span>
                                        <span className="text-gray-500 ml-2">
                                            {variant.size} - {variant.color}
                                        </span>
                                        {variant.sku && (
                                            <span className="text-gray-400 ml-2 text-sm">({variant.sku})</span>
                                        )}
                                    </div>
                                    <Plus size={20} className="text-primary-600" />
                                </button>
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
                                        {items.map((item, index) => (
                                            <tr key={index}>
                                                <td className="font-medium">{item.variant?.product?.name}</td>
                                                <td>
                                                    {item.variant?.size} - {item.variant?.color}
                                                </td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        value={item.quantity}
                                                        onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                                                        className="form-input w-20 text-center mx-auto"
                                                        min="1"
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        value={item.unit_cost}
                                                        onChange={(e) => updateItem(index, 'unit_cost', Number(e.target.value))}
                                                        className="form-input w-28 text-right ml-auto"
                                                        min="0"
                                                        step="0.01"
                                                    />
                                                </td>
                                                <td className="text-right font-medium">
                                                    ${(item.quantity * item.unit_cost).toLocaleString()}
                                                </td>
                                                <td>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeItem(index)}
                                                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </td>
                                            </tr>
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
                        disabled={saveMutation.isPending || items.length === 0}
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
                                Registrar Compra
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    )
}
