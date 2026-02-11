import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { Purchase } from '../../types/database'
import { Plus, Search, ShoppingCart, ChevronDown, ChevronUp } from 'lucide-react'

export default function PurchasesPage() {
    const [searchTerm, setSearchTerm] = useState('')
    const [expandedPurchase, setExpandedPurchase] = useState<string | null>(null)

    // Fetch purchases with items
    const { data: purchases = [], isLoading } = useQuery({
        queryKey: ['purchases'],
        queryFn: async () => {
            if (!isSupabaseConfigured()) return []

            const { data, error } = await supabase
                .from('purchases')
                .select(`
          *,
          supplier:suppliers(id, name),
          items:purchase_items(
            *,
            product_variant:product_variants(
              id, size, color, sku,
              product:products(id, name)
            )
          )
        `)
                .order('purchase_date', { ascending: false })

            if (error) throw error
            return data as Purchase[]
        },
    })

    // Filter purchases
    const filteredPurchases = purchases.filter(
        (purchase) =>
            purchase.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            purchase.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('es-CO', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        })
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Compras</h1>
                    <p className="text-gray-500">Registro de facturas y entrada de inventario</p>
                </div>
                <Link to="/purchases/new" className="btn-primary flex items-center gap-2 w-fit">
                    <Plus size={20} />
                    Nueva Compra
                </Link>
            </div>

            {/* Search */}
            <div className="card shadow-sm border-gray-100">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por factura o proveedor..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="form-input pl-10 border-gray-200"
                    />
                </div>
            </div>

            {/* Purchases list */}
            {isLoading ? (
                <div className="card text-center py-12">
                    <div className="spinner mx-auto"></div>
                    <p className="text-gray-500 mt-4">Cargando compras...</p>
                </div>
            ) : filteredPurchases.length === 0 ? (
                <div className="card text-center py-12">
                    <ShoppingCart className="mx-auto text-gray-300" size={48} />
                    <h3 className="mt-4 text-lg font-medium text-gray-800">No hay compras</h3>
                    <p className="text-gray-500 mt-1">
                        {searchTerm
                            ? 'No se encontraron compras con ese criterio'
                            : 'Comienza registrando tu primera compra'}
                    </p>
                    {!searchTerm && (
                        <Link to="/purchases/new" className="btn-primary mt-4 inline-flex items-center gap-2">
                            <Plus size={20} />
                            Registrar Compra
                        </Link>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredPurchases.map((purchase) => (
                        <div key={purchase.id} className="card hover:border-primary-200 transition-colors">
                            {/* Purchase header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0 text-purple-600">
                                        <ShoppingCart size={24} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-gray-900 leading-tight">
                                                Factura: {purchase.invoice_number || 'Sin número'}
                                            </h3>
                                        </div>
                                        <p className="text-sm text-gray-500 mt-1 font-medium">
                                            {purchase.supplier?.name || 'Sin proveedor'} • {formatDate(purchase.purchase_date)}
                                        </p>
                                        <p className="text-xl font-black text-gray-900 mt-1">
                                            ${purchase.total_amount.toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Link
                                        to={`/purchases/${purchase.id}`}
                                        className="btn-secondary h-10 px-4 flex items-center gap-2 text-xs font-bold"
                                    >
                                        <Plus size={16} className="rotate-45" />
                                        Editar
                                    </Link>
                                    <button
                                        onClick={() =>
                                            setExpandedPurchase(
                                                expandedPurchase === purchase.id ? null : purchase.id
                                            )
                                        }
                                        className="btn-secondary h-10 px-4 flex items-center gap-2 text-xs font-bold"
                                    >
                                        {expandedPurchase === purchase.id ? (
                                            <>
                                                <ChevronUp size={16} />
                                                Ocultar Detalle
                                            </>
                                        ) : (
                                            <>
                                                <ChevronDown size={16} />
                                                Ver Detalle
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Purchase items (Details) */}
                            {expandedPurchase === purchase.id && purchase.items && (
                                <div className="mt-6 pt-6 border-t border-gray-100">
                                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Productos en esta factura</h4>
                                    <div className="overflow-x-auto rounded-xl border border-gray-100">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-500 tracking-widest">
                                                <tr>
                                                    <th className="px-4 py-3">Producto</th>
                                                    <th className="px-4 py-3">Variante</th>
                                                    <th className="px-4 py-3 text-right">Cantidad</th>
                                                    <th className="px-4 py-3 text-right">Costo Unit.</th>
                                                    <th className="px-4 py-3 text-right">Subtotal</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {purchase.items.map((item: any) => (
                                                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                                        <td className="px-4 py-3 font-semibold text-gray-800">
                                                            {item.product_variant?.product?.name || 'Producto'}
                                                        </td>
                                                        <td className="px-4 py-3 text-gray-500 font-medium whitespace-nowrap">
                                                            Talla {item.product_variant?.size} • {item.product_variant?.color}
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-bold text-gray-700">{item.quantity}</td>
                                                        <td className="px-4 py-3 text-right text-gray-500">${item.unit_cost.toLocaleString()}</td>
                                                        <td className="px-4 py-3 text-right font-black text-gray-900">
                                                            ${item.subtotal.toLocaleString()}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot className="bg-gray-50 font-black">
                                                <tr>
                                                    <td colSpan={4} className="px-4 py-4 text-right text-gray-500 uppercase text-[10px]">Total Factura:</td>
                                                    <td className="px-4 py-4 text-right text-lg text-primary-700">
                                                        ${purchase.total_amount.toLocaleString()}
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                    {purchase.notes && (
                                        <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Notas</p>
                                            <p className="text-sm text-gray-600 italic leading-relaxed">{purchase.notes}</p>
                                        </div>
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
