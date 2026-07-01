"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Inbox, Loader2 } from "lucide-react";

import { ServiceAreaWaitlistApiResponseSchema } from "@/lib/api/admin-service-area-waitlist-schema";
import { useAdminApi } from "@/lib/api/use-admin-api";

import { NavBreadcrumbs } from "@/components/layout/NavBreadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const CUSTOMER_TYPE_COPY: Record<string, string> = {
  home: "Home / household",
  business: "Business or hospitality",
  other: "Other",
};

const SOURCE_COPY: Record<string, string> = {
  service_areas_page: "Service areas page",
  booking_wizard: "Booking flow",
};

export default function AdminWaitlistPage() {
  const admin = useAdminApi();
  const q = useQuery({
    queryKey: ["admin-service-area-waitlist"],
    queryFn: async () => {
      const res = await admin.json<unknown>("/api/admin/service-area-waitlist");
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = ServiceAreaWaitlistApiResponseSchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Unexpected waitlist payload.");
      }
      return parsed.data.data.items;
    },
  });

  const rows = q.data ?? [];
  const empty = !q.isPending && !q.isError && rows.length === 0;

  return (
    <div className="space-y-8">
      <NavBreadcrumbs />
      <PageHeader
        title="Service area waitlist"
        description="People who asked to be notified when we expand collection beyond our current areas."
        actions={
          <Button type="button" variant="outline" size="sm" asChild>
            <Link href="/admin/crm">Open CRM</Link>
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
              <Inbox className="h-4 w-4 text-muted-foreground" aria-hidden />
              No waitlist entries yet
            </CardTitle>
            <CardDescription>Entries appear when visitors join the waitlist from Areas we cover.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">{rows.length} lead{rows.length === 1 ? "" : "s"}</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Date</th>
                  <th className="pb-2 pr-4 font-medium">Name</th>
                  <th className="pb-2 pr-4 font-medium">Email</th>
                  <th className="pb-2 pr-4 font-medium">Postcode</th>
                  <th className="pb-2 pr-4 font-medium">Type</th>
                  <th className="pb-2 pr-4 font-medium">Source</th>
                  <th className="pb-2 pr-4 font-medium">Knives</th>
                  <th className="pb-2 pr-4 font-medium">Consent</th>
                  <th className="pb-2 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-border/60 align-top">
                    <td className="py-3 pr-4 tabular-nums text-muted-foreground">
                      {new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(row.created_at))}
                    </td>
                    <td className="py-3 pr-4 font-medium">{row.name}</td>
                    <td className="py-3 pr-4">
                      <a className="text-primary underline-offset-4 hover:underline" href={`mailto:${row.email}`}>
                        {row.email}
                      </a>
                    </td>
                    <td className="py-3 pr-4">{row.postcode}</td>
                    <td className="py-3 pr-4">{CUSTOMER_TYPE_COPY[row.customer_type] ?? row.customer_type}</td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {row.source ? SOURCE_COPY[row.source] ?? row.source : "—"}
                    </td>
                    <td className="py-3 pr-4 tabular-nums text-muted-foreground">
                      {row.estimated_knife_count != null ? row.estimated_knife_count : "—"}
                    </td>
                    <td className="py-3 pr-4 tabular-nums text-muted-foreground">
                      {row.contact_consent === true ? "Yes" : row.contact_consent === false ? "No" : "—"}
                    </td>
                    <td className="py-3 max-w-[14rem] text-muted-foreground">
                      {row.notes ? <span className="line-clamp-3 whitespace-pre-wrap">{row.notes}</span> : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
