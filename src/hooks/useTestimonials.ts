import { useQuery } from "@tanstack/react-query";
import { fetcher } from "@/lib/api";

interface Testimonial {
  _id: string; // MongoDB ID
  name: string;
  role: string;
  company: string;
  avatar: string;
  content: string;
  rating: number;
}

export function useTestimonials() {
  return useQuery<Testimonial[], Error>({
    queryKey: ["testimonials"],
    queryFn: () => fetcher<Testimonial[]>("/testimonials"),
    refetchInterval: 120000, // Refetch every 2 minutes (120,000 ms)
    refetchIntervalInBackground: true, // Keep refetching even if window is not focused
  });
}