"use client";

import { useId, useState } from "react";

import { Loader2, MessageSquarePlus } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { CustomerPortalUpdateAdminRowSchema } from "@/lib/api/admin-routes-schema";
import { useAdminApi } from "@/lib/api/use-admin-api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { z } from "zod";

type UpdateRow = z.infer<typeof CustomerPortalUpdateAdminRowSchema>;
type Settings = {
  default_visibility?: string;
  allow_customer_visible_photos?: boolean;
};

export function RouteStopCustomerPortalSection({
  stopId,
  routeId,
  updates,
  settings,
}: {
  stopId: string;
  routeId: string;
  updates: UpdateRow[];
  settings?: Settings;
}) {
  const idPrefix = useId();
  const admin = useAdminApi();
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<string>(
    settings?.default_visibility === "customer_visible" ? "customer_visible" : "internal_only",
  );

  const allowCustomer = settings?.allow_customer_visible_photos !== false;

  const createMutation = useMutation({
    mutationFn: async () => {
      if (body.trim().length < 1) {
        throw new Error("Enter a message.");
      }
      const res = await admin.json<unknown>(`/api/admin/route-stops/${stopId}/customer-portal-updates`, {
        method: "POST",
        body: JSON.stringify({
          body: body.trim(),
          visibility: allowCustomer ? visibility : "internal_only",
        }),
      });
      if (!res.ok) {
        throw new Error(res.message);
      }
      return res.data;
    },
    onSuccess: () => {
      toast.success("Update saved.");
      setBody("");
      void queryClient.invalidateQueries({ queryKey: ["admin-route-stop", stopId] });
      void queryClient.invalidateQueries({ queryKey: ["admin-route-detail", routeId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const patchMutation = useMutation({
    mutationFn: async (args: { id: string; payload: Record<string, unknown> }) => {
      const res = await admin.json<unknown>(`/api/admin/customer-portal-updates/${args.id}`, {
        method: "PATCH",
        body: JSON.stringify(args.payload),
      });
      if (!res.ok) {
        throw new Error(res.message);
      }
      return res.data;
    },
    onSuccess: () => {
      toast.success("Updated.");
      void queryClient.invalidateQueries({ queryKey: ["admin-route-stop", stopId] });
      void queryClient.invalidateQueries({ queryKey: ["admin-route-detail", routeId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="border-white/10 bg-white/[0.03] p-4 md:border-border md:bg-card">
      <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-400 md:text-muted-foreground">
        <MessageSquarePlus className="h-5 w-5" aria-hidden />
        Customer portal messages
      </div>
      <p className="mt-2 text-base text-slate-300 md:text-muted-foreground">
        Short updates customers may see in their portal when marked customer-visible. Internal-only by default.
      </p>

      <div className="mt-4 space-y-3 rounded-xl border border-white/10 bg-white/5 p-4 md:border-border md:bg-muted/20">
        <div>
          <Label htmlFor={`${idPrefix}-msg`} className="text-base">
            New message
          </Label>
          <Textarea
            id={`${idPrefix}-msg`}
            className="mt-2 min-h-[100px] rounded-xl text-base"
            placeholder="e.g. Running 15 minutes late — still on our way."
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>
        {allowCustomer ? (
          <div>
            <Label className="text-base">Visibility</Label>
            <Select value={visibility} onValueChange={setVisibility}>
              <SelectTrigger className="mt-2 h-12 rounded-xl text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="internal_only" className="text-base">
                  Internal only
                </SelectItem>
                <SelectItem value="customer_visible" className="text-base">
                  Customer-visible
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : null}
        <Button
          type="button"
          className="h-12 w-full rounded-xl text-base font-semibold"
          disabled={createMutation.isPending || body.trim().length < 1}
          onClick={() => createMutation.mutate()}
        >
          {createMutation.isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden /> : null}
          Post update
        </Button>
      </div>

      {updates.length > 0 ? (
        <ul className="mt-6 space-y-3">
          {updates.map((u) => {
            const archived = Boolean(u.archived_at);
            return (
              <li
                key={u.id}
                className={cn(
                  "rounded-xl border border-white/10 bg-white/[0.04] p-3 text-base md:border-border md:bg-muted/20",
                  archived && "opacity-60",
                )}
              >
                <p className="whitespace-pre-wrap text-slate-100 md:text-foreground">{u.body}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-400 md:text-muted-foreground">
                  <span
                    className={cn(
                      "rounded-md px-2 py-0.5 text-xs font-semibold",
                      u.visibility === "customer_visible"
                        ? "bg-emerald-500/20 text-emerald-100 md:text-emerald-900"
                        : "bg-slate-500/20",
                    )}
                  >
                    {u.visibility === "customer_visible" ? "Customer-visible" : "Internal"}
                  </span>
                  {u.created_at ? <span className="tabular-nums">{new Date(u.created_at).toLocaleString("en-GB")}</span> : null}
                  {u.created_by?.name ? <span>· {u.created_by.name}</span> : null}
                </div>
                {!archived ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {allowCustomer ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-lg"
                        disabled={patchMutation.isPending}
                        onClick={() =>
                          patchMutation.mutate({
                            id: u.id,
                            payload: {
                              visibility: u.visibility === "customer_visible" ? "internal_only" : "customer_visible",
                            },
                          })
                        }
                      >
                        {u.visibility === "customer_visible" ? "Make internal" : "Share with customer"}
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="rounded-lg"
                      disabled={patchMutation.isPending}
                      onClick={() => {
                        if (!window.confirm("Archive this message?")) {
                          return;
                        }
                        patchMutation.mutate({ id: u.id, payload: { archived: true } });
                      }}
                    >
                      Archive
                    </Button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </Card>
  );
}
