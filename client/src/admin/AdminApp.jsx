import { Navigate, Route, Routes } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { AuthProvider, RequireAuth } from './lib/auth.jsx';
import { ToastProvider } from './components/Toast.jsx';
import { ConfirmProvider } from './components/ConfirmDialog.jsx';
import AdminLayout from './components/AdminLayout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import RevenuePage from './pages/RevenuePage.jsx';
import MenuItemsPage from './pages/MenuItemsPage.jsx';
import CategoriesPage from './pages/CategoriesPage.jsx';
import OrdersPage from './pages/OrdersPage.jsx';
import ReservationsPage from './pages/ReservationsPage.jsx';
import CateringPage from './pages/CateringPage.jsx';
import MessagesPage from './pages/MessagesPage.jsx';
import OffersPage from './pages/OffersPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import AccountPage from './pages/AccountPage.jsx';

/**
 * Admin dashboard — mounted by the main app at `/admin/*`:
 *   <Route path="/admin/*" element={<AdminApp />} />
 * All child routes are relative; navigation links are absolute (/admin/…).
 */
export default function AdminApp() {
  return (
    <MotionConfig reducedMotion="user">
      <ToastProvider>
        <AuthProvider>
          <ConfirmProvider>
            <Routes>
              <Route path="login" element={<LoginPage />} />
              <Route
                element={
                  <RequireAuth>
                    <AdminLayout />
                  </RequireAuth>
                }
              >
                <Route index element={<DashboardPage />} />
                <Route path="revenue" element={<RevenuePage />} />
                <Route path="menu" element={<MenuItemsPage />} />
                <Route path="categories" element={<CategoriesPage />} />
                <Route path="orders" element={<OrdersPage />} />
                <Route path="reservations" element={<ReservationsPage />} />
                <Route path="catering" element={<CateringPage />} />
                <Route path="messages" element={<MessagesPage />} />
                <Route path="offers" element={<OffersPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="account" element={<AccountPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Routes>
          </ConfirmProvider>
        </AuthProvider>
      </ToastProvider>
    </MotionConfig>
  );
}
