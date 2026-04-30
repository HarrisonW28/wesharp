import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";

export default function PublicLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10 md:px-8">
      <LoadingSkeleton />
    </div>
  );
}
