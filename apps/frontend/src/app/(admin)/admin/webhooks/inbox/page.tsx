"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Loader2, Webhook } from "lucide-react";

import { NavBreadcrumbs } from "@/components/layout/NavBreadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WebhookInboxListResponseSchema } from "@/lib/api/admin-webhooks-inbox-schema";
import { useAdminApi } from "@/lib/api/use-admin-api";

function formatWhen(iso: string | null): string {
  if (!iso) {
    return "—";
  }
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

function stateVariant(state: string): "default" | "secondary" | "destructive" | "outline" {
  if (state === "processed") {
    return "secondary";
  }
  if (state === "failed") {
    return "destructive";
  }
  return "outline";
}

export default function AdminWebhooksInboxPage() {
  const admin = useAdminApi();

  const listQuery = useQuery({
    queryKey: ["admin-webhooks-inbox"],
    queryFn: async () => {
      const res = await admin.json<unknown>("/api/admin/webhooks/inbox");
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = WebhookInboxListResponseSchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Unexpected webhook inbox payload.");
      }
      return parsed.data.data.items;
    },
  });

  const items = listQuery.data ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <NavBreadcrumbs />
      <PageHeader
        title="Webhook inbox"
        description="Recent provider deliveries (Clerk/Svix, future Stripe consolidated here). Metadata only — no raw payloads."
      />

      <Card>
        <CardHeader className="flex flex-row items-start gap-3 space-y-0">
          <Webhook className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-base">Last 100 events</CardTitle>
            <CardDescription>
              Retry-safe idempotency keys are provider <span className="font-medium">external_id</span> (e.g. Svix
              message id). See also{" "}
              <Link href="/admin/audit" className="font-medium text-primary underline-offset-4 hover:underline">
                audit log
              </Link>{" "}
              for application-level changes.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {listQuery.isPending ? (
            <div className="flex items-center gap-2 py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              <span className="text-sm">Loading deliveries…</span>
            </div>
          ) : null}
          {listQuery.isError ? (
            <p className="text-sm text-destructive" role="alert">
              {listQuery.error instanceof Error ? listQuery.error.message : "Could not load webhook inbox."}
            </p>
          ) : null}
          {!listQuery.isPending && !listQuery.isError && items.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">No webhook deliveries recorded yet.</p>
          ) : null}
          {!listQuery.isPending && !listQuery.isError && items.length > 0 ? (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2">Received</th>
                    <th className="px-3 py-2">Provider</th>
                    <th className="px-3 py-2">Event</th>
                    <th className="px-3 py-2">State</th>
                    <th className="px-3 py-2">External id</th>
                    <th className="px-3 py-2">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr key={row.id} className="border-b last:border-0">
                      <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-muted-foreground">
                        {formatWhen(row.received_at)}
                      </td>
                      <td className="px-3 py-2.5 font-medium">{row.provider}</td>
                      <td className="max-w-[200px] truncate px-3 py-2.5 font-mono text-xs" title={row.event_type}>
                        {row.event_type}
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge variant={stateVariant(row.processing_state)} className="font-normal">
                          {row.processing_state}
                        </Badge>
                      </td>
                      <td className="max-w-[140px] truncate px-3 py-2.5 font-mono text-xs" title={row.external_id}>
                        {row.external_id}
                      </td>
                      <td className="max-w-[280px] truncate px-3 py-2.5 text-destructive" title={row.last_error ?? ""}>
                        {row.last_error ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
