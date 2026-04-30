"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { BookingRow } from "@/lib/api/admin-bookings-schema";
import { BOOKING_STATUS_VALUES, PaginatedBookingsResponseSchema } from "@/lib/api/admin-bookings-schema";
import { useAdminApi } from "@/lib/api/use-admin-api";
import { bookingStatusLabel } from "@/lib/helpers/status-helpers";
import { formatGbpFromPence } from "@/lib/format/money";

import { CompanyLookup, ContactLookup, LocationLookup } from "@/components/admin/lookups/AsyncEntityLookup";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/status/StatusBadge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/tables/DataTable";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { adminCreateBookingFormSchema } from "@/lib/forms/admin-create-booking-form-schema";

const SERVICE_TYPES = ["collection", "onsite"] as const;

export default function AdminBookingsPage() {
  const admin = useAdminApi();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const p = new URLSearchParams(searchParams.toString());
    let changed = false;
    const ensure = (key: string, value: string) => {
      if (!p.has(key)) {
        p.set(key, value);
        changed = true;
      }
    };
    ensure("page", "1");
    ensure("per_page", "15");
    ensure("sort", "requested_date");
    ensure("direction", "desc");
    if (changed) {
      router.replace(`${pathname}?${p.toString()}`, { scroll: false });
    }
  }, [pathname, router, searchParams]);

  const listKey = searchParams.toString();

  const listQuery = useQuery({
    queryKey: ["admin-bookings", listKey],
    queryFn: async () => {
      const qs = listKey ? `?${listKey}` : "";
      const res = await admin.json<unknown>(`/api/admin/bookings${qs}`);
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = PaginatedBookingsResponseSchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Unexpected bookings payload.");
      }
      return parsed.data;
    },
  });

  const form = useForm<z.infer<typeof adminCreateBookingFormSchema>>({
    resolver: zodResolver(adminCreateBookingFormSchema),
    defaultValues: {
      company_id: "",
      location_id: "",
      contact_id: "",
      requested_date: "",
      service_type: "collection",
      internal_notes: "",
      price_estimate_pence: undefined,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: z.infer<typeof adminCreateBookingFormSchema>) => {
      const res = await admin.json(`/api/admin/bookings`, {
        method: "POST",
        body: JSON.stringify({
          company_id: payload.company_id,
          location_id: payload.location_id,
          contact_id:
            payload.contact_id !== undefined &&
            payload.contact_id !== "" &&
            payload.contact_id !== "__none"
              ? payload.contact_id
              : null,
          requested_date: payload.requested_date,
          service_type: payload.service_type,
          internal_notes: payload.internal_notes || undefined,
          price_estimate:
            payload.price_estimate_pence === undefined || payload.price_estimate_pence === null
              ? undefined
              : payload.price_estimate_pence,
        }),
      });

      if (!res.ok) {
        throw new Error(res.message);
      }

      return res.data as { data?: { id?: string } };
    },
    onSuccess: async (payload) => {
      toast.success("Booking created.");
      await queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      const id =
        typeof payload === "object" && payload?.data?.id !== undefined ? String(payload.data.id) : null;
      form.reset({
        company_id: "",
        location_id: "",
        contact_id: "",
        requested_date: "",
        service_type: "collection",
        internal_notes: "",
        price_estimate_pence: undefined,
      });
      setCreateOpen(false);
      if (id) {
        router.push(`/admin/bookings/${id}`);
      }
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Create failed.");
    },
  });

  const updateParam = useCallback(
    (mutate: (p: URLSearchParams) => void) => {
      const next = new URLSearchParams(searchParams.toString());
      mutate(next);

      router.replace(`${pathname}?${next.toString()}`);
    },
    [pathname, router, searchParams],
  );

  const columns: ColumnDef<BookingRow>[] = useMemo(
    () => [
      {
        accessorKey: "requested_date",
        header: "Date",
        cell: ({ row }) => <span>{row.original.requested_date ?? "—"}</span>,
      },
      {
        accessorKey: "company",
        header: "Account",
        cell: ({ row }) => (
          <Link className="font-medium text-primary hover:underline" href={`/admin/bookings/${row.original.id}`}>
            {row.original.company?.name ?? "Account"}
          </Link>
        ),
      },
      {
        accessorKey: "venue_city",
        header: "City",
        cell: ({ row }) => row.original.venue_city ?? row.original.company?.city ?? "—",
      },
      {
        accessorKey: "service_type",
        header: "Service",
        cell: ({ row }) => <span className="capitalize">{row.original.service_type}</span>,
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge kind="booking" status={row.original.status ?? ""} />,
      },
      {
        id: "estimate",
        header: "Estimate",
        cell: ({ row }) =>
          row.original.price_estimate != null ? (
            <span className="tabular-nums">{formatGbpFromPence(Number(row.original.price_estimate))}</span>
          ) : (
            "—"
          ),
      },
    ],
    [],
  );

  const data = listQuery.data;

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ label: "Bookings" }]} />
      <PageHeader
        title="Bookings"
        description="Operational booking management — Laravel /api/admin/bookings."
        actions={
          <Button type="button" onClick={() => setCreateOpen(true)}>
            Create booking
          </Button>
        }
      />

      <section className="space-y-4 rounded-2xl border bg-card p-4 shadow-sm md:p-6">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select
              value={searchParams.get("status") ?? "all"}
              onValueChange={(value) =>
                updateParam((p) => {
                  if (value === "all") {
                    p.delete("status");
                  } else {
                    p.set("status", value);
                  }
                  p.set("page", "1");
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Any status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any status</SelectItem>
                {BOOKING_STATUS_VALUES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {bookingStatusLabel(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">City (account)</Label>
            <Input
              defaultValue={searchParams.get("city") ?? ""}
              placeholder="Manchester"
              onChange={(event) =>
                updateParam((p) => {
                  const v = event.target.value.trim();
                  if (v) {
                    p.set("city", v);
                  } else {
                    p.delete("city");
                  }
                  p.set("page", "1");
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Date</Label>
            <Input
              type="date"
              defaultValue={searchParams.get("date") ?? ""}
              onChange={(event) =>
                updateParam((p) => {
                  const v = event.target.value.trim();
                  if (v) {
                    p.set("date", v);
                  } else {
                    p.delete("date");
                  }
                  p.set("page", "1");
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Service</Label>
            <Select
              value={searchParams.get("service_type") ?? "all"}
              onValueChange={(value) =>
                updateParam((p) => {
                  if (value === "all") {
                    p.delete("service_type");
                  } else {
                    p.set("service_type", value);
                  }
                  p.set("page", "1");
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any</SelectItem>
                {SERVICE_TYPES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Sort</Label>
            <Select
              value={searchParams.get("sort") ?? "requested_date"}
              onValueChange={(value) =>
                updateParam((p) => {
                  p.set("sort", value);
                  p.set("page", "1");
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="requested_date">Requested date</SelectItem>
                <SelectItem value="status">Status</SelectItem>
                <SelectItem value="city">City</SelectItem>
                <SelectItem value="created_at">Created</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {listQuery.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading bookings…
        </div>
      ) : listQuery.isError ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {listQuery.error instanceof Error ? listQuery.error.message : "Unable to load bookings."}
        </div>
      ) : (
        <>
          <DataTable columns={columns} data={data?.data.items ?? []} emptyLabel="No bookings match your filters." />
          {data?.meta.pagination ? (
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
              <span>
                Page {data.meta.pagination.page} of {data.meta.pagination.total_pages ?? 1} ·{" "}
                {data.meta.pagination.total ?? 0} bookings
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={data.meta.pagination.page <= 1}
                  onClick={() =>
                    updateParam((p) => {
                      p.set("page", String(Math.max(1, data.meta.pagination.page - 1)));
                    })
                  }
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={data.meta.pagination.has_more_pages === false}
                  onClick={() =>
                    updateParam((p) => {
                      p.set("page", String(data.meta.pagination.page + 1));
                    })
                  }
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New booking</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={form.handleSubmit((vals) => {
              createMutation.mutate(vals);
            })}
          >
            <div className="space-y-2">
              <CompanyLookup
                label="Account"
                value={form.watch("company_id") === "" ? null : form.watch("company_id")}
                onChange={(id) => {
                  form.setValue("company_id", id ?? "");
                  form.setValue("location_id", "");
                  form.setValue("contact_id", "");
                }}
                placeholder="Search kitchen…"
              />
            </div>

            <div className="space-y-2">
              <LocationLookup
                label="Location"
                value={form.watch("location_id") === "" ? null : form.watch("location_id")}
                onChange={(id) => form.setValue("location_id", id ?? "")}
                disabled={!form.watch("company_id")}
                extraParams={
                  form.watch("company_id") ? { company_id: form.watch("company_id") } : undefined
                }
                placeholder="Venue site"
              />
            </div>

            <div className="space-y-2">
              <ContactLookup
                label="Contact (optional)"
                value={form.watch("contact_id") ? (form.watch("contact_id") as string) : null}
                onChange={(id) => form.setValue("contact_id", id ?? "")}
                nullable
                disabled={!form.watch("company_id")}
                extraParams={
                  form.watch("company_id") ? { company_id: form.watch("company_id") } : undefined
                }
                placeholder="Anyone on-site"
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Requested date</Label>
                <Input type="date" {...form.register("requested_date")} />
              </div>
              <div className="space-y-2">
                <Label>Service</Label>
                <Select
                  value={form.watch("service_type")}
                  onValueChange={(v) =>
                    form.setValue("service_type", v as (typeof SERVICE_TYPES)[number])
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_TYPES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="price-estimate-pence">Price estimate (optional)</Label>
                <p id="price-estimate-hint" className="text-xs text-muted-foreground">
                  Enter whole pence (e.g. 850 for £8.50).
                </p>
                <Input
                  id="price-estimate-pence"
                  type="number"
                  aria-describedby="price-estimate-hint"
                  placeholder="Optional"
                  {...form.register("price_estimate_pence")}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Internal notes</Label>
                <Input {...form.register("internal_notes")} />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating…" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
