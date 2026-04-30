"use client";

import { ErrorState } from "@/components/feedback/ErrorState";

export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <ErrorState title="Page unavailable" message={error.message || "Something went wrong"} onRetry={reset} />
    </div>
  );
}
