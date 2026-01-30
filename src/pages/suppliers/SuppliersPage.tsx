import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { Supplier } from '../../types/database'
import { Plus, Edit, Search, Building2, Phone, Mail } from 'lucide-react'

export default function SuppliersPage() {
    const [searchTerm, setSearchTerm] = useState('')
    const queryClient = useQueryClient()

    // Fetch suppliers
    const { data: suppliers = [], isLoading } = useQuery({
        queryKey: ['suppliers'],
        queryFn: async () => {
            if (!isSupabaseConfigured()) return []

            const { data, error } = await supabase
                .from('suppliers')
                .select('*')
                .order('name')

            if (error) throw error
            return data as Supplier[]
        },
    })

    // Toggle active status
    const toggleActiveMutation = useMutation({
        mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
            const { error } = await supabase
                .from('suppliers')
                .update({ is_active: isActive, updated_at: new Date().toISOString() })
                .eq('id', id)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['suppliers'] })
        },
    })

    // Filter suppliers
    const filteredSuppliers = suppliers.filter(
        (supplier) =>
            supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            supplier.contact_name?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Proveedores</h1>
                    <p className="text-gray-500">Gestiona los fabricantes y proveedores de calzado</p>
                </div>
                <Link to="/suppliers/new" className="btn-primary flex items-center gap-2 w-fit">
                    <Plus size={20} />
                    Nuevo Proveedor
                </Link>
            </div>

            {/* Search */}
            <div className="card">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o contacto..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="form-input pl-10"
                    />
                </div>
            </div>

            {/* Suppliers list */}
            {isLoading ? (
                <div className="card text-center py-12">
                    <div className="spinner mx-auto"></div>
                    <p className="text-gray-500 mt-4">Cargando proveedores...</p>
                </div>
            ) : filteredSuppliers.length === 0 ? (
                <div className="card text-center py-12">
                    <Building2 className="mx-auto text-gray-300" size={48} />
                    <h3 className="mt-4 text-lg font-medium text-gray-800">No hay proveedores</h3>
                    <p className="text-gray-500 mt-1">
                        {searchTerm
                            ? 'No se encontraron proveedores con ese criterio'
                            : 'Comienza agregando tu primer proveedor'}
                    </p>
                    {!searchTerm && (
                        <Link to="/suppliers/new" className="btn-primary mt-4 inline-flex items-center gap-2">
                            <Plus size={20} />
                            Agregar Proveedor
                        </Link>
                    )}
                </div>
            ) : (
                <div className="grid gap-4">
                    {filteredSuppliers.map((supplier) => (
                        <div
                            key={supplier.id}
                            className={`card hover:shadow-md transition-shadow ${!supplier.is_active ? 'opacity-60' : ''
                                }`}
                        >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <Building2 className="text-primary-600" size={24} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold text-gray-800">{supplier.name}</h3>
                                            {!supplier.is_active && (
                                                <span className="badge-warning">Inactivo</span>
                                            )}
                                        </div>
                                        {supplier.contact_name && (
                                            <p className="text-sm text-gray-600 mt-1">
                                                Contacto: {supplier.contact_name}
                                            </p>
                                        )}
                                        <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
                                            {supplier.phone && (
                                                <span className="flex items-center gap-1">
                                                    <Phone size={14} />
                                                    {supplier.phone}
                                                </span>
                                            )}
                                            {supplier.email && (
                                                <span className="flex items-center gap-1">
                                                    <Mail size={14} />
                                                    {supplier.email}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 sm:flex-shrink-0">
                                    <button
                                        onClick={() =>
                                            toggleActiveMutation.mutate({
                                                id: supplier.id,
                                                isActive: !supplier.is_active,
                                            })
                                        }
                                        className={`btn text-sm ${supplier.is_active ? 'btn-secondary' : 'btn-success'
                                            }`}
                                    >
                                        {supplier.is_active ? 'Desactivar' : 'Activar'}
                                    </button>
                                    <Link
                                        to={`/suppliers/${supplier.id}`}
                                        className="btn-primary flex items-center gap-2"
                                    >
                                        <Edit size={16} />
                                        Editar
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
