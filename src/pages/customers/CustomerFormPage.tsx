import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { Customer, CustomerInsert, ClientType } from '../../types/database'
import { ArrowLeft, Save, User, Mail, Phone, MapPin, Truck } from 'lucide-react'

export default function CustomerFormPage() {
    const { id } = useParams()
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const isEditing = Boolean(id)
    
    // Determine if this is a shipping client form based on URL param or existing customer data
    const urlClientType = searchParams.get('type') as ClientType | null
    const [clientType, setClientType] = useState<ClientType>(urlClientType || 'standard')

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
        client_type: clientType,
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
            setClientType(customer.client_type || 'standard')
            setFormData({
                full_name: customer.full_name,
                document_type: customer.document_type || '13',
                identification: customer.identification || '',
                verification_digit: customer.verification_digit,
                person_type: customer.person_type || '2',
                tax_regime: customer.tax_regime || '49',
                email: customer.email || '',
                phone: customer.phone || '',
                address: customer.address || '',
                municipality_code: customer.municipality_code || '',
                department_code: customer.department_code || '',
                is_active: customer.is_active,
                client_type: customer.client_type || 'standard',
            })
        }
    }, [customer])

    // Update formData.client_type when clientType changes (for new customers)
    useEffect(() => {
        if (!isEditing) {
            setFormData(prev => ({ ...prev, client_type: clientType }))
        }
    }, [clientType, isEditing])

    const isShipping = clientType === 'shipping'

    const saveMutation = useMutation({
        mutationFn: async () => {
            if (!isSupabaseConfigured()) throw new Error('Supabase no configurado')

            const payload = {
                ...formData,
                client_type: clientType,
                updated_at: new Date().toISOString()
            }

            if (isEditing) {
                const { error } = await supabase
                    .from('customers')
                    .update(payload)
                    .eq('id', id)
                if (error) throw error
            } else {
                const { error } = await supabase
                    .from('customers')
                    .insert([payload])
                if (error) throw error
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['customers'] })
            // Navigate back to appropriate list
            navigate(isShipping ? '/customers?tab=shipping' : '/customers')
        },
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        saveMutation.mutate()
    }

    const backPath = isShipping ? '/customers?tab=shipping' : '/customers'

    if (isEditing && isLoading) {
        return <div className="flex justify-center py-12"><div className="spinner w-8 h-8"></div></div>
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <button
                onClick={() => navigate(backPath)}
                className="flex items-center gap-2 text-gray-500 hover:text-primary-600 transition-colors"
            >
                <ArrowLeft size={20} />
                Volver a {isShipping ? 'clientes de envíos' : 'clientes'}
            </button>

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {isShipping && <Truck className="text-blue-500" size={28} />}
                    <h1 className="text-2xl font-serif font-bold text-gray-800">
                        {isEditing 
                            ? (isShipping ? 'Editar Cliente de Envío' : 'Editar Cliente')
                            : (isShipping ? 'Nuevo Cliente de Envío' : 'Nuevo Cliente')
                        }
                    </h1>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="card p-6 space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-100 mb-4">
                        {isShipping ? <Truck className="text-blue-500" size={20} /> : <User className="text-primary-500" size={20} />}
                        <h2 className="font-bold text-gray-800">
                            {isShipping ? 'Datos del Destinatario' : 'Información Básica'}
                        </h2>
                    </div>

                    <div className="space-y-4">
                        {/* NOMBRE (Obligatorio) */}
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-500">Nombre Completo *</label>
                            <input
                                type="text"
                                required
                                className="form-input"
                                placeholder="Ej: Juan Pérez"
                                value={formData.full_name}
                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                            />
                        </div>

                        {/* TELÉFONO (Obligatorio) */}
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-500">Teléfono / Celular *</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input
                                    type="tel"
                                    required
                                    className="form-input pl-10"
                                    placeholder="Ej: 300 123 4567"
                                    value={formData.phone || ''}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* DIRECCIÓN - OBLIGATORIA para Envíos */}
                        {isShipping && (
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-500">
                                    Dirección de Entrega *
                                </label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input
                                        type="text"
                                        required
                                        className="form-input pl-10"
                                        placeholder="Ej: Calle 123 #45-67, Barrio, Ciudad"
                                        value={formData.address || ''}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    />
                                </div>
                            </div>
                        )}

                        {/* IDENTIFICACIÓN - Obligatorio para envíos, Opcional para standard */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-500">
                                    Identificación {isShipping ? '*' : <span className="text-gray-400 font-normal">(Opcional)</span>}
                                </label>
                                <input
                                    type="text"
                                    required={isShipping}
                                    className="form-input"
                                    placeholder="Cédula o NIT"
                                    value={formData.identification || ''}
                                    onChange={(e) => setFormData({ ...formData, identification: e.target.value })}
                                />
                            </div>

                            {/* CORREO (Opcional) */}
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-500">
                                    Correo Electrónico <span className="text-gray-400 font-normal">(Opcional)</span>
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input
                                        type="email"
                                        className="form-input pl-10"
                                        placeholder="correo@ejemplo.com"
                                        value={formData.email || ''}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* TIPO DE PERSONA - Solo mostrar para clientes estándar */}
                        {!isShipping && (
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-500">Tipo de Persona</label>
                                <div className="flex gap-4 pt-1">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="person_type"
                                            value="2"
                                            checked={formData.person_type === '2'}
                                            onChange={() => setFormData({ ...formData, person_type: '2' })}
                                            className="text-primary-600 focus:ring-primary-500"
                                        />
                                        <span className="text-sm">Persona Natural</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="person_type"
                                            value="1"
                                            checked={formData.person_type === '1'}
                                            onChange={() => setFormData({ ...formData, person_type: '1' })}
                                            className="text-primary-600 focus:ring-primary-500"
                                        />
                                        <span className="text-sm">Persona Jurídica (Empresa)</span>
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-6">
                    <button
                        type="button"
                        onClick={() => navigate(backPath)}
                        className="btn-secondary"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={saveMutation.isPending}
                        className={`flex items-center gap-2 px-8 ${isShipping ? 'bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold py-2.5 transition-all' : 'btn-primary'}`}
                    >
                        {saveMutation.isPending ? (
                            <div className="spinner w-5 h-5 border-white"></div>
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
