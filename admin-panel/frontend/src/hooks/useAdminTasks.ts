import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminFetcher } from '@/lib/api';
import { Task } from '@/types/custom-order';
import { toast } from 'sonner';

export const useAdminTasks = (orderId?: string) => {
  const queryClient = useQueryClient();

  const buildQueryString = () => {
    const params = new URLSearchParams();
    if (orderId) params.append('orderId', orderId);
    return params.toString();
  };

  const tasksQuery = useQuery({
    queryKey: ['admin-tasks', orderId],
    queryFn: () => adminFetcher<Task[]>(`/api/tasks?${buildQueryString()}`),
  });

  const taskQuery = (id: string) => useQuery({
    queryKey: ['admin-task', id],
    queryFn: () => adminFetcher<Task>(`/api/tasks/${id}`),
    enabled: !!id,
  });

  const createTask = useMutation({
    mutationFn: (data: Partial<Task>) =>
      adminFetcher<Task>('/api/tasks', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tasks'] });
      toast.success('Task created successfully');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateTask = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Task> }) =>
      adminFetcher<Task>(`/api/tasks/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['admin-task'] });
      toast.success('Task updated successfully');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteTask = useMutation({
    mutationFn: (id: string) =>
      adminFetcher(`/api/tasks/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tasks'] });
      toast.success('Task deleted successfully');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggleSubtask = useMutation({
    mutationFn: ({ taskId, subtaskId }: { taskId: string; subtaskId: string }) =>
      adminFetcher<Task>(`/api/tasks/${taskId}/subtasks/${subtaskId}`, {
        method: 'PATCH',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['admin-task'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const reorderTasks = useMutation({
    mutationFn: (tasks: { id: string; sortOrder: number }[]) =>
      adminFetcher('/api/tasks/reorder', {
        method: 'POST',
        body: JSON.stringify({ tasks }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tasks'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return {
    tasks: tasksQuery.data || [],
    isLoading: tasksQuery.isLoading,
    error: tasksQuery.error,
    taskQuery,
    createTask,
    updateTask,
    deleteTask,
    toggleSubtask,
    reorderTasks,
  };
};
