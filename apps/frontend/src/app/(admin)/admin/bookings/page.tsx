"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, MoreHorizontal } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { BookingRow } from "@/lib/api/admin-bookings-schema";
import { BOOKING_STATUS_VALUES, PaginatedBookingsResponseSchema } from "@/lib/api/admin-bookings-schema";
import { useAdminApi } from "@/lib/api/use-admin-api";
import { bookingStatusLabel } from "@/lib/helpers/status-helpers";
import { formatDisplayDate } from "@/lib/format/dates";
import { paginationRangeCaption } from "@/lib/format/pagination-caption";
import { formatGBP, parseGbpInputToMinorUnits } from "@/lib/format/money";

import { CompanyLookup, ContactLookup, LocationLookup } from "@/components/admin/lookups/AsyncEntityLookup";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/status/StatusBadge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/tables/DataTable";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

function formatWindow(a?: string | null, e?: string | null): string {
  if (!a && !e) return "—";
  const f = (s: string) => (s.length >= 5 ? s.slice(0, 5) : s);
  return `${a ? f(a) : "?"}–${e ? f(e) : "?"}`;
}

function formatConfirmedCell(row: BookingRow): string {
  const date = row.confirmed_collection_date ?? "—";
  const win = formatWindow(row.confirmed_time_window_start, row.confirmed_time_window_end);
  if (win === "—") {
    return date;
  }
  return `${date} · ${win}`;
}

const SERVICE_TYPES = ["collection", "onsite"] as const;

export default function AdminBookingsPage() {
  const admin = useAdminApi();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);
  const queryClient = useQueryClient();

  const qFromUrl = searchParams.get("q") ?? "";
  const [qDraft, setQDraft] = useState(qFromUrl);

  useEffect(() => {
    setQDraft(qFromUrl);
  }, [qFromUrl]);

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

  useEffect(() => {
    const id = window.setTimeout(() => {
      const next = qDraft.trim();
      const cur = qFromUrl.trim();
      if (next === cur) return;
      const nextParams = new URLSearchParams(searchParams.toString());
      if (next) {
        nextParams.set("q", next);
      } else {
        nextParams.delete("q");
      }
      nextParams.set("page", "1");
      router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
    }, 400);
    return () => window.clearTimeout(id);
  }, [qDraft, qFromUrl, pathname, router, searchParams]);

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
      price_estimate_gbp: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: z.infer<typeof adminCreateBookingFormSchema>) => {
      let price_estimate: number | undefined;
      try {
        price_estimate = parseGbpInputToMinorUnits(payload.price_estimate_gbp ?? "");
      } catch {
        throw new Error("Price estimate must be a valid amount in pounds.");
      }

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
            price_estimate === undefined || price_estimate === null ? undefined : price_estimate,
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
        price_estimate_gbp: "",
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

  const companyFilterId = searchParams.get("company_id") ?? "";

  const columns: ColumnDef<BookingRow>[] = useMemo(
    () => [
      {
        id: "ref",
        header: "Ref",
        cell: ({ row }) => {
          const ref = row.original.reference?.trim();
          return (
            <Link
              className={ref ? "font-mono text-xs text-primary hover:underline" : "text-sm font-medium text-primary hover:underline"}
              href={`/admin/bookings/${row.original.id}`}
            >
              {ref || "View"}
            </Link>
          );
        },
      },
      {
        accessorKey: "requested_date",
        header: "Date",
        cell: ({ row }) => (
          <span className="tabular-nums">{formatDisplayDate(row.original.requested_date)}</span>
        ),
      },
      {
        accessorKey: "company",
        header: "Account",
        cell: ({ row }) => (
          <div className="min-w-[8rem] space-y-0.5">
            <Link className="font-medium text-primary hover:underline" href={`/admin/bookings/${row.original.id}`}>
              {row.original.company?.name ?? "Account"}
            </Link>
            {(row.original.orders_count ?? 0) > 0 ? (
              <div className="text-xs text-muted-foreground">Has linked order</div>
            ) : null}
          </div>
        ),
      },
      {
        id: "req_win",
        header: "Requested window",
        cell: ({ row }) => (
          <span className="text-muted-foreground tabular-nums">
            {formatWindow(
              row.original.requested_time_window_start ?? row.original.time_window_start,
              row.original.requested_time_window_end ?? row.original.time_window_end,
            )}
          </span>
        ),
      },
      {
        id: "conf_win",
        header: "Confirmed",
        cell: ({ row }) => (
          <span className="text-muted-foreground tabular-nums text-xs sm:text-sm">{formatConfirmedCell(row.original)}</span>
        ),
      },
      {
        id: "route",
        header: "Route",
        cell: ({ row }) =>
          row.original.assigned_route_id ? (
            <Link
              className="text-primary underline underline-offset-2"
              href={`/admin/routes/${row.original.assigned_route_id}`}
            >
              {row.original.assigned_route?.name?.trim()
                ? row.original.assigned_route.name
                : "Open run"}
            </Link>
          ) : (
            <span className="text-muted-foreground">Unassigned</span>
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
        header: "Est.",
        cell: ({ row }) =>
          row.original.price_estimate != null ? (
            <span className="tabular-nums text-sm font-medium">{formatGBP(Number(row.original.price_estimate))}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label="Booking actions">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/admin/bookings/${row.original.id}`}>View booking</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/admin/crm/${row.original.company_id}`}>Open account</Link>
              </DropdownMenuItem>
              {row.original.assigned_route_id ? (
                <DropdownMenuItem asChild>
                  <Link href={`/admin/routes/${row.original.assigned_route_id}`}>Open route</Link>
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [],
  );

  const data = listQuery.data;
  const bookingPag = data?.meta.pagination;
  const bookingRangeCaptionText = bookingPag
    ? paginationRangeCaption(bookingPag.page, bookingPag.per_page, bookingPag.total)
    : null;

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ label: "Bookings" }]} />
      <PageHeader
        title="Bookings"
        description="Search, filter, and manage collection bookings — confirm windows, routes, and conversion to orders."
        actions={
          <Button type="button" onClick={() => setCreateOpen(true)}>
            Create booking
          </Button>
        }
      />

      <section className="space-y-4 rounded-2xl border bg-card p-4 shadow-sm md:p-6">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          <div className="space-y-2 md:col-span-2">
            <Label className="text-xs text-muted-foreground">Search</Label>
            <Input
              value={qDraft}
              onChange={(e) => setQDraft(e.target.value)}
              placeholder="Account, site, city, postcode, or booking ID…"
              aria-label="Search bookings"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <CompanyLookup
              label="Account"
              value={searchParams.get("company_id") || null}
              onChange={(id) =>
                updateParam((p) => {
                  if (id) {
                    p.set("company_id", id);
                  } else {
                    p.delete("company_id");
                  }
                  p.set("page", "1");
                })
              }
              nullable
              placeholder="All accounts"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Route</Label>
            <Select
              value={searchParams.get("route_assigned") ?? "all"}
              onValueChange={(value) =>
                updateParam((p) => {
                  if (value === "all") {
                    p.delete("route_assigned");
                  } else {
                    p.set("route_assigned", value);
                  }
                  p.set("page", "1");
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Assignment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any assignment</SelectItem>
                <SelectItem value="assigned">On a route</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
            <Label className="text-xs text-muted-foreground">Collection from</Label>
            <Input
              type="date"
              defaultValue={searchParams.get("date_from") ?? ""}
              onChange={(event) =>
                updateParam((p) => {
                  const v = event.target.value.trim();
                  if (v) {
                    p.set("date_from", v);
                  } else {
                    p.delete("date_from");
                  }
                  p.set("page", "1");
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Collection to</Label>
            <Input
              type="date"
              defaultValue={searchParams.get("date_to") ?? ""}
              onChange={(event) =>
                updateParam((p) => {
                  const v = event.target.value.trim();
                  if (v) {
                    p.set("date_to", v);
                  } else {
                    p.delete("date_to");
                  }
                  p.set("page", "1");
                })
              }
            />
          </div>
          <div className="space-y-2 xl:col-span-2">
            <LocationLookup
              label="Location"
              value={searchParams.get("location_id") || null}
              onChange={(id) =>
                updateParam((p) => {
                  if (id) {
                    p.set("location_id", id);
                  } else {
                    p.delete("location_id");
                  }
                  p.set("page", "1");
                })
              }
              nullable
              placeholder={companyFilterId ? "Filter by site…" : "Pick an account first to filter by location"}
              disabled={!companyFilterId}
              extraParams={companyFilterId ? { company_id: companyFilterId } : undefined}
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
          <p className="col-span-full text-xs text-muted-foreground">
            Search waits until you stop typing. Picking an account enables site/location filters. Changing filters resets to page
            1.
          </p>
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
          <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
            <DataTable columns={columns} data={data?.data.items ?? []} emptyLabel="No bookings match your filters." />
          </div>
          {bookingPag ? (
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
              <span>
                <span className="text-foreground">Page {bookingPag.page}</span> of {bookingPag.total_pages ?? 1} ·{" "}
                {bookingPag.total ?? 0} bookings
                {bookingRangeCaptionText ? ` · ${bookingRangeCaptionText}` : null}
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={bookingPag.page <= 1}
                  onClick={() =>
                    updateParam((p) => {
                      p.set("page", String(Math.max(1, bookingPag.page - 1)));
                    })
                  }
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={bookingPag.has_more_pages === false}
                  onClick={() =>
                    updateParam((p) => {
                      p.set("page", String(bookingPag.page + 1));
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
                label="Account (required)"
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
                label="Location (required)"
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
                <Label htmlFor="booking-requested-date">Requested date (required)</Label>
                <Input id="booking-requested-date" type="date" {...form.register("requested_date")} />
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
                <Label htmlFor="price-estimate-gbp">Price estimate (optional)</Label>
                <p id="price-estimate-hint" className="text-xs text-muted-foreground">
                  In pounds, excluding VAT (e.g. 8.50).
                </p>
                <Input
                  id="price-estimate-gbp"
                  inputMode="decimal"
                  aria-describedby="price-estimate-hint"
                  placeholder="e.g. 120.00"
                  {...form.register("price_estimate_gbp")}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="booking-internal-notes">Internal notes (optional)</Label>
                <Input id="booking-internal-notes" {...form.register("internal_notes")} placeholder="Visible to ops only" />
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
