"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PUBLIC_SITE_CONTENT_CONTAINER_CLASS } from "@/lib/public-site-layout";
import { cn } from "@/lib/utils";

export function AccountOnboardingClient() {
  const searchParams = useSearchParams();
  const subscribed = searchParams.get("subscribed") === "1";

  return (
    <div className={cn(PUBLIC_SITE_CONTENT_CONTAINER_CLASS, "py-12 md:py-16")}>
      <div className="mx-auto max-w-xl space-y-8">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-7 w-7" aria-hidden />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-primary">{subscribed ? "Subscription active" : "Welcome to WeSharp"}</p>
            <h1 className="text-2xl font-semibold tracking-tight">
              {subscribed ? "You're subscribed — let's get you collecting" : "Set up your first collection"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {subscribed
                ? "Payment is confirmed. Add a pickup address and request your first collection when you're ready."
                : "Add a pickup address so we know where to collect from, then book your first sharpening visit."}
            </p>
          </div>
        </div>

        <ol className="space-y-4 text-sm">
          <li className="rounded-xl border bg-muted/20 p-4">
            <span className="font-medium text-foreground">1. Add a pickup address</span>
            <p className="mt-1 text-muted-foreground">
              Save your kitchen, venue, or home address under Locations.
            </p>
            <Button asChild className="mt-3 rounded-lg" size="sm">
              <Link href="/account/locations">Add location</Link>
            </Button>
          </li>
          <li className="rounded-xl border bg-muted/20 p-4">
            <span className="font-medium text-foreground">2. Book your first collection</span>
            <p className="mt-1 text-muted-foreground">Schedule a pickup once your address is saved.</p>
            <Button asChild variant="outline" className="mt-3 rounded-lg" size="sm">
              <Link href="/account/bookings/new">Book a collection</Link>
            </Button>
          </li>
          {subscribed ? (
            <li className="rounded-xl border bg-muted/20 p-4">
              <span className="font-medium text-foreground">3. View your programme</span>
              <p className="mt-1 text-muted-foreground">See allowance, renewal date, and invoices in one place.</p>
              <Button asChild variant="outline" className="mt-3 rounded-lg" size="sm">
                <Link href="/account/subscription">View subscription</Link>
              </Button>
            </li>
          ) : null}
        </ol>

        <Button asChild variant="ghost" className="rounded-lg">
          <Link href="/account/dashboard">Skip for now</Link>
        </Button>
      </div>
    </div>
  );
}
