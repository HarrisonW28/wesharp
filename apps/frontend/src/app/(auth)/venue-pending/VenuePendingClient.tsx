"use client";

import Link from "next/link";
import { useAuth, useUser } from "@clerk/nextjs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { apiOrigin } from "@/lib/env";
import { safeReturnTo } from "@/lib/safe-return-to";

type RegistrationType = "business" | "sole_customer";

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

export function VenuePendingClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = safeReturnTo(searchParams.get("returnTo"), "");
  const queryClient = useQueryClient();
  const { isLoaded, userId, getToken } = useAuth();
  const { user } = useUser();
  const [registrationType, setRegistrationType] = useState<RegistrationType>("business");
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [billingEmail, setBillingEmail] = useState("");

  const primaryEmail =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    "";

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
      router.replace(returnTo !== "" ? returnTo : "/account/dashboard");
      router.refresh();
    },
  });

  if (!isLoaded) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
        <span className="text-sm">Loading…</span>
      </div>
    );
  }

  if (!userId) {
    return (
      <main className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 px-4 py-16 text-center">
        <p className="text-sm text-muted-foreground">Sign in first to finish setting up your business on WeSharp.</p>
        <Button type="button" asChild variant="outline">
          <Link href="/login">Sign in</Link>
        </Button>
      </main>
    );
  }

  const disabled = mutation.isPending || name.trim() === "";

  const sole = registrationType === "sole_customer";

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-4 py-12">
      <div className="text-center">
        <h1 className="text-xl font-semibold tracking-tight">Finish your WeSharp profile</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Signed in as {primaryEmail}. We create your business profile for billing and collections — choose
          whether you are an individual or representing a business venue.
        </p>
      </div>

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
            ) : sole ? (
              "Save & continue"
            ) : (
              "Create & continue"
            )}
          </Button>
          <Button type="button" variant="outline" asChild disabled={mutation.isPending}>
            <Link href="/login">Use a different login</Link>
          </Button>
        </div>
      </form>

      <button
        type="button"
        className="self-center text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground disabled:opacity-50"
        disabled={mutation.isPending}
        onClick={() => typeof window !== "undefined" && window.location.reload()}
      >
        Reload
      </button>
    </main>
  );
}
