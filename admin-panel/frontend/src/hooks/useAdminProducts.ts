import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminFetcher } from "@/lib/api";
import { Product } from "@/types/product";
import { toast } from "sonner";

// Fetch all products for admin
export function useAdminProducts() {
  return useQuery<Product[], Error>({
    queryKey: ["adminProducts"],
    queryFn: () => adminFetcher<Product[]>("/api/products"),
    refetchInterval: 60000, // Refetch every minute
    refetchIntervalInBackground: true,
  });
}

// Fetch a single product for admin
export function useAdminProduct(id: string) {
  return useQuery<Product, Error>({
    queryKey: ["adminProduct", id],
    queryFn: () => adminFetcher<Product>(`/api/products/${id}`),
    enabled: !!id,
  });
}

// Create a new product
export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation<Product, Error, Omit<Product, "_id" | "isHidden" | "reviews" | "rating"> & { rating: number; reviews: number }>({
    mutationFn: (newProductData) => adminFetcher<Product>("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newProductData, isHidden: false }), // Default to not hidden
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminProducts"] });
      toast.success("Product created successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to create product: ${error.message}`);
    },
  });
}

// Update an existing product
export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation<Product, Error, Partial<Product> & { id: string }>({
    mutationFn: ({ id, ...updateData }) => adminFetcher<Product>(`/api/products/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updateData),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminProducts"] });
      toast.success("Product updated successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to update product: ${error.message}`);
    },
  });
}

// Delete a product
export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (productId) => adminFetcher<void>(`/api/products/${productId}`, {
      method: "DELETE",
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminProducts"] });
      toast.success("Product deleted successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to delete product: ${error.message}`);
    },
  });
}