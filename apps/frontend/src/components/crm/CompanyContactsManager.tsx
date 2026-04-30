"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { ContactSchema } from "@/lib/api/admin-crm-schema";
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

type CrmContact = z.infer<typeof ContactSchema>;

const addSchema = z.object({
  first_name: z.string().min(1, "First name is required."),
  last_name: z.string().min(1, "Last name is required."),
  email: z.union([z.string().email("Enter a valid email."), z.literal("")]),
  phone: z.string().optional(),
  notes: z.string().optional(),
  billing_contact: z.boolean(),
});

const editSchema = z.object({
  first_name: z.string().min(1, "First name is required."),
  last_name: z.string().min(1, "Last name is required."),
  email: z.union([z.string().email("Enter a valid email."), z.literal("")]),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

type CompanyContactsManagerProps = {
  companyId: string;
  contacts: CrmContact[];
  canManage: boolean;
  onInvalidate: () => Promise<void>;
};

export function CompanyContactsManager({
  companyId,
  contacts,
  canManage,
  onInvalidate,
}: CompanyContactsManagerProps) {
  const admin = useAdminApi();
  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<CrmContact | null>(null);

  const addForm = useForm<z.infer<typeof addSchema>>({
    resolver: zodResolver(addSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      notes: "",
      billing_contact: false,
    },
  });

  const editForm = useForm<z.infer<typeof editSchema>>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      notes: "",
    },
  });

  const editing = editId ? contacts.find((c) => c.id === editId) : undefined;

  const addMutation = useMutation({
    mutationFn: async (payload: z.infer<typeof addSchema>) => {
      const res = await admin.json(`/api/admin/companies/${companyId}/contacts`, {
        method: "POST",
        body: JSON.stringify({
          ...payload,
          email: payload.email === "" ? null : payload.email,
          notes: payload.notes?.trim() ? payload.notes.trim() : null,
        }),
      });
      if (!res.ok) {
        throw new Error(res.message);
      }
      return res.data;
    },
    onSuccess: async () => {
      toast.success("Contact added.");
      addForm.reset();
      setAddOpen(false);
      await onInvalidate();
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Could not add contact.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: z.infer<typeof editSchema> }) => {
      const res = await admin.json(`/api/admin/companies/${companyId}/contacts/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          ...body,
          email: body.email === "" ? null : body.email,
          notes: body.notes?.trim() ? body.notes.trim() : null,
        }),
      });
      if (!res.ok) {
        throw new Error(res.message);
      }
      return res.data;
    },
    onSuccess: async () => {
      toast.success("Contact saved.");
      setEditId(null);
      await onInvalidate();
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Could not save contact.");
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await admin.json(`/api/admin/companies/${companyId}/contacts/${id}/archive`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        throw new Error(res.message);
      }
      return res.data;
    },
    onSuccess: async () => {
      toast.success("Contact archived.");
      setArchiveTarget(null);
      await onInvalidate();
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Could not archive.");
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await admin.json(`/api/admin/companies/${companyId}/contacts/${id}/restore`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        throw new Error(res.message);
      }
      return res.data;
    },
    onSuccess: async () => {
      toast.success("Contact restored.");
      await onInvalidate();
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Could not restore.");
    },
  });

  const primaryMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await admin.json(`/api/admin/companies/${companyId}/contacts/${id}/set-primary`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        throw new Error(res.message);
      }
      return res.data;
    },
    onSuccess: async () => {
      toast.success("Primary billing contact updated.");
      await onInvalidate();
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Could not update primary.");
    },
  });

  const openEdit = (row: CrmContact) => {
    setEditId(row.id);
    editForm.reset({
      first_name: row.first_name,
      last_name: row.last_name,
      email: row.email ?? "",
      phone: row.phone ?? "",
      notes: row.notes ?? "",
    });
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg">Contacts</CardTitle>
            <p className="text-sm text-muted-foreground">
              People we reach for bookings and billing. Archived contacts stay on historical records.
            </p>
          </div>
          <Button
            type="button"
            className="min-h-10 w-full shrink-0 sm:w-auto"
            disabled={!canManage}
            onClick={() => setAddOpen(true)}
          >
            Add contact
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {contacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No contacts recorded.</p>
          ) : (
            <ul className="space-y-4">
              {contacts.map((contact) => {
                const archived = contact.is_archived === true;
                return (
                  <li
                    key={contact.id}
                    className={`rounded-xl border px-4 py-4 ${archived ? "border-dashed bg-muted/30 opacity-90" : "bg-card"}`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 space-y-1">
                        <div className="text-base font-medium">
                          {contact.first_name} {contact.last_name}
                          {contact.billing_contact ? (
                            <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-normal text-primary">
                              Primary billing
                            </span>
                          ) : null}
                          {archived ? (
                            <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
                              {contact.status_label ?? "Archived"}
                            </span>
                          ) : (
                            <span className="ml-2 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-normal text-emerald-800 dark:text-emerald-200">
                              {contact.status_label ?? "Active"}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">{contact.email ?? "—"}</div>
                        <div className="text-sm text-muted-foreground">{contact.phone ?? "—"}</div>
                        {contact.notes ? (
                          <p className="whitespace-pre-wrap pt-2 text-sm text-muted-foreground">{contact.notes}</p>
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
                                disabled={primaryMutation.isPending || contact.billing_contact}
                                onClick={() => primaryMutation.mutate(contact.id)}
                              >
                                Set primary billing
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                className="min-h-10 w-full sm:w-auto"
                                onClick={() => openEdit(contact)}
                              >
                                Edit
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                className="min-h-10 w-full border-destructive/40 text-destructive sm:w-auto"
                                onClick={() => setArchiveTarget(contact)}
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
                              onClick={() => restoreMutation.mutate(contact.id)}
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add contact</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={addForm.handleSubmit((v) => {
              addMutation.mutate(v);
            })}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="add-fn">First name</Label>
                <Input id="add-fn" className="min-h-10" {...addForm.register("first_name")} />
                {addForm.formState.errors.first_name ? (
                  <p className="text-sm text-destructive">{addForm.formState.errors.first_name.message}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-ln">Last name</Label>
                <Input id="add-ln" className="min-h-10" {...addForm.register("last_name")} />
                {addForm.formState.errors.last_name ? (
                  <p className="text-sm text-destructive">{addForm.formState.errors.last_name.message}</p>
                ) : null}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-em">Email</Label>
              <Input id="add-em" type="email" className="min-h-10" {...addForm.register("email")} />
              {addForm.formState.errors.email ? (
                <p className="text-sm text-destructive">{addForm.formState.errors.email.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-ph">Phone</Label>
              <Input id="add-ph" className="min-h-10" {...addForm.register("phone")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-notes">Notes</Label>
              <Textarea id="add-notes" rows={3} className="min-h-[88px]" {...addForm.register("notes")} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...addForm.register("billing_contact")} />
              Primary billing contact
            </label>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit contact</DialogTitle>
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
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="ed-fn">First name</Label>
                  <Input id="ed-fn" className="min-h-10" {...editForm.register("first_name")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ed-ln">Last name</Label>
                  <Input id="ed-ln" className="min-h-10" {...editForm.register("last_name")} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ed-em">Email</Label>
                <Input id="ed-em" type="email" className="min-h-10" {...editForm.register("email")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ed-ph">Phone</Label>
                <Input id="ed-ph" className="min-h-10" {...editForm.register("phone")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ed-notes">Notes</Label>
                <Textarea id="ed-notes" rows={3} className="min-h-[88px]" {...editForm.register("notes")} />
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
            <AlertDialogTitle>Archive this contact?</AlertDialogTitle>
            <AlertDialogDescription>
              They will be hidden from new booking flows and primary billing selection. Past bookings and invoices stay
              linked.
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
