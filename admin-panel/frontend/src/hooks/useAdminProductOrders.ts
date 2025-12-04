import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminFetcher } from '@/lib/api';
import { ProductOrder, ProductOrdersResponse } from '@/types/product-order';
import { toast } from 'sonner';

export const useAdminProductOrders = (filters?: { status?: string; search?: string; page?: number }) => {
  const queryClient = useQueryClient();

  const buildQueryString = () => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.page) params.append('page', filters.page.toString());
    return params.toString();
  };

  const productOrdersQuery = useQuery({
    queryKey: ['admin-product-orders', filters],
    queryFn: () => adminFetcher<ProductOrdersResponse>(`/api/product-orders?${buildQueryString()}`),
  });

  const productOrderQuery = (id: string) => useQuery({
    queryKey: ['admin-product-order', id],
    queryFn: () => adminFetcher<{ success: boolean; data: ProductOrder }>(`/api/product-orders/${id}`).then(res => res.data),
    enabled: !!id,
  });

  const updateProductOrder = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ProductOrder> }) =>
      adminFetcher<{ success: boolean; data: ProductOrder }>(`/api/product-orders/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-product-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-product-order'] });
      toast.success('Product order updated successfully');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteProductOrder = useMutation({
    mutationFn: (id: string) =>
      adminFetcher<{ success: boolean; message: string }>(`/api/product-orders/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-product-orders'] });
      toast.success('Product order deleted successfully');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return {
    productOrders: productOrdersQuery.data?.orders || [],
    pagination: productOrdersQuery.data?.pagination,
    isLoading: productOrdersQuery.isLoading,
    error: productOrdersQuery.error,
    productOrderQuery,
    updateProductOrder,
    deleteProductOrder,
  };
};