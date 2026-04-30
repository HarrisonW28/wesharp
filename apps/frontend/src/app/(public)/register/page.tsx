"use client";

import Link from "next/link";
import { SignUp } from "@clerk/nextjs";

export default function RegisterPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-8 px-4 py-16">
      <SignUp routing="path" path="/register" signInUrl="/login" fallbackRedirectUrl="/account/dashboard" />
      <p className="max-w-md text-center text-xs text-muted-foreground">
        Commercial kitchens only — WeSharp admins assign internal roles separately from customer portal access.
      </p>
      <Link className="text-sm text-muted-foreground underline" href="/">
        Back home
      </Link>
    </div>
  );
}
