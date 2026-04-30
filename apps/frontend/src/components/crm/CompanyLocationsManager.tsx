"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { LocationSchema } from "@/lib/api/admin-crm-schema";
import { useAdminApi } from "@/lib/api/use-admin-api";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type CrmLocation = z.infer<typeof LocationSchema>;

const addSchema = z.object({
  label: z.string().min(1, "Label is required."),
  line_one: z.string().optional(),
  line_two: z.string().optional(),
  city: z.string().optional(),
  postcode: z.string().optional(),
  country: z.string().optional(),
  notes: z.string().optional(),
});

const editSchema = addSchema;

type CompanyLocationsManagerProps = {
  companyId: string;
  locations: CrmLocation[];
  canManage: boolean;
  onInvalidate: () => Promise<void>;
};

export function CompanyLocationsManager({
  companyId,
  locations,
  canManage,
  onInvalidate,
}: CompanyLocationsManagerProps) {
  const admin = useAdminApi();
  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<CrmLocation | null>(null);

  const addForm = useForm<z.infer<typeof addSchema>>({
    resolver: zodResolver(addSchema),
    defaultValues: {
      label: "",
      line_one: "",
      line_two: "",
      city: "",
      postcode: "",
      country: "",
      notes: "",
    },
  });

  const editForm = useForm<z.infer<typeof editSchema>>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      label: "",
      line_one: "",
      line_two: "",
      city: "",
      postcode: "",
      country: "",
      notes: "",
    },
  });

  const editing = editId ? locations.find((l) => l.id === editId) : undefined;

  const addMutation = useMutation({
    mutationFn: async (payload: z.infer<typeof addSchema>) => {
      const res = await admin.json(`/api/admin/companies/${companyId}/locations`, {
        method: "POST",
        body: JSON.stringify({
          ...payload,
          line_one: payload.line_one?.trim() || null,
          line_two: payload.line_two?.trim() || null,
          city: payload.city?.trim() || null,
          postcode: payload.postcode?.trim() || null,
          country: payload.country?.trim() || null,
          notes: payload.notes?.trim() ? payload.notes.trim() : null,
        }),
      });
      if (!res.ok) {
        throw new Error(res.message);
      }
      return res.data;
    },
    onSuccess: async () => {
      toast.success("Location added.");
      addForm.reset();
      setAddOpen(false);
      await onInvalidate();
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Could not add location.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: z.infer<typeof editSchema> }) => {
      const res = await admin.json(`/api/admin/companies/${companyId}/locations/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          ...body,
          line_one: body.line_one?.trim() || null,
          line_two: body.line_two?.trim() || null,
          city: body.city?.trim() || null,
          postcode: body.postcode?.trim() || null,
          country: body.country?.trim() || null,
          notes: body.notes?.trim() ? body.notes.trim() : null,
        }),
      });
      if (!res.ok) {
        throw new Error(res.message);
      }
      return res.data;
    },
    onSuccess: async () => {
      toast.success("Location saved.");
      setEditId(null);
      await onInvalidate();
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Could not save location.");
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await admin.json(`/api/admin/companies/${companyId}/locations/${id}/archive`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        throw new Error(res.message);
      }
      return res.data;
    },
    onSuccess: async () => {
      toast.success("Location archived.");
      setArchiveTarget(null);
      await onInvalidate();
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Could not archive.");
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await admin.json(`/api/admin/companies/${companyId}/locations/${id}/restore`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        throw new Error(res.message);
      }
      return res.data;
    },
    onSuccess: async () => {
      toast.success("Location restored.");
      await onInvalidate();
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Could not restore.");
    },
  });

  const defaultMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await admin.json(`/api/admin/companies/${companyId}/locations/${id}/set-default`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        throw new Error(res.message);
      }
      return res.data;
    },
    onSuccess: async () => {
      toast.success("Default service location updated.");
      await onInvalidate();
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Could not set default.");
    },
  });

  const openEdit = (row: CrmLocation) => {
    setEditId(row.id);
    editForm.reset({
      label: row.label ?? "",
      line_one: row.line_one ?? "",
      line_two: row.line_two ?? "",
      city: row.city ?? "",
      postcode: row.postcode ?? "",
      country: row.country ?? "",
      notes: row.notes ?? "",
    });
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg">Service locations</CardTitle>
            <p className="text-sm text-muted-foreground">
              Sites we collect from or visit. Archived locations remain on past bookings.
            </p>
          </div>
          <Button
            type="button"
            className="min-h-10 w-full shrink-0 sm:w-auto"
            disabled={!canManage}
            onClick={() => setAddOpen(true)}
          >
            Add location
          </Button>
        </CardHeader>
        <CardContent>
          {locations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No locations — add one before scheduling bookings.</p>
          ) : (
            <ul className="space-y-4">
              {locations.map((loc) => {
                const archived = loc.is_archived === true;
                const line = [loc.line_one, loc.line_two, loc.city, loc.postcode].filter(Boolean).join(", ");
                return (
                  <li
                    key={loc.id}
                    className={`rounded-xl border px-4 py-4 ${archived ? "border-dashed bg-muted/30 opacity-90" : "bg-card"}`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 space-y-1">
                        <div className="text-base font-medium">
                          {loc.label}
                          {loc.is_default ? (
                            <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-normal text-primary">
                              Default site
                            </span>
                          ) : null}
                          {archived ? (
                            <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
                              {loc.status_label ?? "Archived"}
                            </span>
                          ) : (
                            <span className="ml-2 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-normal text-emerald-800 dark:text-emerald-200">
                              {loc.status_label ?? "Active"}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">{line || "—"}</div>
                        {loc.country ? (
                          <div className="text-sm text-muted-foreground">{loc.country}</div>
                        ) : null}
                        {loc.notes ? (
                          <p className="whitespace-pre-wrap pt-2 text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">Access / notes · </span>
                            {loc.notes}
                          </p>
                        ) : null}
                      </div>
                      {canManage ? (
                        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
                          {!archived ? (
                            <>
                              <Button
                                type="button"
                                variant="secondary"
                                className="min-h-10 w-full sm:w-auto"
                                disabled={defaultMutation.isPending || loc.is_default === true}
                                onClick={() => defaultMutation.mutate(loc.id)}
                              >
                                Set as default
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                className="min-h-10 w-full sm:w-auto"
                                onClick={() => openEdit(loc)}
                              >
                                Edit
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                className="min-h-10 w-full border-destructive/40 text-destructive sm:w-auto"
                                onClick={() => setArchiveTarget(loc)}
                              >
                                Archive
                              </Button>
                            </>
                          ) : (
                            <Button
                              type="button"
                              variant="secondary"
                              className="min-h-10 w-full sm:w-auto"
                              disabled={restoreMutation.isPending}
                              onClick={() => restoreMutation.mutate(loc.id)}
                            >
                              Restore
                            </Button>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add location</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={addForm.handleSubmit((v) => {
              addMutation.mutate(v);
            })}
          >
            <div className="space-y-2">
              <Label htmlFor="al-lbl">Site label</Label>
              <Input id="al-lbl" className="min-h-10" {...addForm.register("label")} />
              {addForm.formState.errors.label ? (
                <p className="text-sm text-destructive">{addForm.formState.errors.label.message}</p>
              ) : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Address line one</Label>
                <Input className="min-h-10" {...addForm.register("line_one")} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Address line two</Label>
                <Input className="min-h-10" {...addForm.register("line_two")} />
              </div>
              <div className="space-y-2">
                <Label>City</Label>
                <Input className="min-h-10" {...addForm.register("city")} />
              </div>
              <div className="space-y-2">
                <Label>Postcode</Label>
                <Input className="min-h-10" {...addForm.register("postcode")} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Country</Label>
                <Input className="min-h-10" placeholder="GB" {...addForm.register("country")} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="al-notes">Access instructions / notes</Label>
              <Textarea id="al-notes" rows={3} className="min-h-[88px]" {...addForm.register("notes")} />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="ghost" className="min-h-10" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="min-h-10" disabled={addMutation.isPending}>
                {addMutation.isPending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditId(null);
          }
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit location</DialogTitle>
          </DialogHeader>
          {editing ? (
            <form
              className="space-y-4"
              onSubmit={editForm.handleSubmit((v) => {
                if (editId) {
                  updateMutation.mutate({ id: editId, body: v });
                }
              })}
            >
              <div className="space-y-2">
                <Label htmlFor="el-lbl">Site label</Label>
                <Input id="el-lbl" className="min-h-10" {...editForm.register("label")} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Address line one</Label>
                  <Input className="min-h-10" {...editForm.register("line_one")} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Address line two</Label>
                  <Input className="min-h-10" {...editForm.register("line_two")} />
                </div>
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input className="min-h-10" {...editForm.register("city")} />
                </div>
                <div className="space-y-2">
                  <Label>Postcode</Label>
                  <Input className="min-h-10" {...editForm.register("postcode")} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Country</Label>
                  <Input className="min-h-10" {...editForm.register("country")} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="el-notes">Access instructions / notes</Label>
                <Textarea id="el-notes" rows={3} className="min-h-[88px]" {...editForm.register("notes")} />
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="ghost" className="min-h-10" onClick={() => setEditId(null)}>
                  Cancel
                </Button>
                <Button type="submit" className="min-h-10" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Saving…" : "Save changes"}
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={archiveTarget !== null} onOpenChange={(o) => !o && setArchiveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this location?</AlertDialogTitle>
            <AlertDialogDescription>
              It will no longer appear in booking location pickers. If it was the default site, another active location
              becomes default when possible. Historical bookings keep the link.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-10">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="min-h-10 bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => archiveTarget && archiveMutation.mutate(archiveTarget.id)}
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
