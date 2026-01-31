import { useAuth } from '../contexts/AuthContext'
import { Link } from 'react-router-dom'
import {
    Package,
    Users,
    ShoppingCart,
    Receipt,
    DollarSign,
    TrendingUp,
    AlertTriangle,
} from 'lucide-react'

export default function DashboardPage() {
    const { profile, isAdmin } = useAuth()

    // Quick action cards
    const quickActions = [
        {
            to: '/sales/new',
            icon: <Receipt size={24} />,
            label: 'Nueva Venta',
            description: 'Registrar venta rápida',
            color: 'bg-green-500',
            visible: true,
        },
        {
            to: '/products',
            icon: <Package size={24} />,
            label: 'Productos',
            description: 'Ver inventario',
            color: 'bg-blue-500',
            visible: true,
        },
        {
            to: '/purchases/new',
            icon: <ShoppingCart size={24} />,
            label: 'Nueva Compra',
            description: 'Registrar entrada',
            color: 'bg-purple-500',
            visible: isAdmin,
        },
        {
            to: '/suppliers',
            icon: <Users size={24} />,
            label: 'Proveedores',
            description: 'Gestionar proveedores',
            color: 'bg-orange-500',
            visible: isAdmin,
        },
        {
            to: '/cash',
            icon: <DollarSign size={24} />,
            label: 'Caja Diaria',
            description: 'Ver resumen del día',
            color: 'bg-emerald-500',
            visible: true,
        },
        {
            to: '/sales',
            icon: <TrendingUp size={24} />,
            label: 'Historial',
            description: 'Ver todas las ventas',
            color: 'bg-indigo-500',
            visible: true,
        },
    ].filter((action) => action.visible)

    return (
        <div className="space-y-6">
            {/* Welcome header */}
            <div className="card bg-gradient-to-r from-primary-600 to-primary-700 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">
                            ¡Hola, {profile?.full_name || 'Usuario'}! 👋
                        </h1>
                        <p className="text-primary-100 mt-1">
                            Bienvenido al sistema de inventario de Sophi Shoes
                        </p>
                    </div>
                    <div className="hidden sm:block">
                        <span className="text-5xl">👟</span>
                    </div>
                </div>
            </div>

            {/* Role indicator */}
            <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Tu rol:</span>
                <span
                    className={`badge ${isAdmin ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                        }`}
                >
                    {isAdmin ? '👑 Administrador' : '🛒 Vendedor'}
                </span>
            </div>

            {/* Quick actions grid */}
            <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Acciones Rápidas</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {quickActions.map((action) => (
                        <Link
                            key={action.to}
                            to={action.to}
                            className="card hover:shadow-lg transition-all duration-200 group"
                        >
                            <div className="flex items-center gap-4">
                                <div
                                    className={`w-12 h-12 ${action.color} rounded-xl flex items-center justify-center text-white group-hover:scale-110 transition-transform`}
                                >
                                    {action.icon}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-800">{action.label}</h3>
                                    <p className="text-sm text-gray-500">{action.description}</p>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>



            {/* Stats placeholder - will be populated with real data later */}
            <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Resumen del Día</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="card">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Ventas Hoy</p>
                                <p className="text-2xl font-bold text-gray-800">$0</p>
                            </div>
                            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                <DollarSign className="text-green-600" size={20} />
                            </div>
                        </div>
                    </div>
                    <div className="card">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Transacciones</p>
                                <p className="text-2xl font-bold text-gray-800">0</p>
                            </div>
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Receipt className="text-blue-600" size={20} />
                            </div>
                        </div>
                    </div>
                    <div className="card">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Productos</p>
                                <p className="text-2xl font-bold text-gray-800">0</p>
                            </div>
                            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                <Package className="text-purple-600" size={20} />
                            </div>
                        </div>
                    </div>
                    <div className="card">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Stock Bajo</p>
                                <p className="text-2xl font-bold text-gray-800">0</p>
                            </div>
                            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                                <AlertTriangle className="text-red-600" size={20} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
