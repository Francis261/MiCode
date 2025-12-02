import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminFetcher } from "@/lib/api";
import { Testimonial } from "@/types/testimonial";
import { toast } from "sonner";

// Fetch all testimonials for admin
export function useAdminTestimonials() {
  return useQuery<Testimonial[], Error>({
    queryKey: ["adminTestimonials"],
    queryFn: async () => {
      const response = await adminFetcher<{ success: boolean; data: Testimonial[] }>("/api/testimonials");
      return response.data;
    },
    refetchInterval: 60000, // Refetch every minute
    refetchIntervalInBackground: true,
  });
}

// Fetch a single testimonial for admin
export function useAdminTestimonial(id: string) {
  return useQuery<Testimonial, Error>({
    queryKey: ["adminTestimonial", id],
    queryFn: async () => {
      const response = await adminFetcher<{ success: boolean; data: Testimonial }>(`/api/testimonials/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

// Create a new testimonial
export function useCreateTestimonial() {
  const queryClient = useQueryClient();
  return useMutation<Testimonial, Error, Omit<Testimonial, "_id" | "createdAt" | "updatedAt">>({
    mutationFn: async (newTestimonialData) => {
      const response = await adminFetcher<{ success: boolean; data: Testimonial }>("/api/testimonials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTestimonialData),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminTestimonials"] });
      toast.success("Testimonial created successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to create testimonial: ${error.message}`);
    },
  });
}

// Update an existing testimonial
export function useUpdateTestimonial() {
  const queryClient = useQueryClient();
  return useMutation<Testimonial, Error, Partial<Testimonial> & { id: string }>({
    mutationFn: async ({ id, ...updateData }) => {
      const response = await adminFetcher<{ success: boolean; data: Testimonial }>(`/api/testimonials/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminTestimonials"] });
      toast.success("Testimonial updated successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to update testimonial: ${error.message}`);
    },
  });
}

// Delete a testimonial
export function useDeleteTestimonial() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (testimonialId) => {
      await adminFetcher<void>(`/api/testimonials/${testimonialId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminTestimonials"] });
      toast.success("Testimonial deleted successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to delete testimonial: ${error.message}`);
    },
  });
}