import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { Product, ProductInsert, ProductVariantInsert, Supplier } from '../../types/database'
import { ArrowLeft, Save, Package, Plus, Trash2 } from 'lucide-react'
import ImageUpload from '../../components/ui/ImageUpload'

interface VariantForm {
    id?: string
    size: string
    color: string
    sku: string
    cost: number
    price: number
    stock: number
    min_stock: number
    image_url: string | null
}

export default function ProductFormPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const isEditing = Boolean(id)

    const [formData, setFormData] = useState<ProductInsert>({
        name: '',
        description: '',
        category: '',
        supplier_id: null,
        is_active: true,
        image_url: null,
    })
    const [variants, setVariants] = useState<VariantForm[]>([])
    const [error, setError] = useState<string | null>(null)

    // Fetch suppliers for dropdown
    const { data: suppliers = [] } = useQuery({
        queryKey: ['suppliers-active'],
        queryFn: async () => {
            if (!isSupabaseConfigured()) return []
            const { data } = await supabase
                .from('suppliers')
                .select('id, name')
                .eq('is_active', true)
                .order('name')
            return data as Supplier[]
        },
    })

    // Fetch product for editing
    const { data: product, isLoading: loadingProduct } = useQuery({
        queryKey: ['product', id],
        queryFn: async () => {
            if (!id || !isSupabaseConfigured()) return null
            const { data, error } = await supabase
                .from('products')
                .select(`*, variants:product_variants(*)`)
                .eq('id', id)
                .single()
            if (error) throw error
            return data as Product
        },
        enabled: isEditing,
    })

    // Populate form when editing
    useEffect(() => {
        if (product) {
            setFormData({
                name: product.name,
                description: product.description || '',
                category: product.category || '',
                supplier_id: product.supplier_id,
                is_active: product.is_active,
                image_url: product.image_url || null,
            })
            if (product.variants) {
                setVariants(
                    product.variants.map((v) => ({
                        id: v.id,
                        size: v.size,
                        color: v.color,
                        sku: v.sku || '',
                        cost: v.cost,
                        price: v.price,
                        stock: v.stock,
                        min_stock: v.min_stock,
                        image_url: v.image_url || null,
                    }))
                )
            }
        }
    }, [product])

    // Save mutation
    const saveMutation = useMutation({
        mutationFn: async () => {
            if (!isSupabaseConfigured()) throw new Error('Supabase no configurado')

            let productId = id

            if (isEditing && id) {
                const { error } = await supabase
                    .from('products')
                    .update({ ...formData, updated_at: new Date().toISOString() })
                    .eq('id', id)
                if (error) throw error
            } else {
                const { data, error } = await supabase
                    .from('products')
                    .insert(formData)
                    .select('id')
                    .single()
                if (error) throw error
                productId = data.id
            }

            // Handle variants
            if (productId) {
                // Get existing variant IDs
                const existingIds = variants.filter((v) => v.id).map((v) => v.id)

                // Delete removed variants (only if editing)
                if (isEditing && product?.variants) {
                    const toDelete = product.variants.filter((v) => !existingIds.includes(v.id))
                    for (const v of toDelete) {
                        await supabase.from('product_variants').delete().eq('id', v.id)
                    }
                }

                // Upsert variants
                for (const variant of variants) {
                    const variantData: ProductVariantInsert = {
                        product_id: productId,
                        size: variant.size,
                        color: variant.color,
                        sku: variant.sku || null,
                        cost: variant.cost,
                        price: variant.price,
                        stock: variant.stock,
                        min_stock: variant.min_stock,
                        image_url: variant.image_url || null,
                    }

                    if (variant.id) {
                        await supabase
                            .from('product_variants')
                            .update({ ...variantData, updated_at: new Date().toISOString() })
                            .eq('id', variant.id)
                    } else {
                        await supabase.from('product_variants').insert(variantData)
                    }
                }
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] })
            navigate('/products')
        },
        onError: (err: Error) => {
            setError(err.message)
        },
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (!formData.name.trim()) {
            setError('El nombre del producto es requerido')
            return
        }

        saveMutation.mutate()
    }

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const { name, value, type } = e.target
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value || null,
        }))
    }

    const addVariant = () => {
        setVariants((prev) => [
            ...prev,
            { size: '', color: '', sku: '', cost: 0, price: 0, stock: 0, min_stock: 0, image_url: null },
        ])
    }

    const updateVariant = (index: number, field: keyof VariantForm, value: string | number | null) => {
        setVariants((prev) =>
            prev.map((v, i) => (i === index ? { ...v, [field]: value } : v))
        )
    }

    const removeVariant = (index: number) => {
        setVariants((prev) => prev.filter((_, i) => i !== index))
    }

    if (isEditing && loadingProduct) {
        return (
            <div className="card text-center py-12">
                <div className="spinner mx-auto"></div>
                <p className="text-gray-500 mt-4">Cargando producto...</p>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/products')}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <ArrowLeft size={24} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">
                        {isEditing ? 'Editar Producto' : 'Nuevo Producto'}
                    </h1>
                    <p className="text-gray-500">
                        {isEditing ? 'Modifica los datos del producto' : 'Agrega un nuevo producto al catálogo'}
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Product info card */}
                <div className="card space-y-6">
                    <div className="flex justify-center gap-8">
                        <div className="flex-1 max-w-[200px]">
                            <ImageUpload
                                value={formData.image_url}
                                onChange={(url) => setFormData(prev => ({ ...prev, image_url: url }))}
                                path="products"
                                label="Foto del Producto"
                            />
                        </div>
                        <div className="flex flex-col justify-center">
                            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-2">
                                <Package className="text-blue-600" size={32} />
                            </div>
                            <p className="text-xs text-gray-400 max-w-[150px]">Esta será la foto principal del catálogo.</p>
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Name */}
                    <div className="form-group">
                        <label htmlFor="name" className="form-label">Nombre del Producto *</label>
                        <input
                            id="name"
                            name="name"
                            type="text"
                            value={formData.name}
                            onChange={handleChange}
                            className="form-input"
                            placeholder="Ej: Bota Elegante Cuero"
                            required
                        />
                    </div>

                    {/* Category & Supplier */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="form-group">
                            <label htmlFor="category" className="form-label">Categoría</label>
                            <input
                                id="category"
                                name="category"
                                type="text"
                                value={formData.category || ''}
                                onChange={handleChange}
                                className="form-input"
                                placeholder="Ej: Botas, Tacones, Deportivos"
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="supplier_id" className="form-label">Proveedor</label>
                            <select
                                id="supplier_id"
                                name="supplier_id"
                                value={formData.supplier_id || ''}
                                onChange={handleChange}
                                className="form-select"
                            >
                                <option value="">Seleccionar proveedor...</option>
                                {suppliers.map((s) => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="form-group">
                        <label htmlFor="description" className="form-label">Descripción</label>
                        <textarea
                            id="description"
                            name="description"
                            value={formData.description || ''}
                            onChange={handleChange}
                            className="form-input min-h-[80px]"
                            placeholder="Descripción del producto..."
                        />
                    </div>

                    {/* Active */}
                    <div className="flex items-center gap-3">
                        <input
                            id="is_active"
                            name="is_active"
                            type="checkbox"
                            checked={formData.is_active}
                            onChange={handleChange}
                            className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <label htmlFor="is_active" className="text-sm text-gray-700">Producto activo</label>
                    </div>
                </div>

                {/* Variants card */}
                <div className="card">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-800">Variantes</h2>
                        <button type="button" onClick={addVariant} className="btn-secondary flex items-center gap-2">
                            <Plus size={16} />
                            Agregar Variante
                        </button>
                    </div>

                    {variants.length === 0 ? (
                        <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
                            <Package className="mx-auto text-gray-300" size={40} />
                            <p className="text-gray-500 mt-2">No hay variantes</p>
                            <button type="button" onClick={addVariant} className="btn-primary mt-4">
                                <Plus size={16} className="inline mr-1" />
                                Agregar Primera Variante
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {variants.map((variant, index) => (
                                <div key={index} className="p-4 bg-gray-50 rounded-xl border">
                                    <div className="flex justify-between items-start mb-3">
                                        <span className="text-sm font-medium text-gray-600">Variante {index + 1}</span>
                                        <button
                                            type="button"
                                            onClick={() => removeVariant(index)}
                                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                                        <div className="sm:col-span-1">
                                            <ImageUpload
                                                value={variant.image_url}
                                                onChange={(url) => updateVariant(index, 'image_url', url)}
                                                path="variants"
                                                label="Foto"
                                            />
                                        </div>
                                        <div className="sm:col-span-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                                            <div>
                                                <label className="text-xs text-gray-500">Talla *</label>
                                                <input
                                                    type="text"
                                                    value={variant.size}
                                                    onChange={(e) => updateVariant(index, 'size', e.target.value)}
                                                    className="form-input text-sm"
                                                    placeholder="37"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500">Color *</label>
                                                <input
                                                    type="text"
                                                    value={variant.color}
                                                    onChange={(e) => updateVariant(index, 'color', e.target.value)}
                                                    className="form-input text-sm"
                                                    placeholder="Negro"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500">SKU</label>
                                                <input
                                                    type="text"
                                                    value={variant.sku}
                                                    onChange={(e) => updateVariant(index, 'sku', e.target.value)}
                                                    className="form-input text-sm"
                                                    placeholder="ABC-001"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500">Stock Mín.</label>
                                                <input
                                                    type="number"
                                                    value={variant.min_stock}
                                                    onChange={(e) => updateVariant(index, 'min_stock', Number(e.target.value))}
                                                    className="form-input text-sm"
                                                    min="0"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500">Costo</label>
                                                <input
                                                    type="number"
                                                    value={variant.cost}
                                                    onChange={(e) => updateVariant(index, 'cost', Number(e.target.value))}
                                                    className="form-input text-sm"
                                                    min="0"
                                                    step="0.01"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500">Precio</label>
                                                <input
                                                    type="number"
                                                    value={variant.price}
                                                    onChange={(e) => updateVariant(index, 'price', Number(e.target.value))}
                                                    className="form-input text-sm"
                                                    min="0"
                                                    step="0.01"
                                                />
                                            </div>
                                            <div className="col-span-2 sm:col-span-2">
                                                <label className="text-xs text-gray-500">Stock Actual</label>
                                                <input
                                                    type="number"
                                                    value={variant.stock}
                                                    onChange={(e) => updateVariant(index, 'stock', Number(e.target.value))}
                                                    className="form-input text-sm"
                                                    min="0"
                                                    disabled={isEditing}
                                                    title={isEditing ? 'El stock se modifica mediante compras y ventas' : ''}
                                                />
                                                {isEditing && (
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        Stock se modifica con compras/ventas
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3">
                    <button type="button" onClick={() => navigate('/products')} className="btn-secondary">
                        Cancelar
                    </button>
                    <button type="submit" disabled={saveMutation.isPending} className="btn-primary flex items-center gap-2">
                        {saveMutation.isPending ? (
                            <>
                                <div className="spinner w-4 h-4 border-white/30 border-t-white"></div>
                                Guardando...
                            </>
                        ) : (
                            <>
                                <Save size={20} />
                                {isEditing ? 'Actualizar' : 'Guardar'}
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    )
}
