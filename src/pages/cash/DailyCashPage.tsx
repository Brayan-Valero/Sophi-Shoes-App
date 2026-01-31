import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { Sale, PaymentMethod } from '../../types/database'
import { DollarSign, CreditCard, Banknote, Smartphone, Calendar, Lock, Unlock } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import CashOpenModal from '../../components/cash/CashOpenModal'
import ExpenseModal from '../../components/cash/ExpenseModal'

interface CashRegister {
    id: string
    opening_amount: number
    closing_amount: number | null
    expected_amount: number | null
    status: 'open' | 'closed'
    opened_at: string
    notes: string | null
}

interface Expense {
    id: string
    description: string
    amount: number
    category: string
    expense_date: string
}


export default function DailyCashPage() {
    const { user } = useAuth()
    const queryClient = useQueryClient()
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
    const [isDataOpen, setIsDataOpen] = useState(false) // For modal
    const [isExpenseOpen, setIsExpenseOpen] = useState(false)
    const [statusMessage, setStatusMessage] = useState<string | null>(null)


    // Check if there is an open register for today
    const { data: currentRegister, isLoading: isLoadingRegister } = useQuery({
        queryKey: ['cash-register', 'current'],
        queryFn: async () => {
            if (!isSupabaseConfigured()) return null
            const { data } = await supabase
                .from('cash_registers')
                .select('*')
                .eq('status', 'open')
                .single()

            // If error, it might mean no row found (which is fine)
            return data as CashRegister | null
        },
        retry: false
    })

    // Fetch sales for selected date
    const { data: sales = [], isLoading: isLoadingSales } = useQuery({
        queryKey: ['daily-cash', selectedDate],
        queryFn: async () => {
            if (!isSupabaseConfigured()) return []

            const { data, error } = await supabase
                .from('sales')
                .select('*')
                .gte('sale_date', selectedDate)
                .lte('sale_date', selectedDate)
                .order('created_at', { ascending: false })

            if (error) throw error
            return data as Sale[]
        },
    })

    // Fetch expenses
    const { data: expenses = [] } = useQuery({
        queryKey: ['expenses', selectedDate],
        queryFn: async () => {
            if (!isSupabaseConfigured()) return []
            const { data } = await supabase
                .from('expenses')
                .select('*')
                .gte('expense_date', selectedDate) // Simplification: filtering by date string match on ISO?
                // Ideally use gte/lte with timestamps. For now assume date matching works or improve.
                // Better:
                .gte('expense_date', `${selectedDate}T00:00:00`)
                .lte('expense_date', `${selectedDate}T23:59:59`)

            return (data || []) as Expense[]
        }
    })

    // Actions
    const openRegisterMutation = useMutation({

        mutationFn: async ({ amount, notes }: { amount: number, notes: string }) => {
            if (!user) throw new Error('No user')
            const { error } = await supabase.from('cash_registers').insert({
                opening_amount: amount,
                notes: notes || null,
                opened_by: user.id,
                status: 'open'
            })
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cash-register'] })
            setStatusMessage('Caja abierta correctamente')
            setTimeout(() => setStatusMessage(null), 3000)
        }
    })

    const closeRegisterMutation = useMutation({
        mutationFn: async (id: string) => {
            // Calculate expected amount (Opening + Cash Sales - Expenses)
            const cashSales = sales
                .filter(s => s.payment_method === 'efectivo')
                .reduce((sum, s) => sum + s.total_amount, 0)

            const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)

            const expected = (currentRegister?.opening_amount || 0) + cashSales - totalExpenses

            const { error } = await supabase.from('cash_registers').update({
                status: 'closed',
                closing_amount: expected, // Auto-close with expected for MVP
                expected_amount: expected,
                closed_at: new Date().toISOString()
            }).eq('id', id)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cash-register'] })
            setStatusMessage('Caja cerrada correctamente')
            setTimeout(() => setStatusMessage(null), 3000)
        }
    })

    const addExpenseMutation = useMutation({
        mutationFn: async ({ description, amount, category }: { description: string, amount: number, category: string }) => {
            if (!user) return
            const { error } = await supabase.from('expenses').insert({
                description,
                amount,
                category,
                user_id: user.id,
                cash_register_id: currentRegister?.id,
                expense_date: new Date().toISOString()
            })
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] })
            setStatusMessage('Gasto registrado')
            setTimeout(() => setStatusMessage(null), 3000)
        }
    })

    // Calculate totals
    const totalSales = sales.reduce((sum, sale) => sum + sale.total_amount, 0)
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)

    const totalDiscount = sales.reduce((sum, sale) => sum + (sale.discount_amount || 0), 0)

    // Detailed payment methods
    const byPaymentMethod: Record<string, number> = {
        efectivo: sales.filter((s) => s.payment_method === 'efectivo').reduce((sum, s) => sum + s.total_amount, 0),
        tarjeta: sales.filter((s) => s.payment_method === 'tarjeta').reduce((sum, s) => sum + s.total_amount, 0),
        transferencia: sales.filter((s) => s.payment_method === 'transferencia').reduce((sum, s) => sum + s.total_amount, 0),
        mixto: sales.filter((s) => s.payment_method === 'mixto').reduce((sum, s) => sum + s.total_amount, 0),
        dropi: sales.filter((s) => s.payment_method === 'dropi').reduce((sum, s) => sum + s.total_amount, 0),
        contraentrega: sales.filter((s) => s.payment_method === 'contraentrega').reduce((sum, s) => sum + s.total_amount, 0),
    }

    const totalCashInDrawer = (currentRegister?.opening_amount || 0) + (byPaymentMethod.efectivo || 0) - totalExpenses

    const paymentMethodInfo: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
        efectivo: { label: 'Efectivo', icon: <Banknote size={24} />, color: 'bg-green-100 text-green-600' },
        tarjeta: { label: 'Tarjeta', icon: <CreditCard size={24} />, color: 'bg-blue-100 text-blue-600' },
        transferencia: { label: 'Transferencia', icon: <Smartphone size={24} />, color: 'bg-purple-100 text-purple-600' },
        mixto: { label: 'Mixto', icon: <DollarSign size={24} />, color: 'bg-orange-100 text-orange-600' },
        dropi: { label: 'Dropi', icon: <Smartphone size={24} />, color: 'bg-indigo-100 text-indigo-600' },
        contraentrega: { label: 'Contraentrega', icon: <Smartphone size={24} />, color: 'bg-indigo-100 text-indigo-600' },
    }

    const formatDate = (date: string) => {
        return new Date(date + 'T12:00:00').toLocaleDateString('es-CO', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        })
    }

    const formatTime = (date: string) => {
        return new Date(date).toLocaleTimeString('es-CO', {
            hour: '2-digit', minute: '2-digit',
        })
    }

    if (isLoadingRegister || isLoadingSales) {
        return (
            <div className="flex h-96 items-center justify-center">
                <div className="spinner w-8 h-8 border-primary-500 border-t-transparent"></div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <CashOpenModal
                isOpen={isDataOpen}
                onClose={() => setIsDataOpen(false)}
                onOpen={async (amount, notes) => {
                    await openRegisterMutation.mutateAsync({ amount, notes })
                }}
            />

            <ExpenseModal
                isOpen={isExpenseOpen}
                onClose={() => setIsExpenseOpen(false)}
                onSave={async (desc, amount, cat) => {
                    await addExpenseMutation.mutateAsync({ description: desc, amount, category: cat })
                }}
            />

            {/* Header */}

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Caja Diaria</h1>
                    <p className="text-gray-500">Resumen y Control de Caja</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <Calendar size={20} className="text-gray-400" />
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="form-input w-auto h-10"
                        />
                    </div>
                </div>
            </div>

            {/* Status Notifications */}
            {statusMessage && (
                <div className="bg-green-100 border border-green-200 text-green-700 px-4 py-3 rounded-lg animate-fade-in">
                    {statusMessage}
                </div>
            )}

            {/* Cash Control Block */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 1. Register Status */}
                <div className={`card border-l-4 ${currentRegister ? 'border-l-green-500' : 'border-l-red-500'}`}>
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Estado de Caja</p>
                            <h3 className={`text-2xl font-bold mt-1 ${currentRegister ? 'text-green-600' : 'text-red-500'}`}>
                                {currentRegister ? 'ABIERTA' : 'CERRADA'}
                            </h3>
                            {currentRegister && (
                                <p className="text-xs text-gray-400 mt-1">
                                    Abierta a las {formatTime(currentRegister.opened_at)}
                                </p>
                            )}
                        </div>
                        <div className={`p-2 rounded-full ${currentRegister ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
                            {currentRegister ? <Unlock size={24} /> : <Lock size={24} />}
                        </div>
                    </div>
                    <div className="mt-4">
                        {currentRegister ? (
                            <button
                                onClick={() => closeRegisterMutation.mutate(currentRegister.id)}
                                disabled={closeRegisterMutation.isPending}
                                className="btn-secondary w-full text-sm py-1.5"
                            >
                                {closeRegisterMutation.isPending ? 'Cerrando...' : 'Cerrar Caja'}
                            </button>
                        ) : (
                            <button
                                onClick={() => setIsDataOpen(true)}
                                className="btn-primary w-full text-sm py-1.5"
                            >
                                Abrir Caja
                            </button>
                        )}
                        <div className="mt-2 text-center">
                            <button
                                onClick={() => setIsExpenseOpen(true)}
                                disabled={!currentRegister}
                                className="text-xs text-red-600 font-medium hover:underline disabled:opacity-50 disabled:no-underline"
                            >
                                Registrar Salida / Gasto
                            </button>
                        </div>
                    </div>
                </div>

                {/* 2. Opening Amount */}
                <div className="card">
                    <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Base Inicial</p>
                    <h3 className="text-2xl font-bold text-gray-800 mt-1">
                        ${(currentRegister?.opening_amount || 0).toLocaleString()}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">Dinero al inicio del turno</p>
                </div>

                {/* 3. Expected in Drawer */}
                <div className="card bg-gray-900 text-white relative overflow-hidden">
                    <div className="relative z-10">
                        <p className="text-gray-400 text-sm font-medium uppercase tracking-wider">Dinero en Caja</p>
                        <h3 className="text-3xl font-bold text-white mt-1">
                            ${totalCashInDrawer.toLocaleString()}
                        </h3>
                        <p className="text-xs text-gray-400 mt-1">
                            Base + Ventas - Gastos
                        </p>
                    </div>
                    {totalExpenses > 0 && (
                        <div className="absolute right-0 top-0 p-3">
                            <div className="text-right">
                                <p className="text-red-400 text-xs font-bold uppercase">Gastos</p>
                                <p className="text-red-400 font-bold">-${totalExpenses.toLocaleString()}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Sales Summary */}
            <div className="card bg-gradient-to-r from-primary-600 to-primary-700 text-white">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <p className="text-primary-100 capitalize">{formatDate(selectedDate)}</p>
                        <p className="text-4xl font-bold mt-2">${totalSales.toLocaleString()}</p>
                        <p className="text-primary-100 mt-1">
                            {sales.length} {sales.length === 1 ? 'venta' : 'ventas'}
                            {totalDiscount > 0 && ` • $${totalDiscount.toLocaleString()} en descuentos`}
                        </p>
                    </div>
                    <div className="bg-white/10 px-4 py-2 rounded-lg text-center backdrop-blur-sm">
                        <p className="text-xs uppercase tracking-wider mb-1">Total Calculado</p>
                        <p className="text-xl font-bold">${totalSales.toLocaleString()}</p>
                    </div>
                </div>
            </div>

            {/* Payment Methods Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {(Object.keys(byPaymentMethod) as PaymentMethod[]).map((method) => {
                    const info = paymentMethodInfo[method]
                    const amount = byPaymentMethod[method]
                    const count = sales.filter((s) => s.payment_method === method).length

                    return (
                        <div key={method} className="card">
                            <div className="flex items-center gap-3">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${info.color}`}>
                                    {info.icon}
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">{info.label}</p>
                                    <p className="text-xl font-bold text-gray-800">
                                        ${amount.toLocaleString()}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        {count} ventas
                                    </p>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Recent Sales List */}
            {sales.length > 0 && (
                <div className="card">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4 px-2">Detalle de Movimientos</h2>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Hora</th>
                                    <th>Forma de Pago</th>
                                    <th className="text-right">Descuento</th>
                                    <th className="text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sales.map((sale) => (
                                    <tr key={sale.id}>
                                        <td className="font-medium">{formatTime(sale.created_at)}</td>
                                        <td>
                                            <span className={`badge ${sale.payment_method === 'efectivo' ? 'badge-success' :
                                                sale.payment_method === 'tarjeta' ? 'badge-info' :
                                                    sale.payment_method === 'transferencia' ? 'bg-purple-100 text-purple-800' :
                                                        'badge-warning'
                                                }`}>
                                                {paymentMethodInfo[sale.payment_method].label}
                                            </span>
                                        </td>
                                        <td className="text-right text-gray-500">
                                            {(sale.discount_amount || 0) > 0 && (
                                                <div className="flex justify-between">
                                                    <span>Descuento:</span>
                                                    <span>-${(sale.discount_amount || 0).toLocaleString()}</span>
                                                </div>
                                            )}
                                        </td>

                                        <td className="text-right font-semibold">
                                            ${sale.total_amount.toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}
