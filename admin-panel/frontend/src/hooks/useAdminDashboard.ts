import { useQuery } from "@tanstack/react-query";
import { adminFetcher } from "@/lib/api";

interface DashboardStats {
  totalSales: string;
  newUsers: string;
  activeProducts: number;
  totalProducts: number;
  salesChange: string;
  usersChange: string;
  productsChange: string;
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