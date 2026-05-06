"use client";

import { useCallback, useMemo, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Save } from "lucide-react";

import {
  AdminPricingRuleMutationResponseSchema,
  AdminPricingRulesIndexResponseSchema,
  type PricingRuleRow,
} from "@/lib/api/admin-pricing-rules-schema";
import { AdminServiceAreasIndexResponseSchema } from "@/lib/api/admin-service-areas-schema";
import { useAdminApi } from "@/lib/api/use-admin-api";
import { useBackendMe } from "@/hooks/use-backend-me";
import { formatGBP, parseGbpInputToMinorUnits } from "@/lib/format/money";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Draft = {
  id: string | null;
  name: string;
  service_area_id: string;
  service_type: string;
  rule_kind: string;
  priority: string;
  amount_gbp: string;
  first_order_gbp: string;
  minimum_units: string;
  active: boolean;
};

function emptyDraft(): Draft {
  return {
    id: null,
    name: "",
    service_area_id: "",
    service_type: "",
    rule_kind: "per_knife",
    priority: "0",
    amount_gbp: "",
    first_order_gbp: "",
    minimum_units: "",
    active: true,
  };
}

function draftFromRule(r: PricingRuleRow): Draft {
  const c = r.constraints && typeof r.constraints === "object" ? r.constraints : {};
  const minU = c.minimum_units;
  const first = c.first_order_per_knife_pence;
  return {
    id: r.id,
    name: r.name,
    service_area_id: r.service_area_id ?? "",
    service_type: r.service_type ?? "",
    rule_kind: r.rule_kind,
    priority: String(r.priority),
    amount_gbp: r.amount_pence != null ? (r.amount_pence / 100).toFixed(2) : "",
    first_order_gbp: typeof first === "number" ? (first / 100).toFixed(2) : "",
    minimum_units: typeof minU === "number" ? String(minU) : "",
    active: r.active,
  };
}

function buildConstraints(d: Draft): Record<string, number> | null {
  const o: Record<string, number> = {};
  const min = d.minimum_units.trim();
  if (min !== "") {
    const n = parseInt(min, 10);
    if (Number.isFinite(n) && n >= 1) {
      o.minimum_units = n;
    }
  }
  if (d.first_order_gbp.trim() !== "") {
    try {
      const firstMinor = parseGbpInputToMinorUnits(d.first_order_gbp);
      if (firstMinor !== undefined) {
        o.first_order_per_knife_pence = firstMinor;
      }
    } catch {
      throw new Error("First-visit price must be a valid GBP amount.");
    }
  }
  return Object.keys(o).length ? o : null;
}

/** Pay-as-you-go pricing rules — embedded on the Plans & pricing admin page. */
export function AdminPayAsYouGoRulesSection() {
  const admin = useAdminApi();
  const qc = useQueryClient();
  const me = useBackendMe();
  const canManage = Boolean(me.data?.data?.permissions?.includes("pricing.manage"));

  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);

  const rulesQuery = useQuery({
    queryKey: ["admin-pricing-rules"],
    queryFn: async () => {
      const res = await admin.json<unknown>("/api/admin/pricing-rules");
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = AdminPricingRulesIndexResponseSchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Unexpected pricing rules response.");
      }
      return parsed.data.data.items;
    },
  });

  const areasQuery = useQuery({
    queryKey: ["admin-service-areas", "pricing-form"],
    queryFn: async () => {
      const res = await admin.json<unknown>("/api/admin/service-areas");
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = AdminServiceAreasIndexResponseSchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Unexpected service areas response.");
      }
      return parsed.data.data.items;
    },
    enabled: dialogOpen,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const priority = Math.max(0, parseInt(draft.priority, 10) || 0);
      let amountMinor: number;
      try {
        const p = parseGbpInputToMinorUnits(draft.amount_gbp);
        if (p === undefined) {
          throw new Error("Enter a standard price in GBP.");
        }
        amountMinor = p;
      } catch (e) {
        throw e instanceof Error ? e : new Error("Enter a valid standard price.");
      }
      if (draft.rule_kind === "per_knife" && amountMinor === 0) {
        throw new Error("Per-knife standard amount must be greater than zero.");
      }

      let constraints: Record<string, number> | null;
      try {
        constraints = buildConstraints(draft);
      } catch (e) {
        throw e instanceof Error ? e : new Error("Invalid optional fields.");
      }
      const body = {
        name: draft.name.trim(),
        service_area_id: draft.service_area_id || null,
        service_type: draft.service_type || null,
        rule_kind: draft.rule_kind,
        priority,
        amount_pence: amountMinor,
        constraints,
        active: draft.active,
      };

      if (draft.id) {
        const res = await admin.json<unknown>(`/api/admin/pricing-rules/${draft.id}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          throw new Error(res.message);
        }
        return AdminPricingRuleMutationResponseSchema.parse(res.data);
      }

      const res = await admin.json<unknown>("/api/admin/pricing-rules", {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new Error(res.message);
      }
      return AdminPricingRuleMutationResponseSchema.parse(res.data);
    },
    onSuccess: () => {
      toast.success(draft.id ? "Pricing rule updated." : "Pricing rule created.");
      void qc.invalidateQueries({ queryKey: ["admin-pricing-rules"] });
      setDialogOpen(false);
      setDraft(emptyDraft());
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openCreate = useCallback(() => {
    setDraft(emptyDraft());
    setDialogOpen(true);
  }, []);

  const openEdit = useCallback((r: PricingRuleRow) => {
    setDraft(draftFromRule(r));
    setDialogOpen(true);
  }, []);

  const constraintSummary = useCallback((r: PricingRuleRow) => {
    const c = r.constraints && typeof r.constraints === "object" ? r.constraints : {};
    const parts: string[] = [];
    if (typeof c.minimum_units === "number") {
      parts.push(`Min. blades billed: ${c.minimum_units}`);
    }
    if (typeof c.first_order_per_knife_pence === "number") {
      parts.push(`First-visit per blade: ${formatGBP(c.first_order_per_knife_pence)}`);
    }
    return parts.length ? parts.join(" · ") : "—";
  }, []);

  const areaLabel = useMemo(() => {
    const items = areasQuery.data ?? [];
    const m = new Map(items.map((a) => [a.id, a.name]));
    return (id: string | null) => (id && m.get(id)) || "All areas (global)";
  }, [areasQuery.data]);

  return (
    <section id="pay-as-you-go-rules" className="scroll-mt-24 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">Pay-as-you-go rules</h2>
          <p className="text-sm leading-snug text-muted-foreground">
            Per-knife and visit rates for quotes, public estimates, and default order lines. Higher priority wins when multiple
            rules match a service type and postcode. Subscription programme prices stay in the catalogue below.
          </p>
        </div>
        {canManage ? (
          <Button type="button" size="sm" className="shrink-0 rounded-lg" onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" aria-hidden />
            New rule
          </Button>
        ) : null}
      </div>

      {rulesQuery.isPending ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          Loading rules…
        </div>
      ) : null}

      {rulesQuery.error ? (
        <p className="text-sm text-destructive">{rulesQuery.error instanceof Error ? rulesQuery.error.message : "Failed to load."}</p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {(rulesQuery.data ?? []).length === 0 && !rulesQuery.isPending ? (
          <Card className="border-dashed sm:col-span-2 xl:col-span-3">
            <CardHeader>
              <CardTitle className="text-base">No rules yet</CardTitle>
              <CardDescription>
                Create a per-knife rule for each coverage band you serve, or one global rule.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}
        {(rulesQuery.data ?? []).map((r) => (
          <Card key={r.id} className="flex h-full flex-col">
            <CardHeader className="space-y-1 pb-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <CardTitle className="text-base leading-snug">{r.name}</CardTitle>
                <Badge variant={r.active ? "default" : "secondary"}>{r.active ? "Active" : "Off"}</Badge>
              </div>
              <CardDescription className="text-xs leading-snug">
                {r.rule_kind === "per_knife" ? "Per blade" : "Flat visit"} · Priority {r.priority}
                {r.service_type ? ` · ${r.service_type}` : " · Any service type"}
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-auto flex flex-1 flex-col gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Coverage</span>
                <p className="font-medium leading-snug">{areaLabel(r.service_area_id)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Standard amount</span>
                <p className="font-semibold tabular-nums">
                  {r.amount_pence != null ? formatGBP(r.amount_pence) : "—"}
                  {r.rule_kind === "per_knife" ? " / blade" : " / visit"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Extra conditions</span>
                <p className="text-xs leading-snug text-muted-foreground">{constraintSummary(r)}</p>
              </div>
              {canManage ? (
                <Button type="button" variant="outline" size="sm" className="mt-1 w-full rounded-lg" onClick={() => openEdit(r)}>
                  <Pencil className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                  Edit
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[min(90vh,40rem)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{draft.id ? "Edit pricing rule" : "New pricing rule"}</DialogTitle>
            <DialogDescription>
              First-visit per-blade price applies until the company has a completed, invoiced, or returned order — then the
              standard rate is used automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="pr-name">Name</Label>
              <Input
                id="pr-name"
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="e.g. Manchester collection · standard"
              />
            </div>
            <div className="grid gap-2">
              <Label>Service area</Label>
              <Select
                value={draft.service_area_id || "__global__"}
                onValueChange={(v) => setDraft((d) => ({ ...d, service_area_id: v === "__global__" ? "" : v }))}
              >
                <SelectTrigger className="w-full min-w-0 rounded-lg">
                  <SelectValue placeholder="Choose area" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__global__">All areas (global)</SelectItem>
                  {(areasQuery.data ?? []).map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                      {a.postcode_prefix ? ` · ${a.postcode_prefix}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
              <div className="grid gap-2">
                <Label>Service type</Label>
                <Select value={draft.service_type || "__any__"} onValueChange={(v) => setDraft((d) => ({ ...d, service_type: v === "__any__" ? "" : v }))}>
                  <SelectTrigger className="w-full min-w-0 rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__any__">Any</SelectItem>
                    <SelectItem value="collection">Collection</SelectItem>
                    <SelectItem value="onsite">On-site</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Rule kind</Label>
                <Select value={draft.rule_kind} onValueChange={(v) => setDraft((d) => ({ ...d, rule_kind: v }))}>
                  <SelectTrigger className="w-full min-w-0 rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="per_knife">Per knife / line</SelectItem>
                    <SelectItem value="flat_visit">Flat visit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
              <div className="grid gap-2">
                <Label htmlFor="pr-priority">Priority</Label>
                <Input
                  id="pr-priority"
                  inputMode="numeric"
                  value={draft.priority}
                  onChange={(e) => setDraft((d) => ({ ...d, priority: e.target.value.replace(/\D/g, "") }))}
                />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 rounded border-input accent-primary"
                    checked={draft.active}
                    onChange={(e) => setDraft((d) => ({ ...d, active: e.target.checked }))}
                  />
                  Active
                </label>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pr-amount">
                Standard price (GBP){draft.rule_kind === "per_knife" ? " · per blade" : " · per visit"}
              </Label>
              <Input
                id="pr-amount"
                inputMode="decimal"
                value={draft.amount_gbp}
                onChange={(e) => setDraft((d) => ({ ...d, amount_gbp: e.target.value }))}
                placeholder="8.50"
              />
            </div>
            {draft.rule_kind === "per_knife" ? (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="pr-first">First-visit price (GBP) · optional per blade</Label>
                  <Input
                    id="pr-first"
                    inputMode="decimal"
                    value={draft.first_order_gbp}
                    onChange={(e) => setDraft((d) => ({ ...d, first_order_gbp: e.target.value }))}
                    placeholder="Leave empty to use standard only"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="pr-min-u">Minimum units billed · optional</Label>
                  <Input
                    id="pr-min-u"
                    inputMode="numeric"
                    value={draft.minimum_units}
                    onChange={(e) => setDraft((d) => ({ ...d, minimum_units: e.target.value.replace(/\D/g, "") }))}
                    placeholder="e.g. 5 for a minimum blade count on estimates"
                  />
                </div>
              </>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-lg" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" className="rounded-lg" disabled={saveMutation.isPending || !canManage} onClick={() => void saveMutation.mutate()}>
              {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <Save className="mr-2 h-4 w-4" aria-hidden />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
