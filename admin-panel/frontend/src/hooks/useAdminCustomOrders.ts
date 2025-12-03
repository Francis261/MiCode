import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminFetcher } from '@/lib/api';
import { CustomOrder, OrdersResponse } from '@/types/custom-order';
import { toast } from 'sonner';

export const useAdminCustomOrders = (filters?: { status?: string; priority?: string; search?: string; page?: number }) => {
  const queryClient = useQueryClient();

  const buildQueryString = () => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.page) params.append('page', filters.page.toString());
    return params.toString();
  };

  const ordersQuery = useQuery({
    queryKey: ['admin-custom-orders', filters],
    queryFn: () => adminFetcher<OrdersResponse>(`/api/custom-orders?${buildQueryString()}`),
  });

  const orderQuery = (id: string) => useQuery({
    queryKey: ['admin-custom-order', id],
    queryFn: () => adminFetcher<CustomOrder>(`/api/custom-orders/${id}`),
    enabled: !!id,
  });

  const createOrder = useMutation({
    mutationFn: (data: Partial<CustomOrder>) => 
      adminFetcher<CustomOrder>('/api/custom-orders', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-custom-orders'] });
      toast.success('Order created successfully');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateOrder = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CustomOrder> }) =>
      adminFetcher<CustomOrder>(`/api/custom-orders/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-custom-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-custom-order'] });
      toast.success('Order updated successfully');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteOrder = useMutation({
    mutationFn: (id: string) =>
      adminFetcher(`/api/custom-orders/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-custom-orders'] });
      toast.success('Order deleted successfully');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const addMessage = useMutation({
    mutationFn: ({ id, message }: { id: string; message: { message: string; isEmail?: boolean; emailSubject?: string; senderName?: string } }) =>
      adminFetcher<CustomOrder>(`/api/custom-orders/${id}/messages`, {
        method: 'POST',
        body: JSON.stringify(message),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-custom-order'] });
      toast.success('Message sent successfully');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const sendQuote = useMutation({
    mutationFn: ({ id, quote }: { id: string; quote: { amount: number; timeline: string; notes?: string } }) =>
      adminFetcher<CustomOrder>(`/api/custom-orders/${id}/quote`, {
        method: 'POST',
        body: JSON.stringify(quote),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-custom-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-custom-order'] });
      toast.success('Quote sent successfully');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return {
    orders: ordersQuery.data?.orders || [],
    pagination: ordersQuery.data?.pagination,
    isLoading: ordersQuery.isLoading,
    error: ordersQuery.error,
    orderQuery,
    createOrder,
    updateOrder,
    deleteOrder,
    addMessage,
    sendQuote,
  };
};
