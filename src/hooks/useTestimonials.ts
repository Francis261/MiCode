import { useQuery } from "@tanstack/react-query";
import { fetcher } from "@/lib/api";
import { Testimonial } from "@/types/testimonial"; // Import new Testimonial type

export function useTestimonials() {
  return useQuery<Testimonial[], Error>({
    queryKey: ["testimonials"],
    queryFn: () => fetcher<Testimonial[]>("/testimonials"),
    refetchInterval: 120000, // Refetch every 2 minutes (120,000 ms)
    refetchIntervalInBackground: true, // Keep refetching even if window is not focused
  });
}