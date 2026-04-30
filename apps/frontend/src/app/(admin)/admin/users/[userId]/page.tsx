"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { UserDetail, UserRoleValue, UserStatusValue } from "@/lib/api/admin-users-schema";
import { UserDetailResponseSchema, UserRoleEnum, UserStatusEnum } from "@/lib/api/admin-users-schema";
import { useAdminApi } from "@/lib/api/use-admin-api";

import { CompanyLookup } from "@/components/admin/lookups/AsyncEntityLookup";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
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

const ROLE_OPTIONS: { value: UserRoleValue; label: string }[] = [
  { value: "super_admin", label: "Super admin" },
  { value: "admin", label: "Admin" },
  { value: "route_manager", label: "Route manager" },
  { value: "finance", label: "Finance" },
  { value: "customer_owner", label: "Customer owner" },
  { value: "customer_staff", label: "Customer staff" },
];

const STATUS_OPTIONS: { value: UserStatusValue; label: string }[] = [
  { value: "invited", label: "Invited" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
];

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

  const form = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    values: formDefaults(user),
  });

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: ["admin-user", userId] });
    await qc.invalidateQueries({ queryKey: ["admin-users"] });
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

  const watchedRole = form.watch("role");
  const needsSelfDemotionBanner =
    canManage && actorId === userId && user.role === "super_admin" && watchedRole !== "super_admin";

  const isSelf = actorId === userId;
  const suspended = user.status === "suspended";

  return (
    <>
      <PageHeader
        title={user.name}
        description={user.email}
        actions={
          canManage ? (
            <div className="flex flex-wrap gap-2">
              {suspended ? (
                <Button type="button" variant="outline" disabled={activateMutation.isPending} onClick={() => activateMutation.mutate()}>
                  {activateMutation.isPending ? "Activating…" : "Activate user"}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="destructive"
                  disabled={deactivateMutation.isPending || isSelf}
                  onClick={() => deactivateMutation.mutate()}
                  title={isSelf ? "You cannot suspend your own login from this workspace." : undefined}
                >
                  {deactivateMutation.isPending ? "Suspending…" : "Suspend user"}
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
            <CardDescription>Synced from Laravel and Clerk on sign-in.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <span className="text-muted-foreground">Clerk ID</span>
              <p className="font-mono text-xs">{user.clerk_user_id ?? "—"}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant={user.role === "super_admin" || user.role === "admin" ? "default" : "secondary"}>
                {ROLE_OPTIONS.find((r) => r.value === user.role)?.label ?? user.role}
              </Badge>
              {user.status ? <Badge variant="outline">{user.status}</Badge> : null}
            </div>
            {user.company_id ? (
              <div>
                <span className="text-muted-foreground">Linked account</span>
                <p>
                  <Link className="text-primary hover:underline" href={`/admin/crm/${user.company_id}`}>
                    {user.company?.name ?? user.company_id}
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
            <CardTitle className="text-base">Manage access</CardTitle>
            <CardDescription>Requires users.manage permission (super admin / admin).</CardDescription>
          </CardHeader>
          <CardContent>
            {!canManage ? (
              <p className="text-sm text-muted-foreground">View-only — your role cannot change user assignments.</p>
            ) : (
              <form
                className="space-y-4"
                onSubmit={form.handleSubmit((vals) => {
                  if (needsSelfDemotionBanner && (vals.confirm_super_demotion ?? "").trim() !== "REMOVE_MY_SUPER_ACCESS") {
                    toast.error("Enter REMOVE_MY_SUPER_ACCESS to confirm stepping down from super admin.");
                    return;
                  }
                  updateMutation.mutate(vals);
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
                    Staff roles may clear this field. Customer roles must point at a valid{" "}
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
                    <p className="text-sm font-medium text-foreground">
                      You are lowering your own super admin access
                    </p>
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
    </>
  );
}
