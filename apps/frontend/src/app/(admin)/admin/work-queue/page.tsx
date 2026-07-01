"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ClipboardList } from "lucide-react";

import { WorkQueueApiResponseSchema } from "@/lib/api/admin-work-queue-schema";
import { useAdminApi } from "@/lib/api/use-admin-api";

import { NavBreadcrumbs } from "@/components/layout/NavBreadcrumbs";
import { PageActions, PortalPage } from "@/components/layout/PortalPage";
import { PageHeader } from "@/components/layout/PageHeader";
import { PortalEmptyCard, PortalErrorAlert, PortalLoadingCenter } from "@/components/layout/PortalStates";
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
    <PortalPage>
      <NavBreadcrumbs />
      <PageHeader
        title="Work queue"
        description="Role-aware list of operational tasks that need a clear next step. Items with a zero count are hidden so this stays actionable."
        actions={
          <PageActions>
            <Button type="button" variant="outline" size="sm" asChild>
              <Link href="/admin/dashboard">Back to dashboard</Link>
            </Button>
          </PageActions>
        }
      />

      {q.isPending ? (
        <PortalLoadingCenter />
      ) : q.isError ? (
        <PortalErrorAlert
          message={(q.error as Error).message}
          onRetry={() => void q.refetch()}
        />
      ) : empty ? (
        <PortalEmptyCard
          icon={ClipboardList}
          title="All clear"
          description="There are no open queue items for your role. Check back after new bookings, routes, or finance activity."
        >
          <p className="text-sm text-muted-foreground">
            Tip: operational filters (unassigned bookings, orders without knives, and more) are linked from each row when
            something needs attention.
          </p>
        </PortalEmptyCard>
      ) : (
        <div className="flex flex-col gap-6">
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
    </PortalPage>
  );
}
