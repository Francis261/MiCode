import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminFetcher } from '@/lib/api';
import { ProjectType } from '@/types/custom-order';
import { toast } from 'sonner';

export const useAdminProjectTypes = () => {
  const queryClient = useQueryClient();

  const projectTypesQuery = useQuery({
    queryKey: ['admin-project-types'],
    queryFn: () => adminFetcher<ProjectType[]>('/api/project-types'),
  });

  const createProjectType = useMutation({
    mutationFn: (data: Partial<ProjectType>) =>
      adminFetcher<ProjectType>('/api/project-types', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-project-types'] });
      toast.success('Project type created successfully');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateProjectType = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ProjectType> }) =>
      adminFetcher<ProjectType>(`/api/project-types/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-project-types'] });
      toast.success('Project type updated successfully');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteProjectType = useMutation({
    mutationFn: (id: string) =>
      adminFetcher(`/api/project-types/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-project-types'] });
      toast.success('Project type deleted successfully');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return {
    projectTypes: projectTypesQuery.data || [],
    isLoading: projectTypesQuery.isLoading,
    error: projectTypesQuery.error,
    createProjectType,
    updateProjectType,
    deleteProjectType,
  };
};
