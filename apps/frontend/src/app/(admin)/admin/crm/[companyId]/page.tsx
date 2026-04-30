"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";

import type { CompanyDetail } from "@/lib/api/admin-crm-schema";
import {
  BookingPreviewSchema,
  CompanyActivityResponseSchema,
  CompanyDetailResponseSchema,
  CompanySummarySchema,
  InvoicePreviewSchema,
  KnifePreviewSchema,
  OrderPreviewSchema,
} from "@/lib/api/admin-crm-schema";
import { useAdminApi } from "@/lib/api/use-admin-api";
import { formatGbpFromPence } from "@/lib/format/money";

import { LocationLookup } from "@/components/admin/lookups/AsyncEntityLookup";
import { CompanyStatusBadge } from "@/components/crm/CompanyStatusBadge";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/tables/DataTable";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useBackendMe } from "@/hooks/use-backend-me";

type BookingRow = z.infer<typeof BookingPreviewSchema>;
type OrderRow = z.infer<typeof OrderPreviewSchema>;
type KnifeRow = z.infer<typeof KnifePreviewSchema>;
type InvoiceRow = z.infer<typeof InvoicePreviewSchema>;

const noteFormSchema = z.object({
  body: z.string().min(1, "Enter note text."),
});

const contactFormSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.union([z.string().email(), z.literal("")]),
  phone: z.string().optional(),
  billing_contact: z.boolean(),
});

const locationFormSchema = z.object({
  label: z.string().min(1),
  line_one: z.string().optional(),
  line_two: z.string().optional(),
  city: z.string().optional(),
  postcode: z.string().optional(),
  country: z.string().optional(),
});

const bookingFormSchema = z.object({
  company_location_id: z.string().uuid(),
  scheduled_date: z.string().min(1),
  service_type: z.enum(["collection", "onsite"]),
  internal_notes: z.string().optional(),
});

export default function AdminCrmCompanyPage() {
  const params = useParams();
  const companyId =
    typeof params.companyId === "string" ? params.companyId : Array.isArray(params.companyId)
      ? params.companyId[0]
      : "";
  const admin = useAdminApi();
  const qc = useQueryClient();
  const { data: me } = useBackendMe();
  const perms = useMemo(() => new Set(me?.data?.permissions ?? []), [me?.data?.permissions]);
  const canUpdate = perms.has("companies.update");
  const canCreateBooking = perms.has("bookings.create");

  const invalidateCompany = async () => {
    await qc.invalidateQueries({ queryKey: ["admin-company", companyId] });
    await qc.invalidateQueries({ queryKey: ["admin-company-summary", companyId] });
    await qc.invalidateQueries({ queryKey: ["admin-company-activity", companyId] });
    await qc.invalidateQueries({ queryKey: ["admin-companies"] });
  };

  const companyQuery = useQuery({
    enabled: Boolean(companyId),
    queryKey: ["admin-company", companyId],
    queryFn: async () => {
      const res = await admin.json<unknown>(`/api/admin/companies/${companyId}`);
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = CompanyDetailResponseSchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Unexpected company payload.");
      }
      return parsed.data.data;
    },
  });

  const summaryQuery = useQuery({
    enabled: Boolean(companyId),
    queryKey: ["admin-company-summary", companyId],
    queryFn: async () => {
      const res = await admin.json<unknown>(`/api/admin/companies/${companyId}/summary`);
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = CompanySummarySchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Unexpected summary payload.");
      }
      return parsed.data.data;
    },
  });

  const activityQuery = useQuery({
    enabled: Boolean(companyId),
    queryKey: ["admin-company-activity", companyId],
    queryFn: async () => {
      const res = await admin.json<unknown>(`/api/admin/companies/${companyId}/activity`);
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = CompanyActivityResponseSchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Unexpected activity payload.");
      }
      return parsed.data.data.items;
    },
  });

  const statusMutation = useMutation({
    mutationFn: async (company_status: CompanyDetail["company_status"]) => {
      const res = await admin.json(`/api/admin/companies/${companyId}/status`, {
        method: "PUT",
        body: JSON.stringify({ company_status }),
      });
      if (!res.ok) {
        throw new Error(res.message);
      }
      return res.data;
    },
    onSuccess: async () => {
      toast.success("Status updated.");
      await invalidateCompany();
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Status update failed.");
    },
  });

  const noteForm = useForm<z.infer<typeof noteFormSchema>>({
    resolver: zodResolver(noteFormSchema),
    defaultValues: { body: "" },
  });

  const noteMutation = useMutation({
    mutationFn: async (body: string) => {
      const res = await admin.json(`/api/admin/companies/${companyId}/notes`, {
        method: "POST",
        body: JSON.stringify({ body }),
      });
      if (!res.ok) {
        throw new Error(res.message);
      }
      return res.data;
    },
    onSuccess: async () => {
      toast.success("Note added.");
      noteForm.reset({ body: "" });
      await invalidateCompany();
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Could not save note.");
    },
  });

  const contactForm = useForm<z.infer<typeof contactFormSchema>>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      billing_contact: false,
    },
  });

  const [contactOpen, setContactOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);

  const contactMutation = useMutation({
    mutationFn: async (payload: z.infer<typeof contactFormSchema>) => {
      const res = await admin.json(`/api/admin/companies/${companyId}/contacts`, {
        method: "POST",
        body: JSON.stringify({
          ...payload,
          email: payload.email === "" ? null : payload.email,
        }),
      });
      if (!res.ok) {
        throw new Error(res.message);
      }
      return res.data;
    },
    onSuccess: async () => {
      toast.success("Contact added.");
      contactForm.reset();
      setContactOpen(false);
      await invalidateCompany();
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Contact failed.");
    },
  });

  const locationForm = useForm<z.infer<typeof locationFormSchema>>({
    resolver: zodResolver(locationFormSchema),
    defaultValues: {
      label: "",
      line_one: "",
      line_two: "",
      city: "",
      postcode: "",
      country: "",
    },
  });

  const locationMutation = useMutation({
    mutationFn: async (payload: z.infer<typeof locationFormSchema>) => {
      const res = await admin.json(`/api/admin/companies/${companyId}/locations`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error(res.message);
      }
      return res.data;
    },
    onSuccess: async () => {
      toast.success("Location added.");
      locationForm.reset();
      setLocationOpen(false);
      await invalidateCompany();
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Location failed.");
    },
  });

  const bookingForm = useForm<z.infer<typeof bookingFormSchema>>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      company_location_id: "",
      scheduled_date: "",
      service_type: "collection",
      internal_notes: "",
    },
  });

  const bookingMutation = useMutation({
    mutationFn: async (payload: z.infer<typeof bookingFormSchema>) => {
      const res = await admin.json(`/api/admin/companies/${companyId}/bookings`, {
        method: "POST",
        body: JSON.stringify({
          ...payload,
          internal_notes: payload.internal_notes || null,
        }),
      });
      if (!res.ok) {
        throw new Error(res.message);
      }
      return res.data;
    },
    onSuccess: async () => {
      toast.success("Booking requested.");
      bookingForm.reset();
      setBookingOpen(false);
      await invalidateCompany();
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Booking failed.");
    },
  });

  const c = companyQuery.data;

  const bookingCols: ColumnDef<BookingRow>[] = useMemo(
    () => [
      { accessorKey: "scheduled_date", header: "Date" },
      { accessorKey: "service_type", header: "Service" },
      { accessorKey: "booking_status", header: "Status" },
      { accessorKey: "internal_notes", header: "Notes", cell: ({ getValue }) => String(getValue() ?? "") || "—" },
    ],
    [],
  );

  const orderCols: ColumnDef<OrderRow>[] = useMemo(
    () => [
      {
        accessorKey: "total_pence",
        header: "Total",
        cell: ({ row }) => formatGbpFromPence(row.original.total_pence),
      },
      { accessorKey: "order_status", header: "Status" },
      { accessorKey: "currency", header: "CCY" },
    ],
    [],
  );

  const knifeCols: ColumnDef<KnifeRow>[] = useMemo(
    () => [
      { accessorKey: "label", header: "Label" },
      { accessorKey: "knife_status", header: "Status" },
      { accessorKey: "position", header: "Pos." },
    ],
    [],
  );

  const invoiceCols: ColumnDef<InvoiceRow>[] = useMemo(
    () => [
      { accessorKey: "invoice_number", header: "#" },
      {
        accessorKey: "total_pence",
        header: "Amount",
        cell: ({ row }) => formatGbpFromPence(row.original.total_pence),
      },
      { accessorKey: "invoice_status", header: "Status" },
      { accessorKey: "issued_on", header: "Issued" },
    ],
    [],
  );

  if (!companyId) {
    return <div className="text-sm text-muted-foreground">Invalid company.</div>;
  }

  if (companyQuery.isLoading || summaryQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Loading account…
      </div>
    );
  }

  if (companyQuery.isError || !c) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        {companyQuery.error instanceof Error ? companyQuery.error.message : "Unable to load company."}
      </div>
    );
  }

  const summary = summaryQuery.data;

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ label: "CRM", href: "/admin/crm" }, { label: c.name }]} />
      <PageHeader
        title={c.name}
        description={`Slug · ${c.slug}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <CompanyStatusBadge status={c.company_status} />
            <Button type="button" variant="outline" size="sm" asChild>
              <Link href="/admin/crm">Back to list</Link>
            </Button>
          </div>
        }
      />

      {/* Quick actions */}
      <section className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={!canUpdate || statusMutation.isPending || c.company_status === "active"}
          onClick={() => statusMutation.mutate("active")}
        >
          Mark active
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={!canUpdate || statusMutation.isPending || c.company_status === "at_risk"}
          onClick={() => statusMutation.mutate("at_risk")}
        >
          Mark at risk
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canUpdate || statusMutation.isPending || c.company_status === "lost"}
          onClick={() => statusMutation.mutate("lost")}
        >
          Mark lost
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() =>
            toast.message("Review request", {
              description: "Outbound review workflows are not wired yet — this route is reserved.",
            })
          }
        >
          Request review
        </Button>
      </section>

      {/* Summary KPIs */}
      {summaryQuery.isError ? (
        <p className="text-sm text-destructive">Could not load summary KPIs.</p>
      ) : summary ? (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Order revenue</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold tabular-nums">{formatGbpFromPence(summary.orders_total_pence)}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Open pipeline bookings</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold tabular-nums">{summary.bookings_pipeline_count}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Contacts / locations</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold tabular-nums">
              {summary.contacts_count} / {summary.locations_count}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Open invoices</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tabular-nums">{summary.invoices_open_count}</div>
              <p className="text-xs text-muted-foreground tabular-nums">{formatGbpFromPence(summary.invoices_open_total_pence)} outstanding</p>
            </CardContent>
          </Card>
        </section>
      ) : null}

      <Separator />

      {/* Contacts & locations */}
      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle className="text-base">Contacts</CardTitle>
            <Button type="button" size="sm" variant="outline" disabled={!canUpdate} onClick={() => setContactOpen(true)}>
              Add contact
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {c.contacts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No contacts recorded.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {c.contacts.map((contact) => (
                  <li key={contact.id} className="rounded-lg border px-3 py-2">
                    <div className="font-medium">
                      {contact.first_name} {contact.last_name}{" "}
                      {contact.billing_contact ? <span className="text-xs text-muted-foreground">(billing)</span> : null}
                    </div>
                    <div className="text-muted-foreground">{contact.email ?? "—"}</div>
                    <div className="text-muted-foreground">{contact.phone ?? "—"}</div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle className="text-base">Locations</CardTitle>
            <Button type="button" size="sm" variant="outline" disabled={!canUpdate} onClick={() => setLocationOpen(true)}>
              Add location
            </Button>
          </CardHeader>
          <CardContent>
            {c.locations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No locations — add one before scheduling bookings.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {c.locations.map((loc) => (
                  <li key={loc.id} className="rounded-lg border px-3 py-2">
                    <div className="font-medium">{loc.label}</div>
                    <div className="text-muted-foreground">
                      {[loc.line_one, loc.line_two, loc.city, loc.postcode].filter(Boolean).join(", ") || "—"}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {canUpdate ? (
            <form
              className="space-y-3"
              onSubmit={noteForm.handleSubmit((v) => {
                noteMutation.mutate(v.body.trim());
              })}
            >
              <Textarea rows={4} placeholder="Add an internal note…" {...noteForm.register("body")} />
              {noteForm.formState.errors.body ? (
                <p className="text-xs text-destructive">{noteForm.formState.errors.body.message}</p>
              ) : null}
              <Button type="submit" size="sm" disabled={noteMutation.isPending}>
                {noteMutation.isPending ? "Saving…" : "Add note"}
              </Button>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">You do not have permission to add notes.</p>
          )}
          <Separator />
          {c.notes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notes yet.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {c.notes.map((n) => (
                <li key={n.id} className="rounded-lg border px-3 py-2">
                  <div className="text-xs text-muted-foreground">{n.created_at ?? "—"} · {n.author_name ?? "Unknown"}</div>
                  <p className="whitespace-pre-wrap pt-1">{n.body}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {activityQuery.isLoading ? (
            <div className="flex gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : activityQuery.isError ? (
            <p className="text-sm text-destructive">Unable to load activity.</p>
          ) : activityQuery.data?.length === 0 ? (
            <p className="text-sm text-muted-foreground">No audit or note timeline entries yet.</p>
          ) : (
            <ul className="max-h-[420px] space-y-2 overflow-auto text-sm">
              {activityQuery.data?.map((row) => (
                <li key={`${row.type}-${row.id}`} className="rounded-md border px-3 py-2">
                  <span className="text-xs text-muted-foreground">{row.at ?? ""}</span>{" "}
                  <span className="font-medium">{row.action ?? row.type}</span>
                  <span className="text-muted-foreground"> · {row.actor_name ?? "—"}</span>
                  {row.type === "note" && row.body ? <p className="mt-1 text-muted-foreground">{row.body}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Operational tables */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Bookings</h2>
          <Button type="button" size="sm" disabled={!canCreateBooking || c.locations.length === 0} onClick={() => setBookingOpen(true)}>
            Create booking
          </Button>
        </div>
        <DataTable columns={bookingCols} data={c.bookings} emptyLabel="No bookings." />
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Orders</h2>
        <DataTable columns={orderCols} data={c.orders} emptyLabel="No orders." />
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Knives</h2>
        <DataTable columns={knifeCols} data={c.knives} emptyLabel="No knives recorded." />
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Invoices</h2>
        <DataTable columns={invoiceCols} data={c.invoices} emptyLabel="No invoices." />
      </section>

      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add contact</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={contactForm.handleSubmit((v) =>
              contactMutation.mutate({
                ...v,
                billing_contact: v.billing_contact,
              }),
            )}
          >
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fn">First name</Label>
                <Input id="fn" {...contactForm.register("first_name")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ln">Last name</Label>
                <Input id="ln" {...contactForm.register("last_name")} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="em">Email</Label>
              <Input id="em" type="email" {...contactForm.register("email")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ph">Phone</Label>
              <Input id="ph" {...contactForm.register("phone")} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...contactForm.register("billing_contact")} />
              Billing contact
            </label>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setContactOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={contactMutation.isPending}>
                {contactMutation.isPending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={locationOpen} onOpenChange={setLocationOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add location</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={locationForm.handleSubmit((v) => locationMutation.mutate(v))}
          >
            <div className="space-y-2">
              <Label htmlFor="lbl">Label</Label>
              <Input id="lbl" {...locationForm.register("label")} />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Line one</Label>
                <Input {...locationForm.register("line_one")} />
              </div>
              <div className="space-y-2">
                <Label>Line two</Label>
                <Input {...locationForm.register("line_two")} />
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>City</Label>
                <Input {...locationForm.register("city")} />
              </div>
              <div className="space-y-2">
                <Label>Postcode</Label>
                <Input {...locationForm.register("postcode")} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Country</Label>
              <Input {...locationForm.register("country")} />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setLocationOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={locationMutation.isPending}>
                {locationMutation.isPending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create booking</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={bookingForm.handleSubmit((v) => bookingMutation.mutate(v))}
          >
            <div className="space-y-2">
              <LocationLookup
                label="Location"
                value={
                  bookingForm.watch("company_location_id") === ""
                    ? null
                    : bookingForm.watch("company_location_id")
                }
                onChange={(id) => bookingForm.setValue("company_location_id", id ?? "")}
                extraParams={{ company_id: companyId }}
                placeholder="Search site…"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sched">Scheduled date</Label>
              <Input id="sched" type="date" {...bookingForm.register("scheduled_date")} />
            </div>
            <div className="space-y-2">
              <Label>Service</Label>
              <Select
                value={bookingForm.watch("service_type")}
                onValueChange={(v) => bookingForm.setValue("service_type", v as "collection" | "onsite")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="collection">Collection</SelectItem>
                  <SelectItem value="onsite">Onsite</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Internal notes</Label>
              <Textarea rows={3} {...bookingForm.register("internal_notes")} />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setBookingOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={bookingMutation.isPending}>
                {bookingMutation.isPending ? "Saving…" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
