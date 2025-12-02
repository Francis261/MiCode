import { useQuery } from "@tanstack/react-query";
import { fetcher } from "@/lib/api";
import { LucideIcon } from "lucide-react";
import * as LucideIcons from "lucide-react"; // Import all icons

interface Service {
  _id: string;
  icon: string;
  title: string;
  description: string;
  features: string[];
  actionButton?: {
    label: string;
    url: string;
  };
  statusTag?: string;
  content?: string;
  isHidden?: boolean; // Added isHidden property
}

// Interface for the service data *after* icon mapping
interface MappedService extends Omit<Service, 'icon'> {
  icon: LucideIcon;
}

// Helper to map string icon name to LucideIcon component
const getLucideIcon = (iconName: string): LucideIcon => {
  const Icon = (LucideIcons as any)[iconName];
  return Icon || LucideIcons.HelpCircle; // Fallback to a default icon if not found
};

export function useServices() {
  return useQuery<MappedService[], Error>({ // Use MappedService for the return type
    queryKey: ["services"],
    queryFn: async () => {
      const data = await fetcher<Service[]>("/services");
      // Map icon string to LucideIcon component for frontend use
      return data.map(service => ({
        ...service,
        icon: getLucideIcon(service.icon), // Now correctly assigns LucideIcon
      }));
    },
    refetchInterval: 120000, // Refetch every 2 minutes (120,000 ms)
    refetchIntervalInBackground: true, // Keep refetching even if window is not focused
  });
}