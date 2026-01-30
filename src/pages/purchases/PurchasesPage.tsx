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
            <div className="card">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por factura o proveedor..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="form-input pl-10"
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
                        <div key={purchase.id} className="card">
                            {/* Purchase header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <ShoppingCart className="text-purple-600" size={24} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="font-semibold text-gray-800">
                                                {purchase.invoice_number || 'Sin número'}
                                            </h3>
                                            <span
                                                className={`badge ${purchase.status === 'pagada'
                                                        ? 'badge-success'
                                                        : 'badge-warning'
                                                    }`}
                                            >
                                                {purchase.status === 'pagada' ? 'Pagada' : 'Pendiente'}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-500 mt-1">
                                            {purchase.supplier?.name || 'Sin proveedor'} •{' '}
                                            {formatDate(purchase.purchase_date)}
                                        </p>
                                        <p className="text-lg font-bold text-gray-800 mt-1">
                                            ${purchase.total_amount.toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() =>
                                        setExpandedPurchase(
                                            expandedPurchase === purchase.id ? null : purchase.id
                                        )
                                    }
                                    className="btn-secondary flex items-center gap-2"
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

                            {/* Purchase items */}
                            {expandedPurchase === purchase.id && purchase.items && (
                                <div className="mt-4 pt-4 border-t">
                                    <h4 className="text-sm font-medium text-gray-700 mb-3">Items comprados</h4>
                                    <div className="table-container">
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>Producto</th>
                                                    <th>Variante</th>
                                                    <th className="text-right">Cantidad</th>
                                                    <th className="text-right">Costo Unit.</th>
                                                    <th className="text-right">Subtotal</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {purchase.items.map((item: any) => (
                                                    <tr key={item.id}>
                                                        <td className="font-medium">
                                                            {item.product_variant?.product?.name || 'Producto'}
                                                        </td>
                                                        <td>
                                                            {item.product_variant?.size} - {item.product_variant?.color}
                                                        </td>
                                                        <td className="text-right">{item.quantity}</td>
                                                        <td className="text-right">${item.unit_cost.toLocaleString()}</td>
                                                        <td className="text-right font-medium">
                                                            ${item.subtotal.toLocaleString()}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot>
                                                <tr className="border-t-2">
                                                    <td colSpan={4} className="text-right font-semibold">Total:</td>
                                                    <td className="text-right font-bold text-lg">
                                                        ${purchase.total_amount.toLocaleString()}
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                    {purchase.notes && (
                                        <p className="mt-3 text-sm text-gray-500">
                                            <strong>Notas:</strong> {purchase.notes}
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
