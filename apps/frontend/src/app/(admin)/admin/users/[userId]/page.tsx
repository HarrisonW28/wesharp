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

import type { UserDetail, UserRoleValue, UserStatusValue } from "@/lib/api/admin-users-schema";
import { UserDetailResponseSchema, UserRoleEnum, UserStatusEnum } from "@/lib/api/admin-users-schema";
import { USER_ROLE_DESCRIPTIONS, USER_ROLE_LABELS, USER_STATUS_LABELS } from "@/lib/admin-user-role-copy";
import { useAdminApi } from "@/lib/api/use-admin-api";

import { AuditTimeline, type AuditTimelineRow } from "@/components/admin/AuditTimeline";
import { CompanyLookup } from "@/components/admin/lookups/AsyncEntityLookup";
import { NavBreadcrumbs } from "@/components/layout/NavBreadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { useBackendMe } from "@/hooks/use-backend-me";

const ROLE_OPTIONS: { value: UserRoleValue; label: string }[] = (
  [
    "super_admin",
    "admin",
    "developer",
    "route_manager",
    "driver",
    "sales",
    "finance",
    "customer_owner",
    "customer_staff",
  ] as const
).map((value) => ({ value, label: USER_ROLE_LABELS[value] }));

const STATUS_OPTIONS: { value: UserStatusValue; label: string }[] = (
  ["invited", "active", "suspended"] as const
).map((value) => ({ value, label: USER_STATUS_LABELS[value] ?? value }));

function customerRole(role: UserRoleValue): boolean {
  return role === "customer_owner" || role === "customer_staff";
}

const editSchema = z
  .object({
    role: UserRoleEnum,
    status: UserStatusEnum,
    company_id: z.string(),
    confirm_super_demotion: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    if (!customerRole(val.role)) {
      return;
    }
    if (val.company_id.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Customer roles must be linked to a company.",
        path: ["company_id"],
      });
      return;
    }
    const uuidOk = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      val.company_id.trim(),
    );
    if (!uuidOk) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Choose a valid company from search.",
        path: ["company_id"],
      });
    }
  });

type EditFormValues = z.infer<typeof editSchema>;

function formDefaults(user: UserDetail): EditFormValues {
  const fromApi = user.company_id?.trim() ?? "";
  const fromEmbed = user.company?.id?.trim() ?? "";
  const company_id = customerRole(user.role) ? fromApi || fromEmbed : "";
  return {
    role: user.role,
    status: user.status ?? "active",
    company_id,
    confirm_super_demotion: "",
  };
}

export default function AdminUserDetailPage() {
  const params = useParams();
  const userId =
    typeof params.userId === "string" ? params.userId : Array.isArray(params.userId) ? params.userId[0] : "";

  const admin = useAdminApi();

  const userQuery = useQuery({
    enabled: Boolean(userId),
    queryKey: ["admin-user", userId],
    queryFn: async () => {
      const res = await admin.json<unknown>(`/api/admin/users/${userId}`);
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = UserDetailResponseSchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Unexpected user payload.");
      }
      return parsed.data.data;
    },
  });

  const user = userQuery.data;

  if (!userId) {
    return null;
  }

  return (
    <div className="space-y-8">
      <NavBreadcrumbs suffix={[{ label: user?.name ?? "Profile" }]} />
      {userQuery.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading user…
        </div>
      ) : userQuery.isError ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {userQuery.error instanceof Error ? userQuery.error.message : "Could not load user."}
        </div>
      ) : user ? (
        <ManageUserPanels user={user} userId={userId} />
      ) : null}
    </div>
  );
}

function ManageUserPanels({ user, userId }: { user: UserDetail; userId: string }) {
  const admin = useAdminApi();
  const qc = useQueryClient();
  const { data: me } = useBackendMe();

  const perms = useMemo(() => new Set(me?.data?.permissions ?? []), [me?.data?.permissions]);
  const canManage = perms.has("users.manage");
  const actorId = me?.data?.user.id ?? "";

  const [suspendOpen, setSuspendOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);

  const editFormValues = useMemo(() => formDefaults(user), [user]);

  const form = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    values: editFormValues,
  });

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: ["admin-user", userId] });
    await qc.invalidateQueries({ queryKey: ["admin-users"] });
    await qc.invalidateQueries({ queryKey: ["backend-me"] });
  };

  const updateMutation = useMutation({
    mutationFn: async (values: EditFormValues) => {
      const trimmedCompany = values.company_id.trim();
      const body: Record<string, unknown> = {
        role: values.role,
        status: values.status,
      };
      body.company_id = customerRole(values.role) ? (trimmedCompany === "" ? null : trimmedCompany) : null;

      if ((values.confirm_super_demotion ?? "") === "REMOVE_MY_SUPER_ACCESS") {
        body.confirm_super_demotion = "REMOVE_MY_SUPER_ACCESS";
      }

      const res = await admin.json(`/api/admin/users/${userId}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new Error(res.message);
      }
      return res.data;
    },
    onSuccess: async () => {
      toast.success("User updated.");
      setSaveOpen(false);
      await invalidate();
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Update failed.");
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async () => {
      const res = await admin.json(`/api/admin/users/${userId}/deactivate`, { method: "POST" });
      if (!res.ok) {
        throw new Error(res.message);
      }
      return res.data;
    },
    onSuccess: async () => {
      toast.success("User suspended.");
      setSuspendOpen(false);
      await invalidate();
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Could not suspend user.");
    },
  });

  const activateMutation = useMutation({
    mutationFn: async () => {
      const res = await admin.json(`/api/admin/users/${userId}/activate`, { method: "POST" });
      if (!res.ok) {
        throw new Error(res.message);
      }
      return res.data;
    },
    onSuccess: async () => {
      toast.success("User activated.");
      await invalidate();
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Could not activate user.");
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async () => {
      const res = await admin.json(`/api/admin/users/${userId}/invite-placeholder`, { method: "POST" });
      if (!res.ok) {
        throw new Error(res.message);
      }
      return res.data;
    },
    onSuccess: async () => {
      toast.message("Logged invite request — email not sent yet.");
      await invalidate();
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Request failed.");
    },
  });

  const watchedRole = form.watch("role");
  const watchedStatus = form.watch("status");
  const watchedCompanyId = form.watch("company_id");
  const needsSelfDemotionBanner =
    canManage && actorId === userId && user.role === "super_admin" && watchedRole !== "super_admin";

  const isSelf = actorId === userId;
  const suspended = user.status === "suspended";

  const desiredCompanyId: string | null = customerRole(watchedRole)
    ? watchedCompanyId.trim() || null
    : null;
  const savedCompanyId: string | null = (user.company_id ?? "").trim() || null;
  const companyDirty = desiredCompanyId !== savedCompanyId;

  const dirtyRisk =
    canManage &&
    (watchedRole !== user.role ||
      watchedStatus !== (user.status ?? "active") ||
      companyDirty);

  const submitValues = (vals: EditFormValues) => {
    if (needsSelfDemotionBanner && (vals.confirm_super_demotion ?? "").trim() !== "REMOVE_MY_SUPER_ACCESS") {
      toast.error("Enter REMOVE_MY_SUPER_ACCESS to confirm stepping down from super admin.");
      return;
    }
    updateMutation.mutate(vals);
  };

  return (
    <>
      <PageHeader
        title={user.name}
        description={user.email}
        actions={
          canManage ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={inviteMutation.isPending}
                onClick={() => inviteMutation.mutate()}
              >
                {inviteMutation.isPending ? "Recording…" : "Resend invite (placeholder)"}
              </Button>
              {suspended ? (
                <Button type="button" variant="outline" size="sm" disabled={activateMutation.isPending} onClick={() => activateMutation.mutate()}>
                  {activateMutation.isPending ? "Activating…" : "Activate user"}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={deactivateMutation.isPending || isSelf}
                  onClick={() => setSuspendOpen(true)}
                  title={isSelf ? "You cannot suspend your own login from this workspace." : undefined}
                >
                  Suspend user
                </Button>
              )}
            </div>
          ) : null
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profile</CardTitle>
            <CardDescription>Laravel user record — role and status control API access.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex flex-wrap gap-2">
              <Badge variant={user.role === "super_admin" || user.role === "admin" ? "default" : "secondary"}>
                {USER_ROLE_LABELS[user.role] ?? user.role}
              </Badge>
              <Badge variant="outline">{user.role_bucket === "internal" ? "Internal" : "Customer"}</Badge>
              {user.status ? <Badge variant="outline">{USER_STATUS_LABELS[user.status] ?? user.status}</Badge> : null}
            </div>
            {user.company_id ? (
              <div>
                <span className="text-muted-foreground">Linked company</span>
                <p>
                  <Link className="text-primary hover:underline" href={`/admin/crm/${user.company_id}`}>
                    {user.company?.name ?? "View account"}
                  </Link>
                  {user.company?.city ? <span className="text-muted-foreground"> · {user.company.city}</span> : null}
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">No company binding.</p>
            )}
            <div className="text-xs text-muted-foreground">
              Created {user.created_at ?? "—"} · Updated {user.updated_at ?? "—"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Admin metadata</CardTitle>
            <CardDescription>Internal reference only — not shown in tenant-facing UI.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            <span className="text-muted-foreground">Clerk user ID</span>
            <p className="break-all font-mono text-xs">{user.admin_metadata.clerk_user_id ?? "—"}</p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Recent activity</CardTitle>
            <CardDescription>Audit events for this user record.</CardDescription>
          </CardHeader>
          <CardContent>
            <AuditTimeline
              items={user.recent_activity as AuditTimelineRow[]}
              showPayload
              showMeta={false}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Manage access</CardTitle>
            <CardDescription>Requires users.manage (super admin or admin).</CardDescription>
          </CardHeader>
          <CardContent>
            {!canManage ? (
              <p className="text-sm text-muted-foreground">View-only — your role cannot change user assignments.</p>
            ) : (
              <form
                className="space-y-4"
                onSubmit={form.handleSubmit((vals) => {
                  if (dirtyRisk) {
                    setSaveOpen(true);
                    return;
                  }
                  submitValues(vals);
                })}
              >
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={form.watch("role")}
                    onValueChange={(v) => {
                      const next = v as UserRoleValue;
                      form.setValue("role", next, { shouldValidate: true });
                      if (!customerRole(next)) {
                        form.setValue("company_id", "", { shouldValidate: true });
                      } else if ((form.getValues("company_id") ?? "").trim() === "" && user.company_id) {
                        form.setValue("company_id", user.company_id, { shouldValidate: true });
                      }
                    }}
                  >
                    <SelectTrigger id="role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">{USER_ROLE_DESCRIPTIONS[form.watch("role")]}</p>
                  {form.formState.errors.role ? (
                    <p className="text-xs text-destructive">{form.formState.errors.role.message}</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={form.watch("status")}
                    onValueChange={(v) => form.setValue("status", v as UserStatusValue, { shouldValidate: true })}
                  >
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.status ? (
                    <p className="text-xs text-destructive">{form.formState.errors.status.message}</p>
                  ) : null}
                </div>

                {customerRole(watchedRole) ? (
                  <div className="space-y-2">
                    <CompanyLookup
                      label="Company"
                      id="company_id"
                      value={watchedCompanyId.trim() === "" ? null : watchedCompanyId}
                      onChange={(id) => form.setValue("company_id", id ?? "", { shouldValidate: true })}
                      nullable
                      placeholder="Search company…"
                      initialOption={
                        user.company
                          ? {
                              id: user.company.id,
                              label: user.company.name,
                              description: user.company.city ?? null,
                            }
                          : null
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Customer roles are scoped to one CRM account. Search by company name or open the{" "}
                      <Link href="/admin/crm" className="text-primary underline">
                        CRM directory
                      </Link>
                      .
                    </p>
                    {form.formState.errors.company_id ? (
                      <p className="text-xs text-destructive">{form.formState.errors.company_id.message}</p>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Internal roles are scoped by role only, not by a CRM account. Saving with an internal role clears
                    tenant company binding when one was set.
                  </p>
                )}

                {needsSelfDemotionBanner ? (
                  <div className="space-y-2 rounded-lg border border-primary/40 bg-primary/10 p-3">
                    <p className="text-sm font-medium text-foreground">You are lowering your own super admin access</p>
                    <p className="text-xs text-muted-foreground">
                      Type REMOVE_MY_SUPER_ACCESS to confirm — you will need another super admin to restore it.
                    </p>
                    <Input placeholder="REMOVE_MY_SUPER_ACCESS" {...form.register("confirm_super_demotion")} />
                  </div>
                ) : null}

                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Saving…" : "Save changes"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={suspendOpen} onOpenChange={setSuspendOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspend this user?</AlertDialogTitle>
            <AlertDialogDescription>
              They will lose access until reactivated. You cannot suspend the last active super admin or yourself.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button variant="destructive" disabled={deactivateMutation.isPending} onClick={() => deactivateMutation.mutate()}>
              {deactivateMutation.isPending ? "Suspending…" : "Suspend"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={saveOpen} onOpenChange={setSaveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply access changes?</AlertDialogTitle>
            <AlertDialogDescription>
              Role, status, and company binding update Laravel immediately and are audited. Confirm to continue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              disabled={updateMutation.isPending}
              onClick={() => {
                void form.handleSubmit(submitValues)();
              }}
            >
              {updateMutation.isPending ? "Saving…" : "Confirm"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
