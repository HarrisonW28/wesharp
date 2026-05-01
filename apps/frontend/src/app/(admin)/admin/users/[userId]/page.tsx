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

import { CompanyLookup } from "@/components/admin/lookups/AsyncEntityLookup";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
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
    "route_manager",
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

function auditActionLabel(action: string): string {
  const map: Record<string, string> = {
    "user.role_changed": "Role changed",
    "user.status_changed": "Status changed",
    "user.company_assignment_changed": "Company assignment changed",
    "user.deactivated": "User suspended",
    "user.activated": "User activated",
    "user.admin_updated": "User updated (legacy)",
    "user.invite_resend_placeholder": "Invite / resend (placeholder)",
  };
  return map[action] ?? action;
}

const editSchema = z
  .object({
    role: UserRoleEnum,
    status: UserStatusEnum,
    company_id: z.string(),
    confirm_super_demotion: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    if (customerRole(val.role) && val.company_id.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Customer roles must be linked to a company.",
        path: ["company_id"],
      });
    }
    const uuidOk =
      val.company_id.trim() === "" ||
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val.company_id.trim());
    if (!uuidOk) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Choose a valid company or leave blank for staff without a tenant.",
        path: ["company_id"],
      });
    }
  });

type EditFormValues = z.infer<typeof editSchema>;

function formDefaults(user: UserDetail): EditFormValues {
  return {
    role: user.role,
    status: user.status ?? "active",
    company_id: user.company_id ?? "",
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
      <Breadcrumbs
        items={[
          { label: "Users", href: "/admin/users" },
          { label: user?.name ?? "Profile" },
        ]}
      />
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

  const form = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    values: formDefaults(user),
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
      body.company_id = trimmedCompany === "" ? null : trimmedCompany;

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
  const needsSelfDemotionBanner =
    canManage && actorId === userId && user.role === "super_admin" && watchedRole !== "super_admin";

  const isSelf = actorId === userId;
  const suspended = user.status === "suspended";

  const dirtyRisk =
    canManage &&
    (watchedRole !== user.role ||
      watchedStatus !== (user.status ?? "active") ||
      form.watch("company_id").trim() !== (user.company_id ?? "").trim());

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
            {user.recent_activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">No audit entries yet.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {user.recent_activity.map((row) => (
                  <li key={row.id} className="rounded-lg border bg-muted/20 px-3 py-2">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-medium">{auditActionLabel(row.action)}</span>
                      <span className="text-xs text-muted-foreground">{row.created_at ?? ""}</span>
                    </div>
                    {row.payload != null && typeof row.payload === "object" && Object.keys(row.payload).length > 0 ? (
                      <pre className="mt-2 max-h-32 overflow-auto rounded bg-muted/40 p-2 text-xs">{JSON.stringify(row.payload, null, 2)}</pre>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
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
                    onValueChange={(v) => form.setValue("role", v as UserRoleValue, { shouldValidate: true })}
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

                <div className="space-y-2">
                  <CompanyLookup
                    label="Company"
                    id="company_id"
                    value={form.watch("company_id").trim() === "" ? null : form.watch("company_id")}
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
                    Search by company name. Staff may clear this; customer roles must link to a{" "}
                    <Link href="/admin/crm" className="text-primary underline">
                      CRM account
                    </Link>
                    .
                  </p>
                  {form.formState.errors.company_id ? (
                    <p className="text-xs text-destructive">{form.formState.errors.company_id.message}</p>
                  ) : null}
                </div>

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
