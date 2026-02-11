import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { Supplier, Purchase } from '../../types/database'
import { X, DollarSign, History, Trash2, ShoppingBag, ArrowDownLeft } from 'lucide-react'
import SupplierPaymentModal from './SupplierPaymentModal'

interface SupplierDebtsModalProps {
    supplier: Supplier
    onClose: () => void
}

export default function SupplierDebtsModal({ supplier, onClose }: SupplierDebtsModalProps) {
    const [showPaymentModal, setShowPaymentModal] = useState(false)
    const queryClient = useQueryClient()

    // 1. Fetch ALL purchases for this supplier
    const { data: purchases = [], isLoading: isLoadingPurchases } = useQuery({
        queryKey: ['supplier-purchases-all', supplier.id],
        queryFn: async () => {
            if (!isSupabaseConfigured()) return []
            const { data, error } = await supabase
                .from('purchases')
                .select('*')
                .eq('supplier_id', supplier.id)
                .order('purchase_date', { ascending: false })

            if (error) throw error
            return data as Purchase[]
        }
    })

    // 2. Fetch ALL payments for this supplier
    const { data: payments = [], isLoading: isLoadingPayments } = useQuery({
        queryKey: ['supplier-payments-all', supplier.id],
        queryFn: async () => {
            if (!isSupabaseConfigured()) return []
            const { data, error } = await supabase
                .from('purchase_payments')
                .select(`
                    *,
                    purchase:purchases(invoice_number)
                `)
                .eq('supplier_id', supplier.id)
                .order('payment_date', { ascending: false })

            if (error) throw error
            return data as any[]
        }
    })

    // Delete payment mutation
    const deletePaymentMutation = useMutation({
        mutationFn: async (payment: any) => {
            const { error } = await supabase
                .from('purchase_payments')
                .delete()
                .eq('id', payment.id)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['supplier-payments-all'] })
            queryClient.invalidateQueries({ queryKey: ['suppliers'] })
        }
    })

    // Calculations for the Ledger
    const totalPurchased = purchases.reduce((sum, p) => sum + (p.total_amount || 0), 0)
    const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0)
    const currentBalance = Math.max(0, totalPurchased - totalPaid)

    // Combine and sort for a unified ledger view
    const ledgerMovements = [
        ...purchases.map(p => ({
            id: p.id,
            date: p.purchase_date,
            type: 'purchase',
            amount: p.total_amount,
            reference: p.invoice_number,
            notes: p.notes,
            created_at: p.created_at
        })),
        ...payments.map(p => ({
            id: p.id,
            date: p.payment_date || p.created_at,
            type: 'payment',
            amount: p.amount,
            reference: p.purchase?.invoice_number || 'Abono',
            notes: p.notes,
            created_at: p.created_at,
            raw: p
        }))
    ].sort((a, b) => new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime())

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 p-2 sm:p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden animate-fade-in flex flex-col h-full max-h-[95vh]">
                {/* Header */}
                <div className="p-4 border-b flex items-center justify-between bg-gray-50 flex-shrink-0">
                    <div>
                        <h3 className="font-bold text-gray-800 flex items-center gap-2 text-lg">
                            <Building2 size={24} className="text-primary-600" />
                            Estado de Cuenta: {supplier.name}
                        </h3>
                        <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest leading-none mt-1">Ledger Global • Sin balance individual por factura</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Ledger Summary Card */}
                <div className="p-6 bg-white flex-shrink-0">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Comprado</p>
                            <p className="text-2xl font-black text-gray-700">${totalPurchased.toLocaleString()}</p>
                        </div>
                        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Total Abonado</p>
                            <p className="text-2xl font-black text-emerald-700">${totalPaid.toLocaleString()}</p>
                        </div>
                        <div className={`p-4 rounded-2xl border shadow-lg shadow-gray-200/50 ${currentBalance > 0 ? 'bg-red-50 border-red-100' : 'bg-emerald-100 border-emerald-200'}`}>
                            <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${currentBalance > 0 ? 'text-red-600' : 'text-emerald-700'}`}>Saldo Deudor Actual</p>
                            <p className={`text-3xl font-black ${currentBalance > 0 ? 'text-red-700' : 'text-emerald-800'}`}>${currentBalance.toLocaleString()}</p>
                        </div>
                    </div>

                    <div className="mt-6 flex flex-col sm:flex-row gap-3">
                        <button
                            onClick={() => setShowPaymentModal(true)}
                            className="flex-1 btn-primary-glow bg-emerald-600 hover:bg-emerald-700 h-14 rounded-xl flex items-center justify-center gap-3 font-black text-xl shadow-xl shadow-emerald-900/20"
                        >
                            <DollarSign size={24} />
                            REGISTRAR ABONO A CUENTA
                        </button>
                    </div>
                </div>

                <div className="px-6 py-2 border-y bg-gray-50 flex items-center justify-between">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Historial de Movimientos</span>
                    <span className="text-[10px] font-bold text-gray-400 italic">Ordenado por fecha (últimos 50)</span>
                </div>

                {/* Ledger Body */}
                <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
                    {isLoadingPurchases || isLoadingPayments ? (
                        <div className="py-20 text-center">
                            <div className="spinner mx-auto mb-4"></div>
                            <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Calculando Ledger...</p>
                        </div>
                    ) : ledgerMovements.length === 0 ? (
                        <div className="py-20 text-center opacity-40">
                            <History size={48} className="mx-auto mb-4 text-gray-300" />
                            <p className="font-black text-gray-400 uppercase text-xs">No hay movimientos registrados</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {ledgerMovements.map((m: any, idx: number) => (
                                <div key={`${m.type}-${m.id}-${idx}`} className={`group p-4 rounded-2xl border transition-all flex items-center justify-between ${m.type === 'purchase' ? 'bg-white border-gray-100' : 'bg-emerald-50/30 border-emerald-100'}`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${m.type === 'purchase' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                            {m.type === 'purchase' ? <ShoppingBag size={20} /> : <ArrowDownLeft size={24} />}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">
                                                    {m.type === 'purchase' ? 'Compra' : 'Abono'} • {m.date}
                                                </p>
                                            </div>
                                            <p className={`text-lg font-black mt-1 ${m.type === 'purchase' ? 'text-gray-800' : 'text-emerald-700'}`}>
                                                {m.type === 'purchase' ? '' : '-'}${m.amount.toLocaleString()}
                                            </p>
                                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">Ref: {m.reference}</p>
                                            {m.notes && <p className="text-[10px] text-gray-400 italic mt-1 line-clamp-1">{m.notes}</p>}
                                        </div>
                                    </div>

                                    {m.type === 'payment' && (
                                        <button
                                            onClick={() => {
                                                if (confirm('¿Eliminar este abono? El saldo deudor aumentará.')) {
                                                    deletePaymentMutation.mutate(m.raw)
                                                }
                                            }}
                                            className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
                    <button onClick={onClose} className="btn-secondary h-12 px-8 font-black uppercase text-xs tracking-widest">
                        Cerrar Ledger
                    </button>
                </div>
            </div>

            {showPaymentModal && (
                <SupplierPaymentModal
                    supplier={supplier}
                    totalDebt={currentBalance}
                    onClose={() => {
                        setShowPaymentModal(false)
                        queryClient.invalidateQueries({ queryKey: ['supplier-purchases-all'] })
                        queryClient.invalidateQueries({ queryKey: ['supplier-payments-all'] })
                        queryClient.invalidateQueries({ queryKey: ['suppliers'] })
                    }}
                />
            )}
        </div>
    )
}

function Building2({ size, className }: { size: number, className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
            <path d="M9 22v-4h6v4" />
            <path d="M8 6h.01" />
            <path d="M16 6h.01" />
            <path d="M8 10h.01" />
            <path d="M16 10h.01" />
        </svg>
    )
}
