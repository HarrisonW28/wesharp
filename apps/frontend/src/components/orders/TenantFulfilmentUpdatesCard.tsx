"use client";

import { CalendarRange, ImageIcon, MessageSquareText, Route } from "lucide-react";
import { useEffect, useState } from "react";
import type { z } from "zod";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AccountCustomerMessageSchema,
  AccountFulfilmentSchema,
  AccountPortalOrderPhotoSchema,
} from "@/lib/api/account-schema";
import { useAccountApi } from "@/lib/api/use-account-api";
import { cn } from "@/lib/utils";

type Fulfilment = z.infer<typeof AccountFulfilmentSchema>;
type Message = z.infer<typeof AccountCustomerMessageSchema>;
type Photo = z.infer<typeof AccountPortalOrderPhotoSchema>;

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

function OrderEvidenceImage({ path, alt }: { path: string; alt: string }) {
  const api = useAccountApi();
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
    setSrc(null);
    let objectUrl: string | null = null;
    let cancelled = false;
    void (async () => {
      try {
        const blob = await api.fetchBlob(path);
        if (!cancelled) {
          objectUrl = URL.createObjectURL(blob);
          setSrc(objectUrl);
        }
      } catch {
        if (!cancelled) {
          setFailed(true);
          setSrc(null);
        }
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [path, api]);

  if (failed) {
    return (
      <div className="flex min-h-32 w-full items-center justify-center rounded-lg border border-dashed border-muted-foreground/40 bg-muted/20 px-3">
        <span className="text-center text-sm text-muted-foreground">
          We couldn’t load this image. Refresh the page or try again later.
        </span>
      </div>
    );
  }

  if (!src) {
    return (
      <div className="flex aspect-video max-h-48 w-full items-center justify-center rounded-lg bg-muted/40">
        <span className="text-sm text-muted-foreground">Loading…</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className="max-h-64 w-full rounded-lg border object-contain" />
  );
}

export function TenantFulfilmentUpdatesCard({
  fulfilment,
  customerMessages,
  photos,
}: {
  fulfilment?: Fulfilment | null;
  customerMessages?: Message[] | null;
  photos?: Photo[] | null;
}) {
  const route = fulfilment?.route;
  const timeline = fulfilment?.timeline ?? [];
  const messages = customerMessages ?? [];
  const imgs = photos ?? [];

  const hasRoute =
    route &&
    (route.collection_date ||
      route.collection_window_start ||
      route.collection_window_end ||
      route.collected_at ||
      route.returned_at);

  const isEmpty = timeline.length === 0 && !hasRoute && messages.length === 0 && imgs.length === 0;

  return (
    <Card className="rounded-xl lg:col-span-3">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Route className="h-4 w-4 text-muted-foreground" aria-hidden />
          Photos &amp; updates
        </CardTitle>
        <CardDescription>
          Collection, return and workshop photos our team has marked visible for your account. Internal-only images are never
          shown here.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 md:space-y-8">
        {isEmpty ? (
          <p className="text-sm text-muted-foreground">
            No updates yet — we’ll post progress here as your booking moves through collection and sharpening.
          </p>
        ) : null}

        {timeline.length > 0 ? (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Progress</p>
            <ol className="mt-3 space-y-0">
              {timeline.map((step) => (
                <li
                  key={step.step_key}
                  className="relative border-l border-border pb-6 pl-6 last:border-l-0 last:pb-0"
                >
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
                    {step.at ? (
                      <p className="text-xs text-muted-foreground tabular-nums">{formatAt(step.at)}</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ) : null}

        {hasRoute ? (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-2">
              <CalendarRange className="h-3.5 w-3.5" aria-hidden />
              Collection &amp; visits
            </p>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              {route.collection_date ? (
                <div>
                  <dt className="text-muted-foreground">Confirmed day</dt>
                  <dd className="font-medium">
                    {new Date(route.collection_date + "T12:00:00").toLocaleDateString("en-GB")}
                  </dd>
                </div>
              ) : null}
              {route.collection_window_start || route.collection_window_end ? (
                <div>
                  <dt className="text-muted-foreground">Window</dt>
                  <dd className="font-medium">
                    {[route.collection_window_start, route.collection_window_end].filter(Boolean).join(" – ") || "—"}
                  </dd>
                </div>
              ) : null}
              {route.collected_at ? (
                <div>
                  <dt className="text-muted-foreground">Collected</dt>
                  <dd className="font-medium tabular-nums">{formatAt(route.collected_at)}</dd>
                </div>
              ) : null}
              {route.returned_at ? (
                <div>
                  <dt className="text-muted-foreground">Returned</dt>
                  <dd className="font-medium tabular-nums">{formatAt(route.returned_at)}</dd>
                </div>
              ) : null}
            </dl>
          </div>
        ) : null}

        {messages.length > 0 ? (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-2">
              <MessageSquareText className="h-3.5 w-3.5" aria-hidden />
              Messages from our team
            </p>
            <ul className="mt-3 space-y-4">
              {messages.map((m, idx) => (
                <li key={`${idx}-${m.body.slice(0, 24)}`} className="rounded-lg border bg-muted/20 px-3 py-3">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.body}</p>
                  <p className="mt-2 text-xs text-muted-foreground tabular-nums">
                    {m.posted_at_label ?? formatAt(m.posted_at)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {imgs.length > 0 ? (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-2">
              <ImageIcon className="h-3.5 w-3.5" aria-hidden />
              Photos shared with you
            </p>
            <ul className="mt-3 space-y-6">
              {imgs.map((ph) => (
                <li key={ph.id} className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium">{ph.category_label ?? ph.status_line ?? "Photo"}</span>
                    {ph.captured_at_label ? (
                      <span className="text-muted-foreground tabular-nums">{ph.captured_at_label}</span>
                    ) : null}
                  </div>
                  {ph.caption ? <p className="text-sm text-muted-foreground">{ph.caption}</p> : null}
                  {ph.file_fetch_path ? (
                    <OrderEvidenceImage
                      path={ph.file_fetch_path}
                      alt={ph.caption || ph.category_label || "Shared photo"}
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
