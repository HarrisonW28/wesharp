"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";

import { LocationsResponseSchema } from "@/lib/api/account-schema";
import { useAccountApi } from "@/lib/api/use-account-api";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function NewAccountBookingPage() {
  const api = useAccountApi();
  const router = useRouter();
  const qc = useQueryClient();

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

  const [serviceType, setServiceType] = useState<"collection" | "onsite">("collection");

  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await api.json<{ data?: { id?: string } }>("/api/account/bookings", {
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

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <Breadcrumbs
        homeHref="/account/dashboard"
        items={[
          { label: "Bookings", href: "/account/bookings" },
          { label: "New" },
        ]}
      />
      <PageHeader
        title="Request a knife collection"
        description="Pickup windows stay indicative until routed to a courier — you will see status updates on the booking timeline."
      />

      {loadingLocs ? (
        <div className="flex justify-center py-16 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
        </div>
      ) : locError ? (
        <Alert variant="destructive">
          <AlertDescription>{(locError as Error).message}</AlertDescription>
        </Alert>
      ) : locationsQuery.data?.length === 0 ? (
        <Alert>
          <AlertDescription>
            Add a venue address first{" "}
            <Link href="/account/locations" className="text-primary underline">
              Locations
            </Link>
          </AlertDescription>
        </Alert>
      ) : (
        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const body: Record<string, unknown> = {
              location_id: String(fd.get("location_id") ?? ""),
              requested_date: String(fd.get("requested_date") ?? ""),
              time_window_start: String(fd.get("time_window_start") ?? "").trim() || undefined,
              time_window_end: String(fd.get("time_window_end") ?? "").trim() || undefined,
              service_type: serviceType,
              customer_notes: String(fd.get("customer_notes") ?? "").trim() || undefined,
              damage_acknowledged: fd.get("damage_acknowledged") === "on",
              terms_accepted: fd.get("terms_accepted") === "on",
            };
            const est = String(fd.get("estimated_knife_count") ?? "").trim();
            if (est !== "") {
              body.estimated_knife_count = Number.parseInt(est, 10);
            }

            createMutation.reset();
            void createMutation.mutateAsync(body).then((envelope) => {
              const id = envelope?.data?.id ?? null;
              if (typeof id === "string" && id !== "") {
                router.push(`/account/bookings/${id}`);
              }
            }).catch(() => undefined);
          }}
        >
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="location_id">Pickup location</Label>
              <select
                id="location_id"
                name="location_id"
                required
                className="rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                defaultValue={locationsQuery.data?.[0]?.id ?? ""}
              >
                {locationsQuery.data?.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {[loc.label, loc.city].filter(Boolean).join(" · ")}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="requested_date">Preferred pickup day</Label>
              <Input id="requested_date" type="date" name="requested_date" required />
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="grid gap-2">
                <Label htmlFor="time_window_start">Window start</Label>
                <Input id="time_window_start" type="time" name="time_window_start" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="time_window_end">Window end</Label>
                <Input id="time_window_end" type="time" name="time_window_end" />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="service_type">Service</Label>
              <select
                id="service_type"
                value={serviceType}
                onChange={(event) =>
                  void setServiceType(event.target.value === "onsite" ? "onsite" : "collection")
                }
                className="rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="collection">Courier collection</option>
                <option value="onsite">On-site sharpening</option>
              </select>
              <p className="text-xs text-muted-foreground">
                On-site collections need a short coordination call — we may contact you before confirming.
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="estimated_knife_count">Estimated knives</Label>
              <Input id="estimated_knife_count" name="estimated_knife_count" inputMode="numeric" placeholder="optional" />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="customer_notes">Notes</Label>
              <Textarea id="customer_notes" name="customer_notes" rows={4} placeholder="Access instructions…" />
            </div>

            <label className="flex items-start gap-2">
              <input type="checkbox" name="damage_acknowledged" required className="mt-1 h-4 w-4 shrink-0" />
              <span className="text-sm leading-relaxed">
                I confirm blade damage risks are discussed with WeSharp before sharpening.
              </span>
            </label>

            <label className="flex items-start gap-2">
              <input type="checkbox" name="terms_accepted" required className="mt-1 h-4 w-4 shrink-0" />
              <span className="text-sm leading-relaxed">I accept WeSharp service terms for this stop.</span>
            </label>
          </div>

          {createMutation.isError ? (
            <Alert variant="destructive">
              <AlertDescription>
                {(createMutation.error as Error).message ?? "Unable to create booking."}
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Submit booking
            </Button>
            <Button type="button" variant="ghost" asChild>
              <Link href="/account/bookings">Cancel</Link>
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
