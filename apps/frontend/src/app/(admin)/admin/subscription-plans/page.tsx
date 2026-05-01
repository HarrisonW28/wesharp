"use client";

import { useMemo, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Pencil, Plus, Power, Save, Trash2, X } from "lucide-react";

import { useAdminApi } from "@/lib/api/use-admin-api";
import {
  AdminSubscriptionPlanIndexResponseSchema,
  type SubscriptionPlanRow,
} from "@/lib/api/admin-subscription-plans-schema";
import { formatGBP } from "@/lib/format/money";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

type PlanDraft = {
  name: string;
  description: string;
  billing_interval: string;
  price_amount_minor: number;
  currency: string;
  included_collections: number | null;
  included_knife_allowance: number | null;
  overage_price_amount_minor: number | null;
  is_active: boolean;
  sort_order: number;
};

const INTERVALS = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
];

function moneyMinorFromInput(v: string): number {
  const raw = v.trim();
  if (!raw) return 0;
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n * 100));
}

function moneyInputFromMinor(minor: number): string {
  const pounds = (minor ?? 0) / 100;
  return Number.isFinite(pounds) ? pounds.toFixed(2) : "0.00";
}

function intOrNull(v: string): number | null {
  const s = v.trim();
  if (s === "") return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.floor(n));
}

function defaultDraft(): PlanDraft {
  return {
    name: "",
    description: "",
    billing_interval: "monthly",
    price_amount_minor: 0,
    currency: "GBP",
    included_collections: null,
    included_knife_allowance: null,
    overage_price_amount_minor: null,
    is_active: true,
    sort_order: 0,
  };
}

function toDraft(p: SubscriptionPlanRow): PlanDraft {
  return {
    name: p.name ?? "",
    description: p.description ?? "",
    billing_interval: p.billing_interval ?? "monthly",
    price_amount_minor: p.price_amount_minor ?? 0,
    currency: p.currency ?? "GBP",
    included_collections: p.included_collections ?? null,
    included_knife_allowance: p.included_knife_allowance ?? null,
    overage_price_amount_minor: p.overage_price_amount_minor ?? null,
    is_active: Boolean(p.is_active),
    sort_order: p.sort_order ?? 0,
  };
}

export default function AdminSubscriptionPlansPage() {
  const admin = useAdminApi();
  const qc = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [createDraft, setCreateDraft] = useState<PlanDraft>(() => defaultDraft());
  const [editId, setEditId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<PlanDraft>(() => defaultDraft());

  const plansQuery = useQuery({
    queryKey: ["admin-subscription-plans"],
    queryFn: async () => {
      const res = await admin.json<unknown>("/api/admin/subscription-plans");
      if (!res.ok) throw new Error(res.message);
      const parsed = AdminSubscriptionPlanIndexResponseSchema.safeParse(res.data);
      if (!parsed.success) throw new Error("Unexpected subscription plan payload.");
      return parsed.data.data.items;
    },
  });

  const createPlan = useMutation({
    mutationFn: async (payload: PlanDraft) => {
      const res = await admin.json<unknown>("/api/admin/subscription-plans", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(res.message);
      return res.data;
    },
    onSuccess: async () => {
      toast.success("Plan created.");
      setCreateOpen(false);
      setCreateDraft(defaultDraft());
      await qc.invalidateQueries({ queryKey: ["admin-subscription-plans"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Create failed."),
  });

  const updatePlan = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: PlanDraft }) => {
      const res = await admin.json<unknown>(`/api/admin/subscription-plans/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(res.message);
      return res.data;
    },
    onSuccess: async () => {
      toast.success("Plan updated.");
      setEditId(null);
      await qc.invalidateQueries({ queryKey: ["admin-subscription-plans"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed."),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const res = await admin.json<unknown>(
        `/api/admin/subscription-plans/${id}/${active ? "activate" : "deactivate"}`,
        { method: "POST", body: JSON.stringify({}) },
      );
      if (!res.ok) throw new Error(res.message);
      return res.data;
    },
    onSuccess: async () => {
      toast.success("Plan status updated.");
      await qc.invalidateQueries({ queryKey: ["admin-subscription-plans"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed."),
  });

  const archivePlan = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const res = await admin.json<unknown>(`/api/admin/subscription-plans/${id}/archive`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error(res.message);
      return res.data;
    },
    onSuccess: async () => {
      toast.success("Plan archived.");
      await qc.invalidateQueries({ queryKey: ["admin-subscription-plans"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Archive failed."),
  });

  const rows = useMemo(() => plansQuery.data ?? [], [plansQuery.data]);
  const saving = createPlan.isPending || updatePlan.isPending || toggleActive.isPending || archivePlan.isPending;

  const activeCount = useMemo(() => rows.filter((r) => r.is_active).length, [rows]);

  return (
    <div className="space-y-8">
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Subscription plans", href: "/admin/subscription-plans" },
        ]}
      />

      <PageHeader
        title="Subscription plans"
        description="Manage the plan catalogue. Existing company subscriptions keep price snapshots for historical accuracy."
        actions={
          <Button
            type="button"
            onClick={() => setCreateOpen((v) => !v)}
            disabled={saving || !admin.origin}
          >
            <Plus className="mr-2 h-4 w-4" aria-hidden />
            New plan
          </Button>
        }
      />

      {createOpen ? (
        <PlanEditorCard
          title="Create plan"
          description="Snapshots are stored on company subscriptions; editing a plan will not rewrite history."
          draft={createDraft}
          onChange={setCreateDraft}
          saving={createPlan.isPending}
          onCancel={() => {
            setCreateOpen(false);
            setCreateDraft(defaultDraft());
          }}
          onSave={() => createPlan.mutate(createDraft)}
        />
      ) : null}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Plans</CardTitle>
          <CardDescription className="text-sm">
            {rows.length ? `${rows.length} total · ${activeCount} active` : "No plans yet."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {plansQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading plans…</p>
          ) : plansQuery.isError ? (
            <p className="text-sm text-destructive">{(plansQuery.error as Error).message}</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Create your first plan. Inactive plans cannot be assigned to new companies.
            </p>
          ) : (
            <div className="space-y-3">
              {rows.map((p) => {
                const isEditing = editId === p.id;
                const draft = isEditing ? editDraft : null;
                return (
                  <div key={p.id} className="rounded-lg border bg-background">
                    <div className="flex flex-col gap-3 p-4 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="truncate text-base font-semibold">{p.name}</div>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${
                              p.is_active
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {p.is_active ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          {INTERVALS.find((i) => i.value === p.billing_interval)?.label ?? p.billing_interval} ·{" "}
                          {p.currency === "GBP" ? formatGBP(p.price_amount_minor ?? 0) : `${p.price_amount_minor} ${p.currency}`}
                        </div>
                        {p.description ? (
                          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>
                        ) : null}
                        <div className="mt-2 text-xs text-muted-foreground">
                          Included collections: {p.included_collections ?? "—"} · Knife allowance:{" "}
                          {p.included_knife_allowance ?? "—"} · Overage:{" "}
                          {p.overage_price_amount_minor != null ? formatGBP(p.overage_price_amount_minor) : "—"} · Sort:{" "}
                          {p.sort_order}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 md:justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          disabled={saving}
                          onClick={() => {
                            setEditId(p.id);
                            setEditDraft(toDraft(p));
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" aria-hidden />
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant={p.is_active ? "secondary" : "default"}
                          disabled={saving}
                          onClick={() => {
                            const ok = window.confirm(
                              p.is_active
                                ? "Deactivate this plan? It cannot be assigned to new companies while inactive."
                                : "Activate this plan?",
                            );
                            if (!ok) return;
                            toggleActive.mutate({ id: p.id, active: !p.is_active });
                          }}
                        >
                          <Power className="mr-2 h-4 w-4" aria-hidden />
                          {p.is_active ? "Deactivate" : "Activate"}
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          disabled={saving}
                          onClick={() => {
                            const ok = window.confirm(
                              "Archive this plan? Existing company subscriptions remain linked; the plan will be removed from the active catalogue.",
                            );
                            if (!ok) return;
                            archivePlan.mutate({ id: p.id });
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" aria-hidden />
                          Archive
                        </Button>
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="border-t p-4">
                        <PlanEditor
                          draft={draft!}
                          onChange={setEditDraft}
                          saving={updatePlan.isPending}
                          onCancel={() => setEditId(null)}
                          onSave={() => updatePlan.mutate({ id: p.id, payload: draft! })}
                        />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PlanEditorCard(props: {
  title: string;
  description: string;
  draft: PlanDraft;
  onChange: (d: PlanDraft) => void;
  saving: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{props.title}</CardTitle>
        <CardDescription className="text-sm">{props.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <PlanEditor
          draft={props.draft}
          onChange={props.onChange}
          saving={props.saving}
          onCancel={props.onCancel}
          onSave={props.onSave}
        />
      </CardContent>
    </Card>
  );
}

function PlanEditor(props: {
  draft: PlanDraft;
  onChange: (d: PlanDraft) => void;
  saving: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  const d = props.draft;
  const update = (patch: Partial<PlanDraft>) => props.onChange({ ...d, ...patch });

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="plan-name">Name</Label>
          <Input
            id="plan-name"
            value={d.name}
            onChange={(e) => update({ name: e.target.value })}
            placeholder="Kitchen Care Monthly"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="plan-sort">Sort order</Label>
          <Input
            id="plan-sort"
            inputMode="numeric"
            value={String(d.sort_order)}
            onChange={(e) => update({ sort_order: Math.max(0, Number(e.target.value || 0)) })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="plan-desc">Description</Label>
        <Input
          id="plan-desc"
          value={d.description}
          onChange={(e) => update({ description: e.target.value })}
          placeholder="What’s included, what’s not, and how overages work."
        />
      </div>

      <Separator />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Billing interval</Label>
          <Select value={d.billing_interval} onValueChange={(v) => update({ billing_interval: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Select interval" />
            </SelectTrigger>
            <SelectContent>
              {INTERVALS.map((i) => (
                <SelectItem key={i.value} value={i.value}>
                  {i.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Currency</Label>
          <Input
            value={d.currency}
            onChange={(e) => update({ currency: e.target.value.toUpperCase().slice(0, 3) })}
            placeholder="GBP"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label>Price (GBP)</Label>
          <Input
            inputMode="decimal"
            value={moneyInputFromMinor(d.price_amount_minor)}
            onChange={(e) => update({ price_amount_minor: moneyMinorFromInput(e.target.value) })}
          />
          <p className="text-xs text-muted-foreground">Stored in minor units; shown as GBP.</p>
        </div>
        <div className="space-y-2">
          <Label>Overage price (GBP)</Label>
          <Input
            inputMode="decimal"
            value={d.overage_price_amount_minor == null ? "" : moneyInputFromMinor(d.overage_price_amount_minor)}
            onChange={(e) => update({ overage_price_amount_minor: moneyMinorFromInput(e.target.value) })}
            placeholder="Optional"
          />
        </div>
        <div className="flex items-end gap-3">
          <label className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={d.is_active}
              onChange={(e) => update({ is_active: e.target.checked })}
            />
            <span className="text-sm">{d.is_active ? "Active" : "Inactive"}</span>
          </label>
        </div>
      </div>

      <Separator />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Included collections</Label>
          <Input
            inputMode="numeric"
            value={d.included_collections == null ? "" : String(d.included_collections)}
            onChange={(e) => update({ included_collections: intOrNull(e.target.value) })}
            placeholder="Optional"
          />
        </div>
        <div className="space-y-2">
          <Label>Included knife allowance</Label>
          <Input
            inputMode="numeric"
            value={d.included_knife_allowance == null ? "" : String(d.included_knife_allowance)}
            onChange={(e) => update({ included_knife_allowance: intOrNull(e.target.value) })}
            placeholder="Optional"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" onClick={props.onCancel} disabled={props.saving}>
          <X className="mr-2 h-4 w-4" aria-hidden />
          Cancel
        </Button>
        <Button type="button" onClick={props.onSave} disabled={props.saving || d.name.trim() === ""}>
          {props.saving ? <Save className="mr-2 h-4 w-4" aria-hidden /> : <Check className="mr-2 h-4 w-4" aria-hidden />}
          Save
        </Button>
        <div className="text-xs text-muted-foreground">
          Changing plan price affects future assignments only. Existing subscriptions keep price snapshots.
        </div>
      </div>
    </div>
  );
}

