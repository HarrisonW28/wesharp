"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ClipboardList, Loader2 } from "lucide-react";

import { WorkQueueApiResponseSchema } from "@/lib/api/admin-work-queue-schema";
import { useAdminApi } from "@/lib/api/use-admin-api";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminWorkQueuePage() {
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

  const sections = q.data?.sections ?? [];
  const empty = !q.isPending && !q.isError && sections.length === 0;

  return (
    <div className="space-y-8">
      <Breadcrumbs homeHref="/admin/dashboard" items={[{ label: "Work queue" }]} />
      <PageHeader
        title="Work queue"
        description="Role-aware list of operational tasks that need a clear next step. Items with a zero count are hidden so this stays actionable."
        actions={
          <Button type="button" variant="outline" size="sm" asChild>
            <Link href="/admin/dashboard">Back to dashboard</Link>
          </Button>
        }
      />

      {q.isPending ? (
        <div className="flex min-h-[24vh] flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
          <p className="text-base">Loading…</p>
        </div>
      ) : q.isError ? (
        <p className="text-destructive">{(q.error as Error).message}</p>
      ) : empty ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <ClipboardList className="h-4 w-4 text-muted-foreground" aria-hidden />
              All clear
            </CardTitle>
            <CardDescription>
              There are no open queue items for your role. Check back after new bookings, routes, or finance
              activity.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Tip: operational filters (unassigned bookings, orders without knives, and more) are linked from each row
              when something needs attention.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {sections.map((section) => (
            <Card key={section.key}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">{section.label}</CardTitle>
                <CardDescription>
                  {section.items.length} active {section.items.length === 1 ? "task" : "tasks"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {section.items.map((row) => (
                  <div
                    key={row.id}
                    className="flex flex-col gap-2 rounded-lg border bg-muted/30 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 space-y-1">
                      <p className="font-medium leading-snug">{row.title}</p>
                      <p className="text-xs text-muted-foreground tabular-nums">{row.count} pending</p>
                    </div>
                    <Button type="button" size="sm" className="shrink-0 self-start sm:self-center" asChild>
                      <Link href={row.href}>{row.action_label}</Link>
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
