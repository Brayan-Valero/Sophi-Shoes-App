import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { Supplier, SupplierInsert } from '../../types/database'
import { ArrowLeft, Save, Building2 } from 'lucide-react'

export default function SupplierFormPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const isEditing = Boolean(id)

    const [formData, setFormData] = useState<SupplierInsert>({
        name: '',
        contact_name: '',
        phone: '',
        email: '',
        address: '',
        notes: '',
        is_active: true,
    })
    const [error, setError] = useState<string | null>(null)

    // Fetch supplier for editing
    const { data: supplier, isLoading: loadingSupplier } = useQuery({
        queryKey: ['supplier', id],
        queryFn: async () => {
            if (!id || !isSupabaseConfigured()) return null

            const { data, error } = await supabase
                .from('suppliers')
                .select('*')
                .eq('id', id)
                .single()

            if (error) throw error
            return data as Supplier
        },
        enabled: isEditing,
    })

    // Populate form when editing
    useEffect(() => {
        if (supplier) {
            setFormData({
                name: supplier.name,
                contact_name: supplier.contact_name || '',
                phone: supplier.phone || '',
                email: supplier.email || '',
                address: supplier.address || '',
                notes: supplier.notes || '',
                is_active: supplier.is_active,
            })
        }
    }, [supplier])

    // Create/Update mutation
    const saveMutation = useMutation({
        mutationFn: async (data: SupplierInsert) => {
            if (!isSupabaseConfigured()) {
                throw new Error('Supabase no configurado')
            }

            if (isEditing && id) {
                const { error } = await supabase
                    .from('suppliers')
                    .update({ ...data, updated_at: new Date().toISOString() })
                    .eq('id', id)

                if (error) throw error
            } else {
                const { error } = await supabase
                    .from('suppliers')
                    .insert(data)

                if (error) throw error
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['suppliers'] })
            navigate('/suppliers')
        },
        onError: (err: Error) => {
            setError(err.message)
        },
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (!formData.name.trim()) {
            setError('El nombre es requerido')
            return
        }

        saveMutation.mutate(formData)
    }

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value, type } = e.target
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
        }))
    }

    if (isEditing && loadingSupplier) {
        return (
            <div className="card text-center py-12">
                <div className="spinner mx-auto"></div>
                <p className="text-gray-500 mt-4">Cargando proveedor...</p>
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/suppliers')}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <ArrowLeft size={24} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">
                        {isEditing ? 'Editar Proveedor' : 'Nuevo Proveedor'}
                    </h1>
                    <p className="text-gray-500">
                        {isEditing ? 'Modifica los datos del proveedor' : 'Agrega un nuevo proveedor al sistema'}
                    </p>
                </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="card space-y-6">
                {/* Icon */}
                <div className="flex justify-center">
                    <div className="w-20 h-20 bg-primary-100 rounded-2xl flex items-center justify-center">
                        <Building2 className="text-primary-600" size={40} />
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                        {error}
                    </div>
                )}

                {/* Name */}
                <div className="form-group">
                    <label htmlFor="name" className="form-label">
                        Nombre del Proveedor *
                    </label>
                    <input
                        id="name"
                        name="name"
                        type="text"
                        value={formData.name}
                        onChange={handleChange}
                        className="form-input"
                        placeholder="Ej: Calzado Colombia S.A.S"
                        required
                    />
                </div>

                {/* Contact Name */}
                <div className="form-group">
                    <label htmlFor="contact_name" className="form-label">
                        Nombre del Contacto
                    </label>
                    <input
                        id="contact_name"
                        name="contact_name"
                        type="text"
                        value={formData.contact_name || ''}
                        onChange={handleChange}
                        className="form-input"
                        placeholder="Ej: Juan Pérez"
                    />
                </div>

                {/* Phone & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="form-group">
                        <label htmlFor="phone" className="form-label">
                            Teléfono
                        </label>
                        <input
                            id="phone"
                            name="phone"
                            type="tel"
                            value={formData.phone || ''}
                            onChange={handleChange}
                            className="form-input"
                            placeholder="Ej: +57 300 123 4567"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="email" className="form-label">
                            Correo Electrónico
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            value={formData.email || ''}
                            onChange={handleChange}
                            className="form-input"
                            placeholder="Ej: contacto@proveedor.com"
                        />
                    </div>
                </div>

                {/* Address */}
                <div className="form-group">
                    <label htmlFor="address" className="form-label">
                        Dirección
                    </label>
                    <input
                        id="address"
                        name="address"
                        type="text"
                        value={formData.address || ''}
                        onChange={handleChange}
                        className="form-input"
                        placeholder="Ej: Calle 123 #45-67, Bogotá"
                    />
                </div>

                {/* Notes */}
                <div className="form-group">
                    <label htmlFor="notes" className="form-label">
                        Notas
                    </label>
                    <textarea
                        id="notes"
                        name="notes"
                        value={formData.notes || ''}
                        onChange={handleChange}
                        className="form-input min-h-[100px]"
                        placeholder="Información adicional sobre el proveedor..."
                    />
                </div>

                {/* Active status */}
                <div className="flex items-center gap-3">
                    <input
                        id="is_active"
                        name="is_active"
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={handleChange}
                        className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <label htmlFor="is_active" className="text-sm text-gray-700">
                        Proveedor activo
                    </label>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                    <button
                        type="button"
                        onClick={() => navigate('/suppliers')}
                        className="btn-secondary"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={saveMutation.isPending}
                        className="btn-primary flex items-center gap-2"
                    >
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
