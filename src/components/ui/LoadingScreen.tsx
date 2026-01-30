export default function LoadingScreen() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-900 flex items-center justify-center">
            <div className="text-center">
                {/* Logo/Brand */}
                <div className="mb-8">
                    <div className="w-20 h-20 mx-auto bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-4">
                        <span className="text-4xl">👟</span>
                    </div>
                    <h1 className="text-2xl font-bold text-white">Sophi Shoes</h1>
                    <p className="text-primary-200 text-sm mt-1">Sistema de Inventario</p>
                </div>

                {/* Loading spinner */}
                <div className="flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <p className="text-primary-200 text-sm mt-4">Cargando...</p>
            </div>
        </div>
    )
}
