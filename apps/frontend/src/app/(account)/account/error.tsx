"use client";

import { ErrorState } from "@/components/feedback/ErrorState";

export default function AccountError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="space-y-6 px-4 py-6 md:px-8">
      <ErrorState title="Something went wrong" message={error.message || "Unexpected error"} onRetry={reset} />
    </div>
  );
}
