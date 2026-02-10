import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { TrendingUp, Package, AlertTriangle, Check, FileDown, ArrowDownRight, ArrowUpRight, Calendar, DollarSign } from 'lucide-react'
import { exportToCSV } from '../../utils/exportUtils'

type ReportRange = 'week' | 'month' | 'lastMonth' | 'custom'

export default function ReportsPage() {
    const [timeRange, setTimeRange] = useState<ReportRange>('week')

    // Default dates for ranges
    const getRangeDates = (range: ReportRange) => {
        const now = new Date()
        const end = new Date()
        const start = new Date()

        switch (range) {
            case 'week':
                start.setDate(now.getDate() - 7)
                break
            case 'month':
                start.setMonth(now.getMonth() - 1)
                break
            case 'lastMonth':
                start.setMonth(now.getMonth() - 1)
                start.setDate(1)
                end.setDate(0) // Last day of previous month
                break
        }
        return { start, end }
    }

    const initialDates = getRangeDates('week')
    const [startDate, setStartDate] = useState(initialDates.start.toISOString().split('T')[0])
    const [endDate, setEndDate] = useState(initialDates.end.toISOString().split('T')[0])

    const handleRangeChange = (range: ReportRange) => {
        setTimeRange(range)
        if (range !== 'custom') {
            const { start, end } = getRangeDates(range)
            setStartDate(start.toISOString().split('T')[0])
            setEndDate(end.toISOString().split('T')[0])
        }
    }

    // Fetch Comprehensive Report Data
    const { data: reportData, isLoading } = useQuery({
        queryKey: ['reports', startDate, endDate],
        queryFn: async () => {
            if (!isSupabaseConfigured()) return null

            const rangeStart = `${startDate}T00:00:00`
            const rangeEnd = `${endDate}T23:59:59`

            // 1. Fetch Sales
            const { data: sales } = await supabase
                .from('sales')
                .select('*, customer:customers(full_name)')
                .gte('sale_date', rangeStart)
                .lte('sale_date', rangeEnd)
                .order('sale_date')

            // 2. Fetch Purchases
            const { data: purchases } = await supabase
                .from('purchases')
                .select('*, supplier:suppliers(name)')
                .gte('purchase_date', rangeStart)
                .lte('purchase_date', rangeEnd)
                .order('purchase_date')

            // 3. Fetch Sale Items for top products
            const { data: items } = await supabase
                .from('sale_items')
                .select(`
                    quantity,
                    subtotal,
                    product_variant:product_variants(
                        sku,
                        product:products(name)
                    )
                `)
                .gte('created_at', rangeStart)
                .lte('created_at', rangeEnd)

            // 4. Fetch Low Stock (Current state, not interval based)
            const { data: variants } = await supabase
                .from('product_variants')
                .select('stock, min_stock, product:products(name)')

            const lowStock = variants?.filter((v: any) => v.stock <= (v.min_stock || 5)) || []

            // --- Aggregations ---

            // Sales by Day
            const salesByDay: Record<string, number> = {}
            sales?.forEach((s: any) => {
                const date = s.sale_date.split('T')[0]
                salesByDay[date] = (salesByDay[date] || 0) + s.total_amount
            })

            // Top Products aggregation
            const productStats: Record<string, { qty: number, revenue: number, sku: string }> = {}
            items?.forEach((i: any) => {
                const name = i.product_variant?.product?.name || 'Desconocido'
                const sku = i.product_variant?.sku || 'N/A'
                if (!productStats[name]) {
                    productStats[name] = { qty: 0, revenue: 0, sku }
                }
                productStats[name].qty += i.quantity
                productStats[name].revenue += i.subtotal
            })

            const topProducts = Object.entries(productStats)
                .map(([name, stats]) => ({ name, ...stats }))
                .sort((a, b) => b.qty - a.qty)
                .slice(0, 10)

            const totalSales = sales?.reduce((sum: number, s: any) => sum + s.total_amount, 0) || 0
            const totalPurchases = purchases?.reduce((sum: number, p: any) => sum + p.total_amount, 0) || 0
            const recentTransactions = [...(sales || []), ...(purchases || [])]
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .slice(0, 5)

            return {
                sales,
                purchases,
                salesByDay,
                topProducts,
                lowStock,
                totalSales,
                totalPurchases,
                netProfit: totalSales - totalPurchases,
                recentTransactions
            }
        }
    })

    const handleExportSales = () => {
        if (!reportData?.sales?.length) return
        const data = reportData.sales.map((s: any) => ({
            'ID': s.id,
            'Fecha': new Date(s.sale_date).toLocaleDateString(),
            'Cliente': s.customer?.full_name || 'C. Final',
            'Tipo': s.shipping_type,
            'Método': s.payment_method,
            'Subtotal': s.total_amount + s.discount_amount,
            'Descuento': s.discount_amount,
            'Total': s.total_amount
        }))
        exportToCSV(data, `reporte_ventas_${startDate}_a_${endDate}`)
    }

    const handleExportPurchases = () => {
        if (!reportData?.purchases?.length) return
        const data = reportData.purchases.map((p: any) => ({
            'ID': p.id,
            'Fecha': new Date(p.purchase_date).toLocaleDateString(),
            'Proveedor': p.supplier?.name || 'Varios',
            'Factura': p.invoice_number || 'N/A',
            'Estado': p.status,
            'Total': p.total_amount
        }))
        exportToCSV(data, `reporte_compras_${startDate}_a_${endDate}`)
    }

    const handleExportProducts = () => {
        if (!reportData?.topProducts?.length) return
        const data = reportData.topProducts.map(p => ({
            'Producto': p.name,
            'SKU': p.sku,
            'Cant. Vendida': p.qty,
            'Ventas Generadas': p.revenue
        }))
        exportToCSV(data, `reporte_productos_${startDate}_a_${endDate}`)
    }

    if (isLoading || !reportData) {
        return <div className="p-12 text-center text-gray-400 flex flex-col items-center gap-4">
            <div className="spinner"></div>
            Cargando estadísticas detalladas...
        </div>
    }

    const maxSale = Math.max(...Object.values(reportData.salesByDay), 1)

    return (
        <div className="space-y-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Business Intelligence</h1>
                    <p className="text-gray-500">Análisis detallado de ventas, compras y rendimiento</p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex bg-white rounded-xl border p-1 shadow-sm">
                        <button
                            onClick={() => handleRangeChange('week')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${timeRange === 'week' ? 'bg-primary-500 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}
                        >7D</button>
                        <button
                            onClick={() => handleRangeChange('month')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${timeRange === 'month' ? 'bg-primary-500 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}
                        >MES</button>
                        <button
                            onClick={() => handleRangeChange('lastMonth')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${timeRange === 'lastMonth' ? 'bg-primary-500 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}
                        >PASADO</button>
                        <button
                            onClick={() => setTimeRange('custom')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${timeRange === 'custom' ? 'bg-primary-500 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}
                        >LIBRE</button>
                    </div>

                    {timeRange === 'custom' && (
                        <div className="flex items-center gap-2 animate-fade-in bg-white p-1 rounded-xl border shadow-sm">
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="border-none text-xs focus:ring-0 p-2"
                            />
                            <span className="text-gray-300">-</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="border-none text-xs focus:ring-0 p-2"
                            />
                        </div>
                    )}

                    <div className="flex gap-2">
                        <button
                            onClick={handleExportSales}
                            className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-all flex items-center gap-2 text-sm font-bold"
                            title="Exportar Ventas"
                        >
                            <FileDown size={18} className="text-green-600" />
                            Ventas
                        </button>
                        <button
                            onClick={handleExportPurchases}
                            className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-all flex items-center gap-2 text-sm font-bold"
                            title="Exportar Compras"
                        >
                            <FileDown size={18} className="text-orange-600" />
                            Compras
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="card border-l-4 border-l-green-500 py-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center text-green-600">
                            <ArrowUpRight size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Ingresos</p>
                            <p className="text-2xl font-black text-gray-800">${reportData.totalSales.toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                <div className="card border-l-4 border-l-orange-500 py-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600">
                            <ArrowDownRight size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Egresos (Compras)</p>
                            <p className="text-2xl font-black text-gray-800">${reportData.totalPurchases.toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                <div className="card border-l-4 border-l-blue-600 py-6 bg-blue-50/30">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                            <DollarSign size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">Utilidad Estimada</p>
                            <p className={`text-2xl font-black ${reportData.netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                ${reportData.netProfit.toLocaleString()}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="card border-l-4 border-l-red-500 py-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center text-red-600">
                            <AlertTriangle size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Stock Crítico</p>
                            <p className="text-2xl font-black text-gray-800">{reportData.lowStock.length}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Sales Activity Chart */}
                <div className="card lg:col-span-2">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <Calendar size={18} className="text-primary-500" />
                            Fluidez de Ventas Diaria
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                            <span className="w-3 h-3 bg-primary-500 rounded-full"></span> Ventas
                        </div>
                    </div>
                    <div className="h-64 flex items-end justify-between gap-2 pt-10">
                        {Object.entries(reportData.salesByDay).length === 0 ? (
                            <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 gap-2">
                                <TrendingUp size={48} className="opacity-20" />
                                <p className="font-bold italic">Sin movimientos en este periodo</p>
                            </div>
                        ) : (
                            Object.entries(reportData.salesByDay).map(([date, amount]) => (
                                <div key={date} className="flex-1 flex flex-col items-center gap-2 group relative">
                                    <div
                                        className="w-full bg-primary-400 rounded-t-lg hover:bg-primary-600 transition-all cursor-crosshair relative shadow-sm"
                                        style={{ height: `${(amount / maxSale) * 100}%` }}
                                    >
                                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-xl pointer-events-none">
                                            ${amount.toLocaleString()}
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-gray-400 font-bold rotate-45 mt-4 origin-left truncate w-6">{date.split('-').slice(1).join('/')}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Top Selling Products Detail */}
                <div className="card">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <Package size={18} className="text-orange-500" />
                            Top Productos
                        </h3>
                        <button onClick={handleExportProducts} className="text-primary-600 hover:text-primary-700 text-xs font-bold flex items-center gap-1">
                            Ver reporte <FileDown size={14} />
                        </button>
                    </div>
                    <div className="space-y-4">
                        {reportData.topProducts.map((p, index) => (
                            <div key={p.name} className="flex flex-col gap-1.5 bg-gray-50/50 p-3 rounded-xl border border-gray-100/50">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black ${index === 0 ? 'bg-yellow-400 text-black shadow-md' :
                                            index === 1 ? 'bg-gray-300 text-gray-800' :
                                                index === 2 ? 'bg-orange-300 text-orange-900' : 'bg-white text-gray-400 border border-gray-200'
                                            }`}>
                                            {index + 1}
                                        </span>
                                        <span className="font-bold text-gray-700 text-xs truncate max-w-[140px]">{p.name}</span>
                                    </div>
                                    <span className="font-black text-gray-800 text-xs">{p.qty} un.</span>
                                </div>
                                <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-1000 ${index === 0 ? 'bg-yellow-400' : 'bg-primary-500'}`}
                                        style={{ width: `${(p.qty / reportData.topProducts[0].qty) * 100}%` }}
                                    ></div>
                                </div>
                                <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                                    <span>Revenue Total</span>
                                    <span className="text-green-600">${p.revenue.toLocaleString()}</span>
                                </div>
                            </div>
                        ))}
                        {reportData.topProducts.length === 0 && (
                            <div className="text-center py-10 opacity-30 italic text-sm">Escasez de información</div>
                        )}
                    </div>
                </div>

                {/* Recent Activity List */}
                <div className="card lg:col-span-2">
                    <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <TrendingUp size={18} className="text-blue-500" />
                        Transacciones Recientes
                    </h3>
                    <div className="space-y-2">
                        {reportData.recentTransactions.map((t: any) => {
                            const isSale = !!t.sale_date
                            return (
                                <div key={t.id} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isSale ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                                            {isSale ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-800 text-sm">
                                                {isSale ? (t.customer?.full_name || 'Venta Local') : (t.supplier?.name || 'Compra Stock')}
                                            </p>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase">
                                                {new Date(isSale ? t.sale_date : t.purchase_date).toLocaleDateString()} • {t.payment_method || t.status}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`font-black text-sm ${isSale ? 'text-green-600' : 'text-orange-600'}`}>
                                            {isSale ? '+' : '-'}${t.total_amount.toLocaleString()}
                                        </p>
                                        <p className="text-[10px] font-mono text-gray-300">ID: {t.id.slice(0, 8)}</p>
                                    </div>
                                </div>
                            )
                        })}
                        {reportData.recentTransactions.length === 0 && (
                            <p className="text-center py-6 text-gray-400 italic">No hay historial reciente en este rango</p>
                        )}
                    </div>
                </div>

                {/* Low Stock (Keeping the original but updated style) */}
                <div className="card">
                    <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2 text-red-600">
                        <AlertTriangle size={18} />
                        Alertas Críticas ({reportData.lowStock.length})
                    </h3>
                    <div className="space-y-3">
                        {reportData.lowStock.slice(0, 4).map((v: any, i: number) => (
                            <div key={i} className="p-3 border border-red-100 bg-red-50/50 rounded-xl flex justify-between items-center group hover:bg-red-50 transition-colors">
                                <div className="min-w-0">
                                    <p className="font-bold text-gray-800 text-xs truncate" title={v.product?.name}>{v.product?.name}</p>
                                    <p className="text-[10px] font-bold text-red-400 uppercase">Mínimo requerido: {v.min_stock || 5}</p>
                                </div>
                                <div className="bg-white w-8 h-8 rounded-lg flex items-center justify-center text-red-600 font-black border border-red-100 shadow-sm text-xs">
                                    {v.stock}
                                </div>
                            </div>
                        ))}
                        {reportData.lowStock.length > 4 && (
                            <p className="text-center text-[10px] font-bold text-gray-400 tracking-tighter">Y {reportData.lowStock.length - 4} variantes más en riesgo...</p>
                        )}
                        {reportData.lowStock.length === 0 && (
                            <div className="bg-green-50 p-6 rounded-2xl flex flex-col items-center gap-2 border border-green-100">
                                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white shadow-lg">
                                    <Check size={24} />
                                </div>
                                <p className="font-bold text-green-700 text-sm">Sin Riesgos de Quiebre</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
