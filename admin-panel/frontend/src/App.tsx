import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from '@/components/ui/toaster';
import { Sonner } from '@/components/ui/sonner';

// Pages
import AccessVerificationPage from './pages/AccessVerificationPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';

// Placeholder pages for future implementation
const ProductsPage = () => <DashboardPage />; // Replace with actual ProductsPage
const ServicesPage = () => <DashboardPage />; // Replace with actual ServicesPage
const TestimonialsPage = () => <DashboardPage />; // Replace with actual TestimonialsPage
const CustomOrdersPage = () => <DashboardPage />; // Replace with actual CustomOrdersPage
const OrdersPaymentsPage = () => <DashboardPage />; // Replace with actual OrdersPaymentsPage
const UsersPage = () => <DashboardPage />; // Replace with actual UsersPage
const ManageAdminsPage = () => <DashboardPage />; // Replace with actual ManageAdminsPage
const SupportCenterPage = () => <DashboardPage />; // Replace with actual SupportCenterPage

const queryClient = new QueryClient();

// PrivateRoute component to protect routes
const PrivateRoute = ({ children, permission }: { children: JSX.Element; permission: string }) => {
  const { isAuthenticated, checkPermission, tempToken } = useAuth();

  if (!tempToken) {
    return <Navigate to="/" replace />; // Redirect to access verification if no temp token
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />; // Redirect to login if not authenticated
  }

  if (!checkPermission(permission)) {
    toast.error("You don't have permission to access this page.");
    return <Navigate to="/dashboard" replace />; // Redirect to dashboard if no permission
  }

  return children;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter> {/* Removed basename="/admin-app" */}
        <Routes>
          <Route path="/" element={<AccessVerificationPage />} /> {/* This is now the initial page */}
          <Route path="/login" element={<LoginPage />} />
          
          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <PrivateRoute permission="dashboard">
                <DashboardPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/products"
            element={
              <PrivateRoute permission="products">
                <ProductsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/services"
            element={
              <PrivateRoute permission="services">
                <ServicesPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/testimonials"
            element={
              <PrivateRoute permission="testimonials">
                <TestimonialsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/custom-orders"
            element={
              <PrivateRoute permission="customOrders">
                <CustomOrdersPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/orders-payments"
            element={
              <PrivateRoute permission="ordersPayments">
                <OrdersPaymentsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/users"
            element={
              <PrivateRoute permission="users">
                <UsersPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/manage-admins"
            element={
              <PrivateRoute permission="manageAdmins">
                <ManageAdminsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/support-center"
            element={
              <PrivateRoute permission="support">
                <SupportCenterPage />
              </PrivateRoute>
            }
          />

          {/* Catch-all for unmatched routes */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;