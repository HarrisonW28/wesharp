"use client";

import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Inbox, Loader2, Map as MapIcon, Plus, Save, Trash2 } from "lucide-react";

import {
  AdminServiceAreasIndexResponseSchema,
  AdminServiceAreaMutationResponseSchema,
  type AdminServiceAreaRow,
} from "@/lib/api/admin-service-areas-schema";
import { useAdminApi } from "@/lib/api/use-admin-api";
import { useBackendMe } from "@/hooks/use-backend-me";
import {
  metresToUnitDisplay,
  unitInputToMetres,
  type ServiceAreaCoverageMapProps,
} from "@/components/admin/ServiceAreaCoverageMap";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ServiceAreaCoverageMap = dynamic<ServiceAreaCoverageMapProps>(
  () =>
    import("@/components/admin/ServiceAreaCoverageMap").then((m) => ({
      default: m.ServiceAreaCoverageMap,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[340px] items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
        Loading map…
      </div>
    ),
  },
);

type Draft = {
  name: string;
  city: string;
  region: string;
  country: string;
  postcode_prefix: string;
  active: boolean;
  centre_latitude: number | null;
  centre_longitude: number | null;
  radius_metres: number | null;
  radius_unit: "mi" | "km";
  radius_input: string;
};

function emptyDraft(): Draft {
  return {
    name: "",
    city: "",
    region: "",
    country: "GB",
    postcode_prefix: "",
    active: true,
    centre_latitude: null,
    centre_longitude: null,
    radius_metres: null,
    radius_unit: "mi",
    radius_input: "",
  };
}

function draftFromRow(row: AdminServiceAreaRow): Draft {
  const unit: "mi" | "km" = "mi";
  const display = metresToUnitDisplay(row.radius_metres, unit);
  return {
    name: row.name,
    city: row.city,
    region: row.region ?? "",
    country: row.country,
    postcode_prefix: row.postcode_prefix ?? "",
    active: row.active,
    centre_latitude: row.centre_latitude,
    centre_longitude: row.centre_longitude,
    radius_metres: row.radius_metres,
    radius_unit: unit,
    radius_input:
      display !== null && Number.isFinite(display) ? String(Math.round(display * 100) / 100) : "",
  };
}

export default function AdminServiceAreasPage() {
  const admin = useAdminApi();
  const qc = useQueryClient();
  const { data: mePayload } = useBackendMe();
  const permissions = useMemo(() => new Set(mePayload?.data?.permissions ?? []), [mePayload?.data?.permissions]);
  const canView = permissions.has("service_areas.view");
  const canManage = permissions.has("service_areas.manage");
  const canViewWaitlist = permissions.has("companies.view");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const listQuery = useQuery({
    queryKey: ["admin-service-areas"],
    enabled: canView,
    queryFn: async () => {
      const res = await admin.json<unknown>("/api/admin/service-areas");
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = AdminServiceAreasIndexResponseSchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Unexpected service areas payload.");
      }
      return parsed.data.data.items;
    },
  });

  const rows = listQuery.data ?? [];

  const selectRow = useCallback((row: AdminServiceAreaRow) => {
    setSelectedId(row.id);
    setCreatingNew(false);
    setDraft(draftFromRow(row));
  }, []);

  const startNew = useCallback(() => {
    setSelectedId(null);
    setCreatingNew(true);
    setDraft(emptyDraft());
  }, []);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const trimmedPrefix = draft.postcode_prefix.trim();
      const n = parseFloat(draft.radius_input);
      const radiusMetres =
        draft.radius_input.trim() === "" ? null : unitInputToMetres(Number.isFinite(n) ? n : null, draft.radius_unit);
      const body: Record<string, unknown> = {
        name: draft.name.trim(),
        city: draft.city.trim(),
        region: draft.region.trim() === "" ? null : draft.region.trim(),
        country: draft.country.trim() || "GB",
        postcode_prefix: trimmedPrefix === "" ? null : trimmedPrefix.toUpperCase(),
        centre_latitude: draft.centre_latitude,
        centre_longitude: draft.centre_longitude,
        radius_metres: radiusMetres,
        active: draft.active,
      };
      if (creatingNew || selectedId === null) {
        const res = await admin.json<unknown>("/api/admin/service-areas", {
          method: "POST",
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          throw new Error(res.message);
        }
        const parsed = AdminServiceAreaMutationResponseSchema.safeParse(res.data);
        if (!parsed.success) {
          throw new Error("Unexpected create response.");
        }
        return { mode: "created" as const, row: parsed.data.data.area };
      }
      const res = await admin.json<unknown>(`/api/admin/service-areas/${selectedId}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = AdminServiceAreaMutationResponseSchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Unexpected update response.");
      }
      return { mode: "updated" as const, row: parsed.data.data.area };
    },
    onSuccess: (r) => {
      toast.success(r.mode === "created" ? "Service area created." : "Service area updated.");
      void qc.invalidateQueries({ queryKey: ["admin-service-areas"] });
      setCreatingNew(false);
      setSelectedId(r.row.id);
      setDraft(draftFromRow(r.row));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (selectedId === null) return;
      const res = await admin.json<unknown>(`/api/admin/service-areas/${selectedId}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error(res.message);
      }
    },
    onSuccess: () => {
      toast.success("Service area deleted.");
      void qc.invalidateQueries({ queryKey: ["admin-service-areas"] });
      setDeleteOpen(false);
      setSelectedId(null);
      setCreatingNew(false);
      setDraft(emptyDraft());
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onCentreChange = useCallback((lat: number | null, lng: number | null) => {
    setDraft((d) => ({
      ...d,
      centre_latitude: lat,
      centre_longitude: lng,
    }));
  }, []);

  const clearCentre = useCallback(() => {
    setDraft((d) => ({
      ...d,
      centre_latitude: null,
      centre_longitude: null,
      radius_metres: null,
      radius_input: "",
    }));
  }, []);

  if (!canView) {
    return (
      <div className="space-y-8">
        <Breadcrumbs homeHref="/admin/dashboard" items={[{ label: "Service areas" }]} />
        <PageHeader title="Service areas" description="You do not have access to this page." />
      </div>
    );
  }

  const editorOpen = creatingNew || selectedId !== null;

  return (
    <div className="space-y-8">
      <Breadcrumbs
        homeHref="/admin/dashboard"
        items={[{ label: "Service areas", href: "/admin/service-areas" }]}
      />
      <PageHeader
        title="Service areas"
        description="Define postcode prefix and optional map radius for each coverage cell. Public checks still use backend rules (radius applies after Sprint 17.3)."
        actions={
          <div className="flex flex-wrap gap-2">
            {canManage ? (
              <Button type="button" size="sm" onClick={startNew}>
                <Plus className="mr-1.5 h-4 w-4" aria-hidden />
                New area
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <Card className="h-fit">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <MapIcon className="h-4 w-4 text-muted-foreground" aria-hidden />
                Areas
              </CardTitle>
              <CardDescription>Select a row to edit. Prefix matching is used for coverage today.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              {listQuery.isPending ? (
                <div className="flex items-center gap-2 py-8 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                  Loading…
                </div>
              ) : listQuery.isError ? (
                <p className="text-destructive">{(listQuery.error as Error).message}</p>
              ) : rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">No service areas yet. Create one to get started.</p>
              ) : (
                <ul className="space-y-1">
                  {rows.map((row) => {
                    const selected = !creatingNew && selectedId === row.id;
                    return (
                      <li key={row.id}>
                        <button
                          type="button"
                          onClick={() => selectRow(row)}
                          className={`flex w-full min-w-0 flex-col items-start gap-1 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                            selected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/60"
                          }`}
                        >
                          <span className="truncate font-medium text-foreground">{row.name}</span>
                          <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span>{row.city}</span>
                            <Badge variant={row.active ? "default" : "secondary"} className="text-[10px]">
                              {row.active ? "Active" : "Inactive"}
                            </Badge>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          {canViewWaitlist ? (
            <Card className="h-fit">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Inbox className="h-4 w-4 text-muted-foreground" aria-hidden />
                  Waitlist
                </CardTitle>
                <CardDescription>
                  Postcodes outside current coverage — open the full list to review and export leads.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button type="button" variant="outline" size="sm" className="w-full" asChild>
                  <Link href="/admin/waitlist">Open waitlist</Link>
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          {!editorOpen ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Choose an area</CardTitle>
                <CardDescription>
                  Pick a service area from the list{canManage ? ", or create a new one" : ""}.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base">{creatingNew ? "New service area" : "Edit service area"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="sa-name">Name / label</Label>
                      <Input
                        id="sa-name"
                        value={draft.name}
                        disabled={!canManage}
                        onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sa-city">City</Label>
                      <Input
                        id="sa-city"
                        value={draft.city}
                        disabled={!canManage}
                        onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sa-region">Region (optional)</Label>
                      <Input
                        id="sa-region"
                        value={draft.region}
                        disabled={!canManage}
                        onChange={(e) => setDraft((d) => ({ ...d, region: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sa-country">Country</Label>
                      <Input
                        id="sa-country"
                        value={draft.country}
                        disabled={!canManage}
                        onChange={(e) => setDraft((d) => ({ ...d, country: e.target.value }))}
                        maxLength={8}
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="sa-prefix">Postcode prefix fallback</Label>
                      <Input
                        id="sa-prefix"
                        value={draft.postcode_prefix}
                        disabled={!canManage}
                        placeholder="e.g. M or M1"
                        onChange={(e) => setDraft((d) => ({ ...d, postcode_prefix: e.target.value }))}
                        maxLength={10}
                      />
                      <p className="text-xs text-muted-foreground">
                        Longest matching active prefix wins for public postcode checks (existing behaviour).
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-muted/20 px-4 py-3">
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-input"
                        checked={draft.active}
                        disabled={!canManage}
                        onChange={(e) => setDraft((d) => ({ ...d, active: e.target.checked }))}
                      />
                      Active
                    </label>
                    {canManage ? (
                      <Button type="button" variant="outline" size="sm" onClick={clearCentre}>
                        Clear map centre / radius
                      </Button>
                    ) : null}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="sa-radius">Coverage radius</Label>
                      <div className="flex gap-2">
                        <Input
                          id="sa-radius"
                          type="number"
                          step="0.1"
                          min="0"
                          className="min-w-0 flex-1"
                          disabled={!canManage}
                          placeholder="e.g. 10"
                          value={draft.radius_input}
                          onChange={(e) => setDraft((d) => ({ ...d, radius_input: e.target.value }))}
                        />
                        <Select
                          value={draft.radius_unit}
                          disabled={!canManage}
                          onValueChange={(v) => setDraft((d) => ({ ...d, radius_unit: v as "mi" | "km" }))}
                        >
                          <SelectTrigger className="w-[88px] shrink-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mi">Miles</SelectItem>
                            <SelectItem value="km">Km</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <p className="text-xs text-muted-foreground">Requires a centre on the map (50m–500km).</p>
                    </div>
                  </div>

                  <ServiceAreaCoverageMap
                    centreLat={draft.centre_latitude}
                    centreLng={draft.centre_longitude}
                    radiusMetres={
                      draft.radius_input.trim() === ""
                        ? null
                        : unitInputToMetres(
                            (() => {
                              const n = parseFloat(draft.radius_input);
                              return Number.isFinite(n) ? n : null;
                            })(),
                            draft.radius_unit,
                          )
                    }
                    interactive={canManage}
                    onCentreChange={onCentreChange}
                  />

                  {canManage ? (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        onClick={() => saveMutation.mutate()}
                        disabled={
                          saveMutation.isPending || draft.name.trim() === "" || draft.city.trim() === ""
                        }
                      >
                        {saveMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                        ) : (
                          <Save className="mr-2 h-4 w-4" aria-hidden />
                        )}
                        Save
                      </Button>
                      {!creatingNew && selectedId !== null ? (
                        <Button type="button" variant="destructive" onClick={() => setDeleteOpen(true)}>
                          <Trash2 className="mr-2 h-4 w-4" aria-hidden />
                          Delete
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this service area?</AlertDialogTitle>
            <AlertDialogDescription>
              Pricing rules that pointed here will unlink automatically. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
            <AlertDialogAction
              type="button"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
