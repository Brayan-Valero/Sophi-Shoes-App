import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { Customer } from '../../types/database'
import { Plus, Search, User, Mail, Phone, MapPin, CreditCard, ChevronRight } from 'lucide-react'

export default function CustomersPage() {
    const navigate = useNavigate()
    const [searchTerm, setSearchTerm] = useState('')

    const { data: customers = [], isLoading } = useQuery({
        queryKey: ['customers'],
        queryFn: async () => {
            if (!isSupabaseConfigured()) return []
            const { data, error } = await supabase
                .from('customers')
                .select('*')
                .order('full_name')
            if (error) throw error
            return data as Customer[]
        },
    })

    const filteredCustomers = customers.filter(c =>
        c.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.identification.includes(searchTerm)
    )

    const getDocumentTypeName = (code: string) => {
        const types: Record<string, string> = {
            '13': 'Cédula de Ciudadanía',
            '31': 'NIT',
            '11': 'Registro Civil',
            '12': 'Tarjeta de Identidad',
            '21': 'Tarjeta de Extranjería',
            '22': 'Cédula de Extranjería',
            '41': 'Pasaporte',
            '42': 'Documento de Identificación Extranjero',
            '50': 'NIT de otro país',
            '91': 'NUIP',
        }
        return types[code] || 'Otro'
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-serif font-bold text-gray-800">Clientes</h1>
                    <p className="text-gray-500">Gestión de clientes y facturación electrónica</p>
                </div>
                <button
                    onClick={() => navigate('/customers/new')}
                    className="btn-primary flex items-center gap-2"
                >
                    <Plus size={20} />
                    Nuevo Cliente
                </button>
            </div>

            {/* Search and Filters */}
            <div className="card p-4">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o identificación..."
                        className="form-input pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Customers List */}
            {isLoading ? (
                <div className="flex justify-center py-12">
                    <div className="spinner w-8 h-8 border-primary-500"></div>
                </div>
            ) : filteredCustomers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredCustomers.map((customer) => (
                        <div
                            key={customer.id}
                            className="card p-5 hover:shadow-md transition-shadow cursor-pointer group"
                            onClick={() => navigate(`/customers/${customer.id}`)}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-12 h-12 rounded-full bg-secondary-100 flex items-center justify-center text-secondary-600 flex-shrink-0">
                                    <User size={24} />
                                </div>
                                <div className="flex-1 ml-4 min-w-0">
                                    <h3 className="font-bold text-gray-800 truncate group-hover:text-primary-600 transition-colors">
                                        {customer.full_name}
                                    </h3>
                                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                                        <CreditCard size={12} />
                                        <span>{getDocumentTypeName(customer.document_type)}: {customer.identification}</span>
                                        {customer.verification_digit && <span>-{customer.verification_digit}</span>}
                                    </div>
                                </div>
                                <ChevronRight className="text-gray-300 group-hover:text-primary-400" size={20} />
                            </div>

                            <div className="space-y-2 text-sm text-gray-600">
                                <div className="flex items-center gap-2">
                                    <Mail size={14} className="text-gray-400" />
                                    <span className="truncate">{customer.email}</span>
                                </div>
                                {customer.phone && (
                                    <div className="flex items-center gap-2">
                                        <Phone size={14} className="text-gray-400" />
                                        <span>{customer.phone}</span>
                                    </div>
                                )}
                                {customer.address && (
                                    <div className="flex items-center gap-2">
                                        <MapPin size={14} className="text-gray-400" />
                                        <span className="truncate">{customer.address}</span>
                                    </div>
                                )}
                            </div>

                            <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                                <span className={`px-2 py-0.5 rounded-full ${customer.tax_regime === '48' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'}`}>
                                    {customer.tax_regime === '48' ? 'Responsable IVA' : 'No Responsable'}
                                </span>
                                <span className="text-gray-400">
                                    {customer.person_type === '1' ? 'Persona Jurídica' : 'Persona Natural'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="card p-12 text-center text-gray-500">
                    <User size={48} className="mx-auto mb-4 opacity-20" />
                    <p>No se encontraron clientes.</p>
                </div>
            )}
        </div>
    )
}
