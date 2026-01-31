// Loading screen

export default function LoadingScreen() {
    console.log('Rendering LoadingScreen...')
    return (
        <div className="min-h-screen bg-brand-lavender flex flex-col items-center justify-center p-4">
            <div className="relative w-24 h-24 mb-8">
                {/* Logo container with pulse effect */}
                <div className="absolute inset-0 bg-white rounded-full shadow-lg flex items-center justify-center animate-pulse">
                    <img src="/logos/logo-lavender.jpg" alt="Logo" className="w-20 h-20 rounded-full object-contain" />
                </div>
                {/* Outer ring spinner */}
                <div className="absolute -inset-2 border-4 border-t-primary-500 border-r-transparent border-b-primary-200 border-l-transparent rounded-full animate-spin"></div>
            </div>

            <h2 className="text-xl font-serif font-bold text-primary-700 mb-2">Sophi Shoes</h2>
            <div className="flex gap-1 mb-8">
                <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                <div className="w-2 h-2 bg-secondary-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>

            <button
                onClick={() => window.location.reload()}
                className="text-xs text-primary-400 hover:text-primary-600 underline"
            >
                ¿Tarda mucho? Clic aquí para reintentar
            </button>
        </div>
    )
}
