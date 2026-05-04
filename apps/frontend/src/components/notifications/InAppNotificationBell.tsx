"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { InAppNotificationsIndexResponseSchema } from "@/lib/api/in-app-notifications-schema";
import { useAccountApi } from "@/lib/api/use-account-api";
import { useAdminApi } from "@/lib/api/use-admin-api";
import { cn } from "@/lib/utils";

type Variant = "admin" | "account";

export function InAppNotificationBell({
  variant,
  triggerClassName,
}: {
  variant: Variant;
  /** Optional trigger styling (e.g. route-manager dark header). */
  triggerClassName?: string;
}) {
  const admin = useAdminApi();
  const account = useAccountApi();
  const api = variant === "admin" ? admin : account;
  const listPath = variant === "admin" ? "/api/admin/notifications/in-app" : "/api/account/in-app-notifications";
  const markAllPath =
    variant === "admin" ? "/api/admin/notifications/in-app/mark-all-read" : "/api/account/in-app-notifications/mark-all-read";
  const fullPageHref = variant === "admin" ? "/admin/notifications#in-app" : "/account/notifications";

  const qc = useQueryClient();

  const listQuery = useQuery({
    queryKey: ["in-app-notifications", variant],
    queryFn: async () => {
      const res = await api.json<unknown>(`${listPath}?per_page=15`);
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = InAppNotificationsIndexResponseSchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Unexpected notifications payload.");
      }
      return parsed.data;
    },
    staleTime: 20_000,
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
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["in-app-notifications", variant] }),
  });

  const markAll = useMutation({
    mutationFn: async () => {
      const res = await api.json<unknown>(markAllPath, { method: "POST", body: "{}" });
      if (!res.ok) {
        throw new Error(res.message);
      }
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["in-app-notifications", variant] }),
  });

  const unread = listQuery.data?.data.unread_count ?? 0;
  const items = listQuery.data?.data.items ?? [];

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open) {
          void listQuery.refetch();
        }
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={cn("relative shrink-0", triggerClassName)}
          aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ""}`}
        >
          <Bell className="h-5 w-5" aria-hidden />
          {unread > 0 ? (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 h-5 min-w-5 justify-center px-1 text-[10px] leading-none"
            >
              {unread > 99 ? "99+" : unread}
            </Badge>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side="bottom"
        sideOffset={6}
        collisionPadding={16}
        className={cn(
          "z-50 max-w-[calc(100vw-2rem)] w-[min(24rem,calc(100vw-2rem))] sm:max-w-none sm:w-96",
        )}
      >
        <DropdownMenuLabel className="flex items-center justify-between gap-2 font-normal">
          <span className="text-sm font-medium">Notifications</span>
          {unread > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs"
              disabled={markAll.isPending}
              onClick={() => void markAll.mutate()}
            >
              Mark all read
            </Button>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {listQuery.isError ? (
          <div className="px-2 py-3 text-sm text-destructive">{(listQuery.error as Error).message}</div>
        ) : listQuery.isPending && items.length === 0 ? (
          <div className="px-2 py-6 text-center text-sm text-muted-foreground">Loading…</div>
        ) : items.length === 0 ? (
          <div className="px-2 py-6 text-center text-sm text-muted-foreground">You&apos;re all caught up.</div>
        ) : (
          <ScrollArea className="max-h-80">
            <div className="pr-3">
              {items.map((n) => {
                const href = n.path && n.path.length > 0 ? n.path : fullPageHref;
                const unreadRow = !n.read_at;
                return (
                  <DropdownMenuItem key={n.id} asChild className={cn("cursor-pointer flex-col items-stretch p-0")}>
                    <Link
                      href={href}
                      className={cn("block rounded-sm px-2 py-2", unreadRow && "bg-muted/60")}
                      onClick={() => {
                        if (unreadRow) {
                          void markOne.mutate(n.id);
                        }
                      }}
                    >
                      <div className="text-sm font-medium leading-snug">{n.title}</div>
                      {n.body ? (
                        <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</div>
                      ) : null}
                    </Link>
                  </DropdownMenuItem>
                );
              })}
            </div>
          </ScrollArea>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="cursor-pointer justify-center font-medium">
          <Link href={fullPageHref}>View all</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
