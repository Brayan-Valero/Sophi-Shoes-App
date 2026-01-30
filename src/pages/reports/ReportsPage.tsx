import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { BarChart, TrendingUp, Package, AlertTriangle, Check } from 'lucide-react'

export default function ReportsPage() {
    const [timeRange, setTimeRange] = useState<'week' | 'month'>('week')

    // Fetch Sales Data relative to timeRange
    const { data: reportData, isLoading } = useQuery({
        queryKey: ['reports', timeRange],
        queryFn: async () => {
            if (!isSupabaseConfigured()) return null

            const now = new Date()
            const startDate = new Date()
            if (timeRange === 'week') startDate.setDate(now.getDate() - 7)
            if (timeRange === 'month') startDate.setMonth(now.getMonth() - 1)

            // 1. Fetch Sales
            const { data: sales } = await supabase
                .from('sales')
                .select('sale_date, total_amount')
                .gte('sale_date', startDate.toISOString())
                .order('sale_date')

            // 2. Fetch Top Products (simplified: fetch all sale_items in range and aggregate)
            const { data: items } = await supabase
                .from('sale_items')
                .select(`
                    quantity,
                    product_variant:product_variants(
                        product:products(name)
                    )
                `)
                .gte('created_at', startDate.toISOString())

            // 3. Fetch Low Stock
            const { data: variants } = await supabase
                .from('product_variants')
                .select('stock, min_stock, product:products(name)')

            const lowStock = variants?.filter((v: any) => v.stock <= (v.min_stock || 5)) || []

            // Aggregate Sales by Day
            const salesByDay: Record<string, number> = {}
            sales?.forEach((s: any) => {
                const date = s.sale_date.split('T')[0]
                salesByDay[date] = (salesByDay[date] || 0) + s.total_amount
            })

            // Aggregate Top Products
            const productSales: Record<string, number> = {}
            items?.forEach((i: any) => {
                const name = i.product_variant?.product?.name || 'Desconocido'
                productSales[name] = (productSales[name] || 0) + i.quantity
            })

            const topProducts = Object.entries(productSales)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)

            return {
                salesByDay,
                topProducts,
                lowStock,
                totalSales: sales?.reduce((sum: number, s: any) => sum + s.total_amount, 0) || 0
            }
        }
    })

    if (isLoading || !reportData) {
        return <div className="p-8 text-center text-gray-500">Cargando reportes...</div>
    }

    const maxSale = Math.max(...Object.values(reportData.salesByDay), 1)

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Reportes Avanzados</h1>
                    <p className="text-gray-500">Resumen de rendimiento y alertas</p>
                </div>
                <div className="flex bg-white rounded-lg border p-1">
                    <button
                        onClick={() => setTimeRange('week')}
                        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${timeRange === 'week' ? 'bg-primary-50 text-primary-700' : 'text-gray-600'}`}
                    >Semanales</button>
                    <button
                        onClick={() => setTimeRange('month')}
                        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${timeRange === 'month' ? 'bg-primary-50 text-primary-700' : 'text-gray-600'}`}
                    >Mensuales</button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card flex items-center gap-4 border-l-4 border-l-blue-500">
                    <div className="bg-blue-100 p-3 rounded-full text-blue-600">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Ventas Totales ({timeRange === 'week' ? '7d' : '30d'})</p>
                        <p className="text-2xl font-bold">${reportData.totalSales.toLocaleString()}</p>
                    </div>
                </div>
                <div className="card flex items-center gap-4 border-l-4 border-l-orange-500">
                    <div className="bg-orange-100 p-3 rounded-full text-orange-600">
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Productos Stock Bajo</p>
                        <p className="text-2xl font-bold">{reportData.lowStock.length}</p>
                    </div>
                </div>
                {reportData.topProducts.length > 0 && (
                    <div className="card flex items-center gap-4 border-l-4 border-l-green-500">
                        <div className="bg-green-100 p-3 rounded-full text-green-600">
                            <Package size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Más Vendido</p>
                            <p className="text-lg font-bold truncate w-40" title={reportData.topProducts[0][0]}>
                                {reportData.topProducts[0][0]}
                            </p>
                            <p className="text-xs text-green-600">{reportData.topProducts[0][1]} unidades</p>
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Sales Chart (CSS based) */}
                <div className="card">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <BarChart size={20} />
                        Historial de Ventas
                    </h3>
                    <div className="h-64 flex items-end justify-between gap-2 pt-4">
                        {Object.entries(reportData.salesByDay).length === 0 ? (
                            <p className="w-full text-center text-gray-400">Sin datos para mostrar</p>
                        ) : (
                            Object.entries(reportData.salesByDay).map(([date, amount]) => (
                                <div key={date} className="flex-1 flex flex-col items-center gap-2 group relative">
                                    <div
                                        className="w-full bg-primary-500 rounded-t-sm hover:bg-primary-600 transition-all relative"
                                        style={{ height: `${(amount / maxSale) * 100}%` }}
                                    >
                                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                            ${amount.toLocaleString()}
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-gray-500 rotate-45 mt-2 origin-left w-6">{date.slice(5)}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Top Products Table */}
                <div className="card">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Package size={20} />
                        Top 5 Productos
                    </h3>
                    <div className="space-y-3">
                        {reportData.topProducts.map(([name, qty], index) => (
                            <div key={name} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${index === 0 ? 'bg-yellow-100 text-yellow-700' :
                                        index === 1 ? 'bg-gray-200 text-gray-700' :
                                            index === 2 ? 'bg-orange-100 text-orange-700' : 'bg-white text-gray-500'
                                        }`}>
                                        {index + 1}
                                    </span>
                                    <span className="font-medium text-gray-800 text-sm">{name}</span>
                                </div>
                                <span className="font-bold text-gray-700 text-sm">{qty} un.</span>
                            </div>
                        ))}
                        {reportData.topProducts.length === 0 && (
                            <p className="text-gray-400 text-center py-4">No hay ventas suficientes</p>
                        )}
                    </div>
                </div>

                {/* Low Stock Table */}
                <div className="card lg:col-span-2">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-red-600">
                        <AlertTriangle size={20} />
                        Alertas de Stock ({reportData.lowStock.length})
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {reportData.lowStock.map((v: any, i: number) => (
                            <div key={i} className="p-3 border border-red-100 bg-red-50 rounded-lg flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-gray-800 text-sm">{v.product?.name}</p>
                                    <p className="text-xs text-red-600">Mínimo: {v.min_stock || 5}</p>
                                </div>
                                <div className="bg-white px-2 py-1 rounded text-red-600 font-bold border border-red-100">
                                    {v.stock}
                                </div>
                            </div>
                        ))}
                        {reportData.lowStock.length === 0 && (
                            <p className="text-green-600 text-center py-4 w-full col-span-full flex items-center justify-center gap-2">
                                <Check size={16} /> Inventario Saludable
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
