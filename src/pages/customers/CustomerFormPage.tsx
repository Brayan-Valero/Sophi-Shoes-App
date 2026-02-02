import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { Customer, CustomerInsert, DocumentType, PersonType, TaxRegime } from '../../types/database'
import { ArrowLeft, Save, User, MapPin, Mail, Phone } from 'lucide-react'

export default function CustomerFormPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const isEditing = Boolean(id)

    const [formData, setFormData] = useState<CustomerInsert>({
        full_name: '',
        document_type: '13',
        identification: '',
        verification_digit: null,
        person_type: '2',
        tax_regime: '49',
        email: '',
        phone: '',
        address: '',
        municipality_code: '',
        department_code: '',
        is_active: true,
    })

    const { data: customer, isLoading } = useQuery({
        queryKey: ['customer', id],
        queryFn: async () => {
            if (!id || !isSupabaseConfigured()) return null
            const { data, error } = await supabase
                .from('customers')
                .select('*')
                .eq('id', id)
                .single()
            if (error) throw error
            return data as Customer
        },
        enabled: isEditing,
    })

    useEffect(() => {
        if (customer) {
            setFormData({
                full_name: customer.full_name,
                document_type: customer.document_type,
                identification: customer.identification,
                verification_digit: customer.verification_digit,
                person_type: customer.person_type,
                tax_regime: customer.tax_regime,
                email: customer.email,
                phone: customer.phone || '',
                address: customer.address || '',
                municipality_code: customer.municipality_code || '',
                department_code: customer.department_code || '',
                is_active: customer.is_active,
            })
        }
    }, [customer])

    const saveMutation = useMutation({
        mutationFn: async () => {
            if (!isSupabaseConfigured()) throw new Error('Supabase no configurado')

            if (isEditing) {
                const { error } = await supabase
                    .from('customers')
                    .update({ ...formData, updated_at: new Date().toISOString() })
                    .eq('id', id)
                if (error) throw error
            } else {
                const { error } = await supabase
                    .from('customers')
                    .insert([formData])
                if (error) throw error
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['customers'] })
            navigate('/customers')
        },
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        saveMutation.mutate()
    }

    if (isEditing && isLoading) {
        return <div className="flex justify-center py-12"><div className="spinner w-8 h-8"></div></div>
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <button
                onClick={() => navigate('/customers')}
                className="flex items-center gap-2 text-gray-500 hover:text-primary-600 transition-colors"
            >
                <ArrowLeft size={20} />
                Volver a clientes
            </button>

            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-serif font-bold text-gray-800">
                    {isEditing ? 'Editar Cliente' : 'Nuevo Cliente'}
                </h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="card p-6 space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-100 mb-4">
                        <User className="text-primary-500" size={20} />
                        <h2 className="font-bold text-gray-800">Información General</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2 space-y-1">
                            <label className="text-xs font-medium text-gray-500">Nombre Completo o Razón Social</label>
                            <input
                                type="text"
                                required
                                className="form-input"
                                value={formData.full_name}
                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-500">Tipo de Documento</label>
                            <select
                                className="form-input"
                                value={formData.document_type}
                                onChange={(e) => setFormData({ ...formData, document_type: e.target.value as DocumentType })}
                            >
                                <option value="13">Cédula de Ciudadanía</option>
                                <option value="31">NIT</option>
                                <option value="11">Registro Civil</option>
                                <option value="12">Tarjeta de Identidad</option>
                                <option value="21">Tarjeta de Extranjería</option>
                                <option value="22">Cédula de Extranjería</option>
                                <option value="41">Pasaporte</option>
                                <option value="50">NIT otro país</option>
                            </select>
                        </div>

                        <div className="flex gap-2">
                            <div className="flex-1 space-y-1">
                                <label className="text-xs font-medium text-gray-500">Número de Identificación</label>
                                <input
                                    type="text"
                                    required
                                    className="form-input"
                                    value={formData.identification}
                                    onChange={(e) => setFormData({ ...formData, identification: e.target.value.replace(/\D/g, '') })}
                                />
                            </div>
                            {formData.document_type === '31' && (
                                <div className="w-16 space-y-1">
                                    <label className="text-xs font-medium text-gray-500">DV</label>
                                    <input
                                        type="text"
                                        maxLength={1}
                                        className="form-input text-center"
                                        placeholder="0"
                                        value={formData.verification_digit || ''}
                                        onChange={(e) => setFormData({ ...formData, verification_digit: e.target.value })}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-500">Tipo de Persona</label>
                            <select
                                className="form-input"
                                value={formData.person_type}
                                onChange={(e) => setFormData({ ...formData, person_type: e.target.value as PersonType })}
                            >
                                <option value="1">Persona Jurídica</option>
                                <option value="2">Persona Natural</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-500">Régimen Fiscal</label>
                            <select
                                className="form-input"
                                value={formData.tax_regime}
                                onChange={(e) => setFormData({ ...formData, tax_regime: e.target.value as TaxRegime })}
                            >
                                <option value="48">Responsable de IVA</option>
                                <option value="49">No responsable de IVA</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="card p-6 space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-100 mb-4">
                        <MapPin className="text-primary-500" size={20} />
                        <h2 className="font-bold text-gray-800">Ubicación y Contacto</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-500">Email (Obligatorio para Factura Electrónica)</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input
                                    type="email"
                                    required
                                    className="form-input pl-10"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-500">Teléfono</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input
                                    type="tel"
                                    className="form-input pl-10"
                                    value={formData.phone || ''}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="md:col-span-2 space-y-1">
                            <label className="text-xs font-medium text-gray-500">Dirección</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Ej: Calle 123 #45-67"
                                value={formData.address || ''}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-500">Código Ciudad (Cód. Dane)</label>
                            <input
                                type="text"
                                maxLength={5}
                                className="form-input"
                                placeholder="Ej: 05001 (Medellín)"
                                value={formData.municipality_code || ''}
                                onChange={(e) => setFormData({ ...formData, municipality_code: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-500">Código Depto</label>
                            <input
                                type="text"
                                maxLength={2}
                                className="form-input"
                                placeholder="Ej: 05 (Antioquia)"
                                value={formData.department_code || ''}
                                onChange={(e) => setFormData({ ...formData, department_code: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-6">
                    <button
                        type="button"
                        onClick={() => navigate('/customers')}
                        className="btn-secondary"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={saveMutation.isPending}
                        className="btn-primary flex items-center gap-2 px-8"
                    >
                        {saveMutation.isPending ? (
                            <div className="spinner w-5 h-5 border-white"></div>
                        ) : (
                            <>
                                <Save size={20} />
                                {isEditing ? 'Actualizar Cliente' : 'Guardar Cliente'}
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    )
}
