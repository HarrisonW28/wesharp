"use client";

import Link from "next/link";
import { SignUp } from "@clerk/nextjs";

export default function RegisterPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-8 px-4 py-16">
      <div className="w-full max-w-[28rem] [&_.cl-card]:shadow-md">
        <SignUp routing="path" path="/register" signInUrl="/login" forceRedirectUrl="/auth/continue" />
      </div>
      <p className="max-w-md text-center text-sm text-muted-foreground">
        Create a free account to book collections, track sharpenings, and see invoices — built for kitchens and home cooks
        who want the same professional service.
      </p>
      <Link className="text-sm text-muted-foreground underline" href="/">
        Back home
      </Link>
    </div>
  );
}
