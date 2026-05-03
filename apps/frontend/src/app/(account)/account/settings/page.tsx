"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { SettingsResponseSchema } from "@/lib/api/account-schema";
import { useAccountApi } from "@/lib/api/use-account-api";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PortalFormWidth } from "@/components/layout/PortalForm";
import { PortalPage } from "@/components/layout/PortalPage";
import { PageHeader } from "@/components/layout/PageHeader";
import { PortalErrorAlert, PortalLoadingCenter } from "@/components/layout/PortalStates";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AccountSettingsPage() {
  const api = useAccountApi();

  const [emailPrefs, setEmailPrefs] = useState({
    booking_updates: true,
    order_updates: true,
    subscription_digest: true,
  });
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [portalTermsAccepted, setPortalTermsAccepted] = useState(false);

  const profileQuery = useQuery({
    queryKey: ["account-settings"],
    queryFn: async () => {
      const res = await api.json<unknown>("/api/account/settings");
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = SettingsResponseSchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Unexpected settings payload.");
      }
      return parsed.data.data;
    },
  });

  const mutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await api.json<unknown>("/api/account/settings", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error(res.message);
      }
      return res.data;
    },
    onSuccess: () => void profileQuery.refetch(),
  });

  const d = profileQuery.data;

  useEffect(() => {
    const p = d?.user.email_notification_preferences;
    if (p) {
      setEmailPrefs(p);
    }
  }, [d?.user.email_notification_preferences]);

  useEffect(() => {
    if (d?.user.marketing_opt_in !== undefined) {
      setMarketingOptIn(d.user.marketing_opt_in);
    }
  }, [d?.user.marketing_opt_in]);

  useEffect(() => {
    if (d?.user.terms_accepted_at) {
      setPortalTermsAccepted(false);
    }
  }, [d?.user.terms_accepted_at]);

  return (
    <PortalPage>
      <Breadcrumbs homeHref="/account/dashboard" items={[{ label: "Settings" }]} />
      <PageHeader title="Account basics" description="Operational emails and phone routing only — invoicing thresholds stay behind finance." />

      {profileQuery.status === "pending" ? (
        <PortalLoadingCenter label="Loading settings…" />
      ) : profileQuery.isError ? (
        <PortalErrorAlert
          message={(profileQuery.error as Error).message}
          onRetry={() => void profileQuery.refetch()}
        />
      ) : (
        <PortalFormWidth>
        <form
          className="mx-auto grid w-full gap-6 rounded-2xl border bg-card p-6 shadow-sm"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            mutation.reset();
            const user: Record<string, unknown> = {
              name: String(fd.get("user.name") ?? ""),
              email_notification_preferences: {
                booking_updates: emailPrefs.booking_updates,
                order_updates: emailPrefs.order_updates,
                subscription_digest: emailPrefs.subscription_digest,
              },
              marketing_opt_in: marketingOptIn,
            };
            if (!d?.user.terms_accepted_at && portalTermsAccepted) {
              user.accept_portal_terms = true;
            }
            void mutation.mutateAsync({
              user,
              company: {
                name: String(fd.get("company.name") ?? ""),
                phone: String(fd.get("company.phone") ?? "").trim(),
                billing_email: String(fd.get("company.billing_email") ?? "").trim(),
              },
            });
          }}
        >
          {mutation.error ? (
            <Alert variant="destructive">
              <AlertDescription>{(mutation.error as Error).message}</AlertDescription>
            </Alert>
          ) : null}
          <div className="grid gap-2">
            <Label htmlFor="user.name">Your name</Label>
            <Input id="user.name" name="user.name" defaultValue={d?.user.name ?? ""} required />
            <p className="text-xs text-muted-foreground">Shows on internal acknowledgements alongside audit trails.</p>
          </div>
          <div className="grid gap-2">
            <Label>Email</Label>
            <Input value={d?.user.email ?? ""} readOnly className="bg-muted/60" />
            <p className="text-xs text-muted-foreground">
              Managed through Clerk — email us if your name or email looks wrong.
            </p>
          </div>
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold">Email updates</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Invoices, payments, and core subscription account notices always send to your billing inbox. You can pause
              non-essential service emails when they are going to this login&apos;s address.
            </p>
            <div className="mt-4 space-y-3">
              <label className="flex cursor-pointer items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border"
                  checked={emailPrefs.booking_updates}
                  onChange={(e) => setEmailPrefs((p) => ({ ...p, booking_updates: e.target.checked }))}
                />
                <span className="text-sm">Bookings (requests, confirmations, cancellations)</span>
              </label>
              <label className="flex cursor-pointer items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border"
                  checked={emailPrefs.order_updates}
                  onChange={(e) => setEmailPrefs((p) => ({ ...p, order_updates: e.target.checked }))}
                />
                <span className="text-sm">Orders &amp; fulfilment status</span>
              </label>
              <label className="flex cursor-pointer items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border"
                  checked={emailPrefs.subscription_digest}
                  onChange={(e) => setEmailPrefs((p) => ({ ...p, subscription_digest: e.target.checked }))}
                />
                <span className="text-sm">Subscription reminders &amp; usage digests (not billing notices)</span>
              </label>
            </div>
          </div>
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold">Legal &amp; marketing</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Accepting the portal terms does <span className="font-medium">not</span> sign you up for marketing.
              Marketing email is an explicit, separate choice.
            </p>
            <div className="mt-4 space-y-3">
              {d?.user.terms_accepted_at ? (
                <p className="text-sm text-muted-foreground">
                  Portal terms accepted on{" "}
                  {new Date(d.user.terms_accepted_at).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                  .
                </p>
              ) : (
                <label className="flex cursor-pointer items-start gap-2">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border"
                    checked={portalTermsAccepted}
                    onChange={(e) => setPortalTermsAccepted(e.target.checked)}
                  />
                  <span className="text-sm">
                    I have read and accept the WeSharp portal terms of use for this account (required only once).
                  </span>
                </label>
              )}
              <label className="flex cursor-pointer items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border"
                  checked={marketingOptIn}
                  onChange={(e) => setMarketingOptIn(e.target.checked)}
                />
                <span className="text-sm">
                  Email me occasional product tips and updates (optional marketing — you can turn this off anytime).
                </span>
              </label>
            </div>
          </div>
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold">Venue profile</h3>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="company.name">Trading name</Label>
            <Input id="company.name" name="company.name" defaultValue={d?.company.name ?? ""} />
          </div>
          <div className="grid gap-2">
            <Label>City snapshot</Label>
            <Input value={d?.company.city ?? ""} readOnly className="bg-muted/60" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="company.phone">Switchboard / phone tree</Label>
            <Input id="company.phone" name="company.phone" defaultValue={d?.company.phone ?? ""} placeholder="+44 …" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="company.billing_email">Billing/AP inbox</Label>
            <Input
              id="company.billing_email"
              name="company.billing_email"
              defaultValue={d?.company.billing_email ?? ""}
              type="email"
            />
          </div>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save changes
          </Button>
        </form>
        </PortalFormWidth>
      )}
    </PortalPage>
  );
}
