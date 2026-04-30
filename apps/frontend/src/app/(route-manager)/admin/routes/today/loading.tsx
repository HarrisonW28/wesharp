import { Skeleton } from "@/components/ui/skeleton";

export default function RouteTodayLoading() {
  return (
    <div className="mx-auto max-w-md space-y-3 px-4 py-4 pb-28 md:max-w-none md:pb-10">
      <Skeleton className="h-28 w-full rounded-2xl bg-white/10 md:bg-muted" />
      <Skeleton className="h-36 w-full rounded-2xl bg-white/10 md:bg-muted" />
      <Skeleton className="h-36 w-full rounded-2xl bg-white/10 md:bg-muted" />
      <Skeleton className="h-36 w-full rounded-2xl bg-white/10 md:bg-muted" />
    </div>
  );
}
