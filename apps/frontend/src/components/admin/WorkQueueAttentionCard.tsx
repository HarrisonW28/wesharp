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
      <CardHeader className="min-w-0 space-y-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <ClipboardList
            className="h-4 w-4 text-muted-foreground"
            aria-hidden
          />
          <CardTitle className="min-w-0 max-w-full text-base font-semibold text-pretty break-words">
            Needs attention
            {hasItems ? (
              <span className="ml-2 inline-flex max-w-full flex-wrap items-center gap-x-1 gap-y-1 rounded-md bg-primary/15 px-2 py-0.5 text-xs font-semibold tabular-nums text-primary">
                <span className="break-words">
                  {flat.length} {flat.length === 1 ? "category" : "categories"}
                </span>
                <span aria-hidden>·</span>
                <span>
                  {totalTasks} {totalTasks === 1 ? "task" : "tasks"}
                </span>
              </span>
            ) : null}
          </CardTitle>
        </div>
        <CardDescription className="text-pretty leading-relaxed break-words">
          Work waiting on the team. You&apos;ll only see items your login can
          access.
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
          <p className="text-sm leading-relaxed text-muted-foreground text-pretty break-words">
            Nothing needs attention right now — you&apos;re up to date.
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
          <span className="min-w-0 max-w-full text-xs text-muted-foreground break-words">
            +{more} more on the full work queue
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
