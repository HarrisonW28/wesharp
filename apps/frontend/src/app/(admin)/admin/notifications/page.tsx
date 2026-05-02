"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  NotificationAdminSettingsResponseSchema,
  NotificationEmailPreviewResponseSchema,
  PaginatedNotificationDeliveriesResponseSchema,
} from "@/lib/api/admin-notifications-schema";
import { useAdminApi } from "@/lib/api/use-admin-api";

import { useBackendMe } from "@/hooks/use-backend-me";

function buildDeliveriesQuery(sp: URLSearchParams): string {
  const u = new URLSearchParams();
  const status = sp.get("status") ?? "";
  const companyId = sp.get("company_id") ?? "";
  const type = sp.get("type") ?? "";
  const page = sp.get("page") ?? "1";
  const perPage = sp.get("per_page") ?? "25";
  if (status.trim() !== "") {
    u.set("status", status.trim());
  }
  if (companyId.trim() !== "") {
    u.set("company_id", companyId.trim());
  }
  if (type.trim() !== "") {
    u.set("type", type.trim());
  }
  u.set("page", page);
  u.set("per_page", perPage);
  const s = u.toString();
  return s === "" ? "" : `?${s}`;
}

export default function AdminNotificationsPage() {
  const admin = useAdminApi();
  const router = useRouter();
  const sp = useSearchParams();
  const { data: me } = useBackendMe();

  const permissions = useMemo(() => new Set(me?.data?.permissions ?? []), [me?.data?.permissions]);
  const canManageSettings = permissions.has("settings.manage");

  const listQs = useMemo(() => buildDeliveriesQuery(sp), [sp]);

  const [draftStatus, setDraftStatus] = useState(sp.get("status") ?? "");
  const [draftCompanyId, setDraftCompanyId] = useState(sp.get("company_id") ?? "");
  const [draftType, setDraftType] = useState(sp.get("type") ?? "");

  useEffect(() => {
    setDraftStatus(sp.get("status") ?? "");
    setDraftCompanyId(sp.get("company_id") ?? "");
    setDraftType(sp.get("type") ?? "");
  }, [sp]);

  const deliveriesQuery = useQuery({
    queryKey: ["admin-notification-deliveries", listQs],
    queryFn: async () => {
      const res = await admin.json<unknown>(`/api/admin/notifications/deliveries${listQs}`);
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = PaginatedNotificationDeliveriesResponseSchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Unexpected notification deliveries payload.");
      }
      return parsed.data;
    },
  });

  const adminSettingsQuery = useQuery({
    enabled: canManageSettings,
    queryKey: ["admin-notification-settings"],
    queryFn: async () => {
      const res = await admin.json<unknown>("/api/admin/notifications/settings");
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = NotificationAdminSettingsResponseSchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Unexpected admin notification settings payload.");
      }
      return parsed.data.data;
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (body: Record<string, boolean>) => {
      const res = await admin.json<unknown>("/api/admin/notifications/settings", {
        method: "PUT",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = NotificationAdminSettingsResponseSchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Unexpected admin notification settings payload.");
      }
      return parsed.data.data;
    },
    onSuccess: () => void adminSettingsQuery.refetch(),
  });

  const [previewPreset, setPreviewPreset] = useState("generic");
  const previewQuery = useQuery({
    enabled: canManageSettings && previewPreset !== "",
    queryKey: ["admin-notification-email-preview", previewPreset],
    queryFn: async () => {
      const res = await admin.json<unknown>(
        `/api/admin/notifications/email-preview?preset=${encodeURIComponent(previewPreset)}`,
      );
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = NotificationEmailPreviewResponseSchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Unexpected email preview payload.");
      }
      return parsed.data.data;
    },
  });

  const applyFilters = useCallback(() => {
    const u = new URLSearchParams();
    if (draftStatus.trim() !== "") {
      u.set("status", draftStatus.trim());
    }
    if (draftCompanyId.trim() !== "") {
      u.set("company_id", draftCompanyId.trim());
    }
    if (draftType.trim() !== "") {
      u.set("type", draftType.trim());
    }
    u.set("page", "1");
    u.set("per_page", sp.get("per_page") ?? "25");
    router.push(`/admin/notifications?${u.toString()}`);
  }, [draftCompanyId, draftStatus, draftType, router, sp]);

  const pagination = deliveriesQuery.data?.meta?.pagination;
  const items = deliveriesQuery.data?.data.items ?? [];

  const goPage = (nextPage: number) => {
    const u = new URLSearchParams(sp.toString());
    u.set("page", String(nextPage));
    router.push(`/admin/notifications?${u.toString()}`);
  };

  return (
    <div className="space-y-8">
      <Breadcrumbs homeHref="/admin/dashboard" items={[{ label: "Notifications" }]} />
      <PageHeader
        title="Notifications"
        description="Delivery history across customers — filter failures, tune opt-out behaviour, and preview fixtures without sending."
      />

      <Card>
        <CardHeader>
          <CardTitle>Deliveries</CardTitle>
          <CardDescription>Queued, sent, failed, skipped, and preference-skipped rows share the same audit trail.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
            <div className="grid gap-2 md:w-40">
              <Label htmlFor="f-status">Status</Label>
              <Select value={draftStatus || "__any"} onValueChange={(v) => setDraftStatus(v === "__any" ? "" : v)}>
                <SelectTrigger id="f-status">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__any">Any</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="queued">Queued</SelectItem>
                  <SelectItem value="skipped">Skipped</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid flex-1 gap-2 md:min-w-[200px]">
              <Label htmlFor="f-company">Company id</Label>
              <Input
                id="f-company"
                value={draftCompanyId}
                onChange={(e) => setDraftCompanyId(e.target.value)}
                placeholder="UUID filter"
              />
            </div>
            <div className="grid flex-1 gap-2 md:min-w-[200px]">
              <Label htmlFor="f-type">Type contains</Label>
              <Input
                id="f-type"
                value={draftType}
                onChange={(e) => setDraftType(e.target.value)}
                placeholder="e.g. invoice.issued"
              />
            </div>
            <Button type="button" variant="secondary" onClick={() => void applyFilters()}>
              Apply filters
            </Button>
          </div>

          {deliveriesQuery.isPending ? (
            <div className="flex justify-center py-12 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : deliveriesQuery.isError ? (
            <p className="text-sm text-destructive">{(deliveriesQuery.error as Error).message}</p>
          ) : (
            <>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="border-b bg-muted/40">
                    <tr>
                      <th className="px-3 py-2 font-medium">When</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium">Type</th>
                      <th className="px-3 py-2 font-medium">Recipient</th>
                      <th className="px-3 py-2 font-medium">Failure / note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                          No rows match this filter.
                        </td>
                      </tr>
                    ) : (
                      items.map((row) => (
                        <tr key={row.id} className="border-b last:border-0">
                          <td className="px-3 py-2 align-top text-muted-foreground">
                            {row.created_at?.replace("T", " ").slice(0, 19) ?? "—"}
                          </td>
                          <td className="px-3 py-2 align-top">{row.status ?? "—"}</td>
                          <td className="px-3 py-2 align-top font-mono text-xs">{row.type ?? "—"}</td>
                          <td className="px-3 py-2 align-top break-all">{row.recipient_email ?? "—"}</td>
                          <td className="px-3 py-2 align-top text-xs text-muted-foreground break-words">
                            {row.failure_reason ?? "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {pagination ? (
                <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
                  <span>
                    Page {pagination.page}
                    {pagination.total !== undefined ? ` · ${pagination.total} total` : null}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={pagination.page <= 1}
                      onClick={() => goPage(pagination.page - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" aria-hidden />
                      Prev
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={pagination.has_more_pages === false}
                      onClick={() => goPage(pagination.page + 1)}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" aria-hidden />
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      {canManageSettings ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Customer opt-outs</CardTitle>
              <CardDescription>
                When switched off, portal preferences for that category are ignored and emails send anyway (invoices and
                payments are never gated).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {adminSettingsQuery.isPending ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : adminSettingsQuery.isError ? (
                <p className="text-sm text-destructive">{(adminSettingsQuery.error as Error).message}</p>
              ) : adminSettingsQuery.data ? (
                <div className="space-y-3">
                  {(
                    [
                      ["respect_booking_notification_opt_out", "Respect booking email opt-outs"],
                      ["respect_order_notification_opt_out", "Respect order & fulfilment opt-outs"],
                      ["respect_subscription_digest_opt_out", "Respect subscription reminder / digest opt-outs"],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className="flex cursor-pointer items-start gap-2">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 rounded border"
                        checked={adminSettingsQuery.data[key]}
                        disabled={updateSettingsMutation.isPending}
                        onChange={(e) => {
                          void updateSettingsMutation.mutateAsync({
                            ...adminSettingsQuery.data,
                            [key]: e.target.checked,
                          });
                        }}
                      />
                      <span className="text-sm">{label}</span>
                    </label>
                  ))}
                  {updateSettingsMutation.error ? (
                    <p className="text-sm text-destructive">{(updateSettingsMutation.error as Error).message}</p>
                  ) : null}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Fixture email preview</CardTitle>
              <CardDescription>Renders HTML with canned copy — nothing is sent or queued.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2">
                <Label htmlFor="preview-preset">Template</Label>
                <Select value={previewPreset} onValueChange={setPreviewPreset}>
                  <SelectTrigger id="preview-preset">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="generic">Generic</SelectItem>
                    <SelectItem value="booking">Booking</SelectItem>
                    <SelectItem value="order">Order</SelectItem>
                    <SelectItem value="invoice">Invoice</SelectItem>
                    <SelectItem value="subscription">Subscription</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {previewQuery.data ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Subject line: {previewQuery.data.subject}</p>
                  <iframe
                    title="Email preview"
                    srcDoc={previewQuery.data.html}
                    className="h-[420px] w-full rounded-md border bg-white"
                    sandbox=""
                  />
                </div>
              ) : previewQuery.isPending ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : previewQuery.isError ? (
                <p className="text-sm text-destructive">{(previewQuery.error as Error).message}</p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
