import { useState } from 'react'
import { DollarSign, X } from 'lucide-react'

interface CashOpenModalProps {
    isOpen: boolean
    onClose: () => void
    onOpen: (amount: number, notes: string) => Promise<void>
}

export default function CashOpenModal({ isOpen, onClose, onOpen }: CashOpenModalProps) {
    const [amount, setAmount] = useState('')
    const [notes, setNotes] = useState('')
    const [loading, setLoading] = useState(false)

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            await onOpen(Number(amount), notes)
            onClose()
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <DollarSign className="text-green-600" size={20} />
                        Apertura de Caja
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-sm mb-4">
                        Ingresa el monto de dinero con el que inicias el día (Base).
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Monto Inicial (Base)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                            <input
                                type="number"
                                required
                                min="0"
                                step="100"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="form-input pl-8 text-lg font-bold"
                                placeholder="0"
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Notas (Opcional)</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="form-input min-h-[80px]"
                            placeholder="Ej: Billetes de baja denominación..."
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 btn-secondary"
                            disabled={loading}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 btn-primary"
                            disabled={loading || !amount}
                        >
                            {loading ? 'Abriendo...' : 'Abrir Caja'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
