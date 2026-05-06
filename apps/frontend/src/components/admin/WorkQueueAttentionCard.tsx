"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ClipboardList, Loader2 } from "lucide-react";

import {
  WorkQueueApiResponseSchema,
  flattenWorkQueueItems,
  type WorkQueueItem,
} from "@/lib/api/admin-work-queue-schema";
import { useAdminApi } from "@/lib/api/use-admin-api";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function byCountDesc(a: WorkQueueItem, b: WorkQueueItem): number {
  return b.count - a.count;
}

export function WorkQueueAttentionCard() {
  const admin = useAdminApi();

  const q = useQuery({
    queryKey: ["admin-work-queue"],
    queryFn: async () => {
      const res = await admin.json<unknown>("/api/admin/work-queue");
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = WorkQueueApiResponseSchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Unexpected work queue payload.");
      }
      return parsed.data.data;
    },
  });

  const flat = q.data
    ? flattenWorkQueueItems(q.data.sections).sort(byCountDesc)
    : [];
  const top = flat.slice(0, 5);
  const more = Math.max(0, flat.length - top.length);

  const totalTasks = flat.reduce((acc, row) => acc + row.count, 0);
  const hasItems = flat.length > 0;

  return (
    <Card
      className={cn(
        "border-dashed transition-colors",
        hasItems ? "border-primary/35 bg-primary/[0.03] shadow-sm" : null,
      )}
    >
      <CardHeader className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <ClipboardList
            className="h-4 w-4 text-muted-foreground"
            aria-hidden
          />
          <CardTitle className="text-base font-semibold">
            Needs attention
            {hasItems ? (
              <span className="ml-2 inline-flex items-center rounded-md bg-primary/15 px-2 py-0.5 text-xs font-semibold tabular-nums text-primary">
                {flat.length} {flat.length === 1 ? "lane" : "lanes"} ·{" "}
                {totalTasks} tasks
              </span>
            ) : null}
          </CardTitle>
        </div>
        <CardDescription>
          Jobs that need someone to pick them up — lists respect what your role
          can open.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {q.isPending ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Loading queue…
          </div>
        ) : q.isError ? (
          <p className="text-sm text-destructive">
            {(q.error as Error).message}
          </p>
        ) : flat.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing needs attention — you&apos;re caught up.
          </p>
        ) : (
          <ul className="space-y-2">
            {top.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-baseline justify-between gap-2 text-sm"
              >
                <Link
                  href={row.href}
                  className="min-w-0 flex-1 font-medium text-primary underline-offset-4 hover:underline"
                >
                  {row.title}
                </Link>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {row.count}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      <CardFooter className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
        {more > 0 ? (
          <span className="text-xs text-muted-foreground">
            +{more} more {more === 1 ? "item" : "items"} on the full queue
          </span>
        ) : (
          <span className="text-xs text-muted-foreground" />
        )}
        <Button type="button" variant="outline" size="sm" asChild>
          <Link href="/admin/work-queue">View work queue</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
