import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminFetcher } from "@/lib/api";
import { Service } from "@/types/service";
import { toast } from "sonner";

// Fetch all services for admin
export function useAdminServices() {
  return useQuery<Service[], Error>({
    queryKey: ["adminServices"],
    queryFn: async () => {
      const response = await adminFetcher<{ success: boolean; data: Service[] }>("/api/services");
      return response.data;
    },
    refetchInterval: 60000,
    refetchIntervalInBackground: true,
  });
}

// Fetch a single service for admin
export function useAdminService(id: string) {
  return useQuery<Service, Error>({
    queryKey: ["adminService", id],
    queryFn: async () => {
      const response = await adminFetcher<{ success: boolean; data: Service }>(`/api/services/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

// Create a new service
export function useCreateService() {
  const queryClient = useQueryClient();
  return useMutation<Service, Error, Omit<Service, "_id" | "createdAt" | "updatedAt">>({
    mutationFn: async (newServiceData) => {
      const response = await adminFetcher<{ success: boolean; data: Service }>("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newServiceData),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminServices"] });
      toast.success("Service created successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to create service: ${error.message}`);
    },
  });
}

// Update an existing service
export function useUpdateService() {
  const queryClient = useQueryClient();
  return useMutation<Service, Error, Partial<Service> & { id: string }>({
    mutationFn: async ({ id, ...updateData }) => {
      const response = await adminFetcher<{ success: boolean; data: Service }>(`/api/services/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminServices"] });
      toast.success("Service updated successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to update service: ${error.message}`);
    },
  });
}

// Delete a service
export function useDeleteService() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (serviceId) => {
      await adminFetcher<void>(`/api/services/${serviceId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminServices"] });
      toast.success("Service deleted successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to delete service: ${error.message}`);
    },
  });
}
