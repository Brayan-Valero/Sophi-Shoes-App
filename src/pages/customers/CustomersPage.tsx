import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { Customer, ClientType } from '../../types/database'
import { Plus, Search, User, Mail, Phone, MapPin, ChevronRight, Truck, Users } from 'lucide-react'

export default function CustomersPage() {
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()
    const [searchTerm, setSearchTerm] = useState('')

    // Tab state from URL
    const currentTab = (searchParams.get('tab') as ClientType) || 'standard'

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

    // Filter by client_type and search term
    const filteredCustomers = customers.filter(c => {
        const matchesType = (c.client_type || 'standard') === currentTab
        const matchesSearch = c.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (c.identification || '').includes(searchTerm) ||
            (c.phone || '').includes(searchTerm)
        return matchesType && matchesSearch
    })

    const standardCount = customers.filter(c => (c.client_type || 'standard') === 'standard').length
    const shippingCount = customers.filter(c => c.client_type === 'shipping').length

    const handleTabChange = (tab: ClientType) => {
        setSearchParams({ tab })
    }

    const isShipping = currentTab === 'shipping'

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-serif font-bold text-gray-800">Clientes</h1>
                    <p className="text-gray-500">
                        {isShipping ? 'Clientes para envíos (Dropi / Contraentrega)' : 'Clientes locales del almacén'}
                    </p>
                </div>
                <button
                    onClick={() => navigate(isShipping ? '/customers/new?type=shipping' : '/customers/new')}
                    className={`flex items-center gap-2 ${isShipping ? 'bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold py-2.5 px-4 transition-all' : 'btn-primary'}`}
                >
                    <Plus size={20} />
                    {isShipping ? 'Nuevo Cliente Envío' : 'Nuevo Cliente'}
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-gray-200">
                <button
                    onClick={() => handleTabChange('standard')}
                    className={`flex items-center gap-2 px-4 py-2.5 font-medium text-sm border-b-2 transition-all ${currentTab === 'standard'
                            ? 'border-primary-500 text-primary-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <Users size={18} />
                    Clientes Locales
                    <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-gray-100">{standardCount}</span>
                </button>
                <button
                    onClick={() => handleTabChange('shipping')}
                    className={`flex items-center gap-2 px-4 py-2.5 font-medium text-sm border-b-2 transition-all ${currentTab === 'shipping'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <Truck size={18} />
                    Clientes Envíos
                    <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-gray-100">{shippingCount}</span>
                </button>
            </div>

            {/* Search */}
            <div className="card p-4">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder={isShipping ? "Buscar por nombre, teléfono..." : "Buscar por nombre o identificación..."}
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
                            className={`card p-5 hover:shadow-md transition-shadow cursor-pointer group ${isShipping ? 'border-l-4 border-l-blue-400' : ''}`}
                            onClick={() => navigate(`/customers/${customer.id}`)}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${isShipping ? 'bg-blue-100 text-blue-600' : 'bg-secondary-100 text-secondary-600'}`}>
                                    {isShipping ? <Truck size={24} /> : <User size={24} />}
                                </div>
                                <div className="flex-1 ml-4 min-w-0">
                                    <h3 className={`font-bold text-gray-800 truncate transition-colors ${isShipping ? 'group-hover:text-blue-600' : 'group-hover:text-primary-600'}`}>
                                        {customer.full_name}
                                    </h3>
                                    {customer.identification && (
                                        <div className="text-xs text-gray-500 mt-0.5">
                                            ID: {customer.identification}
                                        </div>
                                    )}
                                </div>
                                <ChevronRight className={`${isShipping ? 'text-blue-300 group-hover:text-blue-400' : 'text-gray-300 group-hover:text-primary-400'}`} size={20} />
                            </div>

                            <div className="space-y-2 text-sm text-gray-600">
                                {customer.phone && (
                                    <div className="flex items-center gap-2">
                                        <Phone size={14} className="text-gray-400" />
                                        <span>{customer.phone}</span>
                                    </div>
                                )}
                                {customer.email && (
                                    <div className="flex items-center gap-2">
                                        <Mail size={14} className="text-gray-400" />
                                        <span className="truncate">{customer.email}</span>
                                    </div>
                                )}
                                {isShipping && customer.address && (
                                    <div className="flex items-center gap-2">
                                        <MapPin size={14} className="text-blue-400" />
                                        <span className="truncate text-blue-700">{customer.address}</span>
                                    </div>
                                )}
                            </div>

                            {!isShipping && (
                                <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                                    <span className="text-gray-400">
                                        {customer.person_type === '1' ? 'Persona Jurídica' : 'Persona Natural'}
                                    </span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="card p-12 text-center text-gray-500">
                    {isShipping ? <Truck size={48} className="mx-auto mb-4 opacity-20" /> : <User size={48} className="mx-auto mb-4 opacity-20" />}
                    <p>No se encontraron clientes {isShipping ? 'de envío' : 'locales'}.</p>
                    <button
                        onClick={() => navigate(isShipping ? '/customers/new?type=shipping' : '/customers/new')}
                        className="mt-4 text-primary-600 hover:underline"
                    >
                        + Agregar primer cliente
                    </button>
                </div>
            )}
        </div>
    )
}
