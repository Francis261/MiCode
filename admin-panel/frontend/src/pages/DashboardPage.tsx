import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { motion } from 'framer-motion';
import { Users, Package, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { useDashboardStats, useSalesOverview, useProductPerformance } from '@/hooks/useAdminDashboard';
import { Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const { admin } = useAuth();
  const { data: stats, isLoading: isLoadingStats, error: statsError } = useDashboardStats();
  const { data: salesOverview, isLoading: isLoadingSales, error: salesError } = useSalesOverview();
  const { data: productPerformance, isLoading: isLoadingProductPerformance, error: productPerformanceError } = useProductPerformance();

  return (
    <AdminLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold mb-6">Welcome, {admin?.email}!</h1>
        <p className="text-muted-foreground mb-8">Your role: <span className="font-semibold capitalize">{admin?.role}</span></p>

        {isLoadingStats ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="h-4 w-24 bg-muted rounded" />
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="h-6 w-32 bg-muted rounded mb-1" />
                  <div className="h-3 w-40 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : statsError ? (
          <p className="text-destructive">Error loading dashboard stats: {statsError.message}</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalSales}</div>
                <p className="text-xs text-muted-foreground flex items-center">
                  {stats?.salesChange.startsWith('+') ? <TrendingUp className="h-3 w-3 mr-1 text-green-500" /> : <TrendingDown className="h-3 w-3 mr-1 text-red-500" />}
                  {stats?.salesChange}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">New Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.newUsers}</div>
                <p className="text-xs text-muted-foreground flex items-center">
                  {stats?.usersChange.startsWith('+') ? <TrendingUp className="h-3 w-3 mr-1 text-green-500" /> : <TrendingDown className="h-3 w-3 mr-1 text-red-500" />}
                  {stats?.usersChange}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Products</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.activeProducts} / {stats?.totalProducts}</div>
                <p className="text-xs text-muted-foreground flex items-center">
                  {stats?.productsChange.startsWith('+') ? <TrendingUp className="h-3 w-3 mr-1 text-green-500" /> : <TrendingDown className="h-3 w-3 mr-1 text-red-500" />}
                  {stats?.productsChange}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Sales Overview</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingSales ? (
                <div className="flex items-center justify-center h-[300px]">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : salesError ? (
                <p className="text-destructive">Error loading sales overview: {salesError.message}</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={salesOverview}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: '0.5rem',
                      }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="sales" stroke="hsl(var(--primary))" activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Product Performance</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingProductPerformance ? (
                <div className="flex items-center justify-center h-[300px]">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : productPerformanceError ? (
                <p className="text-destructive">Error loading product performance: {productPerformanceError.message}</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={productPerformance}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: '0.5rem',
                      }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Legend />
                    <Bar dataKey="sales" fill="hsl(var(--accent))" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </AdminLayout>
  );
}