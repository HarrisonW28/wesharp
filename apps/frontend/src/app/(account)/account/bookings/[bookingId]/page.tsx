"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Link2, Loader2, MapPin, StickyNote, User } from "lucide-react";

import { AccountBookingDetailResponseSchema } from "@/lib/api/account-schema";
import { useAccountApi } from "@/lib/api/use-account-api";
import {
  bookingCustomerNextSteps,
  buildCustomerBookingTimeline,
  formatBookingTimeWindow,
  formatContactBlock,
  formatLocationBlock,
} from "@/lib/bookings/customer-booking-ui";

import { CustomerBookingStatusBadge } from "@/components/bookings/CustomerBookingStatusBadge";
import { TenantFulfilmentUpdatesCard } from "@/components/orders/TenantFulfilmentUpdatesCard";
import { CustomerActivityTimeline } from "@/components/account/CustomerActivityTimeline";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

export default function TenantBookingDetailPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const api = useAccountApi();
  const qc = useQueryClient();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const query = useQuery({
    queryKey: ["account-booking", bookingId],
    enabled: Boolean(bookingId),
    queryFn: async () => {
      const res = await api.json<unknown>(`/api/account/bookings/${bookingId}`);
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = AccountBookingDetailResponseSchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Unexpected booking payload.");
      }
      return parsed.data.data;
    },
  });

  const copyTrackingMutation = useMutation({
    mutationFn: async () => {
      const res = await api.json<unknown>(`/api/account/bookings/${bookingId}/tracking-link`);
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = z
        .object({
          success: z.literal(true),
          data: z.object({ tracking_url: z.string() }),
        })
        .safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Unexpected tracking link response.");
      }
      return parsed.data.data.tracking_url;
    },
    onSuccess: async (url) => {
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Tracking link copied");
      } catch {
        toast.message("Copy this link", { description: url });
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await api.json<unknown>(`/api/account/bookings/${bookingId}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason: cancelReason.trim() || undefined }),
      });
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = AccountBookingDetailResponseSchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Unexpected response after cancel.");
      }
      return parsed.data.data;
    },
    onSuccess: async () => {
      setCancelOpen(false);
      setCancelReason("");
      await qc.invalidateQueries({ queryKey: ["account-bookings"] });
      await qc.invalidateQueries({ queryKey: ["account-booking", bookingId] });
      await qc.invalidateQueries({ queryKey: ["account-dashboard"] });
    },
  });

  const d = query.data ?? null;
  const timeline = d ? buildCustomerBookingTimeline(d.status) : null;
  const useServerFulfilment = Boolean(d?.fulfilment?.timeline && d.fulfilment.timeline.length > 0);

  const requestedDay = d?.requested_collection_date ?? d?.requested_date ?? null;
  const requestedWin = d
    ? formatBookingTimeWindow(
        d.requested_time_window_start ?? d.time_window_start,
        d.requested_time_window_end ?? d.time_window_end,
      )
    : null;
  const confirmedDay = d?.confirmed_collection_date ?? null;
  const confirmedWin = d ? formatBookingTimeWindow(d.confirmed_time_window_start, d.confirmed_time_window_end) : null;

  const hasOrders = (d?.orders?.length ?? 0) > 0;
  const canCancel = Boolean(d?.customer_cancellable);

  const nextSteps =
    d != null
      ? bookingCustomerNextSteps(d.status, {
          canCancel,
          hasLinkedOrders: hasOrders,
        })
      : [];

  return (
    <div className="space-y-8">
      <Breadcrumbs
        homeHref="/account/dashboard"
        items={[
          { label: "My bookings", href: "/account/bookings" },
          { label: "Booking details" },
        ]}
      />
      <PageHeader
        title="Booking details"
        description="Everything you need to know about this collection — in plain language."
        titleRowEnd={
          d && timeline ? (
            <>
              <CustomerBookingStatusBadge status={d.status} className="w-fit text-sm" />
              {canCancel ? (
                <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="outline" size="sm" className="rounded-lg text-destructive hover:text-destructive">
                      Cancel booking
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
                      <AlertDialogDescription>
                        You can cancel before we assign this collection to a route. If we’ve already scheduled your visit, contact
                        us instead.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-2">
                      <label className="text-sm font-medium" htmlFor="cancel-reason">
                        Note (optional)
                      </label>
                      <Textarea
                        id="cancel-reason"
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        placeholder="e.g. Kitchen closed that day"
                        className="min-h-[80px] resize-none"
                        maxLength={2000}
                      />
                    </div>
                    {cancelMutation.isError ? (
                      <p className="text-sm text-destructive">{(cancelMutation.error as Error).message}</p>
                    ) : null}
                    <AlertDialogFooter>
                      <AlertDialogCancel type="button" disabled={cancelMutation.isPending}>
                        Keep booking
                      </AlertDialogCancel>
                      <Button
                        type="button"
                        disabled={cancelMutation.isPending}
                        variant="destructive"
                        className="rounded-lg"
                        onClick={() => cancelMutation.mutate()}
                      >
                        {cancelMutation.isPending ? "Cancelling…" : "Yes, cancel"}
                      </Button>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : null}
            </>
          ) : null
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" className="rounded-lg" asChild>
              <Link href={`/account/bookings/${bookingId}/track`}>Track progress</Link>
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="rounded-lg gap-2"
              disabled={copyTrackingMutation.isPending}
              onClick={() => copyTrackingMutation.mutate()}
            >
              {copyTrackingMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Link2 className="h-4 w-4" aria-hidden />
              )}
              Copy guest link
            </Button>
            <Button type="button" variant="outline" size="sm" className="rounded-lg" asChild>
              <Link href="/account/bookings">Back to list</Link>
            </Button>
          </div>
        }
      />

      {query.status === "pending" ? (
        <div className="flex min-h-[20vh] items-center justify-center text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
        </div>
      ) : query.isError ? (
        <Card className="border-destructive/40">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{(query.error as Error).message}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              If this isn’t your booking, you won’t be able to open it — each company only sees its own collections.
            </p>
            <Button type="button" className="mt-4 rounded-lg" variant="outline" size="sm" asChild>
              <Link href="/account/bookings">My bookings</Link>
            </Button>
          </CardContent>
        </Card>
      ) : d && timeline ? (
        <div className="space-y-6">
          {useServerFulfilment ? (
            <TenantFulfilmentUpdatesCard
              fulfilment={d.fulfilment}
              customerMessages={d.customer_messages}
              photos={[]}
            />
          ) : timeline.variant === "cancelled" ? (
            <Card className="border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{timeline.headline}</CardTitle>
              </CardHeader>
            </Card>
          ) : (
            <Card className="border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalendarClock className="h-4 w-4 text-primary" aria-hidden />
                  Progress
                </CardTitle>
                <CardDescription>{timeline.headline}</CardDescription>
              </CardHeader>
              <CardContent>
                <ol className="space-y-0">
                  {timeline.steps.map((step) => (
                    <li key={step.id} className="relative border-l border-border pb-8 pl-6 last:border-l-0 last:pb-0">
                      <span
                        className={cn(
                          "absolute left-0 top-1.5 h-2.5 w-2.5 -translate-x-1/2 rounded-full border-2 border-background",
                          step.state === "complete" && "bg-emerald-500",
                          step.state === "current" && "bg-primary",
                          step.state === "upcoming" && "bg-muted-foreground/30",
                        )}
                        aria-hidden
                      />
                      <div className="space-y-1">
                        <div className="font-medium leading-tight">{step.label}</div>
                        {step.description ? <p className="text-sm text-muted-foreground">{step.description}</p> : null}
                      </div>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}

          <CustomerActivityTimeline
            title="What we’ve recorded"
            emptyHint="When we update this booking, you’ll see milestones here — confirmations, schedule changes, and when it’s linked to a visit."
            items={d.activity_timeline ?? []}
          />

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Requested collection</CardTitle>
                <CardDescription>What you asked for when you booked.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <div className="text-xs font-medium text-muted-foreground">Preferred day</div>
                  <div className="mt-0.5">{requestedDay ?? "—"}</div>
                </div>
                <div>
                  <div className="text-xs font-medium text-muted-foreground">Requested time window</div>
                  <div className="mt-0.5">{requestedWin ?? "Not specified"}</div>
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Confirmed visit</CardTitle>
                <CardDescription>The date and window we’ve agreed with you.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <div className="text-xs font-medium text-muted-foreground">Confirmed day</div>
                  <div className="mt-0.5">{confirmedDay ?? "Not yet — we’ll confirm soon."}</div>
                </div>
                <div>
                  <div className="text-xs font-medium text-muted-foreground">Confirmed time window</div>
                  <div className="mt-0.5">{confirmedWin ?? "—"}</div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="h-4 w-4 text-primary" aria-hidden />
                  Location
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                {formatLocationBlock(d.location ?? null).length > 0 ? (
                  <ul className="space-y-1">
                    {formatLocationBlock(d.location ?? null).map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">No address on file for this booking.</p>
                )}
              </CardContent>
            </Card>

            <Card className="border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="h-4 w-4 text-primary" aria-hidden />
                  Contact on site
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                {formatContactBlock(d.contact ?? null).length > 0 ? (
                  <ul className="space-y-1">
                    {formatContactBlock(d.contact ?? null).map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">No named contact for this booking.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <StickyNote className="h-4 w-4 text-primary" aria-hidden />
                Your notes
              </CardTitle>
              <CardDescription>Information you shared when booking (not seen on your invoice automatically).</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {d.customer_notes?.trim() ? (
                <p className="whitespace-pre-wrap text-foreground">{d.customer_notes}</p>
              ) : (
                <p>No notes added.</p>
              )}
            </CardContent>
          </Card>

          {d.customer_company_notes && d.customer_company_notes.length > 0 ? (
            <Card className="border border-primary/20 bg-primary/5 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">From your account team</CardTitle>
                <CardDescription>Messages shared for your organisation in the customer portal.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                {d.customer_company_notes.map((note, idx) => (
                  <blockquote
                    key={`${note.created_at ?? "note"}-${idx}`}
                    className="border-l-2 border-primary/50 py-1 pl-3 text-foreground"
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">{note.body}</p>
                    {note.created_at ? (
                      <footer className="mt-2 text-xs text-muted-foreground tabular-nums">
                        {new Date(note.created_at).toLocaleString("en-GB", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </footer>
                    ) : null}
                  </blockquote>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {hasOrders ? (
            <Card className="border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Linked order</CardTitle>
                <CardDescription>Sharpening work tied to this collection.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-3 text-sm">
                {(d.orders ?? []).map((o) => (
                  <Button key={o.id} variant="secondary" size="sm" className="rounded-lg" asChild>
                    <Link href={`/account/orders/${o.id}`}>View order</Link>
                  </Button>
                ))}
              </CardContent>
            </Card>
          ) : null}

          <Card className="border bg-muted/20 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">What happens next</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-inside list-disc space-y-1.5 text-sm text-muted-foreground">
                {nextSteps.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="button" size="sm" className="rounded-lg" asChild>
                  <Link href="/account/bookings/new">Book another collection</Link>
                </Button>
                <Button type="button" variant="outline" size="sm" className="rounded-lg" asChild>
                  <Link href="/account/dashboard">Dashboard</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
