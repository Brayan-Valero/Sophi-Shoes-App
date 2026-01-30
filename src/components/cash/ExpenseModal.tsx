import { useState } from 'react'
import { X, Receipt } from 'lucide-react'

interface ExpenseModalProps {
    isOpen: boolean
    onClose: () => void
    onSave: (description: string, amount: number, category: string) => Promise<void>
}

export default function ExpenseModal({ isOpen, onClose, onSave }: ExpenseModalProps) {
    const [amount, setAmount] = useState('')
    const [description, setDescription] = useState('')
    const [category, setCategory] = useState('otros')
    const [loading, setLoading] = useState(false)

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            await onSave(description, Number(amount), category)
            onClose()
            // Reset form
            setAmount('')
            setDescription('')
            setCategory('otros')
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-red-50">
                    <h3 className="text-lg font-bold text-red-700 flex items-center gap-2">
                        <Receipt size={20} />
                        Registrar Gasto
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Monto del Gasto</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                            <input
                                type="number"
                                required
                                min="0"
                                step="100"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="form-input pl-8 text-lg font-bold border-red-200 focus:ring-red-500 focus:border-red-500"
                                placeholder="0"
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Descripción</label>
                        <input
                            type="text"
                            required
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="form-input"
                            placeholder="Ej: Pago de almuerzo, Taxi..."
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Categoría</label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="form-select"
                        >
                            <option value="otros">Otros</option>
                            <option value="proveedor">Proveedor</option>
                            <option value="servicios">Servicios</option>
                            <option value="personal">Personal</option>
                        </select>
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
                            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-sm hover:shadow-md disabled:opacity-50"
                            disabled={loading || !amount || !description}
                        >
                            {loading ? 'Guardando...' : 'Registrar Salida'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
