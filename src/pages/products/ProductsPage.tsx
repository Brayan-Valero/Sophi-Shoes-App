import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { Product } from '../../types/database'
import { useAuth } from '../../contexts/AuthContext'
import { Plus, Search, Package, Edit, ChevronDown, ChevronUp } from 'lucide-react'

export default function ProductsPage() {
    const { isAdmin } = useAuth()
    const [searchTerm, setSearchTerm] = useState('')
    const [expandedProduct, setExpandedProduct] = useState<string | null>(null)

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
    const filteredProducts = products.filter(
        (product) =>
            product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.category?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // Calculate total stock for a product
    const getTotalStock = (product: Product) => {
        return product.variants?.reduce((sum, v) => sum + v.stock, 0) || 0
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Productos</h1>
                    <p className="text-gray-500">Gestiona el catálogo de calzado e inventario</p>
                </div>
                {isAdmin && (
                    <Link to="/products/new" className="btn-primary flex items-center gap-2 w-fit">
                        <Plus size={20} />
                        Nuevo Producto
                    </Link>
                )}
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
                                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <Package className="text-blue-600" size={24} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold text-gray-800">{product.name}</h3>
                                            {!product.is_active && (
                                                <span className="badge-warning">Inactivo</span>
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
                                        <Link
                                            to={`/products/${product.id}`}
                                            className="btn-primary flex items-center gap-2"
                                        >
                                            <Edit size={16} />
                                            Editar
                                        </Link>
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
                                                    <th>Talla</th>
                                                    <th>Color</th>
                                                    <th>SKU</th>
                                                    <th className="text-right">Costo</th>
                                                    <th className="text-right">Precio</th>
                                                    <th className="text-right">Stock</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {product.variants.map((variant) => (
                                                    <tr key={variant.id}>
                                                        <td className="font-medium">{variant.size}</td>
                                                        <td>{variant.color}</td>
                                                        <td className="text-gray-500">{variant.sku || '-'}</td>
                                                        <td className="text-right">${variant.cost.toLocaleString()}</td>
                                                        <td className="text-right">${variant.price.toLocaleString()}</td>
                                                        <td className="text-right">
                                                            <span
                                                                className={`font-medium ${variant.stock <= variant.min_stock
                                                                        ? 'text-red-600'
                                                                        : 'text-green-600'
                                                                    }`}
                                                            >
                                                                {variant.stock}
                                                            </span>
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
