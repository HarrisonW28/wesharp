"use client";

import Link from "next/link";
import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-8 px-4 py-16">
      <div className="w-full max-w-[28rem] [&_.cl-card]:shadow-md">
        <SignIn routing="path" path="/login" signUpUrl="/register" forceRedirectUrl="/auth/continue" />
      </div>
      <p className="text-sm text-muted-foreground">
        Sign in to book collections, follow your orders, and manage invoices — all in one calm dashboard.
      </p>
      <Link className="text-sm text-muted-foreground underline" href="/">
        Back home
      </Link>
    </div>
  );
}
