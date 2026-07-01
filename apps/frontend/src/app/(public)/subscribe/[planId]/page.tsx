import { Suspense } from "react";
import { Loader2 } from "lucide-react";

import { SubscribeCheckoutClient } from "./SubscribeCheckoutClient";

export default function SubscriptionCheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
          <span className="text-sm">Loading checkout…</span>
        </div>
      }
    >
      <SubscribeCheckoutClient />
    </Suspense>
  );
}
