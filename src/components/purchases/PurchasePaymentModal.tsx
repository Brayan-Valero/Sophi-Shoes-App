import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { Purchase, PurchasePaymentInsert } from '../../types/database'
import { useAuth } from '../../contexts/AuthContext'
import { X, Save, DollarSign } from 'lucide-react'

interface PurchasePaymentModalProps {
    purchase: Purchase
    onClose: () => void
}

export default function PurchasePaymentModal({ purchase, onClose }: PurchasePaymentModalProps) {
    const queryClient = useQueryClient()
    const { user } = useAuth()
    const [amount, setAmount] = useState<number>(0)
    const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'tarjeta' | 'transferencia' | 'otro'>('efectivo')
    const [notes, setNotes] = useState('')
    const [error, setError] = useState<string | null>(null)

    const pendingBalance = purchase.total_amount - (purchase.paid_amount || 0)

    const paymentMutation = useMutation({
        mutationFn: async () => {
            if (!isSupabaseConfigured()) throw new Error('Supabase no configurado')
            if (amount <= 0) throw new Error('El monto debe ser mayor a 0')
            if (amount > pendingBalance) throw new Error('El monto no puede superar el saldo pendiente')

            // 1. Insert payment record
            const paymentData: PurchasePaymentInsert = {
                purchase_id: purchase.id,
                amount: amount,
                payment_date: new Date().toISOString().split('T')[0],
                payment_method: paymentMethod,
                notes: notes || 'Abono registrado',
                created_by: user?.id || null
            }

            const { error: pError } = await supabase
                .from('purchase_payments')
                .insert(paymentData)

            if (pError) throw pError

            // 2. Update purchase paid_amount and status
            const newPaidAmount = (purchase.paid_amount || 0) + amount
            const newStatus = newPaidAmount >= purchase.total_amount ? 'pagada' : 'pendiente'

            const { error: uError } = await supabase
                .from('purchases')
                .update({
                    paid_amount: newPaidAmount,
                    status: newStatus,
                    updated_at: new Date().toISOString()
                })
                .eq('id', purchase.id)

            if (uError) throw uError
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['purchases'] })
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
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in">
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
                    <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 mb-2">
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-emerald-700">Total Factura:</span>
                            <span className="font-bold text-emerald-800">${purchase.total_amount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-emerald-700">Pagado:</span>
                            <span className="font-bold text-emerald-800">${(purchase.paid_amount || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-base pt-2 border-t border-emerald-200 mt-1">
                            <span className="font-bold text-emerald-900">Saldo Pendiente:</span>
                            <span className="font-extrabold text-emerald-900">${pendingBalance.toLocaleString()}</span>
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
                            {error}
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label">Monto del Abono *</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(Number(e.target.value))}
                                className="form-input pl-8 font-bold text-lg"
                                min="1"
                                max={pendingBalance}
                                required
                                autoFocus
                            />
                        </div>
                        <div className="flex gap-2 mt-2">
                            <button
                                type="button"
                                onClick={() => setAmount(pendingBalance)}
                                className="text-[10px] bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded font-bold transition-colors"
                            >
                                Pagar Saldo Total
                            </button>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Método de Pago</label>
                        <select
                            value={paymentMethod}
                            onChange={(e: any) => setPaymentMethod(e.target.value)}
                            className="form-select"
                        >
                            <option value="efectivo">Efectivo</option>
                            <option value="tarjeta">Tarjeta</option>
                            <option value="transferencia">Transferencia</option>
                            <option value="otro">Otro</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Notas (Opcional)</label>
                        <input
                            type="text"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="form-input"
                            placeholder="Ej: Pago con transferencia Nequi"
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 btn-secondary"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={paymentMutation.isPending || amount <= 0}
                            className="flex-1 btn-primary flex items-center justify-center gap-2"
                        >
                            {paymentMutation.isPending ? (
                                <div className="spinner w-4 h-4 border-white/30 border-t-white"></div>
                            ) : (
                                <Save size={18} />
                            )}
                            Guardar Pago
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
