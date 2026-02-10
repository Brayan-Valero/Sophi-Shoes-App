import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { Profile } from '../../types/database'
import { ArrowLeft, Save, Shield, Info, ExternalLink } from 'lucide-react'

export default function UserFormPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const queryClient = useQueryClient()

    const [form, setForm] = useState({
        full_name: '',
        role: 'vendedor' as 'admin' | 'vendedor',
    })
    const [error, setError] = useState<string | null>(null)

    // Fetch existing profile
    const { data: profile, isLoading } = useQuery({
        queryKey: ['profile', id],
        queryFn: async () => {
            if (!isSupabaseConfigured() || !id) return null
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', id)
                .single()
            if (error) throw error
            return data as Profile
        },
        enabled: !!id,
    })

    useEffect(() => {
        if (profile) {
            setForm({
                full_name: profile.full_name || '',
                role: profile.role as 'admin' | 'vendedor',
            })
        }
    }, [profile])

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: async () => {
            if (!isSupabaseConfigured()) throw new Error('Supabase no configurado')
            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: form.full_name,
                    role: form.role,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['profiles'] })
            navigate('/users')
        },
        onError: (err: Error) => {
            setError(err.message)
        },
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        updateMutation.mutate()
    }

    if (isLoading) return <div className="text-center py-12 text-gray-400">Cargando...</div>

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/users')}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <ArrowLeft size={24} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">
                        Editar Perfil de Usuario
                    </h1>
                    <p className="text-gray-500">Configura el nombre y rol del sistema</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <form onSubmit={handleSubmit} className="card space-y-6">
                        <div className="flex justify-center">
                            <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center text-primary-600">
                                <Shield size={40} />
                            </div>
                        </div>

                        {error && (
                            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                                {error}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="form-group">
                                <label className="form-label">Nombre Completo</label>
                                <input
                                    type="text"
                                    required
                                    value={form.full_name}
                                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                                    className="form-input"
                                    placeholder="Nombre del vendedor"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Rol del Sistema</label>
                                <select
                                    value={form.role}
                                    onChange={(e) => setForm({ ...form, role: e.target.value as any })}
                                    className="form-select"
                                >
                                    <option value="vendedor">Vendedor (Acceso limitado a envíos)</option>
                                    <option value="admin">Administrador (Acceso total)</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Email (Bloqueado)</label>
                                <input
                                    type="email"
                                    disabled
                                    value={profile?.email || ''}
                                    className="form-input bg-gray-50 text-gray-400 cursor-not-allowed"
                                />
                                <p className="text-[10px] text-gray-400 mt-1 italic">El email no se puede cambiar ya que está vinculado al acceso de Supabase.</p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-6 border-t font-bold font-sans">
                            <button
                                type="button"
                                onClick={() => navigate('/users')}
                                className="btn-secondary"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={updateMutation.isPending}
                                className="btn-primary flex items-center gap-2"
                            >
                                {updateMutation.isPending ? 'Guardando...' : <><Save size={20} /> Guardar Cambios</>}
                            </button>
                        </div>
                    </form>
                </div>

                <div className="space-y-6">
                    <div className="card bg-blue-50 border-blue-100">
                        <div className="flex items-center gap-2 text-blue-700 mb-4">
                            <Info size={20} />
                            <h3 className="font-bold">Guía de Activación</h3>
                        </div>
                        <div className="space-y-4 text-sm text-blue-900 leading-relaxed">
                            <p>Para que un nuevo vendedor pueda entrar:</p>
                            <ol className="list-decimal list-inside space-y-2 font-medium">
                                <li>Ve a tu panel de **Supabase**.</li>
                                <li>Sección **Authentication {'>'} Users**.</li>
                                <li>Haz clic en **Add User {'>'} Invite User**.</li>
                                <li>Ingresa el email del vendedor.</li>
                            </ol>
                            <p className="text-xs mt-4 p-2 bg-blue-100/50 rounded border border-blue-200">
                                Una vez que el vendedor acepte la invitación, su perfil aparecerá automáticamente en esta lista.
                            </p>
                            <a
                                href="https://supabase.com/dashboard"
                                target="_blank"
                                className="inline-flex items-center gap-2 text-primary-600 font-bold hover:underline mt-2"
                            >
                                Ir al Dashboard <ExternalLink size={14} />
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
