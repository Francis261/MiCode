import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminFetcher } from "@/lib/api";
import { AdminUser } from "@/types/admin-user";
import { toast } from "sonner";

// Fetch all admin users
export function useAdminUsers() {
  return useQuery<AdminUser[], Error>({
    queryKey: ["adminUsers"],
    queryFn: async () => {
      const response = await adminFetcher<{ success: boolean; data: AdminUser[] }>("/api/admin-users");
      return response.data;
    },
    refetchInterval: 60000, // Refetch every minute
    refetchIntervalInBackground: true,
  });
}

// Fetch a single admin user
export function useAdminUser(id: string) {
  return useQuery<AdminUser, Error>({
    queryKey: ["adminUser", id],
    queryFn: async () => {
      const response = await adminFetcher<{ success: boolean; data: AdminUser }>(`/api/admin-users/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

// Create a new admin user
export function useCreateAdminUser() {
  const queryClient = useQueryClient();
  return useMutation<AdminUser, Error, Omit<AdminUser, "_id" | "createdAt" | "updatedAt">>({
    mutationFn: async (newAdminUserData) => {
      const response = await adminFetcher<{ success: boolean; data: AdminUser }>("/api/admin-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAdminUserData),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      toast.success("Admin user created successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to create admin user: ${error.message}`);
    },
  });
}

// Update an existing admin user
export function useUpdateAdminUser() {
  const queryClient = useQueryClient();
  return useMutation<AdminUser, Error, Partial<AdminUser> & { id: string }>({
    mutationFn: async ({ id, ...updateData }) => {
      const response = await adminFetcher<{ success: boolean; data: AdminUser }>(`/api/admin-users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      toast.success("Admin user updated successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to update admin user: ${error.message}`);
    },
  });
}

// Delete an admin user
export function useDeleteAdminUser() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (adminUserId) => {
      await adminFetcher<void>(`/api/admin-users/${adminUserId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      toast.success("Admin user deleted successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to delete admin user: ${error.message}`);
    },
  });
}