import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";

export default function AccountLoading() {
  return (
    <div className="space-y-6 px-4 py-6 md:px-8">
      <LoadingSkeleton />
    </div>
  );
}
