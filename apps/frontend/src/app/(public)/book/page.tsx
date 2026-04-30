"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { apiOrigin } from "@/lib/env";
import {
  PUBLIC_BOOKING_ENQUIRY_SCHEMA,
  type PublicBookingFormValues,
} from "@/lib/public-booking-schema";

type FieldErrors = Partial<Record<keyof PublicBookingFormValues | "root", string>>;

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
};

export default function BookPage() {
  const [values, setValues] = useState<PublicBookingFormValues>(initialValues);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [globalMessage, setGlobalMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  const endpoint = useMemo(() => `${apiOrigin()}/api/public/booking-enquiries`, []);

  const patch =
    <K extends keyof PublicBookingFormValues>(key: K) =>
    (next: PublicBookingFormValues[K]) => {
      setValues((prev: PublicBookingFormValues) => ({ ...prev, [key]: next }));
      setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
      setGlobalMessage(null);
    };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setGlobalMessage(null);

    const parsed = PUBLIC_BOOKING_ENQUIRY_SCHEMA.safeParse(values);
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      const next: FieldErrors = {};
      (Object.keys(flat) as (keyof typeof flat)[]).forEach((k) => {
        const msg = flat[k];
        if (msg?.[0]) {
          next[k as keyof PublicBookingFormValues] = msg[0];
        }
      });
      setFieldErrors(next);
      setStatus("error");
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
        const nextErrors: FieldErrors = {};
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
    } catch {
      setGlobalMessage(
        apiOrigin() === ""
          ? "Check NEXT_PUBLIC_API_ORIGIN is set so this form can reach the API."
          : "Network error — check your connection and try again.",
      );
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="mx-auto max-w-xl space-y-6 px-4 py-16 md:py-24">
        <div className="space-y-2">
          <p className="text-sm font-medium text-primary">Enquiry received</p>
          <h1 className="text-balance text-3xl font-semibold tracking-tight">We’ll be in touch soon</h1>
          <p className="text-muted-foreground">
            Our team will review your request and contact you using the email and phone you provided to confirm timing and
            any access details.
          </p>
        </div>
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          <li>Watch your inbox and phone for a confirmation from WeSharp.</li>
          <li>Have knives gathered in a safe, accessible place ready for the technician.</li>
          <li>If plans change, reply to our message and we will adjust the booking.</li>
        </ul>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link href="/">Back home</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-10 px-4 py-16 md:py-20">
      <div className="space-y-3">
        <p className="text-sm font-medium text-primary">Public booking enquiry</p>
        <h1 className="text-balance text-3xl font-semibold tracking-tight">Request a collection or on-site visit</h1>
        <p className="text-muted-foreground">
          Commercial kitchens in our service area can request a pickup without signing in. Your details create a lead in
          SharpFlow and a requested booking for operations to qualify and schedule.
        </p>
      </div>

      {apiOrigin() === "" && (
        <Alert variant="destructive">
          <AlertDescription>
            <code className="font-mono">NEXT_PUBLIC_API_ORIGIN</code> is not configured — set it to your Laravel API base
            (for example <code className="font-mono">http://localhost:8000</code>) so this form can submit.
          </AlertDescription>
        </Alert>
      )}

      <form className="space-y-6" onSubmit={(e) => void onSubmit(e)} noValidate>
        {globalMessage && (
          <Alert variant="destructive">
            <AlertDescription>{globalMessage}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="business_name">Venue / business name</Label>
            <Input
              id="business_name"
              name="business_name"
              autoComplete="organization"
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
            <Label htmlFor="contact_name">Contact name</Label>
            <Input
              id="contact_name"
              name="contact_name"
              autoComplete="name"
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
              <Label htmlFor="email">Work email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
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
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
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
            <Label htmlFor="address_line_1">Address line 1</Label>
            <Input
              id="address_line_1"
              name="address_line_1"
              autoComplete="address-line1"
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
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                name="city"
                autoComplete="address-level2"
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
              <Label htmlFor="postcode">Postcode</Label>
              <Input
                id="postcode"
                name="postcode"
                autoComplete="postal-code"
                value={values.postcode}
                onChange={(ev) => patch("postcode")(ev.target.value)}
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="estimated_knife_count">Estimated knife count (optional)</Label>
              <Input
                id="estimated_knife_count"
                name="estimated_knife_count"
                inputMode="numeric"
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
            <div className="grid gap-2">
              <Label htmlFor="preferred_date">Preferred date</Label>
              <Input
                id="preferred_date"
                name="preferred_date"
                type="date"
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
          </div>

          <div className="grid gap-2">
            <Label htmlFor="service_type">Service type</Label>
            <select
              id="service_type"
              name="service_type"
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60"
              value={values.service_type}
              onChange={(ev) =>
                patch("service_type")(ev.target.value === "onsite" ? "onsite" : "collection")
              }
              aria-invalid={fieldErrors.service_type ? "true" : undefined}
              aria-describedby={fieldErrors.service_type ? "service_type-error" : undefined}
            >
              <option value="collection">Pickup &amp; return</option>
              <option value="onsite">On-site sharpening</option>
            </select>
            {fieldErrors.service_type && (
              <p id="service_type-error" className="text-sm text-destructive">
                {fieldErrors.service_type}
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="time_window_preference">Preferred arrival window</Label>
            <Input
              id="time_window_preference"
              name="time_window_preference"
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

          <div className="grid gap-2">
            <Label htmlFor="message">What needs sharpening?</Label>
            <Textarea
              id="message"
              name="message"
              rows={5}
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

          <div className="grid gap-2">
            <label className="flex items-start gap-3 text-sm leading-relaxed">
              <input
                type="checkbox"
                checked={values.terms_accepted}
                onChange={(ev) => patch("terms_accepted")(ev.target.checked)}
                className="mt-1 h-4 w-4 shrink-0 rounded border-input"
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
        </div>

        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={status === "submitting" || apiOrigin() === ""}>
            {status === "submitting" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                Sending…
              </>
            ) : (
              "Submit enquiry"
            )}
          </Button>
          <Button type="button" variant="ghost" asChild>
            <Link href="/">Cancel</Link>
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          For abuse protection, enquiries are limited to about ten submissions per minute per IP. If you need an urgent
          slot, mention it in the message field.
        </p>
      </form>
    </div>
  );
}
