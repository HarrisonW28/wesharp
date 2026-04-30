"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";

import { LocationsResponseSchema } from "@/lib/api/account-schema";
import { useAccountApi } from "@/lib/api/use-account-api";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AccountLocationsPage() {
  const api = useAccountApi();
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ["account-locations-manage"],
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

  const addMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await api.json<unknown>("/api/account/locations", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error(res.message);
      }
      return res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["account-locations-manage"] });
      void qc.invalidateQueries({ queryKey: ["account-locations-pick"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (args: { id: string; body: Record<string, unknown> }) => {
      const res = await api.json<unknown>(`/api/account/locations/${args.id}`, {
        method: "PUT",
        body: JSON.stringify(args.body),
      });
      if (!res.ok) {
        throw new Error(res.message);
      }
      return res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["account-locations-manage"] });
      void qc.invalidateQueries({ queryKey: ["account-locations-pick"] });
    },
  });

  const rows = listQuery.data ?? [];

  const editingRow = editingId !== null ? rows.find((row) => row.id === editingId) : undefined;

  return (
    <div className="space-y-8">
      <Breadcrumbs homeHref="/account/dashboard" items={[{ label: "Locations" }]} />
      <PageHeader
        title="Venue locations"
        description="Operational crews use these pins for routing pickups — postal accuracy matters."
      />

      {listQuery.status === "pending" ? (
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
      ) : listQuery.error ? (
        <Alert variant="destructive">
          <AlertDescription>{(listQuery.error as Error).message}</AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((loc) => (
            <Card key={loc.id}>
              <CardHeader className="space-y-1">
                <CardTitle className="text-base">{loc.label}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {[loc.line_one, loc.postcode].filter(Boolean).join(" · ")}
                </p>
              </CardHeader>
              <CardContent className="space-y-1 text-sm leading-relaxed text-muted-foreground">
                <div>{loc.line_one ?? "—"}</div>
                {loc.line_two ? <div>{loc.line_two}</div> : null}
                <div>
                  {[loc.city, loc.country].filter(Boolean).join(", ")}
                </div>
              </CardContent>
              <CardFooter>
                <Button type="button" variant="outline" size="sm" onClick={() => setEditingId(loc.id)}>
                  Edit location
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <Card id="edit">
        <CardHeader>
          <CardTitle className="text-base">{editingRow ? `Update · ${editingRow.label}` : "Add a location"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {updateMutation.error ? (
            <Alert variant="destructive">
              <AlertDescription>{(updateMutation.error as Error).message}</AlertDescription>
            </Alert>
          ) : null}
          {addMutation.error ? (
            <Alert variant="destructive">
              <AlertDescription>{(addMutation.error as Error).message}</AlertDescription>
            </Alert>
          ) : null}
          <form
            key={editingRow?.id ?? "new"}
            className="grid gap-3 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const payload: Record<string, unknown> = {
                label: String(fd.get("label") ?? ""),
                line_one: String(fd.get("line_one") ?? ""),
                line_two: String(fd.get("line_two") ?? "").trim() || undefined,
                city: String(fd.get("city") ?? ""),
                postcode: String(fd.get("postcode") ?? "").trim() || undefined,
                country: String(fd.get("country") ?? "").trim() || undefined,
              };
              if (editingRow) {
                void updateMutation.mutateAsync({ id: editingRow.id, body: payload }).finally(() =>
                  setEditingId(null),
                );
              } else {
                void addMutation.mutateAsync(payload);
                e.currentTarget.reset();
              }
            }}
          >
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="label">Label</Label>
              <Input id="label" name="label" required defaultValue={editingRow?.label ?? ""} />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="line_one">Address line one</Label>
              <Input id="line_one" name="line_one" required defaultValue={editingRow?.line_one ?? ""} />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="line_two">Address line two</Label>
              <Input id="line_two" name="line_two" defaultValue={editingRow?.line_two ?? ""} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" name="city" required defaultValue={editingRow?.city ?? ""} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="postcode">Postcode</Label>
              <Input id="postcode" name="postcode" defaultValue={editingRow?.postcode ?? ""} />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="country">Country</Label>
              <Input id="country" name="country" placeholder="GB" defaultValue={editingRow?.country ?? ""} />
            </div>

            <div className="md:col-span-2 flex gap-3">
              <Button type="submit" disabled={addMutation.isPending || updateMutation.isPending}>
                {(addMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editingRow ? "Save changes" : "Add location"}
              </Button>
              {editingRow ? (
                <Button type="button" variant="ghost" onClick={() => setEditingId(null)}>
                  Cancel edit
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
