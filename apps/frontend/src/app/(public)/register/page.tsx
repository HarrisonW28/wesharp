"use client";

import Link from "next/link";
import { SignUp } from "@clerk/nextjs";

export default function RegisterPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-8 px-4 py-16">
      <div className="w-full max-w-[28rem] [&_.cl-card]:shadow-md">
        <SignUp routing="path" path="/register" signInUrl="/login" forceRedirectUrl="/auth/continue" />
      </div>
      <p className="max-w-md text-center text-xs text-muted-foreground">
        Commercial kitchens only — WeSharp admins assign internal roles separately from customer portal access.
      </p>
      <Link className="text-sm text-muted-foreground underline" href="/">
        Back home
      </Link>
    </div>
  );
}
