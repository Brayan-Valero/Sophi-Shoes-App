import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { Sale, PaymentMethod } from '../../types/database'
import { DollarSign, CreditCard, Banknote, Smartphone, Receipt, Calendar } from 'lucide-react'

export default function DailyCashPage() {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

    // Fetch sales for selected date
    const { data: sales = [], isLoading } = useQuery({
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

    // Calculate totals
    const totalSales = sales.reduce((sum, sale) => sum + sale.total_amount, 0)
    const totalDiscount = sales.reduce((sum, sale) => sum + (sale.discount_amount || 0), 0)

    const byPaymentMethod = {
        efectivo: sales.filter((s) => s.payment_method === 'efectivo').reduce((sum, s) => sum + s.total_amount, 0),
        tarjeta: sales.filter((s) => s.payment_method === 'tarjeta').reduce((sum, s) => sum + s.total_amount, 0),
        transferencia: sales.filter((s) => s.payment_method === 'transferencia').reduce((sum, s) => sum + s.total_amount, 0),
        mixto: sales.filter((s) => s.payment_method === 'mixto').reduce((sum, s) => sum + s.total_amount, 0),
    }

    const paymentMethodInfo: Record<PaymentMethod, { label: string; icon: React.ReactNode; color: string }> = {
        efectivo: { label: 'Efectivo', icon: <Banknote size={24} />, color: 'bg-green-100 text-green-600' },
        tarjeta: { label: 'Tarjeta', icon: <CreditCard size={24} />, color: 'bg-blue-100 text-blue-600' },
        transferencia: { label: 'Transferencia', icon: <Smartphone size={24} />, color: 'bg-purple-100 text-purple-600' },
        mixto: { label: 'Mixto', icon: <DollarSign size={24} />, color: 'bg-orange-100 text-orange-600' },
    }

    const formatDate = (date: string) => {
        return new Date(date + 'T12:00:00').toLocaleDateString('es-CO', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        })
    }

    const formatTime = (date: string) => {
        return new Date(date).toLocaleTimeString('es-CO', {
            hour: '2-digit',
            minute: '2-digit',
        })
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Caja Diaria</h1>
                    <p className="text-gray-500">Resumen de ventas del día</p>
                </div>
                <div className="flex items-center gap-2">
                    <Calendar size={20} className="text-gray-400" />
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="form-input w-auto"
                    />
                </div>
            </div>

            {/* Date header */}
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
                    <div className="text-6xl opacity-20">
                        💰
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="card text-center py-12">
                    <div className="spinner mx-auto"></div>
                    <p className="text-gray-500 mt-4">Cargando datos...</p>
                </div>
            ) : (
                <>
                    {/* Payment method breakdown */}
                    <div>
                        <h2 className="text-lg font-semibold text-gray-800 mb-4">Por Forma de Pago</h2>
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
                                                    {count} {count === 1 ? 'venta' : 'ventas'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Recent sales */}
                    <div>
                        <h2 className="text-lg font-semibold text-gray-800 mb-4">Ventas del Día</h2>
                        {sales.length === 0 ? (
                            <div className="card text-center py-12">
                                <Receipt className="mx-auto text-gray-300" size={48} />
                                <h3 className="mt-4 text-lg font-medium text-gray-800">Sin ventas</h3>
                                <p className="text-gray-500 mt-1">
                                    No hay ventas registradas para esta fecha
                                </p>
                            </div>
                        ) : (
                            <div className="card">
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
                                                        {sale.discount_amount > 0 ? `-$${sale.discount_amount.toLocaleString()}` : '-'}
                                                    </td>
                                                    <td className="text-right font-semibold">
                                                        ${sale.total_amount.toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr className="border-t-2 bg-gray-50">
                                                <td colSpan={2} className="font-semibold">Total del Día</td>
                                                <td className="text-right text-gray-500">
                                                    {totalDiscount > 0 ? `-$${totalDiscount.toLocaleString()}` : '-'}
                                                </td>
                                                <td className="text-right font-bold text-lg text-green-600">
                                                    ${totalSales.toLocaleString()}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    )
}
