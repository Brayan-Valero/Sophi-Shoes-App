import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import MainLayout from './components/layout/MainLayout'
import LoginPage from './pages/auth/LoginPage'
import DashboardPage from './pages/DashboardPage'
import SuppliersPage from './pages/suppliers/SuppliersPage'
import SupplierFormPage from './pages/suppliers/SupplierFormPage'
import ProductsPage from './pages/products/ProductsPage'
import ProductFormPage from './pages/products/ProductFormPage'
import PurchasesPage from './pages/purchases/PurchasesPage'
import PurchaseFormPage from './pages/purchases/PurchaseFormPage'
import SalesPage from './pages/sales/SalesPage'
import POSPage from './pages/sales/POSPage'
import DailyCashPage from './pages/cash/DailyCashPage'
import LoadingScreen from './components/ui/LoadingScreen'

// Protected Route component
function ProtectedRoute({ children, requireAdmin = false }: { children: React.ReactNode; requireAdmin?: boolean }) {
    const { user, profile, loading } = useAuth()

    if (loading) {
        return <LoadingScreen />
    }

    if (!user) {
        return <Navigate to="/login" replace />
    }

    if (requireAdmin && profile?.role !== 'admin') {
        return <Navigate to="/" replace />
    }

    return <>{children}</>
}

function App() {
    const { user, loading } = useAuth()

    if (loading) {
        return <LoadingScreen />
    }

    return (
        <Routes>
            {/* Public route */}
            <Route
                path="/login"
                element={user ? <Navigate to="/" replace /> : <LoginPage />}
            />

            {/* Protected routes */}
            <Route
                path="/"
                element={
                    <ProtectedRoute>
                        <MainLayout />
                    </ProtectedRoute>
                }
            >
                <Route index element={<DashboardPage />} />

                {/* Suppliers - Admin only */}
                <Route path="suppliers" element={<ProtectedRoute requireAdmin><SuppliersPage /></ProtectedRoute>} />
                <Route path="suppliers/new" element={<ProtectedRoute requireAdmin><SupplierFormPage /></ProtectedRoute>} />
                <Route path="suppliers/:id" element={<ProtectedRoute requireAdmin><SupplierFormPage /></ProtectedRoute>} />

                {/* Products - Admin only for editing */}
                <Route path="products" element={<ProductsPage />} />
                <Route path="products/new" element={<ProtectedRoute requireAdmin><ProductFormPage /></ProtectedRoute>} />
                <Route path="products/:id" element={<ProtectedRoute requireAdmin><ProductFormPage /></ProtectedRoute>} />

                {/* Purchases - Admin only */}
                <Route path="purchases" element={<ProtectedRoute requireAdmin><PurchasesPage /></ProtectedRoute>} />
                <Route path="purchases/new" element={<ProtectedRoute requireAdmin><PurchaseFormPage /></ProtectedRoute>} />

                {/* Sales - All authenticated users */}
                <Route path="sales" element={<SalesPage />} />
                <Route path="sales/new" element={<POSPage />} />

                {/* Cash Register */}
                <Route path="cash" element={<DailyCashPage />} />
            </Route>

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    )
}

export default App
