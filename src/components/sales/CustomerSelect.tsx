import { useState, useRef, useEffect } from 'react'
import { Search, UserPlus, User, X, Check } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'

import { Customer } from '../../types/database'

interface CustomerSelectProps {
    onSelect: (customer: Customer | null) => void
    selectedCustomer: Customer | null
}

export default function CustomerSelect({ onSelect, selectedCustomer }: CustomerSelectProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [isCreating, setIsCreating] = useState(false)
    const [newCustomer, setNewCustomer] = useState({
        full_name: '',
        phone: '',
        email: '',
        identification: '',
        document_type: '13'
    })
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
                .or(`full_name.ilike.%${searchTerm}%,identification.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
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
            setNewCustomer({
                full_name: '',
                phone: '',
                email: '',
                identification: '',
                document_type: '13'
            })
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
        if (!newCustomer.full_name) return

        // Final check for document type and ID if not provided
        const finalCustomer = {
            ...newCustomer,
            identification: newCustomer.identification || `TEMP-${Date.now()}`,
            email: newCustomer.email || `temporal@sophi.com`
        }

        createCustomerMutation.mutate(finalCustomer as any)
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
                    className="p-1 hover:bg-blue-200 rounded-full text-blue-600 transition-colors"
                    title="Quitar cliente"
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
                                    placeholder="Buscar por nombre, cédula o NIT..."
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
                                            <p className="text-[10px] text-gray-400">ID: {customer.identification} {customer.phone && `• Tel: ${customer.phone}`}</p>
                                        </div>
                                    </button>
                                ))}

                                {searchTerm.length > 0 && customers.length === 0 && (
                                    <div className="p-4 text-center text-sm text-gray-500">
                                        No se encontraron resultados
                                    </div>
                                )}
                            </div>

                            {searchTerm.length > 2 && (
                                <button
                                    onClick={() => {
                                        setNewCustomer(prev => ({ ...prev, full_name: searchTerm }))
                                        setIsCreating(true)
                                    }}
                                    className="w-full p-3 bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100 flex items-center justify-center gap-2 border-t border-blue-100"
                                >
                                    <UserPlus size={16} />
                                    Registrar "{searchTerm}" como nuevo cliente
                                </button>
                            )}

                            <button
                                onClick={() => {
                                    setNewCustomer(prev => ({ ...prev, full_name: searchTerm }))
                                    setIsCreating(true)
                                }}
                                className="w-full p-3 bg-gray-50 text-gray-600 text-sm font-medium hover:bg-gray-100 flex items-center justify-center gap-2"
                            >
                                <UserPlus size={16} />
                                Crear Cliente (Formulario Completo)
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
                                placeholder="Nombre Completo / Razón Social"
                                className="form-input text-sm"
                                value={newCustomer.full_name}
                                onChange={e => setNewCustomer({ ...newCustomer, full_name: e.target.value })}
                            />

                            <div className="grid grid-cols-2 gap-2">
                                <select
                                    className="form-input text-sm"
                                    value={newCustomer.document_type}
                                    onChange={e => setNewCustomer({ ...newCustomer, document_type: e.target.value })}
                                >
                                    <option value="13">C.C.</option>
                                    <option value="31">NIT</option>
                                    <option value="41">Pasaporte</option>
                                </select>
                                <input
                                    placeholder="Identificación (Opcional)"
                                    className="form-input text-sm"
                                    value={newCustomer.identification}
                                    onChange={e => setNewCustomer({ ...newCustomer, identification: e.target.value })}
                                />
                            </div>

                            <input
                                placeholder="Teléfono"
                                className="form-input text-sm"
                                value={newCustomer.phone}
                                onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                            />

                            <input
                                type="email"
                                placeholder="Email (Opcional - solo para factura)"
                                className="form-input text-sm"
                                value={newCustomer.email}
                                onChange={e => setNewCustomer({ ...newCustomer, email: e.target.value })}
                            />

                            <button
                                type="submit"
                                disabled={createCustomerMutation.isPending || !newCustomer.full_name}
                                className="w-full btn-primary py-2 text-sm flex justify-center items-center gap-2"
                            >
                                {createCustomerMutation.isPending ? 'Guardando...' : <><Check size={16} /> Guardar y Seleccionar</>}
                            </button>
                            <p className="text-[10px] text-gray-400 text-center">
                                * Para ventas locales solo se requiere el nombre. Identificación y Email se generarán automáticamente si se dejan vacíos.
                            </p>
                        </form>
                    )}
                </div>
            )}
        </div>
    )
}
