"use client";

import Link from "next/link";
import { useAuth, useUser } from "@clerk/nextjs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiOrigin } from "@/lib/env";
import { cn } from "@/lib/utils";
import type { BootstrapRegistrationType } from "@/lib/subscription-checkout-state";

type RegistrationType = BootstrapRegistrationType;

type BootstrapSuccessPayload = {
  success: boolean;
  data?: {
    company?: { id: string; name: string; company_status?: string; is_sole_customer?: boolean };
    message?: string;
  };
  error?: { code?: string; message?: string };
};

async function fetchBootstrapOrganisation(
  token: string,
  body: {
    name: string;
    registration_type?: RegistrationType;
    city?: string;
    phone?: string;
    billing_email?: string;
  },
): Promise<BootstrapSuccessPayload & { rawStatus: number }> {
  const origin = apiOrigin();
  const url = `${origin}/api/v1/account/bootstrap-organisation`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify(body),
  });

  const json = (await res.json().catch(() => ({}))) as BootstrapSuccessPayload;

  return { ...json, rawStatus: res.status };
}

export type TenantOrganisationBootstrapFormProps = {
  className?: string;
  /** Called after Laravel company binding succeeds and `backend-me` is refreshed. */
  onSuccess?: () => void | Promise<void>;
  submitLabel?: string;
  showAlternateSignIn?: boolean;
  defaultRegistrationType?: RegistrationType;
};

/** Business / sole-trader profile step before tenant portal or Stripe checkout. */
export function TenantOrganisationBootstrapForm({
  className,
  onSuccess,
  submitLabel,
  showAlternateSignIn = true,
  defaultRegistrationType = "business",
}: TenantOrganisationBootstrapFormProps) {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const { user } = useUser();
  const [registrationType, setRegistrationType] = useState<RegistrationType>(defaultRegistrationType);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [billingEmail, setBillingEmail] = useState("");

  const primaryEmail =
    user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses?.[0]?.emailAddress ?? "";

  const mutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      if (!token || apiOrigin() === "") {
        throw new Error("Missing session or NEXT_PUBLIC_API_ORIGIN.");
      }
      const trimmed = name.trim();
      if (trimmed === "") {
        throw new Error(
          registrationType === "sole_customer"
            ? "Enter the name for your account (your name or trading as…)."
            : "Enter your organisation or venue name.",
        );
      }
      const res = await fetchBootstrapOrganisation(token, {
        name: trimmed,
        registration_type: registrationType,
        ...(city.trim() !== "" ? { city: city.trim() } : {}),
        ...(phone.trim() !== "" ? { phone: phone.trim() } : {}),
        ...(billingEmail.trim() !== "" ? { billing_email: billingEmail.trim() } : {}),
      });

      if (!res.success || res.rawStatus < 200 || res.rawStatus >= 300) {
        const msg =
          res.error?.message ??
          (res.rawStatus === 422
            ? "This account already has a linked business on WeSharp."
            : `Could not finish setup (${res.rawStatus}).`);
        throw new Error(msg);
      }

      return res;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["backend-me"] });
      await queryClient.refetchQueries({ queryKey: ["backend-me"] });
      await onSuccess?.();
    },
  });

  const sole = registrationType === "sole_customer";
  const disabled = mutation.isPending || name.trim() === "";

  return (
    <div className={cn("space-y-6", className)}>
      <div className="space-y-3" role="radiogroup" aria-label="Account type">
        <Label className="text-sm font-medium text-foreground">How should we set you up?</Label>
        <div className="grid gap-3">
          {(
            [
              {
                value: "business" as const,
                title: "Business / venue",
                body: "Kitchen, brasserie, collective, etc.",
              },
              {
                value: "sole_customer" as const,
                title: "Sole trader / individual",
                body: "Not a registered company — billed to you.",
              },
            ] as const
          ).map((opt) => {
            const selected = registrationType === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setRegistrationType(opt.value)}
                className={cn(
                  "flex min-h-[4.25rem] w-full touch-manipulation flex-col rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:bg-muted/40",
                  selected ? "border-primary bg-primary/5" : "border-border bg-card hover:border-muted-foreground/30",
                )}
              >
                <span className="text-sm font-semibold text-foreground">{opt.title}</span>
                <span className="mt-1 text-xs leading-relaxed text-muted-foreground">{opt.body}</span>
              </button>
            );
          })}
        </div>
      </div>

      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="org-name">{sole ? "Name for invoices & account" : "Venue / business name"}</Label>
          <Input
            id="org-name"
            name="name"
            autoComplete={sole ? "name" : "organization"}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={sole ? "e.g. Alex Chen or Alex Chen trading as SharpEdge" : "e.g. Northern Edge Prep Collective"}
            required
          />
          {!sole ? (
            <p className="text-xs text-muted-foreground">This appears on manifests and receipts as your organisation.</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Use your legal name or &ldquo;trading as …&rdquo; — fine for sharpening without forming a ltd company here.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="org-city">{sole ? "City / area (optional)" : "City (optional)"}</Label>
          <Input id="org-city" name="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="org-phone">Phone (optional)</Label>
          <Input id="org-phone" name="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+44 …" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="org-billing">Billing email (optional)</Label>
          <Input
            id="org-billing"
            name="billing_email"
            type="email"
            value={billingEmail}
            onChange={(e) => setBillingEmail(e.target.value)}
            placeholder={primaryEmail !== "" ? primaryEmail : "invoices@example.com"}
          />
        </div>

        {mutation.isError ? (
          <p className="text-sm text-destructive">{mutation.error instanceof Error ? mutation.error.message : String(mutation.error)}</p>
        ) : null}

        <div className="flex flex-wrap gap-3 pt-2">
          <Button type="submit" disabled={disabled} className="min-w-[11rem]">
            {mutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                Saving…
              </>
            ) : (
              submitLabel ?? (sole ? "Save & continue" : "Create & continue")
            )}
          </Button>
          {showAlternateSignIn ? (
            <Button type="button" variant="outline" asChild disabled={mutation.isPending}>
              <Link href="/login">Use a different login</Link>
            </Button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
