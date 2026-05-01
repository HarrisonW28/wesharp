"use client";

import { useQuery } from "@tanstack/react-query";
import { Bell, Loader2 } from "lucide-react";

import { NotificationDeliveryIndexResponseSchema } from "@/lib/api/admin-notifications-schema";
import { useAdminApi } from "@/lib/api/use-admin-api";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function fmtDt(v?: string | null): string {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" });
}

export function NotificationHistoryCard(props: { scopeLabel: string; fetchPath: string }) {
  const admin = useAdminApi();

  const q = useQuery({
    queryKey: ["admin-notification-history", props.fetchPath],
    queryFn: async () => {
      const res = await admin.json<unknown>(props.fetchPath);
      if (!res.ok) throw new Error(res.message);
      const parsed = NotificationDeliveryIndexResponseSchema.safeParse(res.data);
      if (!parsed.success) throw new Error("Unexpected notification history payload.");
      return parsed.data.data.items;
    },
  });

  return (
    <Card className="rounded-xl border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-4 w-4 text-muted-foreground" aria-hidden />
          Notification history
        </CardTitle>
        <CardDescription className="text-sm">Delivery tracking for {props.scopeLabel}.</CardDescription>
      </CardHeader>
      <CardContent className="text-sm">
        {q.status === "pending" ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Loading…
          </div>
        ) : q.isError ? (
          <p className="text-destructive">{(q.error as Error).message}</p>
        ) : (q.data ?? []).length === 0 ? (
          <p className="text-muted-foreground">No notifications recorded yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[760px] text-left">
              <thead className="border-b bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Channel</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Recipient</th>
                  <th className="px-3 py-2 font-medium">Queued</th>
                  <th className="px-3 py-2 font-medium">Sent</th>
                  <th className="px-3 py-2 font-medium">Failed</th>
                  <th className="px-3 py-2 font-medium">Failure reason</th>
                </tr>
              </thead>
              <tbody>
                {(q.data ?? []).map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="px-3 py-2 font-mono text-xs">{r.type ?? "—"}</td>
                    <td className="px-3 py-2">{r.channel ?? "—"}</td>
                    <td className="px-3 py-2">{r.status ?? "—"}</td>
                    <td className="px-3 py-2">{r.recipient_email ?? "—"}</td>
                    <td className="px-3 py-2 tabular-nums text-muted-foreground">{fmtDt(r.queued_at)}</td>
                    <td className="px-3 py-2 tabular-nums text-muted-foreground">{fmtDt(r.sent_at)}</td>
                    <td className="px-3 py-2 tabular-nums text-muted-foreground">{fmtDt(r.failed_at)}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.failure_reason ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

