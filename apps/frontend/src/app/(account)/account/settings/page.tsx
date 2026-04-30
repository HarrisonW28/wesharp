"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { SettingsResponseSchema } from "@/lib/api/account-schema";
import { useAccountApi } from "@/lib/api/use-account-api";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AccountSettingsPage() {
  const api = useAccountApi();

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

  return (
    <div className="space-y-8">
      <Breadcrumbs homeHref="/account/dashboard" items={[{ label: "Settings" }]} />
      <PageHeader title="Account basics" description="Operational emails and phone routing only — invoicing thresholds stay behind finance." />

      {profileQuery.status === "pending" ? (
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
      ) : profileQuery.isError ? (
        <Alert variant="destructive">
          <AlertDescription>{(profileQuery.error as Error).message}</AlertDescription>
        </Alert>
      ) : (
        <form
          className="mx-auto grid max-w-2xl gap-6 rounded-2xl border bg-card p-6 shadow-sm"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            mutation.reset();
            void mutation.mutateAsync({
              user: {
                name: String(fd.get("user.name") ?? ""),
              },
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
      )}
    </div>
  );
}
