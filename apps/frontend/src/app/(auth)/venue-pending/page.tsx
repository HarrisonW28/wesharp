import { Loader2 } from "lucide-react";
import { Suspense } from "react";

import { VenuePendingClient } from "./VenuePendingClient";

function VenuePendingFallback() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 text-muted-foreground">
      <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
      <span className="text-sm">Loading…</span>
    </div>
  );
}

export default function VenuePendingPage() {
  return (
    <Suspense fallback={<VenuePendingFallback />}>
      <VenuePendingClient />
    </Suspense>
  );
}
