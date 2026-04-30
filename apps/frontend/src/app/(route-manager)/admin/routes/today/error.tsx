"use client";

import { ErrorState } from "@/components/feedback/ErrorState";

export default function RouteTodayError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-md px-4 py-8 pb-28 md:max-w-xl md:pb-10">
      <ErrorState title="Route manifest failed" message={error.message || "Unexpected error"} onRetry={reset} />
    </div>
  );
}
