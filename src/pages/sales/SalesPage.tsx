import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { Sale } from '../../types/database'
import { Plus, Search, Receipt, ChevronDown, ChevronUp } from 'lucide-react'

export default function SalesPage() {
    const [searchTerm, setSearchTerm] = useState('')
    const [expandedSale, setExpandedSale] = useState<string | null>(null)
    const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0])

    // Fetch sales with items
    const { data: sales = [], isLoading } = useQuery({
        queryKey: ['sales', dateFilter],
        queryFn: async () => {
            if (!isSupabaseConfigured()) return []

            const { data, error } = await supabase
                .from('sales')
                .select(`
          *,
          items:sale_items(
            *,
            product_variant:product_variants(
              id, size, color, sku,
              product:products(id, name)
            )
          )
        `)
                .gte('sale_date', dateFilter)
                .lte('sale_date', dateFilter)
                .order('created_at', { ascending: false })

            if (error) throw error
            return data as Sale[]
        },
    })

    const formatTime = (date: string) => {
        return new Date(date).toLocaleTimeString('es-CO', {
            hour: '2-digit',
            minute: '2-digit',
        })
    }

    const paymentMethodLabels: Record<string, string> = {
        efectivo: 'Efectivo',
        tarjeta: 'Tarjeta',
        transferencia: 'Transferencia',
        mixto: 'Mixto',
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Ventas</h1>
                    <p className="text-gray-500">Historial de ventas realizadas</p>
                </div>
                <Link to="/sales/new" className="btn-success flex items-center gap-2 w-fit">
                    <Plus size={20} />
                    Nueva Venta
                </Link>
            </div>

            {/* Filters */}
            <div className="card flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="form-input pl-10"
                        />
                    </div>
                </div>
                <div className="sm:w-48">
                    <input
                        type="date"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="form-input"
                    />
                </div>
            </div>

            {/* Sales list */}
            {isLoading ? (
                <div className="card text-center py-12">
                    <div className="spinner mx-auto"></div>
                    <p className="text-gray-500 mt-4">Cargando ventas...</p>
                </div>
            ) : sales.length === 0 ? (
                <div className="card text-center py-12">
                    <Receipt className="mx-auto text-gray-300" size={48} />
                    <h3 className="mt-4 text-lg font-medium text-gray-800">No hay ventas</h3>
                    <p className="text-gray-500 mt-1">
                        No se encontraron ventas para esta fecha
                    </p>
                    <Link to="/sales/new" className="btn-success mt-4 inline-flex items-center gap-2">
                        <Plus size={20} />
                        Registrar Venta
                    </Link>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Summary */}
                    <div className="card bg-gradient-to-r from-green-500 to-emerald-600 text-white">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <p className="text-green-100">Total del día</p>
                                <p className="text-3xl font-bold">
                                    ${sales.reduce((sum, s) => sum + s.total_amount, 0).toLocaleString()}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-green-100">{sales.length} ventas</p>
                            </div>
                        </div>
                    </div>

                    {/* Sales list */}
                    {sales.map((sale) => (
                        <div key={sale.id} className="card">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <Receipt className="text-green-600" size={24} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="font-semibold text-gray-800">
                                                ${sale.total_amount.toLocaleString()}
                                            </h3>
                                            <span className="badge-info">
                                                {paymentMethodLabels[sale.payment_method]}
                                            </span>
                                            {sale.discount_amount > 0 && (
                                                <span className="badge-warning">
                                                    -${sale.discount_amount.toLocaleString()}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-500 mt-1">
                                            {formatTime(sale.created_at)} • {sale.items?.length || 0} productos
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() =>
                                        setExpandedSale(expandedSale === sale.id ? null : sale.id)
                                    }
                                    className="btn-secondary flex items-center gap-2"
                                >
                                    {expandedSale === sale.id ? (
                                        <>
                                            <ChevronUp size={16} />
                                            Ocultar
                                        </>
                                    ) : (
                                        <>
                                            <ChevronDown size={16} />
                                            Ver Detalle
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Sale items */}
                            {expandedSale === sale.id && sale.items && (
                                <div className="mt-4 pt-4 border-t">
                                    <div className="table-container">
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>Producto</th>
                                                    <th>Variante</th>
                                                    <th className="text-right">Cantidad</th>
                                                    <th className="text-right">Precio</th>
                                                    <th className="text-right">Subtotal</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {sale.items.map((item: any) => (
                                                    <tr key={item.id}>
                                                        <td className="font-medium">
                                                            {item.product_variant?.product?.name || 'Producto'}
                                                        </td>
                                                        <td>
                                                            {item.product_variant?.size} - {item.product_variant?.color}
                                                        </td>
                                                        <td className="text-right">{item.quantity}</td>
                                                        <td className="text-right">${item.unit_price.toLocaleString()}</td>
                                                        <td className="text-right font-medium">
                                                            ${item.subtotal.toLocaleString()}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    {sale.notes && (
                                        <p className="mt-3 text-sm text-gray-500">
                                            <strong>Notas:</strong> {sale.notes}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
