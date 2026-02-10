import { useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
    LayoutDashboard,
    Users,
    Package,
    ShoppingCart,
    Receipt,
    LogOut,
    Menu,
    DollarSign,
    UserCircle,
    ChevronRight,
    BarChart,
    Truck
} from 'lucide-react'



export default function MainLayout() {
    const { signOut, profile, isAdmin } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const [isSidebarOpen, setIsSidebarOpen] = useState(false) // Mobile state
    const [isCollapsed] = useState(false) // Desktop state


    const handleSignOut = async () => {
        await signOut()
        navigate('/login')
    }

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen)

    const navItems = [
        { to: '/', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
        { to: '/sales', icon: <Receipt size={20} />, label: 'Ventas' },
        { to: '/shipping', icon: <Truck size={20} />, label: 'Envíos' },
        { to: '/products', icon: <Package size={20} />, label: 'Inventario' },
        { to: '/customers', icon: <Users size={20} />, label: 'Clientes' },

        { to: '/suppliers', icon: <Users size={20} />, label: 'Proveedores', adminOnly: true },
        { to: '/purchases', icon: <ShoppingCart size={20} />, label: 'Compras', adminOnly: true },
        { to: '/cash', icon: <DollarSign size={20} />, label: 'Caja Diaria', adminOnly: true },

        { to: '/reports', icon: <BarChart size={20} />, label: 'Reportes', adminOnly: true },
        { to: '/users', icon: <UserCircle size={20} />, label: 'Usuarios', adminOnly: true },
    ]


    const filteredNavItems = navItems.filter((item) => !item.adminOnly || isAdmin)

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-20 lg:hidden backdrop-blur-sm"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
          fixed lg:static inset-y-0 left-0 z-30
          bg-white border-r border-gray-200 shadow-xl lg:shadow-none
          transition-all duration-300 ease-in-out flex flex-col
          ${isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'}
          ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}
        `}
            >
                {/* Brand */}
                <div className={`h-20 flex items-center ${isCollapsed ? 'justify-center' : 'px-6 gap-3'} border-b border-gray-100 bg-brand-peach/20`}>
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm flex-shrink-0 p-1">
                        <img src="/logos/logo-bw.jpg" alt="Logo" className="w-full h-full object-contain rounded-full" />
                    </div>
                    {!isCollapsed && (
                        <div>
                            <h1 className="font-serif font-bold text-lg text-primary-700 leading-tight">Sophi Shoes</h1>
                            <p className="text-xs text-secondary-600 font-medium tracking-wide">POS System</p>
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
                    {filteredNavItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            onClick={() => setIsSidebarOpen(false)}
                            className={({ isActive }: { isActive: boolean }) => `
                flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group
                ${isActive
                                    ? 'bg-primary-50 text-primary-700 shadow-sm'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-primary-600'
                                }
                ${isCollapsed ? 'justify-center' : ''}
              `}
                            title={isCollapsed ? item.label : ''}
                        >
                            <span className={`transition-transform duration-200 ${isCollapsed ? '' : 'group-hover:scale-110'}`}>
                                {item.icon}
                            </span>
                            {!isCollapsed && <span className="font-medium">{item.label}</span>}
                            {!isCollapsed && location.pathname === item.to && (
                                <ChevronRight size={16} className="ml-auto opacity-50" />
                            )}
                        </NavLink>
                    ))}
                </nav>

                {/* User Profile */}
                <div className="p-4 border-t border-gray-100 bg-gray-50/50">
                    <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center flex-col' : ''}`}>
                        <div className="w-10 h-10 rounded-full bg-secondary-100 text-secondary-600 flex items-center justify-center flex-shrink-0">
                            <UserCircle size={24} />
                        </div>
                        {!isCollapsed && (
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-800 truncate">
                                    {profile?.full_name || 'Usuario'}
                                </p>
                                <p className="text-xs text-gray-500 capitalize truncate">
                                    {profile?.role || 'Vendedor'}
                                </p>
                            </div>
                        )}

                        <button
                            onClick={handleSignOut}
                            className={`p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors ${isCollapsed ? 'mt-2' : ''}`}
                            title="Cerrar Sesión"
                        >
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-brand-peach/5">
                {/* Top Header (Mobile Only) */}
                <header className="lg:hidden h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sticky top-0 z-10 shadow-sm">
                    <div className="flex items-center gap-3">
                        <button onClick={toggleSidebar} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                            <Menu size={24} />
                        </button>
                        <h1 className="font-serif font-bold text-lg text-primary-700">Sophi Shoes</h1>
                    </div>
                </header>

                {/* Desktop Header / Breadcrumbs (Optional, keep clean for now) */}
                <div className="h-4 lg:block hidden"></div>

                {/* Content Scrollable */}
                <main className="flex-1 overflow-auto p-4 lg:p-8">
                    <div className="max-w-7xl mx-auto animate-fade-in">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    )
}
