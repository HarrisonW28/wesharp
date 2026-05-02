"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Loader2, MapPin } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiOrigin } from "@/lib/env";
import {
  PublicServiceAreaCheckResponseSchema,
  PublicServiceAreaWaitlistFormSchema,
  type PublicServiceAreaWaitlistFormValues,
} from "@/lib/public-service-area-schema";
import { cn } from "@/lib/utils";

function formatNextCollectionLabel(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

const CUSTOMER_TYPE_LABEL: Record<PublicServiceAreaWaitlistFormValues["customer_type"], string> = {
  home: "Home / household",
  business: "Business or hospitality",
  other: "Other",
};

export function ServiceAreaCheckerSection({ className }: { className?: string }) {
  const checkUrl = useMemo(() => `${apiOrigin()}/api/public/service-area/check`, []);
  const waitlistUrl = useMemo(() => `${apiOrigin()}/api/public/service-area/waitlist`, []);

  const [postcodeInput, setPostcodeInput] = useState("");
  const [checkLoading, setCheckLoading] = useState(false);
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [waitlistBanner, setWaitlistBanner] = useState<{ variant: "default" | "destructive"; text: string } | null>(null);
  const [waitlistFieldErrors, setWaitlistFieldErrors] = useState<
    Partial<Record<keyof PublicServiceAreaWaitlistFormValues, string>>
  >({});

  const [checkResult, setCheckResult] = useState<{
    covered: boolean;
    areaLabel: string | null;
    nextCollection: string | null;
  } | null>(null);

  const [waitlistForm, setWaitlistForm] = useState<PublicServiceAreaWaitlistFormValues>({
    name: "",
    email: "",
    postcode: "",
    customer_type: "home",
    estimated_knife_count: undefined,
    notes: "",
  });

  const [waitlistSucceeded, setWaitlistSucceeded] = useState(false);

  async function runCheck() {
    setCheckError(null);
    setCheckResult(null);
    setWaitlistBanner(null);
    setWaitlistSucceeded(false);
    if (apiOrigin() === "") {
      setCheckError("Booking tools are not connected — your developer needs to set NEXT_PUBLIC_API_ORIGIN.");
      return;
    }

    const pc = postcodeInput.trim();
    if (pc.length < 2) {
      setCheckError("Enter a full postcode.");
      return;
    }

    setCheckLoading(true);
    try {
      const res = await fetch(checkUrl, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ postcode: pc }),
      });
      const json: unknown = await res.json();
      if (!res.ok) {
        const msg =
          typeof json === "object" && json !== null && "error" in json && typeof (json as { error?: { message?: string } }).error?.message === "string"
            ? (json as { error: { message: string } }).error.message
            : "Something went wrong — please try again.";
        setCheckError(msg);
        return;
      }
      const data = typeof json === "object" && json !== null && "data" in json ? (json as { data: unknown }).data : json;
      const parsed = PublicServiceAreaCheckResponseSchema.safeParse(data);
      if (!parsed.success) {
        setCheckError("Unexpected response from the server.");
        return;
      }
      setCheckResult({
        covered: parsed.data.covered,
        areaLabel: parsed.data.area?.label ?? null,
        nextCollection: parsed.data.next_collection_date,
      });
      setWaitlistForm((prev) => ({ ...prev, postcode: pc }));
    } catch {
      setCheckError("Network error — check your connection and try again.");
    } finally {
      setCheckLoading(false);
    }
  }

  async function submitWaitlist(e: React.FormEvent) {
    e.preventDefault();
    setWaitlistBanner(null);
    setWaitlistFieldErrors({});
    if (apiOrigin() === "") return;

    const merged = {
      ...waitlistForm,
      postcode: waitlistForm.postcode.trim() || postcodeInput.trim(),
    };
    const parsed = PublicServiceAreaWaitlistFormSchema.safeParse(merged);
    if (!parsed.success) {
      const errs: Partial<Record<keyof PublicServiceAreaWaitlistFormValues, string>> = {};
      for (const issue of parsed.error.issues) {
        const k = issue.path[0];
        if (typeof k === "string" && !errs[k as keyof PublicServiceAreaWaitlistFormValues]) {
          errs[k as keyof PublicServiceAreaWaitlistFormValues] = issue.message;
        }
      }
      setWaitlistFieldErrors(errs);
      return;
    }

    setWaitlistLoading(true);
    try {
      const res = await fetch(waitlistUrl, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          name: parsed.data.name,
          email: parsed.data.email,
          postcode: parsed.data.postcode,
          customer_type: parsed.data.customer_type,
          estimated_knife_count: parsed.data.estimated_knife_count,
          notes: parsed.data.notes && parsed.data.notes !== "" ? parsed.data.notes : undefined,
        }),
      });
      const json: unknown = await res.json();
      if (res.status === 422) {
        const code =
          typeof json === "object" && json !== null && "error" in json
            ? (json as { error?: { code?: string; message?: string } }).error?.code
            : undefined;
        const msg =
          typeof json === "object" && json !== null && "error" in json
            ? (json as { error?: { message?: string } }).error?.message
            : undefined;
        if (code === "in_service_area") {
          setWaitlistBanner({ variant: "destructive", text: msg ?? "This postcode is already in our collection area — use Book a collection instead." });
          return;
        }
        setWaitlistBanner({ variant: "destructive", text: msg ?? "Please check the form and try again." });
        return;
      }
      if (!res.ok) {
        setWaitlistBanner({ variant: "destructive", text: "Could not save your details — please try again later." });
        return;
      }
      const data = typeof json === "object" && json !== null && "data" in json ? (json as { data: { message?: string } }).data : {};
      const successText = typeof data.message === "string" ? data.message : "Thanks — you’re on the list.";
      setWaitlistBanner({ variant: "default", text: successText });
      setWaitlistSucceeded(true);
    } catch {
      setWaitlistBanner({ variant: "destructive", text: "Network error — please try again." });
    } finally {
      setWaitlistLoading(false);
    }
  }

  return (
    <Card className={cn("border-border/80 shadow-sm", className)}>
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <MapPin className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
          Check your postcode
        </CardTitle>
        <CardDescription>
          See if we currently collect in your area. If not, you can leave your details and we’ll keep you in mind when we
          expand.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {apiOrigin() === "" && (
          <Alert variant="destructive">
            <AlertDescription>
              <code className="font-mono">NEXT_PUBLIC_API_ORIGIN</code> must point at the WeSharp API so this checker can
              run (for example <code className="font-mono">http://localhost:8000</code>).
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 space-y-2">
            <Label htmlFor="service-area-postcode">Postcode</Label>
            <Input
              id="service-area-postcode"
              className="h-11 sm:h-10"
              placeholder="e.g. M1 1AA"
              autoComplete="postal-code"
              value={postcodeInput}
              onChange={(e) => setPostcodeInput(e.target.value)}
              aria-invalid={Boolean(checkError)}
            />
          </div>
          <Button type="button" className="h-11 w-full shrink-0 sm:w-auto sm:px-6" onClick={() => void runCheck()} disabled={checkLoading || apiOrigin() === ""}>
            {checkLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                Checking…
              </>
            ) : (
              "Check coverage"
            )}
          </Button>
        </div>

        {checkError ? (
          <Alert variant="destructive">
            <AlertDescription>{checkError}</AlertDescription>
          </Alert>
        ) : null}

        {checkResult?.covered ? (
          <Alert className="border-emerald-500/40 bg-emerald-500/5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
            <AlertDescription className="space-y-3 text-foreground">
              <p className="font-medium text-emerald-950 dark:text-emerald-50">Yes — we collect in your area.</p>
              {checkResult.areaLabel ? (
                <p className="text-sm text-muted-foreground">
                  Your postcode falls within <span className="font-medium text-foreground">{checkResult.areaLabel}</span>.
                </p>
              ) : null}
              {checkResult.nextCollection ? (
                <p className="text-sm text-muted-foreground">
                  Our next routed collection day on the schedule is{" "}
                  <span className="font-medium text-foreground">{formatNextCollectionLabel(checkResult.nextCollection)}</span>
                  . We&apos;ll confirm an exact window when you book.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">Request a collection to choose a date — we&apos;ll confirm the window with you.</p>
              )}
              <Button asChild className="h-11 w-full rounded-lg sm:w-auto">
                <Link href="/book">
                  Book a collection <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                </Link>
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        {checkResult && !checkResult.covered ? (
          <div className="space-y-4 rounded-xl border bg-muted/20 p-4 dark:bg-muted/10">
            <div className="space-y-1">
              <p className="font-medium">We don&apos;t cover that postcode yet</p>
              <p className="text-sm text-muted-foreground">
                Leave your details and we&apos;ll reach out if we start collecting near you.
              </p>
            </div>

            {waitlistBanner ? (
              <Alert variant={waitlistBanner.variant === "destructive" ? "destructive" : "default"}>
                <AlertDescription>{waitlistBanner.text}</AlertDescription>
              </Alert>
            ) : null}

            {!waitlistSucceeded ? (
              <form className="space-y-4" onSubmit={(e) => void submitWaitlist(e)}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="waitlist-name">Name</Label>
                    <Input
                      id="waitlist-name"
                      className="h-11 sm:h-10"
                      value={waitlistForm.name}
                      onChange={(e) => setWaitlistForm((p) => ({ ...p, name: e.target.value }))}
                      autoComplete="name"
                      aria-invalid={Boolean(waitlistFieldErrors.name)}
                    />
                    {waitlistFieldErrors.name ? <p className="text-xs text-destructive">{waitlistFieldErrors.name}</p> : null}
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="waitlist-email">Email</Label>
                    <Input
                      id="waitlist-email"
                      type="email"
                      className="h-11 sm:h-10"
                      value={waitlistForm.email}
                      onChange={(e) => setWaitlistForm((p) => ({ ...p, email: e.target.value }))}
                      autoComplete="email"
                      aria-invalid={Boolean(waitlistFieldErrors.email)}
                    />
                    {waitlistFieldErrors.email ? <p className="text-xs text-destructive">{waitlistFieldErrors.email}</p> : null}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="waitlist-postcode">Postcode</Label>
                    <Input
                      id="waitlist-postcode"
                      className="h-11 sm:h-10"
                      value={waitlistForm.postcode}
                      onChange={(e) => setWaitlistForm((p) => ({ ...p, postcode: e.target.value }))}
                      autoComplete="postal-code"
                      aria-invalid={Boolean(waitlistFieldErrors.postcode)}
                    />
                    {waitlistFieldErrors.postcode ? <p className="text-xs text-destructive">{waitlistFieldErrors.postcode}</p> : null}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="waitlist-type">You are a…</Label>
                    <select
                      id="waitlist-type"
                      className={cn(
                        "flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:h-10",
                      )}
                      value={waitlistForm.customer_type}
                      onChange={(e) =>
                        setWaitlistForm((p) => ({
                          ...p,
                          customer_type: e.target.value as PublicServiceAreaWaitlistFormValues["customer_type"],
                        }))
                      }
                    >
                      {(Object.keys(CUSTOMER_TYPE_LABEL) as PublicServiceAreaWaitlistFormValues["customer_type"][]).map((k) => (
                        <option key={k} value={k}>
                          {CUSTOMER_TYPE_LABEL[k]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="waitlist-knives">Rough knife count (optional)</Label>
                    <Input
                      id="waitlist-knives"
                      inputMode="numeric"
                      className="h-11 sm:h-10"
                      placeholder="e.g. 12"
                      value={waitlistForm.estimated_knife_count ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        setWaitlistForm((p) => ({
                          ...p,
                          estimated_knife_count: v === "" ? undefined : Number(v),
                        }));
                      }}
                      aria-invalid={Boolean(waitlistFieldErrors.estimated_knife_count)}
                    />
                    {waitlistFieldErrors.estimated_knife_count ? (
                      <p className="text-xs text-destructive">{waitlistFieldErrors.estimated_knife_count}</p>
                    ) : null}
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="waitlist-notes">Anything else we should know? (optional)</Label>
                    <Textarea
                      id="waitlist-notes"
                      className="min-h-[88px] resize-y"
                      value={waitlistForm.notes ?? ""}
                      onChange={(e) => setWaitlistForm((p) => ({ ...p, notes: e.target.value }))}
                      aria-invalid={Boolean(waitlistFieldErrors.notes)}
                    />
                    {waitlistFieldErrors.notes ? <p className="text-xs text-destructive">{waitlistFieldErrors.notes}</p> : null}
                  </div>
                </div>
                <Button type="submit" className="h-11 w-full sm:w-auto" disabled={waitlistLoading || apiOrigin() === ""}>
                  {waitlistLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                      Sending…
                    </>
                  ) : (
                    "Join the waitlist"
                  )}
                </Button>
              </form>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
