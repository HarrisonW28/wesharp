"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ChevronLeft, Loader2 } from "lucide-react";

import { BookingWizardStepNav } from "@/components/bookings/BookingWizardStepNav";
import { PublicSubscriptionPlanPicker } from "@/components/marketing/PublicSubscriptionPlanPicker";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiOrigin } from "@/lib/env";
import {
  PUBLIC_BOOKING_ENQUIRY_SCHEMA,
  PUBLIC_BOOKING_WIZARD_STEP_COUNT,
  type PublicBookingFormValues,
  validatePublicBookingWizardStep,
  type PublicBookingFieldErrors,
} from "@/lib/public-booking-schema";
import { postPublicBookingServiceAreaCheck } from "@/lib/public-booking-service-area-check";
import type { PublicBookingFlowSettings } from "@/lib/site-content/fetch-site-content";
import type { SiteContent } from "@/lib/site-content/site-content-defaults";
import { trackBookingWizard } from "@/lib/booking-wizard-analytics";
import { PUBLIC_SITE_CONTENT_CONTAINER_CLASS } from "@/lib/public-site-layout";
import { subscriptionCheckoutPath } from "@/lib/subscription-checkout-path";
import { formatGBP } from "@/lib/format/money";
import { cn } from "@/lib/utils";

function looksLikeUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s.trim());
}

const STEP_HEADINGS = [
  {
    name: "What to sharpen",
    title: "What do you need sharpened?",
    hint: "Tell us what you’re sending — chef knives, tools, or a mix.",
  },
  {
    name: "How many",
    title: "How many knives or items?",
    hint: "A rough count helps us plan. You can skip this if you’re not sure yet.",
  },
  {
    name: "Address",
    title: "Collection address",
    hint: "Where we should collect from (and the venue name we should ask for on site).",
  },
  {
    name: "Date & time",
    title: "Preferred date & time",
    hint: "We’ll confirm the exact window with you after we review the request.",
  },
  {
    name: "Programme",
    title: "One-off or subscription?",
    hint: "No commitment on this form — it just helps us respond with the right options.",
  },
  {
    name: "Review",
    title: "Review & send",
    hint: "Check your details, add your contact information, and send the enquiry.",
  },
] as const;

const initialValues: PublicBookingFormValues = {
  business_name: "",
  contact_name: "",
  email: "",
  phone: "",
  address_line_1: "",
  address_line_2: "",
  city: "",
  postcode: "",
  estimated_knife_count: undefined,
  preferred_date: "",
  time_window_preference: "",
  service_type: "collection",
  message: "",
  terms_accepted: false,
  programme_interest: undefined,
  subscription_plan_id: undefined,
  price_guide_estimate_pence: undefined,
};

export function BookPageClient({
  booking,
  publicBooking,
}: {
  booking: SiteContent["booking"];
  publicBooking: PublicBookingFlowSettings;
}) {
  const searchParams = useSearchParams();
  const seededPlanMessageRef = useRef(false);
  const seededPriceGuideMessageRef = useRef(false);
  const [values, setValues] = useState<PublicBookingFormValues>(initialValues);
  const [fieldErrors, setFieldErrors] = useState<PublicBookingFieldErrors>({});
  const [globalMessage, setGlobalMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [step, setStep] = useState(0);
  const [coverageCheckLoading, setCoverageCheckLoading] = useState(false);
  const [coverageGateBlocked, setCoverageGateBlocked] = useState(false);
  const [outOfAreaAcknowledged, setOutOfAreaAcknowledged] = useState(false);
  const [selectedPlanLabel, setSelectedPlanLabel] = useState<string | null>(null);

  const endpoint = useMemo(() => `${apiOrigin()}/api/public/booking-enquiries`, []);

  useEffect(() => {
    trackBookingWizard("booking_wizard_step_view", {
      step: step + 1,
      step_name: STEP_HEADINGS[step]?.name ?? "unknown",
    });
  }, [step]);

  const subscribeRegisterHref =
    values.subscription_plan_id && looksLikeUuid(values.subscription_plan_id)
      ? `/register?returnTo=${encodeURIComponent(subscriptionCheckoutPath(values.subscription_plan_id))}`
      : "/register";
  const subscribeLoginHref =
    values.subscription_plan_id && looksLikeUuid(values.subscription_plan_id)
      ? `/login?returnTo=${encodeURIComponent(subscriptionCheckoutPath(values.subscription_plan_id))}`
      : "/login";
  const subscribeNowHref =
    values.subscription_plan_id && looksLikeUuid(values.subscription_plan_id)
      ? subscriptionCheckoutPath(values.subscription_plan_id)
      : null;

  useEffect(() => {
    const kn = searchParams.get("knives");
    const pc = searchParams.get("postcode");
    const prog = searchParams.get("programme");
    const svc = searchParams.get("service");
    const planNameRaw = searchParams.get("plan_name");
    const customPlanRaw = searchParams.get("custom_plan");
    const subscriptionPlanIdRaw = searchParams.get("subscription_plan_id");
    const fromPriceGuide = searchParams.get("from_price_guide");
    const estimatePenceRaw = searchParams.get("estimate_pence");
    const pricingRuleRaw = searchParams.get("pricing_rule");

    if (
      kn === null &&
      pc === null &&
      prog === null &&
      svc === null &&
      planNameRaw === null &&
      customPlanRaw === null &&
      subscriptionPlanIdRaw === null &&
      fromPriceGuide === null
    ) {
      return;
    }
    setValues((prev) => {
      const next = { ...prev };
      if (kn !== null && /^\d+$/.test(kn)) {
        const n = Number(kn);
        if (n >= 1 && n <= 50000) {
          next.estimated_knife_count = n;
        }
      }
      if (pc !== null && pc.trim() !== "") {
        next.postcode = pc.trim().slice(0, 24);
      }
      if (svc === "onsite" || svc === "collection") {
        next.service_type = svc;
      }
      if (prog === "subscription") {
        next.programme_interest = "subscription";
      } else if (prog === "one_off") {
        next.programme_interest = "one_off";
      } else if (prog === "unsure") {
        next.programme_interest = "unsure";
      }

      if (subscriptionPlanIdRaw !== null && looksLikeUuid(subscriptionPlanIdRaw)) {
        next.subscription_plan_id = subscriptionPlanIdRaw.trim();
        next.programme_interest = "subscription";
      }

      if (!seededPlanMessageRef.current && prev.message === "") {
        const planName = planNameRaw?.trim() ?? "";
        if (planName !== "") {
          const safe = planName.slice(0, 120);
          next.message = `I'm interested in the "${safe}" subscription programme. Please share next steps.`;
          next.programme_interest = "subscription";
          seededPlanMessageRef.current = true;
        } else if (customPlanRaw !== null && /^(1|true|yes)$/i.test(customPlanRaw.trim())) {
          next.message =
            "I'd like to discuss a custom / bespoke subscription or programme for our volumes and schedule. Please get in touch.";
          next.programme_interest = "subscription";
          seededPlanMessageRef.current = true;
        }
      }

      if (!seededPriceGuideMessageRef.current && prev.message === "" && fromPriceGuide === "1") {
        const ep = estimatePenceRaw !== null ? Number(estimatePenceRaw) : NaN;
        if (Number.isFinite(ep) && ep >= 0 && ep <= 500_000_000) {
          const rounded = Math.round(ep);
          next.price_guide_estimate_pence = rounded;
          const knifeLabel =
            next.estimated_knife_count != null ? `~${next.estimated_knife_count} knives/items` : "my knives/items";
          const amt = formatGBP(rounded);
          const ruleBit =
            pricingRuleRaw !== null && pricingRuleRaw.trim() !== ""
              ? ` Pricing rule matched: ${pricingRuleRaw.trim().slice(0, 120)}.`
              : "";
          next.message = `I'm coming from the website price guide — indicative estimate was ${amt} for ${knifeLabel}.${ruleBit} Please confirm on quote after booking review.`;
          seededPriceGuideMessageRef.current = true;
        }
      }

      return next;
    });
  }, [searchParams]);

  const patch =
    <K extends keyof PublicBookingFormValues>(key: K) =>
    (next: PublicBookingFormValues[K]) => {
      setValues((prev: PublicBookingFormValues) => ({ ...prev, [key]: next }));
      setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
      setGlobalMessage(null);
    };

  const serviceAreasWaitlistHref = useMemo(() => {
    const q = new URLSearchParams();
    q.set("from", "book");
    const pc = values.postcode.trim();
    if (pc !== "") {
      q.set("postcode", pc);
    }
    return `/service-areas?${q.toString()}`;
  }, [values.postcode]);

  const submitEnquiry = async () => {
    setGlobalMessage(null);

    const parsed = PUBLIC_BOOKING_ENQUIRY_SCHEMA.safeParse(values);
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      const next: PublicBookingFieldErrors = {};
      (Object.keys(flat) as (keyof typeof flat)[]).forEach((k) => {
        const msg = flat[k];
        if (msg?.[0]) {
          next[k as keyof PublicBookingFormValues] = msg[0];
        }
      });
      setFieldErrors(next);
      setStatus("error");
      const firstErrorStep = [0, 1, 2, 3, 4, 5].find((i) => {
        const r = validatePublicBookingWizardStep(i, values);
        return !r.ok;
      });
      if (firstErrorStep !== undefined) {
        setStep(firstErrorStep);
      }
      return;
    }

    setFieldErrors({});
    setStatus("submitting");

    const body: Record<string, unknown> = { ...parsed.data };
    delete body.terms_accepted;
    if (body.estimated_knife_count === undefined) {
      delete body.estimated_knife_count;
    }
    if (body.address_line_2 === "" || body.address_line_2 === undefined) {
      body.address_line_2 = "";
    }
    if (body.programme_interest === undefined || body.programme_interest === null) {
      delete body.programme_interest;
    }
    if (body.subscription_plan_id === undefined || body.subscription_plan_id === null) {
      delete body.subscription_plan_id;
    }
    if (body.price_guide_estimate_pence === undefined || body.price_guide_estimate_pence === null) {
      delete body.price_guide_estimate_pence;
    }
    body.terms_accepted = true;

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
      });

      if (response.status === 429) {
        setGlobalMessage("Too many submissions from this connection. Please wait a minute and try again.");
        setStatus("error");
        return;
      }

      let json: unknown = null;
      try {
        json = await response.json();
      } catch {
        json = null;
      }

      if (!response.ok) {
        const nextErrors: PublicBookingFieldErrors = {};
        const errEnvelope =
          json !== null &&
          typeof json === "object" &&
          "error" in json &&
          (json as { error?: unknown }).error !== null &&
          typeof (json as { error?: unknown }).error === "object"
            ? ((json as { error: Record<string, unknown> }).error as Record<string, unknown>)
            : null;

        const fieldMap =
          errEnvelope &&
          "errors" in errEnvelope &&
          errEnvelope.errors !== null &&
          typeof errEnvelope.errors === "object"
            ? (errEnvelope.errors as Record<string, string[] | undefined>)
            : null;

        if (fieldMap) {
          for (const [key, msgs] of Object.entries(fieldMap)) {
            const first = msgs?.[0];
            if (typeof first === "string" && first !== "") {
              nextErrors[key as keyof PublicBookingFormValues] = first;
            }
          }
        }

        let message = "We could not submit your enquiry right now.";
        if (typeof errEnvelope?.message === "string" && errEnvelope.message !== "") {
          message = errEnvelope.message;
        }
        setFieldErrors(nextErrors);
        setGlobalMessage(message);
        setStatus("error");
        return;
      }

      const okPayload =
        json !== null &&
        typeof json === "object" &&
        "success" in json &&
        (json as { success?: unknown }).success === true &&
        "data" in json &&
        (json as { data?: unknown }).data !== null &&
        typeof (json as { data?: unknown }).data === "object" &&
        ((json as { data: { accepted?: unknown } }).data as { accepted?: unknown }).accepted === true;

      if (!okPayload) {
        setGlobalMessage("Unexpected response from the server.");
        setStatus("error");
        return;
      }

      setStatus("success");
      trackBookingWizard("booking_wizard_submit", {
        programme: values.programme_interest ?? "none",
        has_plan: Boolean(values.subscription_plan_id),
      });
    } catch {
      setGlobalMessage(
        apiOrigin() === ""
          ? "Check NEXT_PUBLIC_API_ORIGIN is set so this form can reach the API."
          : "Network error — check your connection and try again.",
      );
      setStatus("error");
    }
  };

  const advanceToNextStep = () => {
    trackBookingWizard("booking_wizard_step_complete", {
      step: step + 1,
      step_name: STEP_HEADINGS[step]?.name ?? "unknown",
    });
    setFieldErrors({});
    setStatus("idle");
    setCoverageGateBlocked(false);
    setStep((s) => Math.min(s + 1, PUBLIC_BOOKING_WIZARD_STEP_COUNT - 1));
  };

  const handleAdvanceStep = async () => {
    setGlobalMessage(null);
    const v = validatePublicBookingWizardStep(step, values);
    if (!v.ok) {
      setFieldErrors(v.errors);
      setStatus("error");
      return;
    }

    const runCollectionCoverage =
      step === 2 && values.service_type === "collection" && apiOrigin() !== "" && !outOfAreaAcknowledged;

    if (runCollectionCoverage) {
      setCoverageCheckLoading(true);
      setCoverageGateBlocked(false);
      try {
        const result = await postPublicBookingServiceAreaCheck(apiOrigin(), values.postcode.trim());
        if (!result.ok) {
          if (result.status === 422 && result.code === "invalid_postcode") {
            setFieldErrors((prev) => ({ ...prev, postcode: result.message }));
          } else {
            setGlobalMessage(result.message);
          }
          setStatus("error");
          return;
        }
        if (!result.data.covered) {
          setCoverageGateBlocked(true);
          return;
        }
      } catch {
        setGlobalMessage("Network error — could not verify coverage. Check your connection or try again.");
        setStatus("error");
        return;
      } finally {
        setCoverageCheckLoading(false);
      }
    }

    advanceToNextStep();
  };

  const proceedAfterOutOfAreaAck = () => {
    setOutOfAreaAcknowledged(true);
    setCoverageGateBlocked(false);
    setFieldErrors({});
    setStatus("idle");
    setStep((s) => Math.min(s + 1, PUBLIC_BOOKING_WIZARD_STEP_COUNT - 1));
  };

  const goBack = () => {
    setGlobalMessage(null);
    setFieldErrors({});
    setStatus("idle");
    setCoverageCheckLoading(false);
    setCoverageGateBlocked(false);
    setStep((s) => {
      const next = Math.max(0, s - 1);
      if (next === 2) {
        setOutOfAreaAcknowledged(false);
      }
      return next;
    });
  };

  const successBullets = booking.success_bullets ?? [];

  if (status === "success") {
    return (
      <div className={PUBLIC_SITE_CONTENT_CONTAINER_CLASS}>
        <div className="min-w-0 space-y-6 overflow-x-hidden py-16 pb-[max(4rem,env(safe-area-inset-bottom))] md:py-24">
          <div className="flex justify-center md:justify-start">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-9 w-9" aria-hidden />
            </div>
          </div>
          <div className="space-y-2 text-center md:text-left">
            <p className="text-sm font-medium text-primary">{booking.success_kicker}</p>
            <h1 className="text-balance text-3xl font-semibold tracking-tight">{booking.success_title}</h1>
            <p className="text-muted-foreground">{booking.success_intro}</p>
          </div>
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            {successBullets.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          {publicBooking.offer_subscription_checkout_in_wizard &&
          values.programme_interest === "subscription" ? (
            <Alert className="border-primary/25 bg-primary/5 text-left">
              <AlertDescription className="text-sm leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground">Subscribe online</span> — finish payment on Stripe when your
                plan supports card billing. Use the same email you used above so we can match your enquiry.
                <div className="mt-3 flex flex-wrap gap-2">
                  {subscribeNowHref ? (
                    <Button asChild variant="default" size="sm" className="rounded-lg">
                      <Link
                        href={subscribeNowHref}
                        onClick={() =>
                          trackBookingWizard("booking_wizard_subscribe_click", {
                            plan_id: values.subscription_plan_id ?? "",
                            context: "success",
                          })
                        }
                      >
                        Subscribe now
                      </Link>
                    </Button>
                  ) : null}
                  <Button asChild variant="secondary" size="sm" className="rounded-lg">
                    <Link href={subscribeRegisterHref}>Create account</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="rounded-lg">
                    <Link href={subscribeLoginHref}>Sign in</Link>
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          ) : null}
          <div className="flex flex-wrap justify-center gap-3 md:justify-start">
            <Button asChild variant="default" className="h-12 min-h-11 touch-manipulation rounded-lg">
              <Link href="/">Back home</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const meta = STEP_HEADINGS[step] ?? STEP_HEADINGS[0];
  const isReviewStep = step === PUBLIC_BOOKING_WIZARD_STEP_COUNT - 1;
  const continueBlockedByCoverage =
    step === 2 && values.service_type === "collection" && apiOrigin() !== "" && coverageGateBlocked;
  const programmeLabel =
    values.programme_interest === "one_off"
      ? "One-off visit"
      : values.programme_interest === "subscription"
        ? "Ongoing programme / subscription"
        : values.programme_interest === "unsure"
          ? "Not sure — please advise"
          : "—";

  return (
    <div className={PUBLIC_SITE_CONTENT_CONTAINER_CLASS}>
      <div className="min-w-0 space-y-8 overflow-x-hidden py-12 pb-[max(3rem,env(safe-area-inset-bottom))] md:space-y-10 md:py-20">
        <div className="space-y-3">
          <p className="text-sm font-medium text-primary">{booking.page_kicker}</p>
          <h1 className="text-balance text-3xl font-semibold tracking-tight">{booking.page_title}</h1>
          <p className="text-muted-foreground">{booking.page_lead}</p>
        </div>

      <BookingWizardStepNav steps={STEP_HEADINGS} currentStep={step} />

      {apiOrigin() === "" && (
        <Alert variant="destructive">
          <AlertDescription>
            <code className="font-mono">NEXT_PUBLIC_API_ORIGIN</code> is not configured — set it to your Laravel API base
            (for example <code className="font-mono">http://localhost:8000</code>) so this form can submit.
          </AlertDescription>
        </Alert>
      )}

      <form
        className="space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (!isReviewStep) {
            void handleAdvanceStep();
            return;
          }
          void submitEnquiry();
        }}
        noValidate
      >
        {globalMessage && (
          <Alert variant="destructive">
            <AlertDescription>{globalMessage}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight">{meta.title}</h2>
          <p className="text-sm text-muted-foreground">{meta.hint}</p>
        </div>

        <div className="grid gap-4">
          {step === 0 ? (
            <>
              <div className="grid gap-2">
                <Label htmlFor="service_type">How should we work with you?</Label>
                <select
                  id="service_type"
                  name="service_type"
                  className="flex h-11 min-h-11 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60 md:text-sm"
                  value={values.service_type}
                  onChange={(ev) => patch("service_type")(ev.target.value === "onsite" ? "onsite" : "collection")}
                  aria-invalid={fieldErrors.service_type ? "true" : undefined}
                  aria-describedby={fieldErrors.service_type ? "service_type-error" : undefined}
                >
                  <option value="collection">Pickup &amp; return (we collect, sharpen, bring back)</option>
                  <option value="onsite">On-site sharpening at your venue</option>
                </select>
                {fieldErrors.service_type && (
                  <p id="service_type-error" className="text-sm text-destructive">
                    {fieldErrors.service_type}
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="message">
                  Description <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="message"
                  name="message"
                  rows={5}
                  className="min-h-[120px] text-base md:text-sm"
                  placeholder="e.g. 18 chef knives and 6 paring knives for the main kitchen…"
                  value={values.message}
                  onChange={(ev) => patch("message")(ev.target.value)}
                  aria-invalid={fieldErrors.message ? "true" : undefined}
                  aria-describedby={fieldErrors.message ? "message-error" : undefined}
                  required
                />
                {fieldErrors.message && (
                  <p id="message-error" className="text-sm text-destructive">
                    {fieldErrors.message}
                  </p>
                )}
              </div>
            </>
          ) : null}

          {step === 1 ? (
            <div className="grid gap-3">
              <div className="grid gap-2">
                <Label htmlFor="estimated_knife_count">Approximate count (optional)</Label>
                <Input
                  id="estimated_knife_count"
                  name="estimated_knife_count"
                  inputMode="numeric"
                  className="h-11 text-base md:text-sm"
                  placeholder="e.g. 24"
                  value={values.estimated_knife_count === undefined ? "" : String(values.estimated_knife_count)}
                  onChange={(ev) => {
                    const v = ev.target.value.trim();
                    if (v === "") {
                      patch("estimated_knife_count")(undefined);
                      return;
                    }
                    const n = Number.parseInt(v, 10);
                    patch("estimated_knife_count")(Number.isNaN(n) ? undefined : n);
                  }}
                  aria-invalid={fieldErrors.estimated_knife_count ? "true" : undefined}
                  aria-describedby={fieldErrors.estimated_knife_count ? "estimated_knife_count-error" : undefined}
                />
                {fieldErrors.estimated_knife_count && (
                  <p id="estimated_knife_count-error" className="text-sm text-destructive">
                    {fieldErrors.estimated_knife_count}
                  </p>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full rounded-lg sm:w-auto"
                onClick={() => patch("estimated_knife_count")(undefined)}
              >
                Not sure yet — skip
              </Button>
              <p className="text-xs text-muted-foreground">
                Rough numbers are fine. If you skip, we’ll confirm details with you before we schedule.
              </p>
            </div>
          ) : null}

          {step === 2 ? (
            <>
              <div className="grid gap-2">
                <Label htmlFor="business_name">
                  Venue / business name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="business_name"
                  name="business_name"
                  autoComplete="organization"
                  className="h-11 text-base md:text-sm"
                  value={values.business_name}
                  onChange={(ev) => patch("business_name")(ev.target.value)}
                  aria-invalid={fieldErrors.business_name ? "true" : undefined}
                  aria-describedby={fieldErrors.business_name ? "business_name-error" : undefined}
                  required
                />
                {fieldErrors.business_name && (
                  <p id="business_name-error" className="text-sm text-destructive">
                    {fieldErrors.business_name}
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="address_line_1">
                  Address line 1 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="address_line_1"
                  name="address_line_1"
                  autoComplete="address-line1"
                  className="h-11 text-base md:text-sm"
                  value={values.address_line_1}
                  onChange={(ev) => patch("address_line_1")(ev.target.value)}
                  aria-invalid={fieldErrors.address_line_1 ? "true" : undefined}
                  aria-describedby={fieldErrors.address_line_1 ? "address_line_1-error" : undefined}
                  required
                />
                {fieldErrors.address_line_1 && (
                  <p id="address_line_1-error" className="text-sm text-destructive">
                    {fieldErrors.address_line_1}
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="address_line_2">Address line 2 (optional)</Label>
                <Input
                  id="address_line_2"
                  name="address_line_2"
                  autoComplete="address-line2"
                  className="h-11 text-base md:text-sm"
                  value={values.address_line_2 ?? ""}
                  onChange={(ev) => patch("address_line_2")(ev.target.value)}
                  aria-invalid={fieldErrors.address_line_2 ? "true" : undefined}
                  aria-describedby={fieldErrors.address_line_2 ? "address_line_2-error" : undefined}
                />
                {fieldErrors.address_line_2 && (
                  <p id="address_line_2-error" className="text-sm text-destructive">
                    {fieldErrors.address_line_2}
                  </p>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="city">
                    City <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="city"
                    name="city"
                    autoComplete="address-level2"
                    className="h-11 text-base md:text-sm"
                    value={values.city}
                    onChange={(ev) => patch("city")(ev.target.value)}
                    aria-invalid={fieldErrors.city ? "true" : undefined}
                    aria-describedby={fieldErrors.city ? "city-error" : undefined}
                    required
                  />
                  {fieldErrors.city && (
                    <p id="city-error" className="text-sm text-destructive">
                      {fieldErrors.city}
                    </p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="postcode">
                    Postcode <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="postcode"
                    name="postcode"
                    autoComplete="postal-code"
                    className="h-11 text-base md:text-sm"
                    value={values.postcode}
                    onChange={(ev) => {
                      setOutOfAreaAcknowledged(false);
                      setCoverageGateBlocked(false);
                      patch("postcode")(ev.target.value);
                    }}
                    aria-invalid={fieldErrors.postcode ? "true" : undefined}
                    aria-describedby={fieldErrors.postcode ? "postcode-error" : undefined}
                    required
                  />
                  {fieldErrors.postcode && (
                    <p id="postcode-error" className="text-sm text-destructive">
                      {fieldErrors.postcode}
                    </p>
                  )}
                </div>
              </div>
              {values.service_type === "collection" && apiOrigin() !== "" && coverageGateBlocked ? (
                <Alert className="border-amber-500/40 bg-amber-500/5 dark:border-amber-500/30 dark:bg-amber-950/20">
                  <AlertDescription className="text-sm text-foreground">
                    <p className="font-medium text-foreground">That postcode is outside our collection area</p>
                    <p className="mt-2 text-muted-foreground">
                      Check coverage or join the waitlist on our service areas page. You can still send an enquiry — we’ll
                      confirm what’s possible.
                    </p>
                    <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-row sm:flex-wrap">
                      <Button asChild variant="outline" className="h-10 touch-manipulation rounded-lg sm:w-auto">
                        <Link href={serviceAreasWaitlistHref}>Service areas &amp; waitlist</Link>
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-10 touch-manipulation rounded-lg sm:w-auto"
                        onClick={proceedAfterOutOfAreaAck}
                      >
                        Continue anyway
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              ) : null}
            </>
          ) : null}

          {step === 3 ? (
            <>
              <div className="grid gap-2">
                <Label htmlFor="preferred_date">
                  Preferred date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="preferred_date"
                  name="preferred_date"
                  type="date"
                  className="h-11 text-base tabular-nums md:text-sm"
                  value={values.preferred_date}
                  onChange={(ev) => patch("preferred_date")(ev.target.value)}
                  aria-invalid={fieldErrors.preferred_date ? "true" : undefined}
                  aria-describedby={fieldErrors.preferred_date ? "preferred_date-error" : undefined}
                  required
                />
                {fieldErrors.preferred_date && (
                  <p id="preferred_date-error" className="text-sm text-destructive">
                    {fieldErrors.preferred_date}
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="time_window_preference">
                  Preferred arrival window <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="time_window_preference"
                  name="time_window_preference"
                  className="h-11 text-base md:text-sm"
                  placeholder="e.g. after lunch service, 14:00–17:00"
                  value={values.time_window_preference}
                  onChange={(ev) => patch("time_window_preference")(ev.target.value)}
                  aria-invalid={fieldErrors.time_window_preference ? "true" : undefined}
                  aria-describedby={fieldErrors.time_window_preference ? "time_window_preference-error" : undefined}
                  required
                />
                {fieldErrors.time_window_preference && (
                  <p id="time_window_preference-error" className="text-sm text-destructive">
                    {fieldErrors.time_window_preference}
                  </p>
                )}
              </div>
            </>
          ) : null}

          {step === 4 ? (
            <div className="grid gap-3" role="radiogroup" aria-label="Programme preference">
              {(
                [
                  {
                    value: "one_off" as const,
                    title: "One-off visit",
                    body: "A single collection and return when you need it.",
                  },
                  {
                    value: "subscription" as const,
                    title: "Ongoing programme",
                    body: "Regular collections and predictable sharpening — we’ll explain options.",
                  },
                  {
                    value: "unsure" as const,
                    title: "Not sure yet",
                    body: "We’ll recommend the best fit once we know your volumes.",
                  },
                ] as const
              ).map((opt) => {
                const selected = values.programme_interest === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => {
                      patch("programme_interest")(opt.value);
                      if (opt.value !== "subscription") {
                        patch("subscription_plan_id")(undefined);
                        setSelectedPlanLabel(null);
                      }
                      setFieldErrors((prev) => ({ ...prev, programme_interest: undefined }));
                    }}
                    className={cn(
                      "flex min-h-[4.5rem] w-full touch-manipulation flex-col rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:bg-muted/40",
                      selected ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30",
                    )}
                  >
                    <span className="font-medium">{opt.title}</span>
                    <span className="mt-1 text-sm text-muted-foreground">{opt.body}</span>
                  </button>
                );
              })}
              {fieldErrors.programme_interest && (
                <p className="text-sm text-destructive">{fieldErrors.programme_interest}</p>
              )}
              {values.programme_interest === "subscription" ? (
                <PublicSubscriptionPlanPicker
                  selectedPlanId={values.subscription_plan_id}
                  onSelect={(planId, planName) => {
                    patch("subscription_plan_id")(planId);
                    setSelectedPlanLabel(planName ?? null);
                  }}
                  className="pt-2"
                />
              ) : null}
            </div>
          ) : null}

          {step === 5 ? (
            <>
              <div className="rounded-xl border bg-muted/20 p-4 text-sm">
                <p className="font-medium text-foreground">Summary</p>
                <dl className="mt-3 space-y-2 text-muted-foreground">
                  <div>
                    <dt className="text-xs uppercase tracking-wide">Service</dt>
                    <dd className="text-foreground">
                      {values.service_type === "onsite" ? "On-site sharpening" : "Pickup & return"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide">Items</dt>
                    <dd className="text-foreground">
                      {values.estimated_knife_count != null ? `~${values.estimated_knife_count} items` : "Not specified yet"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide">Address</dt>
                    <dd className="text-foreground">
                      {values.business_name}
                      <br />
                      {[values.address_line_1, values.address_line_2, values.city, values.postcode]
                        .filter(Boolean)
                        .join(", ")}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide">When</dt>
                    <dd className="text-foreground">
                      {values.preferred_date} · {values.time_window_preference}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide">Programme</dt>
                    <dd className="text-foreground">
                      {programmeLabel}
                      {selectedPlanLabel ? ` — ${selectedPlanLabel}` : null}
                    </dd>
                  </div>
                </dl>
              </div>

              {publicBooking.offer_subscription_checkout_in_wizard &&
              values.programme_interest === "subscription" ? (
                <Alert className="border-primary/25 bg-primary/5">
                  <AlertDescription className="text-sm leading-relaxed text-muted-foreground">
                    <span className="font-medium text-foreground">Pay for your programme online</span> — subscribe on Stripe
                    after you submit this enquiry, or create an account first with the same email below.
                    <div className="mt-3 flex flex-wrap gap-2">
                      {subscribeNowHref ? (
                        <Button asChild type="button" variant="default" size="sm" className="rounded-lg">
                          <Link
                            href={subscribeNowHref}
                            onClick={() =>
                              trackBookingWizard("booking_wizard_subscribe_click", {
                                plan_id: values.subscription_plan_id ?? "",
                                context: "review",
                              })
                            }
                          >
                            Subscribe now
                          </Link>
                        </Button>
                      ) : null}
                      <Button asChild type="button" variant="secondary" size="sm" className="rounded-lg">
                        <Link href={subscribeRegisterHref}>Create account</Link>
                      </Button>
                      <Button asChild type="button" variant="outline" size="sm" className="rounded-lg">
                        <Link href={subscribeLoginHref}>Already registered</Link>
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              ) : null}

              <div className="grid gap-2">
                <Label htmlFor="contact_name">
                  Contact name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="contact_name"
                  name="contact_name"
                  autoComplete="name"
                  className="h-11 text-base md:text-sm"
                  value={values.contact_name}
                  onChange={(ev) => patch("contact_name")(ev.target.value)}
                  aria-invalid={fieldErrors.contact_name ? "true" : undefined}
                  aria-describedby={fieldErrors.contact_name ? "contact_name-error" : undefined}
                  required
                />
                {fieldErrors.contact_name && (
                  <p id="contact_name-error" className="text-sm text-destructive">
                    {fieldErrors.contact_name}
                  </p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="email">
                    Work email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    className="h-11 text-base md:text-sm"
                    value={values.email}
                    onChange={(ev) => patch("email")(ev.target.value)}
                    aria-invalid={fieldErrors.email ? "true" : undefined}
                    aria-describedby={fieldErrors.email ? "email-error" : undefined}
                    required
                  />
                  {fieldErrors.email && (
                    <p id="email-error" className="text-sm text-destructive">
                      {fieldErrors.email}
                    </p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">
                    Phone <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    className="h-11 text-base md:text-sm"
                    value={values.phone}
                    onChange={(ev) => patch("phone")(ev.target.value)}
                    aria-invalid={fieldErrors.phone ? "true" : undefined}
                    aria-describedby={fieldErrors.phone ? "phone-error" : undefined}
                    required
                  />
                  {fieldErrors.phone && (
                    <p id="phone-error" className="text-sm text-destructive">
                      {fieldErrors.phone}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-2">
                <label className="flex min-h-11 touch-manipulation cursor-pointer items-start gap-3 text-sm leading-relaxed">
                  <input
                    type="checkbox"
                    checked={values.terms_accepted}
                    onChange={(ev) => patch("terms_accepted")(ev.target.checked)}
                    className="mt-0.5 h-5 w-5 shrink-0 rounded border-input"
                    aria-invalid={fieldErrors.terms_accepted ? "true" : undefined}
                    aria-describedby={fieldErrors.terms_accepted ? "terms_accepted-error" : undefined}
                  />
                  <span>
                    I agree that WeSharp may contact me about this enquiry. Submitting this form does not guarantee a booking
                    until our team confirms it.
                  </span>
                </label>
                {fieldErrors.terms_accepted && (
                  <p id="terms_accepted-error" className="text-sm text-destructive">
                    {fieldErrors.terms_accepted}
                  </p>
                )}
              </div>
            </>
          ) : null}
        </div>

        <div
          className="sticky bottom-0 z-10 -mx-4 mt-8 border-t border-border/70 bg-background/95 px-4 py-4 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 max-sm:pb-[max(1rem,env(safe-area-inset-bottom))] sm:static sm:z-auto sm:mx-0 sm:mt-6 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none"
        >
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:flex-wrap sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            className="h-11 min-h-11 touch-manipulation rounded-lg"
            disabled={step === 0 || status === "submitting"}
            onClick={goBack}
          >
            <ChevronLeft className="mr-1 h-4 w-4" aria-hidden />
            Back
          </Button>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row sm:gap-3">
            <Button type="button" variant="outline" className="h-11 min-h-11 touch-manipulation rounded-lg" asChild>
              <Link href="/">Cancel</Link>
            </Button>
            {!isReviewStep ? (
              <Button
                type="submit"
                className="h-11 min-h-11 touch-manipulation rounded-lg"
                disabled={apiOrigin() === "" || status === "submitting" || coverageCheckLoading || continueBlockedByCoverage}
              >
                {coverageCheckLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                    Checking coverage…
                  </>
                ) : (
                  "Continue"
                )}
              </Button>
            ) : (
              <Button
                type="submit"
                className="h-11 min-h-11 touch-manipulation rounded-lg"
                disabled={status === "submitting" || apiOrigin() === ""}
              >
                {status === "submitting" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                    Sending…
                  </>
                ) : (
                  "Submit booking enquiry"
                )}
              </Button>
            )}
          </div>
        </div>
        </div>

        <p className="text-xs text-muted-foreground">
          For abuse protection, enquiries are limited to about ten submissions per minute per IP. If you need an urgent slot,
          mention it in your description on step 1.
        </p>
      </form>
      </div>
    </div>
  );
}
