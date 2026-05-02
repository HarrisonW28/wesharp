"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InAppNotificationsIndexResponseSchema } from "@/lib/api/in-app-notifications-schema";
import { useAccountApi } from "@/lib/api/use-account-api";
import { useAdminApi } from "@/lib/api/use-admin-api";
import { cn } from "@/lib/utils";

type Variant = "admin" | "account";

export function InAppNotificationsFullList({
  variant,
  title = "In-app notifications",
  description = "Read/unread messages that mirror important customer and system events. Email delivery history is below.",
}: {
  variant: Variant;
  title?: string;
  description?: string;
}) {
  const admin = useAdminApi();
  const account = useAccountApi();
  const api = variant === "admin" ? admin : account;
  const listPath = variant === "admin" ? "/api/admin/notifications/in-app" : "/api/account/in-app-notifications";
  const markAllPath =
    variant === "admin" ? "/api/admin/notifications/in-app/mark-all-read" : "/api/account/in-app-notifications/mark-all-read";

  const qc = useQueryClient();

  const listQuery = useQuery({
    queryKey: ["in-app-notifications-full", variant],
    queryFn: async () => {
      const res = await api.json<unknown>(`${listPath}?per_page=50`);
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = InAppNotificationsIndexResponseSchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Unexpected notifications payload.");
      }
      return parsed.data;
    },
  });

  const markOne = useMutation({
    mutationFn: async (id: string) => {
      const patchBase =
        variant === "admin" ? `/api/admin/notifications/in-app/${id}` : `/api/account/in-app-notifications/${id}`;
      const res = await api.json<unknown>(patchBase, {
        method: "PATCH",
        body: JSON.stringify({ read: true }),
      });
      if (!res.ok) {
        throw new Error(res.message);
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["in-app-notifications-full", variant] });
      void qc.invalidateQueries({ queryKey: ["in-app-notifications", variant] });
    },
  });

  const markAll = useMutation({
    mutationFn: async () => {
      const res = await api.json<unknown>(markAllPath, { method: "POST", body: "{}" });
      if (!res.ok) {
        throw new Error(res.message);
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["in-app-notifications-full", variant] });
      void qc.invalidateQueries({ queryKey: ["in-app-notifications", variant] });
    },
  });

  const items = listQuery.data?.data.items ?? [];
  const unread = listQuery.data?.data.unread_count ?? 0;

  return (
    <Card id="in-app">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        {unread > 0 ? (
          <Button type="button" variant="outline" size="sm" disabled={markAll.isPending} onClick={() => void markAll.mutate()}>
            Mark all read ({unread})
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        {listQuery.isPending ? (
          <div className="flex justify-center py-10 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
          </div>
        ) : listQuery.isError ? (
          <p className="text-sm text-destructive">{(listQuery.error as Error).message}</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No notifications yet.</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {items.map((n) => {
              const unreadRow = !n.read_at;
              const href = n.path && n.path.length > 0 ? n.path : variant === "admin" ? "/admin/dashboard" : "/account/dashboard";
              return (
                <li key={n.id} className={cn("flex flex-col gap-1 px-3 py-3 sm:flex-row sm:items-start sm:justify-between", unreadRow && "bg-muted/40")}>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={href} className="font-medium hover:underline">
                        {n.title}
                      </Link>
                      {unreadRow ? (
                        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">Unread</span>
                      ) : null}
                    </div>
                    {n.body ? <p className="mt-1 text-sm text-muted-foreground">{n.body}</p> : null}
                    <p className="mt-1 text-xs text-muted-foreground">{n.created_at?.replace("T", " ").slice(0, 19) ?? "—"}</p>
                  </div>
                  <div className="flex shrink-0 gap-2 pt-2 sm:pt-0">
                    {unreadRow ? (
                      <Button type="button" variant="ghost" size="sm" onClick={() => void markOne.mutate(n.id)}>
                        Mark read
                      </Button>
                    ) : null}
                    <Button variant="outline" size="sm" asChild>
                      <Link href={href}>Open</Link>
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
