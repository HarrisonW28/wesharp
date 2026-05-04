import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { PUBLIC_SITE_CONTENT_CONTAINER_CLASS } from "@/lib/public-site-layout";
import { cn } from "@/lib/utils";

export default function PublicLoading() {
  return (
    <div className={cn(PUBLIC_SITE_CONTENT_CONTAINER_CLASS, "space-y-6 py-10")}>
      <LoadingSkeleton />
    </div>
  );
}
