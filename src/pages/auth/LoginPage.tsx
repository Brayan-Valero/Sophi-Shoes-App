import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { AlertCircle, LogIn, Database } from 'lucide-react'
import { isMockMode } from '../../lib/supabase'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const { signIn } = useAuth()
    const navigate = useNavigate()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            await signIn(email, password)
            navigate('/')
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al iniciar sesión')
        } finally {
            setLoading(false)
        }
    }

    const isDemo = isMockMode()

    const handleDemoLogin = (role: 'admin' | 'vendedor') => {
        setEmail(role === 'admin' ? 'admin@sophi.com' : 'vendedor@sophi.com')
        setPassword('demo123')
    }

    return (
        <div className="min-h-screen bg-brand-light flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden border border-white/50">
                <div className="bg-gradient-to-br from-brand-bg to-brand-light p-8 text-center relative overflow-hidden">
                    {/* Decorative circles */}
                    <div className="absolute top-0 left-0 w-32 h-32 bg-secondary-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>

                    <div className="relative z-10">
                        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg p-2">
                            <img src="/logo.jpg" alt="Sophi Shoes" className="w-full h-full object-contain rounded-full" />
                        </div>
                        <h1 className="text-3xl font-serif font-bold text-primary-600">Sophi Shoes</h1>
                        <p className="text-primary-800 mt-2 font-medium">Sistema de Gestión</p>
                    </div>
                </div>

                <div className="p-8">
                    {isDemo && (
                        <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg flex gap-3 text-sm text-orange-800">
                            <Database className="flex-shrink-0 text-orange-600" size={20} />
                            <div>
                                <p className="font-bold">Modo Demo Local</p>
                                <div className="mt-2 flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleDemoLogin('admin')}
                                        className="text-xs bg-orange-200 hover:bg-orange-300 px-3 py-1.5 rounded-full transition-colors font-medium text-orange-900"
                                    >
                                        Xiomara (Admin)
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleDemoLogin('vendedor')}
                                        className="text-xs bg-orange-200 hover:bg-orange-300 px-3 py-1.5 rounded-full transition-colors font-medium text-orange-900"
                                    >
                                        Nicolle (Vendedor)
                                    </button>

                                </div>
                            </div>
                        </div>
                    )}

                    <h2 className="text-xl font-semibold text-gray-800 mb-6 text-center">Bienvenido de nuevo</h2>

                    <form onSubmit={handleLogin} className="space-y-4">
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-600 text-sm animate-pulse">
                                <AlertCircle size={18} />
                                {error}
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Correo Electrónico</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="form-input bg-gray-50 focus:bg-white"
                                placeholder="usuario@ejemplo.com"
                                required
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Contraseña</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="form-input bg-gray-50 focus:bg-white"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full btn-primary py-3 flex items-center justify-center gap-2 shadow-lg shadow-primary-500/30 hover:shadow-primary-600/40"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    <LogIn size={20} />
                                    Ingresar
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center text-xs text-gray-400">
                        &copy; {new Date().getFullYear()} Sophi Shoes
                    </div>
                </div>
            </div>
        </div>
    )
}
