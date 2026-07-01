import { Loader2 } from "lucide-react";
import { Suspense } from "react";

import { AuthContinueClient } from "./AuthContinueClient";

function AuthContinueFallback() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-muted-foreground">
      <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
      <span className="text-sm">Preparing your session…</span>
    </div>
  );
}

export default function AuthContinuePage() {
  return (
    <Suspense fallback={<AuthContinueFallback />}>
      <AuthContinueClient />
    </Suspense>
  );
}
