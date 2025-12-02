import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from '@/components/ui/toaster';
import { Sonner } from '@/components/ui/sonner';
import { toast } from 'sonner'; // Import toast for messages

// Pages
import AccessVerificationPage from './pages/AccessVerificationPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import ServicesPage from './pages/ServicesPage';
import SupportCenterPage from './pages/SupportCenterPage';
import UsersPage from './pages/UsersPage';
const TestimonialsPage = () => <DashboardPage />; // Replace with actual TestimonialsPage
const CustomOrdersPage = () => <DashboardPage />; // Replace with actual CustomOrdersPage
const OrdersPaymentsPage = () => <DashboardPage />; // Replace with actual OrdersPaymentsPage
const ManageAdminsPage = () => <DashboardPage />; // Replace with actual ManageAdminsPage

const queryClient = new QueryClient();

// PrivateRoute component to protect routes
const PrivateRoute = ({ children, permission }: { children: JSX.Element; permission: string }) => {
  const { isAuthenticated, checkPermission, admin } = useAuth();
  const navigate = useNavigate();

  // If not authenticated at all, go to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If authenticated but admin object is somehow missing (shouldn't happen after login)
  if (isAuthenticated && !admin) {
    toast.error("Authentication state corrupted. Please log in again.");
    return <Navigate to="/login" replace />;
  }

  // If authenticated and admin object exists, check permissions
  if (admin && !checkPermission(permission)) {
    toast.error("You don't have permission to access this page.");
    // Redirect to dashboard if they have access to it, otherwise to login
    // This prevents a loop if they don't even have dashboard access
    if (checkPermission("dashboard")) {
      return <Navigate to="/dashboard" replace />;
    } else {
      return <Navigate to="/login" replace />;
    }
  }

  return children;
};

// Component to handle redirects for unmatched routes based on authentication status
const RedirectBasedOnAuth = () => {
  const { isAuthenticated, tempToken } = useAuth();
  if (!tempToken) {
    return <Navigate to="/" replace />; // Go to access verification
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />; // Go to login
  }
  return <Navigate to="/dashboard" replace />; // Go to dashboard
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AccessVerificationPage />} />
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
          <Route path="*" element={<RedirectBasedOnAuth />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;