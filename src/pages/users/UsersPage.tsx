import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { Profile } from '../../types/database'
import { Search, UserPlus, Edit, Trash2, Shield, User } from 'lucide-react'

export default function UsersPage() {
    const [searchTerm, setSearchTerm] = useState('')
    const queryClient = useQueryClient()

    // Fetch profiles
    const { data: profiles = [], isLoading } = useQuery({
        queryKey: ['profiles'],
        queryFn: async () => {
            if (!isSupabaseConfigured()) return []
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('full_name')
            if (error) throw error
            return data as Profile[]
        },
    })

    // Delete profile mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            if (!isSupabaseConfigured()) throw new Error('Supabase no configurado')
            // Note: This only deletes the profile, not the auth user.
            // Deleting auth users requires admin service role which we don't have client-side.
            const { error } = await supabase.from('profiles').delete().eq('id', id)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['profiles'] })
        },
    })

    const filteredProfiles = profiles.filter(
        (p) =>
            p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.email.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const handleDelete = (id: string, name: string) => {
        if (window.confirm(`¿Estás seguro de eliminar a ${name}? Esta acción solo borra su perfil de datos, el acceso debe revocarse en Supabase.`)) {
            deleteMutation.mutate(id)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Cuentas y Vendedores</h1>
                    <p className="text-gray-500 text-sm">Gestiona quién tiene acceso al sistema y sus roles</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                        <UserPlus size={20} />
                    </div>
                    <div className="text-sm">
                        <p className="font-bold text-blue-900">¿Nuevo Vendedor?</p>
                        <p className="text-blue-700 text-xs">Regístralo primero en Supabase Auth</p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o email..."
                        className="form-input pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {isLoading ? (
                    <div className="col-span-full text-center py-12 text-gray-400">Cargando usuarios...</div>
                ) : filteredProfiles.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-gray-400">No se encontraron usuarios</div>
                ) : filteredProfiles.map((p) => (
                    <div key={p.id} className="card hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${p.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                                    }`}>
                                    {p.role === 'admin' ? <Shield size={24} /> : <User size={24} />}
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-bold text-gray-800 truncate">{p.full_name || 'Sin nombre'}</h3>
                                    <p className="text-xs text-secondary-600 font-medium uppercase tracking-wider">{p.role}</p>
                                </div>
                            </div>
                            <div className="flex gap-1">
                                <Link
                                    to={`/users/${p.id}`}
                                    className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                >
                                    <Edit size={18} />
                                </Link>
                                <button
                                    onClick={() => handleDelete(p.id, p.full_name || p.email)}
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-400">Email:</span>
                                <span className="text-gray-700 font-medium">{p.email}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-400">Creado:</span>
                                <span className="text-gray-700 font-medium">
                                    {p.created_at ? new Date(p.created_at).toLocaleDateString() : 'N/A'}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
