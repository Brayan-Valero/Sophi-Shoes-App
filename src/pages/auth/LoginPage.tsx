import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { isSupabaseConfigured } from '../../lib/supabase'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'

export default function LoginPage() {
    const { signIn } = useAuth()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (!isSupabaseConfigured()) {
            setError('Supabase no está configurado. Por favor, configura las variables de entorno.')
            return
        }

        if (!email || !password) {
            setError('Por favor, ingresa tu email y contraseña.')
            return
        }

        setLoading(true)

        const { error } = await signIn(email, password)

        if (error) {
            setError('Credenciales incorrectas. Por favor, intenta de nuevo.')
        }

        setLoading(false)
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="w-20 h-20 mx-auto bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-4 shadow-xl">
                        <span className="text-4xl">👟</span>
                    </div>
                    <h1 className="text-3xl font-bold text-white">Sophi Shoes</h1>
                    <p className="text-primary-200 mt-2">Sistema de Inventario</p>
                </div>

                {/* Login form */}
                <div className="bg-white rounded-2xl shadow-2xl p-8">
                    <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
                        Iniciar Sesión
                    </h2>

                    {/* Supabase warning */}
                    {!isSupabaseConfigured() && (
                        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
                                <div>
                                    <p className="text-sm font-medium text-yellow-800">
                                        Supabase no configurado
                                    </p>
                                    <p className="text-sm text-yellow-700 mt-1">
                                        Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en el archivo .env
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Error message */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                            <div className="flex items-center gap-3">
                                <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Email field */}
                        <div className="form-group">
                            <label htmlFor="email" className="form-label">
                                Correo electrónico
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="form-input"
                                placeholder="tu@email.com"
                                autoComplete="email"
                                disabled={loading}
                            />
                        </div>

                        {/* Password field */}
                        <div className="form-group">
                            <label htmlFor="password" className="form-label">
                                Contraseña
                            </label>
                            <div className="relative">
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="form-input pr-10"
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        {/* Submit button */}
                        <button
                            type="submit"
                            disabled={loading || !isSupabaseConfigured()}
                            className="w-full btn-primary py-3 text-base"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="spinner w-5 h-5 border-white/30 border-t-white"></div>
                                    Ingresando...
                                </span>
                            ) : (
                                'Ingresar'
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <p className="text-center text-primary-200 text-sm mt-6">
                    © 2024 Sophi Shoes. Todos los derechos reservados.
                </p>
            </div>
        </div>
    )
}
