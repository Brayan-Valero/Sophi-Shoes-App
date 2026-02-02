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
import ShippingPage from './pages/sales/ShippingPage'
import POSPage from './pages/sales/POSPage'
import CustomersPage from './pages/customers/CustomersPage'
import CustomerFormPage from './pages/customers/CustomerFormPage'

import DailyCashPage from './pages/cash/DailyCashPage'
import ReportsPage from './pages/reports/ReportsPage'
import ReceiptPage from './pages/sales/ReceiptPage'


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
    console.log('App State:', { loading, user: user?.email })

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

                {/* Customers */}
                <Route path="customers" element={<CustomersPage />} />
                <Route path="customers/new" element={<CustomerFormPage />} />
                <Route path="customers/:id" element={<CustomerFormPage />} />

                {/* Purchases - Admin only */}
                <Route path="purchases" element={<ProtectedRoute requireAdmin><PurchasesPage /></ProtectedRoute>} />
                <Route path="purchases/new" element={<ProtectedRoute requireAdmin><PurchaseFormPage /></ProtectedRoute>} />

                {/* Sales - All authenticated users */}
                <Route path="sales" element={<SalesPage />} />
                <Route path="shipping" element={<ShippingPage />} />
                <Route path="sales/new" element={<POSPage />} />
                <Route path="shipping/new" element={<POSPage />} />



                {/* Cash Register */}
                <Route path="cash" element={<DailyCashPage />} />

                {/* Reports - Admin only */}
                <Route path="reports" element={<ProtectedRoute requireAdmin><ReportsPage /></ProtectedRoute>} />

                {/* Print Receipt - Protected but no layout */}
                <Route path="print/sale/:id" element={<ProtectedRoute><ReceiptPage /></ProtectedRoute>} />
            </Route>


            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    )
}

export default App
