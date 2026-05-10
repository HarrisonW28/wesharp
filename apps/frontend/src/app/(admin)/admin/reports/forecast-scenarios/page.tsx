"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Loader2, Percent, Plus } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ForecastScenarioListResponseSchema } from "@/lib/api/admin-forecast-scenarios-schema";
import { useAdminApi } from "@/lib/api/use-admin-api";

import { useBackendMe } from "@/hooks/use-backend-me";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminForecastScenariosListPage() {
  const router = useRouter();
  const admin = useAdminApi();
  const queryClient = useQueryClient();
  const { data: meData } = useBackendMe();
  const permissions = useMemo(() => new Set(meData?.data?.permissions ?? []), [meData?.data?.permissions]);
  const mayManage = permissions.has("costs.manage");

  const listQuery = useQuery({
    queryKey: ["admin", "reports", "forecast-scenarios"],
    queryFn: async () => {
      const res = await admin.json<unknown>("/api/admin/reports/forecast-scenarios");
      if (!res.ok) throw new Error(res.message);
      const parsed = ForecastScenarioListResponseSchema.safeParse(res.data);
      if (!parsed.success) throw new Error("Unexpected forecast scenario list payload.");
      return parsed.data.data.scenarios;
    },
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");

  const createScenario = useMutation({
    mutationFn: async () => {
      const name = newName.trim();
      if (name === "") throw new Error("Name is required.");
      const res = await admin.json<unknown>("/api/admin/reports/forecast-scenarios", {
        method: "POST",
        body: JSON.stringify({
          name,
          scenario_type: "custom",
          inputs: {},
        }),
      });
      if (!res.ok) throw new Error(res.message);
      return res.data as { data?: { scenario?: { id?: string } } };
    },
    onSuccess: async (raw) => {
      toast.success("Scenario created.");
      setCreateOpen(false);
      setNewName("");
      await queryClient.invalidateQueries({ queryKey: ["admin", "reports", "forecast-scenarios"] });
      const id = raw?.data?.scenario?.id;
      if (typeof id === "string" && id !== "") {
        router.push(`/admin/reports/forecast-scenarios/${id}`);
      }
    },
    onError: (e: Error) => toast.error(e.message || "Could not create scenario."),
  });

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-16">
      <Breadcrumbs
        homeHref="/admin/dashboard"
        items={[
          { label: "Reporting hub", href: "/admin/reporting" },
          { label: "Forecast scenarios" },
        ]}
      />
      <PageHeader
        title="Forecast scenarios"
        description="Sprint 24.2 planning models — estimates only; ledger data stays untouched."
        actions={
          mayManage ? (
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button type="button" size="sm" variant="secondary">
                  <Plus className="mr-2 h-4 w-4" aria-hidden />
                  New custom scenario
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create scenario</DialogTitle>
                  <DialogDescription>Starts from workbook defaults merged with live recurring fixed costs from the cost catalogue.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-2 py-2">
                  <Label htmlFor="sc_name">Name</Label>
                  <Input id="sc_name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Q3 fundraise model" />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="button" onClick={() => void createScenario.mutate()} disabled={createScenario.isPending}>
                    {createScenario.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : "Create"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : null
        }
      />

      {listQuery.isLoading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading scenarios…
        </p>
      ) : listQuery.isError ? (
        <p className="text-sm text-destructive">{listQuery.error instanceof Error ? listQuery.error.message : "Failed to load."}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {(listQuery.data ?? []).map((s) => (
            <Link key={s.id} href={`/admin/reports/forecast-scenarios/${s.id}`} className="group block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              <Card className="h-full border-border/80 shadow-sm transition-colors group-hover:border-primary/35 group-hover:bg-accent/20">
                <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-2">
                  <Percent className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                  <div className="min-w-0 space-y-1">
                    <CardTitle className="text-base">{s.name}</CardTitle>
                    <CardDescription className="capitalize">
                      {s.scenario_type.replace(/_/g, " ")}
                      {s.preset_key ? ` · preset` : ""}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">Open for outputs, ROI buckets and drivers.</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
