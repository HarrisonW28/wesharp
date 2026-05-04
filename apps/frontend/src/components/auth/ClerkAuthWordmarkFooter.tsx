"use client";

import { WeSharpLogo } from "@/components/brand/WeSharpLogo";

/** Sits under the Clerk card on public sign-in/up — replaces the default vendor footer visually. */
export function ClerkAuthWordmarkFooter() {
  return (
    <div className="mt-4 flex justify-center" role="presentation">
      <WeSharpLogo href="/" className="h-7 opacity-85 transition-opacity hover:opacity-100" />
    </div>
  );
}
