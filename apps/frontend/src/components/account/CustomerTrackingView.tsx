"use client";

import Link from "next/link";
import { CheckCircle2, Circle, CircleDashed } from "lucide-react";

import { CustomerBookingStatusBadge } from "@/components/bookings/CustomerBookingStatusBadge";
import { AccountCustomerMessageSchema, AccountCompanyCustomerNoteSchema, AccountFulfilmentSchema } from "@/lib/api/account-schema";
import type { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Fulfilment = z.infer<typeof AccountFulfilmentSchema>;
type Message = z.infer<typeof AccountCustomerMessageSchema>;
type CompanyCustomerNote = z.infer<typeof AccountCompanyCustomerNoteSchema>;

export type CustomerTrackingData = {
  reference?: string;
  status?: string | null;
  fulfilment?: Fulfilment;
  customer_messages?: Message[];
  company?: {
    name: string;
    city?: string | null;
    phone?: string | null;
    billing_email?: string | null;
  } | null;
  display_collection_date?: string | null;
  display_time_window_start?: string | null;
  display_time_window_end?: string | null;
  confirmed_collection_date?: string | null;
  confirmed_time_window_start?: string | null;
  confirmed_time_window_end?: string | null;
  requested_collection_date?: string | null;
  customer_notes?: string | null;
  customer_company_notes?: CompanyCustomerNote[];
};

function formatAt(iso?: string | null): string | null {
  if (!iso) {
    return null;
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return null;
  }
  return d.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

function formatWindow(start?: string | null, end?: string | null): string | null {
  if (!start && !end) {
    return null;
  }
  const clip = (s: string) => (s.length >= 5 ? s.slice(0, 5) : s);
  return `${start ? clip(start) : "?"}–${end ? clip(end) : "?"}`;
}

export function CustomerTrackingView(props: {
  data: CustomerTrackingData;
  variant: "public" | "account";
  accountBookingHref?: string;
}) {
  const { data, variant, accountBookingHref } = props;
  const timeline = data.fulfilment?.timeline ?? [];
  const route = data.fulfilment?.route;
  const ref = data.reference?.trim() || "Your booking";
  const win = formatWindow(
    data.display_time_window_start ?? data.confirmed_time_window_start,
    data.display_time_window_end ?? data.confirmed_time_window_end,
  );
  const day = data.display_collection_date ?? data.confirmed_collection_date ?? data.requested_collection_date ?? null;

  return (
    <div className="mx-auto max-w-lg min-w-0 space-y-6 md:max-w-2xl">
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Progress</p>
        <h1 className="text-balance text-2xl font-semibold tracking-tight">{ref}</h1>
        <p className="text-sm text-muted-foreground">
          {variant === "public"
            ? "Track your collection and workshop progress — no sign-in needed."
            : "Focused view of where your collection is in our process."}
        </p>
      </div>

      {data.status ? (
        <div className="flex flex-wrap items-center gap-2">
          <CustomerBookingStatusBadge status={data.status} className="text-sm" />
        </div>
      ) : null}

      <Card className="rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Schedule</CardTitle>
          <CardDescription>Your agreed collection window where we have one.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
            <span className="text-muted-foreground">Date</span>
            <span className="font-medium">{day ?? "—"}</span>
          </div>
          <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
            <span className="text-muted-foreground">Window</span>
            <span className="font-medium">{win ?? "—"}</span>
          </div>
          {route?.collected_at ? (
            <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
              <span className="text-muted-foreground">Collected</span>
              <span className="font-medium">{formatAt(route.collected_at) ?? "—"}</span>
            </div>
          ) : null}
          {route?.returned_at ? (
            <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
              <span className="text-muted-foreground">Returned</span>
              <span className="font-medium">{formatAt(route.returned_at) ?? "—"}</span>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Steps</CardTitle>
          <CardDescription>We update this as your booking moves forward.</CardDescription>
        </CardHeader>
        <CardContent>
          {timeline.length === 0 ? (
            <p className="text-sm text-muted-foreground">No milestones yet — check back soon.</p>
          ) : (
            <ol className="space-y-0">
              {timeline.map((step, i) => {
                const isLast = i === timeline.length - 1;
                const complete = step.state === "complete";
                const current = step.state === "current";
                return (
                  <li key={`${step.step_key}-${i}`} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      {complete ? (
                        <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                      ) : current ? (
                        <Circle className="h-6 w-6 shrink-0 text-primary" aria-hidden />
                      ) : (
                        <CircleDashed className="h-6 w-6 shrink-0 text-muted-foreground/70" aria-hidden />
                      )}
                      {!isLast ? <span className="mt-1 w-px flex-1 min-h-[1.25rem] bg-border" aria-hidden /> : null}
                    </div>
                    <div className={cn("pb-6", isLast && "pb-0")}>
                      <p
                        className={cn(
                          "font-medium leading-snug",
                          current && "text-foreground",
                          complete && "text-foreground",
                          !current && !complete && "text-muted-foreground",
                        )}
                      >
                        {step.label}
                      </p>
                      {step.description ? (
                        <p className="mt-0.5 text-sm text-muted-foreground">{step.description}</p>
                      ) : null}
                      {step.at ? (
                        <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                          {formatAt(step.at) ?? step.at}
                        </p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </CardContent>
      </Card>

      {data.customer_notes ? (
        <Card className="rounded-xl border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Your note</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="break-words whitespace-pre-wrap text-sm text-muted-foreground">{data.customer_notes}</p>
          </CardContent>
        </Card>
      ) : null}

      {data.customer_company_notes && data.customer_company_notes.length > 0 ? (
        <Card className="rounded-xl border-primary/25 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">From your account team</CardTitle>
            <CardDescription>Shared notes for your organisation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.customer_company_notes.map((note, idx) => (
              <blockquote
                key={`${note.created_at ?? "n"}-${idx}`}
                className="min-w-0 break-words border-l-2 border-primary/40 py-1 pl-3 text-sm leading-relaxed text-foreground"
              >
                <p className="break-words">{note.body}</p>
                {note.created_at ? (
                  <footer className="mt-2 text-xs text-muted-foreground tabular-nums">
                    {formatAt(note.created_at) ?? note.created_at}
                  </footer>
                ) : null}
              </blockquote>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {data.customer_messages && data.customer_messages.length > 0 ? (
        <Card className="rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Updates from our team</CardTitle>
            <CardDescription>Messages we’ve shared on your booking.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.customer_messages.map((m, i) => (
              <blockquote
                key={`${m.body.slice(0, 24)}-${i}`}
                className="min-w-0 break-words border-l-2 border-primary/40 py-1 pl-3 text-sm leading-relaxed"
              >
                <p className="break-words">{m.body}</p>
                {m.posted_at_label ? (
                  <footer className="mt-2 text-xs text-muted-foreground">{m.posted_at_label}</footer>
                ) : null}
              </blockquote>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {data.company?.name ? (
        <p className="text-center text-xs text-muted-foreground">
          Served by <span className="font-medium text-foreground">{data.company.name}</span>
          {data.company.city ? ` · ${data.company.city}` : null}
        </p>
      ) : null}

      {variant === "account" && accountBookingHref ? (
        <ButtonLink href={accountBookingHref} label="Full booking details" />
      ) : null}

      {variant === "public" ? (
        <p className="text-center text-xs text-muted-foreground">
          Prefer your account?{" "}
          <Link href="/account/dashboard" className="font-medium text-primary underline underline-offset-4">
            Sign in
          </Link>{" "}
          to see invoices and manage bookings.
        </p>
      ) : null}
    </div>
  );
}

function ButtonLink({ href, label }: { href: string; label: string }) {
  return (
    <div className="flex justify-center">
      <Link
        href={href}
        className="inline-flex h-12 min-h-11 touch-manipulation items-center justify-center rounded-lg border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground active:bg-accent/90"
      >
        {label}
      </Link>
    </div>
  );
}
