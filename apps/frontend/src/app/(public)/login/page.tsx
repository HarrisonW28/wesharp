"use client";

import Link from "next/link";
import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-8 px-4 py-16">
      <SignIn routing="path" path="/login" signUpUrl="/register" fallbackRedirectUrl="/account/dashboard" />
      <p className="max-w-md text-center text-xs text-muted-foreground">
        Need the operations workspace? Continue after signing in — staff roles are enforced by Laravel, not Clerk metadata.
      </p>
      <Link className="text-sm text-muted-foreground underline" href="/">
        Back home
      </Link>
    </div>
  );
}
