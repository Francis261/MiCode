import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ServiceCardSkeleton() {
  return (
    <Card variant="glass" className="h-full">
      <CardContent className="p-6 lg:p-8">
        <Skeleton className="w-14 h-14 rounded-xl mb-6" />
        <Skeleton className="h-6 w-3/4 mb-3" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-5/6 mb-6" />
        <ul className="space-y-2 mb-6">
          <li><Skeleton className="h-4 w-full" /></li>
          <li><Skeleton className="h-4 w-5/6" /></li>
          <li><Skeleton className="h-4 w-full" /></li>
        </ul>
        <Skeleton className="h-5 w-24" />
      </CardContent>
    </Card>
  );
}