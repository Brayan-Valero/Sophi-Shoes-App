import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { Supplier } from '../../types/database'
import { useAuth } from '../../contexts/AuthContext'
import { X, Save, DollarSign, AlertCircle } from 'lucide-react'

interface SupplierPaymentModalProps {
    supplier: Supplier
    totalDebt: number
    onClose: () => void
}

export default function SupplierPaymentModal({ supplier, totalDebt, onClose }: SupplierPaymentModalProps) {
    const queryClient = useQueryClient()
    const { user } = useAuth()
    const [amount, setAmount] = useState<number>(0)
    const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'tarjeta' | 'transferencia' | 'otro'>('efectivo')
    const [notes, setNotes] = useState('')
    const [error, setError] = useState<string | null>(null)


    const paymentMutation = useMutation({
        mutationFn: async () => {
            if (!isSupabaseConfigured()) throw new Error('Supabase no configurado')
            if (amount <= 0) throw new Error('El monto debe ser mayor a 0')

            // 1. Insert ONE Global Payment Record (linked to supplier)
            // This decouples the payment from specific purchases at the database level
            const { error: payError } = await supabase.from('purchase_payments').insert({
                supplier_id: supplier.id,
                purchase_id: null, // Global payment, no specific purchase mandatory
                amount: amount,
                payment_date: new Date().toISOString().split('T')[0],
                payment_method: paymentMethod,
                notes: notes || `Abono a cuenta global`,
                created_by: user?.id || null
            })

            if (payError) throw payError

            // 2. Background Sync: Distribute paid_amount to purchases (FIFO)
            // This maintains legacy compatibility where each purchase has a paid_amount
            const { data: pendingPurchases } = await supabase
                .from('purchases')
                .select('*')
                .eq('supplier_id', supplier.id)
                .lt('paid_amount', supabase.raw('total_amount'))
                .order('purchase_date', { ascending: true })

            let remainingToDistribute = amount

            if (pendingPurchases && pendingPurchases.length > 0) {
                for (const purchase of pendingPurchases) {
                    if (remainingToDistribute <= 0) break

                    const currentPaid = purchase.paid_amount || 0
                    const total = purchase.total_amount
                    const stillPending = Math.max(0, total - currentPaid)

                    if (stillPending <= 0) continue

                    const paymentForThisPurchase = Math.min(remainingToDistribute, stillPending)
                    const newPaidAmount = currentPaid + paymentForThisPurchase
                    const newStatus = newPaidAmount >= total ? 'pagada' : 'pendiente'

                    // Update header only
                    await supabase
                        .from('purchases')
                        .update({
                            paid_amount: newPaidAmount,
                            status: newStatus,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', purchase.id)

                    remainingToDistribute -= paymentForThisPurchase
                }
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['suppliers'] })
            queryClient.invalidateQueries({ queryKey: ['purchases'] })
            queryClient.invalidateQueries({ queryKey: ['pending-purchases'] })
            queryClient.invalidateQueries({ queryKey: ['purchase-payments-supplier'] })
            queryClient.invalidateQueries({ queryKey: ['supplier-purchases-all', supplier.id] })
            queryClient.invalidateQueries({ queryKey: ['supplier-payments-all', supplier.id] })
            onClose()
        },
        onError: (err: Error) => {
            setError(err.message)
        }
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        paymentMutation.mutate()
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-scale-in">
                <div className="p-4 border-b flex items-center justify-between bg-gray-50">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <DollarSign size={20} className="text-emerald-600" />
                        Registrar Abono
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-lg transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 mb-2 text-center">
                        <p className="text-xs text-emerald-600 font-bold uppercase mb-1">Deuda Actualmente Registrada</p>
                        <p className="text-3xl font-black text-emerald-900">${totalDebt.toLocaleString()}</p>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-2">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label font-black text-gray-700 uppercase text-[10px] tracking-wider">¿Cuánto deseas abonar hoy? *</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600 font-black text-xl">$</span>
                            <input
                                type="number"
                                value={amount || ''}
                                onChange={(e) => setAmount(Math.abs(Number(e.target.value)))}
                                className="form-input pl-8 font-black text-2xl text-emerald-700 bg-emerald-50/30 border-emerald-200"
                                required
                                autoFocus
                                placeholder="0"
                                min="1"
                                step="any"
                            />
                        </div>
                        <div className="flex gap-2 mt-2">
                            <button
                                type="button"
                                onClick={() => setAmount(totalDebt)}
                                className="text-[10px] bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg font-black transition-colors uppercase tracking-widest text-gray-600"
                            >
                                Liquidar Deuda Total
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <label className="form-label text-[10px] font-black uppercase text-gray-500">Método</label>
                            <select
                                value={paymentMethod}
                                onChange={(e: any) => setPaymentMethod(e.target.value)}
                                className="form-select text-sm h-10"
                            >
                                <option value="efectivo">Efectivo</option>
                                <option value="transferencia">Transferencia</option>
                                <option value="tarjeta">Tarjeta</option>
                                <option value="otro">Otro</option>
                            </select>
                        </div>
                        <div className="flex-[2]">
                            <label className="form-label text-[10px] font-black uppercase text-gray-500">Nota corta</label>
                            <input
                                type="text"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="form-input text-sm h-10"
                                placeholder="Ejem: Abono semanal"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-6 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 btn-secondary h-12 font-bold"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={paymentMutation.isPending || amount <= 0}
                            className="flex-1 btn-primary bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center gap-2 h-12 font-black shadow-lg shadow-emerald-900/20"
                        >
                            {paymentMutation.isPending ? (
                                <div className="spinner w-5 h-5 border-white/30 border-t-white"></div>
                            ) : (
                                <>
                                    <Save size={18} />
                                    REGISTRAR PAGO
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
