import { useState } from 'react'
import { Link } from 'react-router-dom'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { ShippingStatus } from '../../types/database'
import { Search, ChevronDown, ChevronUp, Printer, Truck, Clock, CheckCircle, XCircle, Plus, FileDown } from 'lucide-react'
import { exportToCSV } from '../../utils/exportUtils'




export default function ShippingPage() {
    const [searchTerm, setSearchTerm] = useState('')
    const [expandedSale, setExpandedSale] = useState<string | null>(null)
    const queryClient = useQueryClient()

    const { data: shipments = [], isLoading } = useQuery({
        queryKey: ['shipments'],
        queryFn: async () => {
            if (!isSupabaseConfigured()) return []
            const { data, error } = await supabase
                .from('sales')
                .select(`
                    *,
                    items:sale_items(
                        *,
                        product_variant:product_variants(
                            product:products(name),
                            size,
                            color
                        )
                    ),
                    customer:customers(full_name, phone, address)
                `)
                .neq('shipping_type', 'local')
                .order('created_at', { ascending: false })

            if (error) throw error
            return data as any[]
        }
    })

    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status, tracking }: { id: string, status: ShippingStatus, tracking?: string }) => {
            const { error } = await supabase
                .from('sales')
                .update({
                    shipping_status: status,
                    tracking_number: tracking,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shipments'] })
        }
    })

    const filteredShipments = shipments.filter(s =>
        s.customer?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.tracking_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.id.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const getStatusBadge = (status: ShippingStatus) => {
        switch (status) {
            case 'pendiente': return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium flex items-center gap-1"><Clock size={12} /> Pendiente</span>
            case 'enviado': return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium flex items-center gap-1"><Truck size={12} /> Enviado</span>
            case 'entregado': return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium flex items-center gap-1"><CheckCircle size={12} /> Entregado</span>
            case 'devuelto': return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium flex items-center gap-1"><XCircle size={12} /> Devuelto</span>
            default: return status
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-800">Gestión de Envíos</h1>
                <p className="text-gray-500 text-sm">Control de guías y estados para Dropi y Contraentrega</p>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por cliente, guía o ID..."
                        className="form-input pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => {
                            const exportData = shipments.map(s => ({
                                'Fecha': new Date(s.created_at).toLocaleDateString(),
                                'Cliente': s.customer?.full_name || 'Consumidor Final',
                                'Teléfono': s.customer?.phone || '',
                                'Dirección': s.customer?.address || '',
                                'Tipo': s.shipping_type,
                                'Estado': s.shipping_status,
                                'No. Guía': s.tracking_number || '',
                                'Costo Envío': s.shipping_cost || 0,
                                'Total Venta': s.total_amount
                            }))
                            exportToCSV(exportData, 'envios_sophi_shoes')
                        }}
                        className="btn-secondary flex items-center gap-2"
                    >
                        <FileDown size={20} />
                        Exportar
                    </button>
                    <Link to="/shipping/new" className="btn-primary flex items-center gap-2">
                        <Plus size={20} />
                        Nuevo Envío
                    </Link>
                </div>

            </div>


            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">F. Venta</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">No. Guía</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {isLoading ? (
                                <tr><td colSpan={7} className="text-center py-8 text-gray-500">Cargando envíos...</td></tr>
                            ) : filteredShipments.length === 0 ? (
                                <tr><td colSpan={7} className="text-center py-8 text-gray-500">No se encontraron envíos</td></tr>
                            ) : filteredShipments.map((sale) => (
                                <>
                                    <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-4 text-sm text-gray-600">
                                            {new Date(sale.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="text-sm font-medium text-gray-900">{sale.customer?.full_name || 'Consumidor Final'}</div>
                                            <div className="text-xs text-gray-500">{sale.customer?.phone}</div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${sale.shipping_type === 'dropi' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'
                                                }`}>
                                                {sale.shipping_type}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">
                                            {sale.tracking_number ? (
                                                <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">{sale.tracking_number}</code>
                                            ) : (
                                                <span className="text-gray-400 text-xs italic">Sin guía</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            {getStatusBadge(sale.shipping_status)}
                                        </td>
                                        <td className="px-4 py-4 text-right text-sm font-bold text-gray-900">
                                            ${sale.total_amount.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <button
                                                onClick={() => setExpandedSale(expandedSale === sale.id ? null : sale.id)}
                                                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                                            >
                                                {expandedSale === sale.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                            </button>
                                        </td>
                                    </tr>
                                    {expandedSale === sale.id && (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-4 bg-gray-50">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div>
                                                        <h4 className="font-semibold text-sm text-gray-700 mb-2">Detalle de Productos</h4>
                                                        <div className="space-y-2">
                                                            {sale.items?.map((item: any) => (
                                                                <div key={item.id} className="flex justify-between text-xs bg-white p-2 rounded border">
                                                                    <span>{item.quantity}x {item.product_variant?.product?.name} ({item.product_variant?.size} / {item.product_variant?.color})</span>
                                                                    <span className="font-medium">${(item.unit_price * item.quantity).toLocaleString()}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <div className="mt-4 flex gap-2">
                                                            <button
                                                                onClick={() => window.open(`/print/sale/${sale.id}`, '_blank')}
                                                                className="btn-secondary text-xs flex items-center gap-1"
                                                            >
                                                                <Printer size={14} /> Imprimir Recibo
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="bg-white p-4 rounded border">
                                                        <h4 className="font-semibold text-sm text-gray-700 mb-4">Actualizar Estado</h4>
                                                        <div className="grid grid-cols-2 gap-2 mb-4">
                                                            {(['pendiente', 'enviado', 'entregado', 'devuelto'] as ShippingStatus[]).map(status => (
                                                                <button
                                                                    key={status}
                                                                    onClick={() => updateStatusMutation.mutate({ id: sale.id, status })}
                                                                    disabled={updateStatusMutation.isPending}
                                                                    className={`px-3 py-2 rounded text-xs font-medium capitalize border transition-all ${sale.shipping_status === status
                                                                        ? 'bg-primary-50 border-primary-500 text-primary-700'
                                                                        : 'bg-white border-gray-200 hover:border-gray-300'
                                                                        }`}
                                                                >
                                                                    {status}
                                                                </button>
                                                            ))}
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-medium text-gray-600 mb-1 block">Número de Guía</label>
                                                            <div className="flex gap-2">
                                                                <input
                                                                    type="text"
                                                                    className="form-input text-xs h-9"
                                                                    placeholder="Actualizar guía..."
                                                                    defaultValue={sale.tracking_number}
                                                                    onBlur={(e) => {
                                                                        if (e.target.value !== sale.tracking_number) {
                                                                            updateStatusMutation.mutate({ id: sale.id, status: sale.shipping_status, tracking: e.target.value })
                                                                        }
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
