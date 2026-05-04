"use client";

import Link from "next/link";
import { SignUp } from "@clerk/nextjs";

import { PUBLIC_SITE_CONTENT_CONTAINER_CLASS } from "@/lib/public-site-layout";
import { cn } from "@/lib/utils";

export default function RegisterPage() {
  return (
    <div className={cn(PUBLIC_SITE_CONTENT_CONTAINER_CLASS, "flex min-h-[70vh] flex-col items-center justify-center gap-8 py-16")}>
      <div className="wesharp-clerk-auth-card w-full max-w-[28rem] [&_.cl-card]:shadow-md">
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
