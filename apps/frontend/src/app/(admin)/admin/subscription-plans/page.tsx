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
import { useBackendMe } from "@/hooks/use-backend-me";

import { AdminPayAsYouGoRulesSection } from "@/components/admin/AdminPayAsYouGoRulesSection";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type PlanDraft = {
  name: string;
  /** Shown on public subscription cards when set; otherwise `name` is used on the marketing site. */
  public_name: string;
  description: string;
  /** Shown on public cards when set; otherwise internal `description` is used for marketing copy. */
  public_description: string;
  billing_interval: string;
  /** Raw GBP text while editing; parsed to minor units only when saving. */
  price_gbp_input: string;
  currency: string;
  included_collections: number | null;
  included_knife_allowance: number | null;
  /** Raw GBP text; empty means no overage (`null` in API). */
  overage_gbp_input: string;
  is_active: boolean;
  sort_order: number;
  /** When true, plan appears on public marketing pages (home / pricing / subscriptions) if also active. */
  show_on_public_site: boolean;
  /** One bullet per line for public programme cards. */
  public_highlights_text: string;
  public_cta_label: string;
  recommended: boolean;
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
  const n = Number(raw.replace(/,/g, ""));
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
    public_name: "",
    description: "",
    public_description: "",
    billing_interval: "monthly",
    price_gbp_input: "",
    currency: "GBP",
    included_collections: null,
    included_knife_allowance: null,
    overage_gbp_input: "",
    is_active: true,
    sort_order: 0,
    show_on_public_site: false,
    public_highlights_text: "",
    public_cta_label: "",
    recommended: false,
  };
}

function toDraft(p: SubscriptionPlanRow): PlanDraft {
  return {
    name: p.name ?? "",
    public_name: p.public_name ?? "",
    description: p.description ?? "",
    public_description: p.public_description ?? "",
    billing_interval: p.billing_interval ?? "monthly",
    price_gbp_input: moneyInputFromMinor(p.price_amount_minor ?? 0),
    currency: p.currency ?? "GBP",
    included_collections: p.included_collections ?? null,
    included_knife_allowance: p.included_knife_allowance ?? null,
    overage_gbp_input:
      p.overage_price_amount_minor == null
        ? ""
        : moneyInputFromMinor(p.overage_price_amount_minor),
    is_active: Boolean(p.is_active),
    sort_order: p.sort_order ?? 0,
    show_on_public_site: Boolean(p.show_on_public_site),
    public_highlights_text: (p.public_highlights ?? []).join("\n"),
    public_cta_label: p.public_cta_label ?? "",
    recommended: Boolean(p.recommended),
  };
}

/** Body for Laravel `UpsertSubscriptionPlanRequest` (stable types; currency always 3-letter when sent). */
function draftToApiPayload(d: PlanDraft): Record<string, unknown> {
  const cur = d.currency.trim().toUpperCase().slice(0, 3);
  const currency = cur.length === 3 ? cur : "GBP";

  return {
    name: d.name,
    public_name: d.public_name.trim() === "" ? null : d.public_name.trim(),
    description: d.description,
    public_description:
      d.public_description.trim() === "" ? null : d.public_description.trim(),
    billing_interval: d.billing_interval,
    price_amount_minor: moneyMinorFromInput(d.price_gbp_input),
    currency,
    included_collections: d.included_collections,
    included_knife_allowance: d.included_knife_allowance,
    overage_price_amount_minor:
      d.overage_gbp_input.trim() === ""
        ? null
        : moneyMinorFromInput(d.overage_gbp_input),
    is_active: d.is_active,
    sort_order: Number.isFinite(d.sort_order)
      ? Math.max(0, Math.floor(d.sort_order))
      : 0,
    show_on_public_site: d.show_on_public_site,
    public_highlights: d.public_highlights_text
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s !== ""),
    public_cta_label:
      d.public_cta_label.trim() === "" ? null : d.public_cta_label.trim(),
    recommended: d.recommended,
  };
}

export default function AdminSubscriptionPlansPage() {
  const admin = useAdminApi();
  const qc = useQueryClient();
  const { data: mePayload } = useBackendMe();
  const permissions = useMemo(
    () => new Set(mePayload?.data?.permissions ?? []),
    [mePayload?.data?.permissions],
  );
  const canViewPlans = permissions.has("subscriptions.view");
  const canViewPayg = permissions.has("pricing.view");
  const canManage = permissions.has("subscriptions.manage");

  const [createOpen, setCreateOpen] = useState(false);
  const [createDraft, setCreateDraft] = useState<PlanDraft>(() =>
    defaultDraft(),
  );
  const [editId, setEditId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<PlanDraft>(() => defaultDraft());
  const [toggleConfirm, setToggleConfirm] = useState<{
    id: string;
    name: string;
    makeActive: boolean;
  } | null>(null);
  const [archiveConfirm, setArchiveConfirm] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const plansQuery = useQuery({
    queryKey: ["admin-subscription-plans"],
    enabled: canViewPlans,
    queryFn: async () => {
      const res = await admin.json<unknown>("/api/admin/subscription-plans");
      if (!res.ok) throw new Error(res.message);
      const parsed = AdminSubscriptionPlanIndexResponseSchema.safeParse(
        res.data,
      );
      if (!parsed.success)
        throw new Error("Unexpected subscription plan payload.");
      return parsed.data.data.items;
    },
  });

  const pageDescription = useMemo(() => {
    if (canViewPlans && canViewPayg) {
      return canManage
        ? "Pay-as-you-go rules set blade pricing; subscription plans define recurring programmes. Existing subscriptions keep price snapshots."
        : "View pay-as-you-go rules and the plan catalogue. Editing plans requires subscriptions.manage.";
    }
    if (canViewPlans) {
      return canManage
        ? "Manage the plan catalogue. Existing company subscriptions keep price snapshots for historical accuracy."
        : "View the plan catalogue. Editing and archiving require subscriptions.manage (finance / administrators).";
    }
    return "Configure pay-as-you-go blade pricing. Viewing the subscription catalogue requires subscriptions.view.";
  }, [canManage, canViewPayg, canViewPlans]);

  const createPlan = useMutation({
    mutationFn: async (payload: PlanDraft) => {
      const res = await admin.json<unknown>("/api/admin/subscription-plans", {
        method: "POST",
        body: JSON.stringify(draftToApiPayload(payload)),
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
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Create failed."),
  });

  const updatePlan = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: PlanDraft }) => {
      const res = await admin.json<unknown>(
        `/api/admin/subscription-plans/${id}`,
        {
          method: "PUT",
          body: JSON.stringify(draftToApiPayload(payload)),
        },
      );
      if (!res.ok) throw new Error(res.message);
      return res.data;
    },
    onSuccess: async () => {
      toast.success("Plan updated.");
      setEditId(null);
      await qc.invalidateQueries({ queryKey: ["admin-subscription-plans"] });
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Update failed."),
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
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Update failed."),
  });

  const archivePlan = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const res = await admin.json<unknown>(
        `/api/admin/subscription-plans/${id}/archive`,
        {
          method: "POST",
          body: JSON.stringify({}),
        },
      );
      if (!res.ok) throw new Error(res.message);
      return res.data;
    },
    onSuccess: async () => {
      toast.success("Plan archived.");
      setArchiveConfirm(null);
      await qc.invalidateQueries({ queryKey: ["admin-subscription-plans"] });
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Archive failed."),
  });

  const rows = useMemo(() => plansQuery.data ?? [], [plansQuery.data]);
  const saving =
    createPlan.isPending ||
    updatePlan.isPending ||
    toggleActive.isPending ||
    archivePlan.isPending;
  const actionsDisabled = saving || !canManage;

  const activeCount = useMemo(
    () => rows.filter((r) => r.is_active).length,
    [rows],
  );

  return (
    <div className="space-y-8">
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Plans & pricing", href: "/admin/subscription-plans" },
        ]}
      />

      <PageHeader
        title="Plans & pricing"
        description={pageDescription}
        actions={
          canViewPlans ? (
            <Button
              type="button"
              onClick={() => setCreateOpen((v) => !v)}
              disabled={actionsDisabled || !admin.origin}
            >
              <Plus className="mr-2 h-4 w-4" aria-hidden />
              New plan
            </Button>
          ) : undefined
        }
      />

      {canViewPayg ? <AdminPayAsYouGoRulesSection /> : null}

      {canViewPayg && canViewPlans ? <Separator /> : null}

      {canViewPlans ? (
        <>
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
                {rows.length
                  ? `${rows.length} total · ${activeCount} active`
                  : "No plans yet."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {plansQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading plans…</p>
              ) : plansQuery.isError ? (
                <p className="text-sm text-destructive">
                  {(plansQuery.error as Error).message}
                </p>
              ) : rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Create your first plan. Inactive plans cannot be assigned to
                  new companies.
                </p>
              ) : (
                <div className="space-y-3">
                  {rows.map((p) => {
                    const isEditing = editId === p.id;
                    const draft = isEditing ? editDraft : null;
                    return (
                      <div
                        key={p.id}
                        className="rounded-lg border bg-background"
                      >
                        <div className="flex flex-col gap-3 p-4 md:flex-row md:items-start md:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="truncate text-base font-semibold">
                                {(p.public_name?.trim()
                                  ? p.public_name
                                  : p.name) ?? p.name}
                              </div>
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${
                                  p.is_active
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {p.is_active ? "Active" : "Inactive"}
                              </span>
                              {p.show_on_public_site ? (
                                <span
                                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${
                                    p.is_active
                                      ? "bg-sky-50 text-sky-800"
                                      : "bg-amber-50 text-amber-900"
                                  }`}
                                  title={
                                    p.is_active
                                      ? "Shown on public marketing pages"
                                      : "Would appear on the marketing site once this plan is active"
                                  }
                                >
                                  {p.is_active
                                    ? "Marketing site"
                                    : "Marketing (inactive)"}
                                </span>
                              ) : null}
                              {p.recommended ? (
                                <span className="inline-flex items-center rounded-full bg-violet-50 px-2 py-0.5 text-xs text-violet-800 dark:bg-violet-950/50 dark:text-violet-200">
                                  Featured on marketing cards
                                </span>
                              ) : null}
                            </div>
                            <div className="mt-1 text-sm text-muted-foreground">
                              {INTERVALS.find(
                                (i) => i.value === p.billing_interval,
                              )?.label ?? p.billing_interval}{" "}
                              ·{" "}
                              {p.currency === "GBP"
                                ? formatGBP(p.price_amount_minor ?? 0)
                                : `${p.price_amount_minor} ${p.currency}`}
                            </div>
                            {p.public_name?.trim() &&
                            p.public_name.trim() !== (p.name ?? "") ? (
                              <p className="mt-1 text-xs text-muted-foreground">
                                Catalogue name: {p.name}
                              </p>
                            ) : null}
                            {p.description || p.public_description ? (
                              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                                {p.public_description?.trim()
                                  ? p.public_description
                                  : (p.description ?? "")}
                              </p>
                            ) : null}
                            <div className="mt-2 text-xs text-muted-foreground">
                              Included collections:{" "}
                              {p.included_collections ?? "—"} · Knife allowance:{" "}
                              {p.included_knife_allowance ?? "—"} · Overage:{" "}
                              {p.overage_price_amount_minor != null
                                ? formatGBP(p.overage_price_amount_minor)
                                : "—"}{" "}
                              · Sort: {p.sort_order}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 md:justify-end">
                            <Button
                              type="button"
                              variant="outline"
                              disabled={actionsDisabled}
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
                              disabled={actionsDisabled}
                              onClick={() =>
                                setToggleConfirm({
                                  id: p.id,
                                  name: p.name ?? "This plan",
                                  makeActive: !p.is_active,
                                })
                              }
                            >
                              <Power className="mr-2 h-4 w-4" aria-hidden />
                              {p.is_active ? "Deactivate" : "Activate"}
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              disabled={actionsDisabled}
                              onClick={() =>
                                setArchiveConfirm({
                                  id: p.id,
                                  name: p.name ?? "This plan",
                                })
                              }
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
                              onSave={() =>
                                updatePlan.mutate({ id: p.id, payload: draft! })
                              }
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

          <AlertDialog
            open={toggleConfirm !== null}
            onOpenChange={(open) => {
              if (!open) setToggleConfirm(null);
            }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {toggleConfirm?.makeActive
                    ? "Activate plan?"
                    : "Deactivate plan?"}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {toggleConfirm ? (
                    <>
                      <span className="font-medium text-foreground">
                        {toggleConfirm.name}
                      </span>
                      {toggleConfirm.makeActive
                        ? " will be available to assign to accounts again."
                        : " won’t be assignable to new accounts while it’s inactive. Existing subscriptions stay as they are."}
                    </>
                  ) : null}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  type="button"
                  onClick={() => {
                    if (toggleConfirm) {
                      toggleActive.mutate({
                        id: toggleConfirm.id,
                        active: toggleConfirm.makeActive,
                      });
                    }
                    setToggleConfirm(null);
                  }}
                >
                  {toggleConfirm?.makeActive ? "Activate" : "Deactivate"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog
            open={archiveConfirm !== null}
            onOpenChange={(open) => {
              if (!open) setArchiveConfirm(null);
            }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Archive subscription plan?</AlertDialogTitle>
                <AlertDialogDescription>
                  {archiveConfirm ? (
                    <>
                      <span className="font-medium text-foreground">
                        {archiveConfirm.name}
                      </span>{" "}
                      will be removed from the active catalogue. Existing
                      company subscriptions stay linked; this cannot be undone
                      from this screen.
                    </>
                  ) : null}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
                <AlertDialogAction asChild>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={archivePlan.isPending}
                    onClick={async (e) => {
                      e.preventDefault();
                      if (!archiveConfirm) return;
                      try {
                        await archivePlan.mutateAsync({
                          id: archiveConfirm.id,
                        });
                      } catch {
                        /* toast via mutation onError */
                      }
                    }}
                  >
                    {archivePlan.isPending ? "Archiving…" : "Archive plan"}
                  </Button>
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      ) : null}
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
        <CardDescription className="text-sm">
          {props.description}
        </CardDescription>
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
  const update = (patch: Partial<PlanDraft>) =>
    props.onChange({ ...d, ...patch });

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="plan-name">Catalogue name</Label>
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
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === "") {
                update({ sort_order: 0 });
                return;
              }
              const n = Number(raw);
              if (!Number.isFinite(n)) return;
              update({ sort_order: Math.max(0, Math.floor(n)) });
            }}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="plan-desc">Description (internal / catalogue)</Label>
        <Input
          id="plan-desc"
          value={d.description}
          onChange={(e) => update({ description: e.target.value })}
          placeholder="What’s included, what’s not, and how overages work."
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="plan-public-name">Public name (optional)</Label>
          <Input
            id="plan-public-name"
            value={d.public_name}
            onChange={(e) =>
              update({ public_name: e.target.value.slice(0, 160) })
            }
            placeholder="Marketing title — defaults to catalogue name when empty"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="plan-public-desc">
            Public description (optional)
          </Label>
          <Textarea
            id="plan-public-desc"
            value={d.public_description}
            onChange={(e) =>
              update({ public_description: e.target.value.slice(0, 2000) })
            }
            placeholder="Short customer-facing summary for subscription cards"
            rows={3}
            className="min-h-[72px] resize-y text-sm"
          />
        </div>
      </div>

      <Separator />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Billing interval</Label>
          <Select
            value={d.billing_interval}
            onValueChange={(v) => update({ billing_interval: v })}
          >
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
            onChange={(e) =>
              update({ currency: e.target.value.toUpperCase().slice(0, 3) })
            }
            placeholder="GBP"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label>Price (GBP)</Label>
          <Input
            inputMode="decimal"
            value={d.price_gbp_input}
            onChange={(e) => update({ price_gbp_input: e.target.value })}
            placeholder="0.00"
          />
          <p className="text-xs text-muted-foreground">
            Stored in minor units; shown as GBP.
          </p>
        </div>
        <div className="space-y-2">
          <Label>Overage price (GBP)</Label>
          <Input
            inputMode="decimal"
            value={d.overage_gbp_input}
            onChange={(e) => update({ overage_gbp_input: e.target.value })}
            placeholder="Optional"
          />
        </div>
        <div className="flex flex-col gap-2 md:col-span-1">
          <label className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={d.is_active}
              onChange={(e) => update({ is_active: e.target.checked })}
            />
            <span className="text-sm">
              {d.is_active ? "Active" : "Inactive"}
            </span>
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={d.show_on_public_site}
              onChange={(e) =>
                update({ show_on_public_site: e.target.checked })
              }
            />
            <span className="text-sm">Show on marketing site</span>
          </label>
          <p className="text-xs text-muted-foreground">
            Public pages only list plans that are active and have this option
            on. Home, pricing, and subscriptions load the live catalogue from{" "}
            <span className="font-medium text-foreground">
              GET /api/public/subscription-plans
            </span>
            .
          </p>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <div className="text-sm font-medium text-foreground">
          Public programme cards
        </div>
        <p className="text-xs text-muted-foreground">
          Optional bullets and CTA label appear on marketing subscription cards.
          Leave blank to use sensible defaults.
        </p>
        <div className="space-y-2">
          <Label htmlFor="plan-highlights">
            Highlight bullets (one per line)
          </Label>
          <Textarea
            id="plan-highlights"
            value={d.public_highlights_text}
            onChange={(e) => update({ public_highlights_text: e.target.value })}
            placeholder="One bullet per line, e.g. Rolling route priority"
            rows={4}
            className="min-h-[100px] resize-y font-mono text-sm"
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="plan-cta-label">Button label (optional)</Label>
            <Input
              id="plan-cta-label"
              value={d.public_cta_label}
              onChange={(e) =>
                update({ public_cta_label: e.target.value.slice(0, 80) })
              }
              placeholder="Choose plan"
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 md:mt-7">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={d.recommended}
              onChange={(e) => update({ recommended: e.target.checked })}
            />
            <span className="text-sm">
              Featured (recommended) on marketing cards
            </span>
          </label>
        </div>
      </div>

      <Separator />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Included collections</Label>
          <Input
            inputMode="numeric"
            value={
              d.included_collections == null
                ? ""
                : String(d.included_collections)
            }
            onChange={(e) =>
              update({ included_collections: intOrNull(e.target.value) })
            }
            placeholder="Optional"
          />
        </div>
        <div className="space-y-2">
          <Label>Included knife allowance</Label>
          <Input
            inputMode="numeric"
            value={
              d.included_knife_allowance == null
                ? ""
                : String(d.included_knife_allowance)
            }
            onChange={(e) =>
              update({ included_knife_allowance: intOrNull(e.target.value) })
            }
            placeholder="Optional"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={props.onCancel}
          disabled={props.saving}
        >
          <X className="mr-2 h-4 w-4" aria-hidden />
          Cancel
        </Button>
        <Button
          type="button"
          onClick={props.onSave}
          disabled={props.saving || d.name.trim() === ""}
        >
          {props.saving ? (
            <Save className="mr-2 h-4 w-4" aria-hidden />
          ) : (
            <Check className="mr-2 h-4 w-4" aria-hidden />
          )}
          Save
        </Button>
        <div className="text-xs text-muted-foreground">
          Changing plan price affects future assignments only. Existing
          subscriptions keep price snapshots.
        </div>
      </div>
    </div>
  );
}
