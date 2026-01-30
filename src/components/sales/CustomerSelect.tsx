import { useState, useRef, useEffect } from 'react'
import { Search, UserPlus, User, X, Check } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'

interface Customer {
    id: string
    full_name: string
    phone: string | null
    email: string | null
    notes: string | null
}

interface CustomerSelectProps {
    onSelect: (customer: Customer | null) => void
    selectedCustomer: Customer | null
}

export default function CustomerSelect({ onSelect, selectedCustomer }: CustomerSelectProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [isCreating, setIsCreating] = useState(false)
    const [newCustomerBadges, setNewCustomerBadges] = useState({ name: '', phone: '', email: '' })
    const wrapperRef = useRef<HTMLDivElement>(null)
    const queryClient = useQueryClient()

    // Search Customers
    const { data: customers = [] } = useQuery({
        queryKey: ['customers', searchTerm],
        queryFn: async () => {
            if (!isSupabaseConfigured() || !searchTerm || searchTerm.length < 2) return []

            const { data } = await supabase
                .from('customers')
                .select('*')
                .or(`full_name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
                .limit(5)

            return (data || []) as Customer[]
        },
        enabled: isOpen && searchTerm.length >= 2
    })

    // Create Customer
    const createCustomerMutation = useMutation({
        mutationFn: async (newCustomer: { full_name: string, phone: string, email: string }) => {
            const { data, error } = await supabase
                .from('customers')
                .insert([newCustomer])
                .select()
                .single()

            if (error) throw error
            return data as Customer
        },
        onSuccess: (data) => {
            onSelect(data)
            setIsOpen(false)
            setIsCreating(false)
            setNewCustomerBadges({ name: '', phone: '', email: '' })
            setSearchTerm('')
            queryClient.invalidateQueries({ queryKey: ['customers'] })
        }
    })

    // Click outside to close
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false)
                setIsCreating(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [wrapperRef])

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault()
        if (!newCustomerBadges.name) return
        createCustomerMutation.mutate({
            full_name: newCustomerBadges.name,
            phone: newCustomerBadges.phone,
            email: newCustomerBadges.email
        })
    }

    if (selectedCustomer) {
        return (
            <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                        <User size={20} />
                    </div>
                    <div>
                        <p className="font-bold text-gray-800 text-sm">{selectedCustomer.full_name}</p>
                        <p className="text-xs text-gray-500">{selectedCustomer.phone || selectedCustomer.email || 'Sin contacto'}</p>
                    </div>
                </div>
                <button
                    onClick={() => onSelect(null)}
                    className="p-1 hover:bg-blue-100 rounded-full text-blue-500"
                >
                    <X size={18} />
                </button>
            </div>
        )
    }

    return (
        <div ref={wrapperRef} className="relative">
            {!isOpen ? (
                <button
                    onClick={() => setIsOpen(true)}
                    className="w-full flex items-center gap-2 p-3 bg-white border border-gray-200 rounded-lg text-gray-500 hover:border-primary-500 hover:text-primary-600 transition-colors text-left"
                >
                    <UserPlus size={20} />
                    <span className="text-sm font-medium">Asociar Cliente a la Venta</span>
                </button>
            ) : (
                <div className="absolute top-0 left-0 w-full min-w-[300px] bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
                    {!isCreating ? (
                        <>
                            <div className="p-2 border-b border-gray-100 flex items-center gap-2">
                                <Search size={18} className="text-gray-400" />
                                <input
                                    type="text"
                                    autoFocus
                                    placeholder="Buscar por nombre o teléfono..."
                                    className="flex-1 outline-none text-sm"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                <button onClick={() => setIsOpen(false)}><X size={16} className="text-gray-400" /></button>
                            </div>

                            <div className="max-h-60 overflow-y-auto">
                                {customers.map(customer => (
                                    <button
                                        key={customer.id}
                                        onClick={() => {
                                            onSelect(customer)
                                            setIsOpen(false)
                                        }}
                                        className="w-full p-2 hover:bg-gray-50 flex items-center gap-3 text-left"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                                            <User size={16} />
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm text-gray-800">{customer.full_name}</p>
                                            <p className="text-xs text-gray-500">{customer.phone}</p>
                                        </div>
                                    </button>
                                ))}

                                {searchTerm.length > 0 && customers.length === 0 && (
                                    <div className="p-4 text-center text-sm text-gray-500">
                                        No se encontraron resultados
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={() => setIsCreating(true)}
                                className="w-full p-3 bg-primary-50 text-primary-700 text-sm font-medium hover:bg-primary-100 flex items-center justify-center gap-2"
                            >
                                <UserPlus size={16} />
                                Crear Nuevo Cliente
                            </button>
                        </>
                    ) : (
                        <form onSubmit={handleCreate} className="p-4 space-y-3">
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="font-bold text-gray-800 text-sm">Nuevo Cliente</h4>
                                <button type="button" onClick={() => setIsCreating(false)} className="text-gray-400"><X size={16} /></button>
                            </div>

                            <input
                                required
                                placeholder="Nombre Completo"
                                className="form-input text-sm"
                                value={newCustomerBadges.name}
                                onChange={e => setNewCustomerBadges({ ...newCustomerBadges, name: e.target.value })}
                                autoFocus
                            />
                            <input
                                placeholder="Teléfono"
                                className="form-input text-sm"
                                value={newCustomerBadges.phone}
                                onChange={e => setNewCustomerBadges({ ...newCustomerBadges, phone: e.target.value })}
                            />
                            <input
                                type="email"
                                placeholder="Email (Opcional)"
                                className="form-input text-sm"
                                value={newCustomerBadges.email}
                                onChange={e => setNewCustomerBadges({ ...newCustomerBadges, email: e.target.value })}
                            />

                            <button
                                type="submit"
                                disabled={createCustomerMutation.isPending || !newCustomerBadges.name}
                                className="w-full btn-primary py-2 text-sm flex justify-center items-center gap-2"
                            >
                                {createCustomerMutation.isPending ? 'Guardando...' : <><Check size={16} /> Guardar Cliente</>}
                            </button>
                        </form>
                    )}
                </div>
            )}
        </div>
    )
}
