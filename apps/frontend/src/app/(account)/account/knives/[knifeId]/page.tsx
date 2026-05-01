"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { AccountKnifeDetailResponseSchema } from "@/lib/api/account-schema";
import { useAccountApi } from "@/lib/api/use-account-api";
import { customerKnifeListLabel } from "@/lib/helpers/customer-display";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status/StatusBadge";

export default function AccountKnifeDetailPage() {
  const params = useParams<{ knifeId: string }>();
  const knifeId = params.knifeId;
  const api = useAccountApi();

  const detailQuery = useQuery({
    queryKey: ["account-knife", knifeId],
    enabled: Boolean(knifeId),
    queryFn: async () => {
      const res = await api.json<unknown>(`/api/account/knives/${knifeId}`);
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = AccountKnifeDetailResponseSchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Unexpected knife detail payload.");
      }
      return parsed.data.data;
    },
  });

  const k = detailQuery.data;

  return (
    <div className="space-y-8">
      <Breadcrumbs
        homeHref="/account/dashboard"
        items={[
          { label: "Knives", href: "/account/knives" },
          { label: k?.tag_id ? customerKnifeListLabel(k.tag_id, 0) : "Blade" },
        ]}
      />

      {detailQuery.status === "pending" ? (
        <div className="flex min-h-[24vh] flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
          <p className="text-sm">Loading knife…</p>
        </div>
      ) : detailQuery.isError ? (
        <p className="text-sm text-destructive">{(detailQuery.error as Error).message}</p>
      ) : k ? (
        <>
          <PageHeader
            title={customerKnifeListLabel(k.tag_id, 0)}
            description="Service history shows only information we can share with you. Internal workshop notes and photos stay with our team."
          />

          <div className="flex flex-wrap items-center gap-2">
            {k.status ? <StatusBadge kind="knife" status={k.status} /> : null}
            {typeof k.updated_at === "string" ? (
              <span className="text-xs text-muted-foreground">Updated {new Date(k.updated_at).toLocaleString("en-GB")}</span>
            ) : null}
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Service history</CardTitle>
              <CardDescription>Each visit or order we link to this blade (customer-safe summary).</CardDescription>
            </CardHeader>
            <CardContent className="text-sm">
              {(k.service_history ?? []).length === 0 ? (
                <p className="text-muted-foreground">No history to show yet.</p>
              ) : (
                <ol className="space-y-4 border-l-2 border-border pl-4">
                  {(k.service_history ?? []).map((row) => (
                    <li key={row.assignment_id} className="relative">
                      <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-primary" aria-hidden />
                      <div className="flex flex-wrap items-center gap-2">
                        {row.is_current ? <Badge>Current</Badge> : null}
                        <span className="font-medium">{row.service_kind_label ?? "Service"}</span>
                        {row.service_date ? (
                          <span className="text-xs text-muted-foreground">
                            {new Date(row.service_date).toLocaleDateString("en-GB")}
                          </span>
                        ) : null}
                      </div>
                      {row.order ? (
                        <div className="mt-1 text-muted-foreground">
                          <span>{row.order.status_label ?? row.order.status ?? "Order"}</span>
                          {" · "}
                          <Link href={`/account/orders/${row.order.id}`} className="text-primary underline underline-offset-2">
                            View order
                          </Link>
                        </div>
                      ) : null}
                      {row.condition_summary ? (
                        <p className="mt-2 rounded-md bg-muted/50 px-2 py-1 text-xs text-muted-foreground">{row.condition_summary}</p>
                      ) : null}
                      {(row.invoices ?? []).length > 0 ? (
                        <ul className="mt-2 flex flex-wrap gap-2 text-xs">
                          {(row.invoices ?? []).map((inv) => (
                            <li key={inv.id}>
                              <Link
                                href={inv.portal_path ?? `/account/invoices/${inv.id}`}
                                className="font-medium text-primary underline underline-offset-2"
                              >
                                {inv.invoice_number?.trim() ? `Invoice ${inv.invoice_number}` : "Invoice"}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      {(row.photos ?? []).length > 0 ? (
                        <p className="mt-2 text-xs text-muted-foreground">{(row.photos ?? []).length} photo(s) on file for this visit.</p>
                      ) : null}
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
