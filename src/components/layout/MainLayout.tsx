import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
    LayoutDashboard,
    Package,
    Users,
    ShoppingCart,
    Receipt,
    DollarSign,
    LogOut,
    Menu,
    X,
} from 'lucide-react'
import { useState } from 'react'

interface NavItem {
    to: string
    icon: React.ReactNode
    label: string
    adminOnly?: boolean
}

const navItems: NavItem[] = [
    { to: '/', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { to: '/suppliers', icon: <Users size={20} />, label: 'Proveedores', adminOnly: true },
    { to: '/products', icon: <Package size={20} />, label: 'Productos' },
    { to: '/purchases', icon: <ShoppingCart size={20} />, label: 'Compras', adminOnly: true },
    { to: '/sales', icon: <Receipt size={20} />, label: 'Ventas' },
    { to: '/cash', icon: <DollarSign size={20} />, label: 'Caja Diaria' },
]

export default function MainLayout() {
    const { profile, signOut, isAdmin } = useAuth()
    const navigate = useNavigate()
    const [sidebarOpen, setSidebarOpen] = useState(false)

    const handleSignOut = async () => {
        await signOut()
        navigate('/login')
    }

    const filteredNavItems = navItems.filter(
        (item) => !item.adminOnly || isAdmin
    )

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Mobile sidebar backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-64 bg-gradient-to-b from-primary-900 via-primary-800 to-primary-900
          transform transition-transform duration-200 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
            >
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="p-6 border-b border-primary-700/50">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center">
                                <span className="text-2xl">👟</span>
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-white">Sophi Shoes</h1>
                                <p className="text-xs text-primary-200">Sistema de Inventario</p>
                            </div>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                        {filteredNavItems.map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                end={item.to === '/'}
                                onClick={() => setSidebarOpen(false)}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${isActive
                                        ? 'bg-white/20 text-white shadow-lg'
                                        : 'text-primary-100 hover:bg-white/10 hover:text-white'
                                    }`
                                }
                            >
                                {item.icon}
                                {item.label}
                            </NavLink>
                        ))}
                    </nav>

                    {/* User info & logout */}
                    <div className="p-4 border-t border-primary-700/50">
                        <div className="flex items-center gap-3 px-4 py-3 mb-2">
                            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                                <span className="text-white font-semibold">
                                    {profile?.full_name?.charAt(0) || profile?.email?.charAt(0) || 'U'}
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">
                                    {profile?.full_name || profile?.email}
                                </p>
                                <p className="text-xs text-primary-200 capitalize">
                                    {profile?.role || 'Usuario'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleSignOut}
                            className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-primary-100 hover:bg-white/10 hover:text-white rounded-xl transition-all duration-200"
                        >
                            <LogOut size={20} />
                            Cerrar Sesión
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <div className="flex-1 flex flex-col min-h-screen">
                {/* Top bar */}
                <header className="bg-white border-b border-gray-200 px-4 py-3 lg:px-6">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="lg:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                        >
                            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                        <div className="flex-1">
                            {/* Breadcrumb or page title can go here */}
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 p-4 lg:p-6 overflow-auto">
                    <div className="animate-fade-in">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    )
}
