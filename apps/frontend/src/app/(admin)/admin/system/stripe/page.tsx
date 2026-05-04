"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CreditCard, Loader2 } from "lucide-react";

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
import { AdminStripeSettingsResponseSchema } from "@/lib/api/admin-stripe-settings-schema";
import { useAdminApi } from "@/lib/api/use-admin-api";

type Tri = "inherit" | "on" | "off";

function triFromDatabase(v: boolean | null): Tri {
  if (v === null) {
    return "inherit";
  }
  return v ? "on" : "off";
}

function triToPayload(tri: Tri): boolean | null {
  if (tri === "inherit") {
    return null;
  }
  return tri === "on";
}

export default function AdminStripeSettingsPage() {
  const admin = useAdminApi();

  const query = useQuery({
    queryKey: ["admin-stripe-settings"],
    queryFn: async () => {
      const res = await admin.json<unknown>("/api/admin/stripe-settings");
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = AdminStripeSettingsResponseSchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Unexpected Stripe settings payload.");
      }
      return parsed.data.data.integration;
    },
  });

  const integ = query.data;

  const [sk, setSk] = useState("");
  const [pk, setPk] = useState("");
  const [wh, setWh] = useState("");
  const [rmSk, setRmSk] = useState(false);
  const [rmPk, setRmPk] = useState(false);
  const [rmWh, setRmWh] = useState(false);
  const [hosted, setHosted] = useState<Tri>("inherit");
  const [allowLive, setAllowLive] = useState<Tri>("inherit");
  const [successUrl, setSuccessUrl] = useState("");
  const [cancelUrl, setCancelUrl] = useState("");

  useEffect(() => {
    if (!integ) {
      return;
    }
    setSk("");
    setPk("");
    setWh("");
    setRmSk(false);
    setRmPk(false);
    setRmWh(false);
    setHosted(triFromDatabase(integ.hosted_checkout_enabled.database_value));
    setAllowLive(triFromDatabase(integ.allow_live.database_value));
    setSuccessUrl(integ.checkout_success_url.database_value ?? integ.checkout_success_url.effective ?? "");
    setCancelUrl(integ.checkout_cancel_url.database_value ?? integ.checkout_cancel_url.effective ?? "");
  }, [integ]);

  const mutation = useMutation({
    mutationFn: async () => {
      const int = query.data;
      if (!int) {
        throw new Error("Settings not loaded.");
      }

      const body: Record<string, unknown> = {};
      if (rmSk) {
        body.secret_key = "";
      } else if (sk.trim() !== "") {
        body.secret_key = sk.trim();
      }
      if (rmPk) {
        body.public_key = "";
      } else if (pk.trim() !== "") {
        body.public_key = pk.trim();
      }
      if (rmWh) {
        body.webhook_secret = "";
      } else if (wh.trim() !== "") {
        body.webhook_secret = wh.trim();
      }

      const hostedDb = int.hosted_checkout_enabled.database_value;
      const hostedPayload = triToPayload(hosted);
      if (hostedPayload !== hostedDb) {
        body.hosted_checkout_enabled = hostedPayload;
      }

      const liveDb = int.allow_live.database_value;
      const livePayload = triToPayload(allowLive);
      if (livePayload !== liveDb) {
        body.allow_live = livePayload;
      }

      const initSuccess = (int.checkout_success_url.database_value ?? int.checkout_success_url.effective).trim();
      const initCancel = (int.checkout_cancel_url.database_value ?? int.checkout_cancel_url.effective).trim();
      if (successUrl.trim() !== initSuccess) {
        body.checkout_success_url = successUrl.trim() === "" ? null : successUrl.trim();
      }
      if (cancelUrl.trim() !== initCancel) {
        body.checkout_cancel_url = cancelUrl.trim() === "" ? null : cancelUrl.trim();
      }

      const res = await admin.json<unknown>("/api/admin/stripe-settings", {
        method: "PUT",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = AdminStripeSettingsResponseSchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Unexpected Stripe settings save response.");
      }
      return parsed.data.data.integration;
    },
    onSuccess: () => {
      void query.refetch();
    },
  });

  const busy = query.isPending || mutation.isPending;

  const statusLine = useMemo(() => {
    if (!integ) {
      return null;
    }
    const parts = [
      integ.secret_key.effective_configured ? "Secret key ready" : "Secret key missing",
      integ.webhook_secret.effective_configured ? "Webhook signing ready" : "Webhook signing missing",
      integ.hosted_checkout_enabled.effective ? "Hosted checkout on" : "Hosted checkout off",
    ];
    return parts.join(" · ");
  }, [integ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Breadcrumbs
        items={[
          { label: "Webhook inbox", href: "/admin/webhooks/inbox" },
          { label: "Stripe" },
        ]}
      />
      <PageHeader
        title="Stripe integration"
        description="Secrets are encrypted at rest (APP_KEY). Only developers and super admins can view this page. Leave a field empty to leave it unchanged; check clear to drop a database override and fall back to environment variables."
      />

      {query.isPending ? (
        <div className="flex items-center gap-2 py-10 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          <span className="text-sm">Loading…</span>
        </div>
      ) : null}

      {query.isError ? (
        <p className="text-sm text-destructive" role="alert">
          {query.error instanceof Error ? query.error.message : "Could not load Stripe settings."}
        </p>
      ) : null}

      {integ ? (
        <>
          <p className="text-sm text-muted-foreground">{statusLine}</p>

          <Card>
            <CardHeader className="flex flex-row items-start gap-3 space-y-0">
              <CreditCard className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0 space-y-1">
                <CardTitle className="text-base">API keys & webhook secret</CardTitle>
                <CardDescription>
                  Stored values are never shown in full — only masked previews. Environment variables still apply when
                  no database override is set.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <FieldSecret
                label="Secret key"
                placeholder="sk_test_… or sk_live_…"
                hint={`Stored: ${integ.secret_key.database_override ? (integ.secret_key.masked ?? "set") : "no"} · Effective: ${integ.secret_key.effective_configured ? "yes" : "no"}`}
                value={sk}
                onChange={(v) => {
                  setSk(v);
                  setRmSk(false);
                }}
                remove={rmSk}
                onRemoveChange={setRmSk}
                disabled={busy}
              />
              <FieldSecret
                label="Publishable key"
                placeholder="pk_test_… or pk_live_…"
                hint={`Stored: ${integ.public_key.database_override ? (integ.public_key.masked ?? "set") : "no"}`}
                value={pk}
                onChange={(v) => {
                  setPk(v);
                  setRmPk(false);
                }}
                remove={rmPk}
                onRemoveChange={setRmPk}
                disabled={busy}
              />
              <FieldSecret
                label="Webhook signing secret"
                placeholder="whsec_…"
                hint={`Stored: ${integ.webhook_secret.database_override ? (integ.webhook_secret.masked ?? "set") : "no"}`}
                value={wh}
                onChange={(v) => {
                  setWh(v);
                  setRmWh(false);
                }}
                remove={rmWh}
                onRemoveChange={setRmWh}
                disabled={busy}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Feature flags & URLs</CardTitle>
              <CardDescription>
                Environment default reads Laravel config (<code className="text-xs">.env</code>) for that field.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Hosted checkout enabled</Label>
                <Select value={hosted} onValueChange={(v) => setHosted(v as Tri)} disabled={busy}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inherit">Environment default ({integ.hosted_checkout_enabled.effective ? "on" : "off"})</SelectItem>
                    <SelectItem value="on">On (database)</SelectItem>
                    <SelectItem value="off">Off (database)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Allow live secret keys</Label>
                <Select value={allowLive} onValueChange={(v) => setAllowLive(v as Tri)} disabled={busy}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inherit">Environment default ({integ.allow_live.effective ? "on" : "off"})</SelectItem>
                    <SelectItem value="on">On (database)</SelectItem>
                    <SelectItem value="off">Off (database)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="stripe-success-url">Checkout success URL</Label>
                <Input
                  id="stripe-success-url"
                  value={successUrl}
                  onChange={(e) => setSuccessUrl(e.target.value)}
                  disabled={busy}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stripe-cancel-url">Checkout cancel URL</Label>
                <Input
                  id="stripe-cancel-url"
                  value={cancelUrl}
                  onChange={(e) => setCancelUrl(e.target.value)}
                  disabled={busy}
                  autoComplete="off"
                />
              </div>
            </CardContent>
          </Card>

          {mutation.isError ? (
            <p className="text-sm text-destructive" role="alert">
              {mutation.error instanceof Error ? mutation.error.message : "Save failed."}
            </p>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" disabled={busy} onClick={() => void query.refetch()}>
              Reset form
            </Button>
            <Button type="button" disabled={busy} onClick={() => mutation.mutate()}>
              {mutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  Saving…
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}

function FieldSecret({
  label,
  hint,
  placeholder,
  value,
  onChange,
  remove,
  onRemoveChange,
  disabled,
}: {
  label: string;
  hint: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  remove: boolean;
  onRemoveChange: (v: boolean) => void;
  disabled: boolean;
}) {
  const id = `stripe-${label.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <p className="text-xs text-muted-foreground">{hint}</p>
      <Input
        id={id}
        type="password"
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
      <div className="flex items-center gap-2">
        <input
          id={`${id}-clear`}
          type="checkbox"
          className="h-4 w-4 rounded border border-input bg-background accent-primary"
          checked={remove}
          onChange={(e) => onRemoveChange(e.target.checked)}
          disabled={disabled}
        />
        <Label htmlFor={`${id}-clear`} className="text-sm font-normal text-muted-foreground">
          Clear database override (use environment)
        </Label>
      </div>
    </div>
  );
}
