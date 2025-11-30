import { useQuery } from "@tanstack/react-query";
import { fetcher } from "@/lib/api";
import { Product } from "@/data/products"; // Re-using the Product interface

export function useProducts() {
  return useQuery<Product[], Error>({
    queryKey: ["products"],
    queryFn: () => fetcher<Product[]>("/products"),
  });
}

export function useProduct(id: string) {
  return useQuery<Product, Error>({
    queryKey: ["product", id],
    queryFn: () => fetcher<Product>(`/products/${id}`),
    enabled: !!id, // Only run query if id is available
  });
}