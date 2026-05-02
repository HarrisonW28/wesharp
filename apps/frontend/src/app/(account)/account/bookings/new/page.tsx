"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

import { LocationsResponseSchema, SettingsResponseSchema } from "@/lib/api/account-schema";
import { useAccountApi } from "@/lib/api/use-account-api";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const STEPS = 6;

const ACCOUNT_BOOKING_STEPS = [
  "Location & service",
  "Knife count",
  "Collection date",
  "Time window",
  "Notes",
  "Review",
] as const;

function formatTimeLabel(iso: string): string {
  if (iso.length >= 5) {
    return iso.slice(0, 5);
  }
  return iso;
}

export default function NewAccountBookingPage() {
  const api = useAccountApi();
  const qc = useQueryClient();

  const [step, setStep] = useState(1);
  const [locationId, setLocationId] = useState("");
  const [estimatedKnives, setEstimatedKnives] = useState("");
  const [requestedDate, setRequestedDate] = useState("");
  const [timeStart, setTimeStart] = useState("09:00");
  const [timeEnd, setTimeEnd] = useState("17:00");
  const [customerNotes, setCustomerNotes] = useState("");
  const [serviceType, setServiceType] = useState<"collection" | "onsite">("collection");
  const [damageOk, setDamageOk] = useState(false);
  const [termsOk, setTermsOk] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [createdSummary, setCreatedSummary] = useState<{
    date: string;
    window: string;
    status: string;
  } | null>(null);

  const settingsQuery = useQuery({
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

  const locationsQuery = useQuery({
    queryKey: ["account-locations-pick"],
    queryFn: async () => {
      const res = await api.json<unknown>("/api/account/locations");
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = LocationsResponseSchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Unexpected locations payload.");
      }
      return parsed.data.data.items;
    },
  });

  useEffect(() => {
    const items = locationsQuery.data;
    if (!items?.length) {
      return;
    }
    if (items.length === 1) {
      setLocationId(items[0].id);
    }
  }, [locationsQuery.data]);

  const selectedLocation = useMemo(
    () => locationsQuery.data?.find((l) => l.id === locationId) ?? null,
    [locationsQuery.data, locationId],
  );

  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await api.json<{ data?: Record<string, unknown> }>("/api/account/bookings", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error(res.message);
      }
      return res.data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["account-bookings"] }),
  });

  const loadingLocs = locationsQuery.status === "pending";
  const locError = locationsQuery.error;
  const company = settingsQuery.data?.company;

  const validateStep = (s: number): string | null => {
    if (s === 1) {
      if (!locationId) {
        return "Choose where we should collect your knives.";
      }
      return null;
    }
    if (s === 2) {
      const t = estimatedKnives.trim();
      if (t === "") {
        return null;
      }
      const n = Number.parseInt(t, 10);
      if (!Number.isFinite(n) || n < 1) {
        return "Estimated knife count must be a positive number, or leave the field blank.";
      }
      return null;
    }
    if (s === 3) {
      if (!requestedDate) {
        return "Choose the day you would like us to collect.";
      }
      return null;
    }
    if (s === 4) {
      if (!timeStart || !timeEnd) {
        return "Enter both the start and end of your preferred arrival window.";
      }
      if (timeStart >= timeEnd) {
        return "The end time must be after the start time.";
      }
      return null;
    }
    if (s === 5) {
      return null;
    }
    if (s === 6) {
      if (!damageOk || !termsOk) {
        return "Please confirm the damage discussion and accept the service terms to continue.";
      }
      return null;
    }
    return null;
  };

  const goNext = () => {
    const err = validateStep(step);
    setStepError(err);
    if (err) {
      return;
    }
    if (step < STEPS) {
      setStep((x) => x + 1);
    }
  };

  const goBack = () => {
    setStepError(null);
    if (step > 1) {
      setStep((x) => x - 1);
    }
  };

  const submitBooking = () => {
    const err = validateStep(6);
    setStepError(err);
    if (err) {
      return;
    }

    const body: Record<string, unknown> = {
      company_location_id: locationId,
      requested_collection_date: requestedDate,
      time_window_start: timeStart,
      time_window_end: timeEnd,
      service_type: serviceType,
      customer_notes: customerNotes.trim() || undefined,
      damage_acknowledged: true,
      terms_accepted: true,
    };

    const est = estimatedKnives.trim();
    if (est !== "") {
      body.estimated_knife_count = Number.parseInt(est, 10);
    }

    createMutation.reset();
    void createMutation
      .mutateAsync(body)
      .then((envelope) => {
        const row = envelope?.data as
          | { id?: string; requested_collection_date?: string; requested_time_window_start?: string; requested_time_window_end?: string; status?: string }
          | undefined;
        const id = row?.id ?? null;
        const date = row?.requested_collection_date ?? requestedDate;
        const ws = row?.requested_time_window_start ?? timeStart;
        const we = row?.requested_time_window_end ?? timeEnd;
        const window = `${formatTimeLabel(String(ws))}–${formatTimeLabel(String(we))}`;
        if (typeof id === "string" && id !== "") {
          setCreatedId(id);
          setCreatedSummary({
            date,
            window,
            status: row?.status ?? "requested",
          });
          void qc.invalidateQueries({ queryKey: ["account-dashboard"] });
        }
      })
      .catch(() => undefined);
  };

  if (createdId && createdSummary) {
    return (
      <div className="mx-auto max-w-2xl space-y-8">
        <Breadcrumbs
          homeHref="/account/dashboard"
          items={[
            { label: "My bookings", href: "/account/bookings" },
            { label: "Book a collection" },
          ]}
        />
        <Card className="border-primary/25 bg-primary/5">
          <CardHeader>
            <div className="flex items-center gap-2 text-primary">
              <CheckCircle2 className="h-6 w-6" aria-hidden />
              <CardTitle className="text-xl">Request received</CardTitle>
            </div>
            <CardDescription>
              Your booking is <strong className="text-foreground">{createdSummary.status}</strong>. We&apos;ll confirm your
              collection window and contact you if anything needs adjusting.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="rounded-lg border bg-background p-4">
              <p className="font-medium text-foreground">What happens next</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
                <li>We&apos;ll review your preferred date and time window ({createdSummary.window}).</li>
                <li>You&apos;ll see updates on this booking in your account as soon as we confirm routing.</li>
                <li>Need to change something? Open the booking from your list and use the details page.</li>
              </ul>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button className="rounded-lg" asChild>
                <Link href={`/account/bookings/${createdId}`}>View booking</Link>
              </Button>
              <Button variant="outline" className="rounded-lg" asChild>
                <Link href="/account/bookings">All bookings</Link>
              </Button>
              <Button variant="ghost" className="rounded-lg" asChild>
                <Link href="/account/dashboard">Dashboard</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <Breadcrumbs
        homeHref="/account/dashboard"
        items={[
          { label: "My bookings", href: "/account/bookings" },
          { label: "Book a collection" },
        ]}
      />
      <PageHeader
        title="Book a collection"
        description="A few quick steps — we’ll confirm your window before we’re on the way."
      />

      {loadingLocs || settingsQuery.isLoading ? (
        <div className="flex justify-center py-16 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
        </div>
      ) : locError ? (
        <Alert variant="destructive">
          <AlertDescription>{(locError as Error).message}</AlertDescription>
        </Alert>
      ) : locationsQuery.data?.length === 0 ? (
        <Alert>
          <AlertDescription className="space-y-2">
            <p>You need a pickup address before you can book.</p>
            <Button className="rounded-lg" asChild>
              <Link href="/account/locations">Add a location</Link>
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <nav aria-label="Booking progress" className="space-y-3">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">Booking progress</p>
              <p className="text-xs text-muted-foreground tabular-nums">
                Step {step}/{STEPS}
              </p>
            </div>
            <div className="flex items-center gap-1.5" aria-hidden>
              {Array.from({ length: STEPS }, (_, i) => (
                <span
                  key={ACCOUNT_BOOKING_STEPS[i]}
                  className={
                    i + 1 === step
                      ? "h-1.5 flex-1 rounded-full bg-primary"
                      : i + 1 < step
                        ? "h-1.5 flex-1 rounded-full bg-primary/40"
                        : "h-1.5 flex-1 rounded-full bg-muted"
                  }
                />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-2 sm:grid-cols-3 md:grid-cols-6">
              {ACCOUNT_BOOKING_STEPS.map((label, i) => (
                <span
                  key={label}
                  className={cn(
                    "text-center text-[11px] leading-tight text-muted-foreground sm:text-xs",
                    i + 1 === step && "font-semibold text-foreground",
                  )}
                >
                  {label}
                </span>
              ))}
            </div>
          </nav>

          <Card>
            <CardHeader>
              {step === 1 ? (
                <>
                  <CardTitle className="text-lg">Where should we collect?</CardTitle>
                  <CardDescription>
                    {company ? (
                      <>
                        Business: <span className="font-medium text-foreground">{company.name}</span>
                        {company.city ? ` · ${company.city}` : null}
                      </>
                    ) : (
                      "Choose the site for this collection."
                    )}
                  </CardDescription>
                </>
              ) : null}
              {step === 2 ? (
                <>
                  <CardTitle className="text-lg">How many knives are we collecting?</CardTitle>
                  <CardDescription>Optional — a rough count helps us plan the visit.</CardDescription>
                </>
              ) : null}
              {step === 3 ? (
                <>
                  <CardTitle className="text-lg">When would you like us to collect?</CardTitle>
                  <CardDescription>Pick your preferred day. We&apos;ll confirm the exact slot.</CardDescription>
                </>
              ) : null}
              {step === 4 ? (
                <>
                  <CardTitle className="text-lg">What time window works?</CardTitle>
                  <CardDescription>We&apos;ll aim for this arrival window once your booking is confirmed.</CardDescription>
                </>
              ) : null}
              {step === 5 ? (
                <>
                  <CardTitle className="text-lg">Anything we should know?</CardTitle>
                  <CardDescription>Access codes, parking, or other notes for our driver.</CardDescription>
                </>
              ) : null}
              {step === 6 ? (
                <>
                  <CardTitle className="text-lg">Review your request</CardTitle>
                  <CardDescription>Check the details, then submit. You can still cancel from your bookings list if plans change.</CardDescription>
                </>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-4">
              {step === 1 ? (
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="location_id">Pickup location</Label>
                    <select
                      id="location_id"
                      required
                      value={locationId}
                      onChange={(e) => setLocationId(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="">Select a location…</option>
                      {locationsQuery.data?.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {[loc.label, loc.city].filter(Boolean).join(" · ")}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="service_type">Service</Label>
                    <select
                      id="service_type"
                      value={serviceType}
                      onChange={(e) => void setServiceType(e.target.value === "onsite" ? "onsite" : "collection")}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="collection">Door collection &amp; return</option>
                      <option value="onsite">On-site sharpening</option>
                    </select>
                    <p className="text-xs text-muted-foreground">
                      On-site visits may need a quick call from our team before we confirm.
                    </p>
                  </div>
                </div>
              ) : null}

              {step === 2 ? (
                <div className="grid gap-2">
                  <Label htmlFor="estimated_knife_count">Estimated number of knives</Label>
                  <Input
                    id="estimated_knife_count"
                    inputMode="numeric"
                    placeholder="e.g. 24"
                    value={estimatedKnives}
                    onChange={(e) => setEstimatedKnives(e.target.value)}
                  />
                </div>
              ) : null}

              {step === 3 ? (
                <div className="grid gap-2">
                  <Label htmlFor="requested_date">Preferred collection date</Label>
                  <Input
                    id="requested_date"
                    type="date"
                    value={requestedDate}
                    onChange={(e) => setRequestedDate(e.target.value)}
                    min={new Date().toISOString().slice(0, 10)}
                  />
                </div>
              ) : null}

              {step === 4 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="time_window_start">Window starts</Label>
                    <Input
                      id="time_window_start"
                      type="time"
                      value={timeStart}
                      onChange={(e) => setTimeStart(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="time_window_end">Window ends</Label>
                    <Input
                      id="time_window_end"
                      type="time"
                      value={timeEnd}
                      onChange={(e) => setTimeEnd(e.target.value)}
                    />
                  </div>
                </div>
              ) : null}

              {step === 5 ? (
                <div className="grid gap-2">
                  <Label htmlFor="customer_notes">Notes for our team</Label>
                  <Textarea
                    id="customer_notes"
                    rows={4}
                    placeholder="Service entrance, contact on arrival, parking…"
                    value={customerNotes}
                    onChange={(e) => setCustomerNotes(e.target.value)}
                  />
                </div>
              ) : null}

              {step === 6 ? (
                <div className="space-y-4 text-sm">
                  <dl className="grid gap-3 rounded-lg border bg-muted/30 p-4">
                    <div>
                      <dt className="text-muted-foreground">Location</dt>
                      <dd className="font-medium text-foreground">
                        {selectedLocation
                          ? [selectedLocation.label, selectedLocation.city].filter(Boolean).join(" · ")
                          : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Service</dt>
                      <dd className="capitalize">{serviceType.replace("_", " ")}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Estimated knives</dt>
                      <dd>{estimatedKnives.trim() === "" ? "Not specified" : estimatedKnives}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Requested date</dt>
                      <dd className="font-medium">{requestedDate || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Requested time window</dt>
                      <dd className="font-medium">
                        {timeStart && timeEnd ? `${timeStart} – ${timeEnd}` : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Notes</dt>
                      <dd className="whitespace-pre-wrap">{customerNotes.trim() === "" ? "—" : customerNotes}</dd>
                    </div>
                  </dl>

                  <label className="flex items-start gap-3 text-sm leading-relaxed">
                    <input
                      type="checkbox"
                      checked={damageOk}
                      onChange={(e) => setDamageOk(e.target.checked)}
                      className="mt-1 h-4 w-4 shrink-0 rounded border-input"
                    />
                    <span>I understand blade condition will be checked on collection and agree that damage risks are discussed with WeSharp before sharpening.</span>
                  </label>
                  <label className="flex items-start gap-3 text-sm leading-relaxed">
                    <input
                      type="checkbox"
                      checked={termsOk}
                      onChange={(e) => setTermsOk(e.target.checked)}
                      className="mt-1 h-4 w-4 shrink-0 rounded border-input"
                    />
                    <span>I accept WeSharp&apos;s service terms for this booking.</span>
                  </label>
                </div>
              ) : null}

              {stepError ? (
                <Alert variant="destructive">
                  <AlertDescription>{stepError}</AlertDescription>
                </Alert>
              ) : null}

              {createMutation.isError ? (
                <Alert variant="destructive">
                  <AlertDescription>
                    {(createMutation.error as Error).message ?? "Unable to submit your booking."}
                  </AlertDescription>
                </Alert>
              ) : null}

              <div className="flex flex-wrap items-center gap-3 pt-2">
                {step > 1 ? (
                  <Button type="button" variant="outline" className="rounded-lg gap-1" onClick={goBack}>
                    <ChevronLeft className="h-4 w-4" aria-hidden />
                    Back
                  </Button>
                ) : (
                  <Button type="button" variant="ghost" className="rounded-lg" asChild>
                    <Link href="/account/bookings">Cancel</Link>
                  </Button>
                )}

                {step < STEPS ? (
                  <Button type="button" className="rounded-lg gap-1" onClick={goNext}>
                    Continue
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    className="rounded-lg"
                    disabled={createMutation.isPending}
                    onClick={() => void submitBooking()}
                  >
                    {createMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      "Submit booking"
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
