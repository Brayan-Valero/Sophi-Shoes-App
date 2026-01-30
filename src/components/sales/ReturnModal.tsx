import { useState } from 'react'
import { X, RotateCcw, Check, AlertTriangle } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { Sale } from '../../types/database'

interface ReturnModalProps {
    sale: Sale | null
    onClose: () => void
}

export default function ReturnModal({ sale, onClose }: ReturnModalProps) {
    const queryClient = useQueryClient()
    const [selectedItems, setSelectedItems] = useState<Record<string, number>>({})
    const [reason, setReason] = useState('')
    const [restock, setRestock] = useState(true)


    if (!sale) return null

    const handleQuantityChange = (itemId: string, max: number, value: string) => {
        const qty = parseInt(value) || 0
        if (qty < 0) return
        if (qty > max) return // Enforce max

        setSelectedItems(prev => ({
            ...prev,
            [itemId]: qty
        }))
    }

    const totalRefund = sale.items?.reduce((sum, item) => {
        const qty = selectedItems[item.id] || 0
        return sum + (item.unit_price * qty)
    }, 0) || 0

    const returnMutation = useMutation({
        mutationFn: async () => {
            if (!sale.items) return

            const itemsToReturn = sale.items.filter(item => (selectedItems[item.id] || 0) > 0)
            if (itemsToReturn.length === 0) throw new Error("Seleccione productos a devolver")

            // 1. Create Return Record
            const { data: returnRecord, error: returnError } = await supabase
                .from('returns')
                .insert({
                    sale_id: sale.id,
                    reason,
                    refund_amount: totalRefund,
                    status: 'completado'
                })
                .select()
                .single()

            if (returnError) throw returnError

            // 2. Create Return Items & Update Inventory
            for (const item of itemsToReturn) {
                const qty = selectedItems[item.id]

                // Add to return_items
                await supabase.from('return_items').insert({
                    return_id: returnRecord.id,
                    product_variant_id: item.product_variant_id,
                    quantity: qty
                })

                // Restock if requested
                if (restock) {
                    // Get current stock
                    const { data: variant } = await supabase
                        .from('product_variants')
                        .select('stock')
                        .eq('id', item.product_variant_id)
                        .single()

                    if (variant) {
                        await supabase
                            .from('product_variants')
                            .update({ stock: variant.stock + qty })
                            .eq('id', item.product_variant_id)

                        await supabase.from('inventory_movements').insert({
                            product_variant_id: item.product_variant_id,
                            movement_type: 'devolucion',
                            quantity: qty,
                            reference_id: returnRecord.id,
                            reference_type: 'return',
                            notes: `Devolución venta #${sale.id.slice(0, 8)}`
                        })
                    }
                }
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sales'] })
            queryClient.invalidateQueries({ queryKey: ['product-variants-for-sale'] })
            onClose()
        }
    })

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-fade-in">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <RotateCcw size={20} className="text-orange-500" />
                        Devolver Productos
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 flex gap-2 text-sm text-orange-800">
                        <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                        <p>Seleccione las cantidades a devolver. Esta acción no se puede deshacer.</p>
                    </div>

                    <div className="max-h-60 overflow-y-auto border rounded-lg">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-gray-500 text-xs uppercase sticky top-0">
                                <tr>
                                    <th className="p-2 text-left">Producto</th>
                                    <th className="p-2 text-right">Comprado</th>
                                    <th className="p-2 text-right">Devolver</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {sale.items?.map((item: any) => (
                                    <tr key={item.id}>
                                        <td className="p-2">
                                            <p className="font-medium">{item.product_variant?.product?.name}</p>
                                            <p className="text-xs text-gray-500">{item.product_variant?.size} / {item.product_variant?.color}</p>
                                        </td>
                                        <td className="p-2 text-right text-gray-500">{item.quantity}</td>
                                        <td className="p-2 text-right">
                                            <input
                                                type="number"
                                                min="0"
                                                max={item.quantity}
                                                className="w-16 p-1 border rounded text-right"
                                                value={selectedItems[item.id] || ''}
                                                onChange={(e) => handleQuantityChange(item.id, item.quantity, e.target.value)}
                                                placeholder="0"
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Motivo de la devolución</label>
                        <textarea
                            className="form-input text-sm"
                            rows={2}
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            placeholder="Ej: Talla incorrecta, producto defectuoso..."
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="restock"
                            checked={restock}
                            onChange={e => setRestock(e.target.checked)}
                            className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                        />
                        <label htmlFor="restock" className="text-sm text-gray-700">
                            Devolver al inventario (Restock)
                        </label>
                    </div>
                </div>

                <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
                    <div>
                        <p className="text-xs text-gray-500">Total a Reembolsar</p>
                        <p className="text-xl font-bold text-gray-800">${totalRefund.toLocaleString()}</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg text-sm font-medium">
                            Cancelar
                        </button>
                        <button
                            onClick={() => returnMutation.mutate()}
                            disabled={returnMutation.isPending || totalRefund === 0}
                            className="btn-primary bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {returnMutation.isPending ? 'Procesando...' : <><Check size={16} /> Confirmar Devolución</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
