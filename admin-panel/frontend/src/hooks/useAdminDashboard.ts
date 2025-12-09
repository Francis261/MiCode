import { useQuery } from "@tanstack/react-query";
import { adminFetcher } from "@/lib/api";

interface DashboardStats {
  totalSales: string;
  sales24Hrs: string; // New field for sales in last 24 hours
  newUsers24Hrs: number; // New field for new users in last 24 hours
  totalUsers: number; // New field for total users
  activeProducts: number;
  totalProducts: number;
  // Removed salesChange, usersChange, productsChange as they are no longer directly returned
}

interface SalesDataPoint {
  name: string;
  sales: number;
}

interface ProductPerformanceDataPoint {
  name: string;
  sales: number;
}

export function useDashboardStats() {
  return useQuery<DashboardStats, Error>({
    queryKey: ["dashboardStats"],
    queryFn: () => adminFetcher<DashboardStats>("/api/dashboard/stats"),
    refetchInterval: 60000, // Refetch every minute
    refetchIntervalInBackground: true,
  });
}

export function useSalesOverview() {
  return useQuery<SalesDataPoint[], Error>({
    queryKey: ["salesOverview"],
    queryFn: () => adminFetcher<SalesDataPoint[]>("/api/dashboard/sales-overview"),
    refetchInterval: 60000, // Refetch every minute
    refetchIntervalInBackground: true,
  });
}

export function useProductPerformance() {
  return useQuery<ProductPerformanceDataPoint[], Error>({
    queryKey: ["productPerformance"],
    queryFn: () => adminFetcher<ProductPerformanceDataPoint[]>("/api/dashboard/product-performance"),
    refetchInterval: 60000, // Refetch every minute
    refetchIntervalInBackground: true,
  });
}