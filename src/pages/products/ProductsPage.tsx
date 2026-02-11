import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { Product } from '../../types/database'
import { useAuth } from '../../contexts/AuthContext'
import { Plus, Search, Package, Edit, ChevronDown, ChevronUp, AlertTriangle, FileDown, Camera, Trash2 } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { exportToCSV } from '../../utils/exportUtils'
import { groupVariantsByColor } from '../../utils/variantUtils'



export default function ProductsPage() {
    const { isAdmin } = useAuth()
    const queryClient = useQueryClient()
    const [searchTerm, setSearchTerm] = useState('')
    const [expandedProduct, setExpandedProduct] = useState<string | null>(null)

    // Delete product mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            if (!isSupabaseConfigured()) return
            const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', id)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] })
        },
        onError: (err: Error) => {
            alert('No se puede eliminar el producto: ' + err.message)
        }
    })

    const handleDelete = (id: string) => {
        if (window.confirm('¿Está seguro de eliminar este producto y todas sus variantes?')) {
            deleteMutation.mutate(id)
        }
    }

    // Fetch products with variants
    const { data: products = [], isLoading } = useQuery({
        queryKey: ['products'],
        queryFn: async () => {
            if (!isSupabaseConfigured()) return []

            const { data, error } = await supabase
                .from('products')
                .select(`
          *,
          supplier:suppliers(id, name),
          variants:product_variants(*)
        `)
                .order('name')

            if (error) throw error
            return data as Product[]
        },
    })

    // Filter products
    // Filter products
    const filteredProducts = products.filter(
        (product) =>
            product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.category?.toLowerCase().includes(searchTerm.toLowerCase())
    )


    // Calculate total stock for a product
    const getTotalStock = (product: Product) => {
        return product.variants?.reduce((sum, v) => sum + v.stock, 0) || 0
    }

    const hasLowStock = (product: Product) => {
        return (product.variants || []).some(v => v.stock <= (v.min_stock || 5))
    }


    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Productos</h1>
                    <p className="text-gray-500">Gestiona el catálogo de calzado e inventario</p>
                </div>
                <div className="flex items-center gap-2 w-fit">
                    {isAdmin && (
                        <button
                            onClick={() => {
                                const exportData = products.flatMap(p =>
                                    (p.variants || []).map(v => ({
                                        'Producto': p.name,
                                        'Categoría': p.category || '',
                                        'Talla': v.size,
                                        'Color': v.color,
                                        'SKU': v.sku || '',
                                        'Costo': v.cost,
                                        'Precio': v.price,
                                        'Stock': v.stock,
                                        'Stock Mín': v.min_stock || 0,
                                        'Proveedor': p.supplier?.name || '',
                                        'Estado': p.is_active ? 'Activo' : 'Inactivo'
                                    }))
                                )
                                exportToCSV(exportData, 'inventario_sophi_shoes')
                            }}
                            className="btn-secondary flex items-center gap-2"
                        >
                            <FileDown size={20} />
                            Exportar
                        </button>
                    )}
                    {isAdmin && (
                        <Link to="/products/new" className="btn-primary flex items-center gap-2">
                            <Plus size={20} />
                            Nuevo Producto
                        </Link>
                    )}
                </div>

            </div>

            {/* Search */}
            <div className="card">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o categoría..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="form-input pl-10"
                    />
                </div>
            </div>

            {/* Products list */}
            {isLoading ? (
                <div className="card text-center py-12">
                    <div className="spinner mx-auto"></div>
                    <p className="text-gray-500 mt-4">Cargando productos...</p>
                </div>
            ) : filteredProducts.length === 0 ? (
                <div className="card text-center py-12">
                    <Package className="mx-auto text-gray-300" size={48} />
                    <h3 className="mt-4 text-lg font-medium text-gray-800">No hay productos</h3>
                    <p className="text-gray-500 mt-1">
                        {searchTerm
                            ? 'No se encontraron productos con ese criterio'
                            : 'Comienza agregando tu primer producto'}
                    </p>
                    {!searchTerm && isAdmin && (
                        <Link to="/products/new" className="btn-primary mt-4 inline-flex items-center gap-2">
                            <Plus size={20} />
                            Agregar Producto
                        </Link>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredProducts.map((product) => (
                        <div
                            key={product.id}
                            className={`card transition-shadow ${!product.is_active ? 'opacity-60' : ''
                                }`}
                        >
                            {/* Product header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-start gap-4">
                                    {product.image_url ? (
                                        <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border border-gray-100 shadow-sm">
                                            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                                        </div>
                                    ) : (
                                        <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                            <Package className="text-blue-600" size={28} />
                                        </div>
                                    )}
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold text-gray-800">{product.name}</h3>
                                            {!product.is_active && (
                                                <span className="badge-warning">Inactivo</span>
                                            )}
                                            {hasLowStock(product) && (
                                                <span className="badge-error flex items-center gap-1">
                                                    <AlertTriangle size={12} />
                                                    Stock Bajo
                                                </span>
                                            )}

                                        </div>
                                        <div className="flex flex-wrap gap-2 mt-1">
                                            {product.category && (
                                                <span className="badge-info">{product.category}</span>
                                            )}
                                            {product.supplier && (
                                                <span className="text-sm text-gray-500">
                                                    Proveedor: {product.supplier.name}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex gap-4 mt-2 text-sm">
                                            <span className="text-gray-600">
                                                <strong>{product.variants?.length || 0}</strong> variantes
                                            </span>
                                            <span className={`font-medium ${getTotalStock(product) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                Stock: {getTotalStock(product)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() =>
                                            setExpandedProduct(
                                                expandedProduct === product.id ? null : product.id
                                            )
                                        }
                                        className="btn-secondary flex items-center gap-2"
                                    >
                                        {expandedProduct === product.id ? (
                                            <>
                                                <ChevronUp size={16} />
                                                Ocultar
                                            </>
                                        ) : (
                                            <>
                                                <ChevronDown size={16} />
                                                Ver Variantes
                                            </>
                                        )}
                                    </button>
                                    {isAdmin && (
                                        <div className="flex items-center gap-1">
                                            <Link
                                                to={`/products/${product.id}`}
                                                className="btn-primary flex items-center gap-2"
                                            >
                                                <Edit size={16} />
                                                Editar
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(product.id)}
                                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Eliminar Producto"
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Variants table */}
                            {expandedProduct === product.id && product.variants && product.variants.length > 0 && (
                                <div className="mt-4 pt-4 border-t">
                                    <h4 className="text-sm font-medium text-gray-700 mb-3">Variantes</h4>
                                    <div className="table-container">
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th className="w-12">Foto</th>
                                                    <th>Color</th>
                                                    <th>Tallas</th>
                                                    <th className="text-right">Stock Total</th>
                                                    <th className="text-right">Precio</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {groupVariantsByColor(product.variants).map((group, idx) => (
                                                    <tr key={idx}>
                                                        <td>
                                                            {group.image_url ? (
                                                                <img src={group.image_url} alt="" className="w-10 h-10 rounded object-cover border" />
                                                            ) : (
                                                                <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                                                                    <Camera size={16} className="text-gray-400" />
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="font-semibold text-gray-800">{group.color}</td>
                                                        <td>
                                                            <div className="flex flex-wrap gap-1">
                                                                {group.sizes.map(size => (
                                                                    <span key={size} className="bg-gray-100 px-2 py-0.5 rounded text-xs border border-gray-200">
                                                                        {size}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </td>
                                                        <td className="text-right">
                                                            <span className={`font-bold ${group.totalStock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                {group.totalStock}
                                                            </span>
                                                        </td>
                                                        <td className="text-right font-medium">
                                                            ${(product.variants?.[0]?.price || 0).toLocaleString()}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {expandedProduct === product.id && (!product.variants || product.variants.length === 0) && (
                                <div className="mt-4 pt-4 border-t text-center py-4">
                                    <p className="text-gray-500 text-sm">
                                        Este producto no tiene variantes registradas
                                    </p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
