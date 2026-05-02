"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { Loader2, Newspaper } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAdminApi } from "@/lib/api/use-admin-api";
import {
  SITE_CONTENT_DEFAULTS,
  mergeSiteContent,
  type SiteContent,
} from "@/lib/site-content/site-content-defaults";
import { useBackendMe } from "@/hooks/use-backend-me";

function cloneContent(c: SiteContent): SiteContent {
  return JSON.parse(JSON.stringify(c)) as SiteContent;
}

export default function AdminContentSettingsPage() {
  const admin = useAdminApi();
  const qc = useQueryClient();
  const { data: me } = useBackendMe();
  const permissions = useMemo(() => new Set(me?.data?.permissions ?? []), [me?.data?.permissions]);
  const canManage = permissions.has("settings.manage");

  const [draft, setDraft] = useState<SiteContent | null>(null);

  const loadQuery = useQuery({
    enabled: canManage,
    queryKey: ["admin-site-content"],
    queryFn: async () => {
      const res = await admin.json<unknown>("/api/admin/site-content");
      if (!res.ok) {
        throw new Error(res.message);
      }
      const raw = res.data as { data?: { content?: unknown } };
      const content = raw?.data?.content;
      return mergeSiteContent(SITE_CONTENT_DEFAULTS, content);
    },
  });

  useEffect(() => {
    if (loadQuery.data) {
      setDraft(cloneContent(loadQuery.data));
    }
  }, [loadQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (body: SiteContent) => {
      const res = await admin.json<unknown>("/api/admin/site-content", {
        method: "PUT",
        body: JSON.stringify({ content: body }),
      });
      if (!res.ok) {
        throw new Error(res.message);
      }
    },
    onSuccess: () => {
      toast.success("Site content saved.");
      void qc.invalidateQueries({ queryKey: ["admin-site-content"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!canManage) {
    return (
      <>
        <Breadcrumbs crumbs={[{ label: "Settings", href: "/admin/dashboard" }, { label: "Site content" }]} />
        <PageHeader title="Site content" description="Your role cannot edit marketing copy." />
      </>
    );
  }

  if (loadQuery.isPending || !draft) {
    return (
      <>
        <Breadcrumbs crumbs={[{ label: "Settings", href: "/admin/dashboard" }, { label: "Site content" }]} />
        <PageHeader title="Site content" description="Loading…" />
        <div className="flex min-h-[30vh] items-center justify-center text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
        </div>
      </>
    );
  }

  if (loadQuery.isError) {
    return (
      <>
        <Breadcrumbs crumbs={[{ label: "Settings", href: "/admin/dashboard" }, { label: "Site content" }]} />
        <PageHeader title="Site content" description="Could not load settings." />
        <p className="text-sm text-destructive">{(loadQuery.error as Error).message}</p>
      </>
    );
  }

  const h = draft.homepage;

  return (
    <>
      <Breadcrumbs crumbs={[{ label: "Settings", href: "/admin/dashboard" }, { label: "Site content" }]} />
      <PageHeader
        title="Site content"
        description="Public marketing copy, booking helper text, and notification footer — audited when you save."
        actions={
          <Button
            type="button"
            size="lg"
            disabled={saveMutation.isPending}
            onClick={() => {
              const body: SiteContent = {
                ...draft,
                faq: (draft.faq ?? []).filter((x) => x.q.trim() !== "" && x.a.trim() !== ""),
              };
              saveMutation.mutate(body);
            }}
            className="gap-2"
          >
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Newspaper className="h-4 w-4" aria-hidden />}
            Save changes
          </Button>
        }
      />

      <div className="flex flex-col gap-6 pb-16">
        <Card>
          <CardHeader>
            <CardTitle>Homepage · hero</CardTitle>
            <CardDescription>Pill, headline, and primary calls to action.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field label="Hero badge / region pill" value={h.hero_badge} onChange={(v) => setDraft({ ...draft, homepage: { ...h, hero_badge: v } })} />
            <Field label="CTA · book" value={h.cta_book} onChange={(v) => setDraft({ ...draft, homepage: { ...h, cta_book: v } })} />
            <div className="md:col-span-2">
              <Area label="Hero title" value={h.hero_title} onChange={(v) => setDraft({ ...draft, homepage: { ...h, hero_title: v } })} />
            </div>
            <div className="md:col-span-2">
              <Area label="Hero subtitle" value={h.hero_subtitle} onChange={(v) => setDraft({ ...draft, homepage: { ...h, hero_subtitle: v } })} rows={3} />
            </div>
            <div className="md:col-span-2">
              <Area label="Hero supporting line" value={h.hero_supporting} onChange={(v) => setDraft({ ...draft, homepage: { ...h, hero_supporting: v } })} rows={2} />
            </div>
            <Field label="CTA · pricing" value={h.cta_pricing} onChange={(v) => setDraft({ ...draft, homepage: { ...h, cta_pricing: v } })} />
            <Field label="CTA · how it works" value={h.cta_how} onChange={(v) => setDraft({ ...draft, homepage: { ...h, cta_how: v } })} />
            <Field label="CTA · sign in" value={h.cta_sign_in} onChange={(v) => setDraft({ ...draft, homepage: { ...h, cta_sign_in: v } })} />
            <Field label="CTA · register" value={h.cta_register} onChange={(v) => setDraft({ ...draft, homepage: { ...h, cta_register: v } })} />
            <Field label="CTA · my account" value={h.cta_my_account} onChange={(v) => setDraft({ ...draft, homepage: { ...h, cta_my_account: v } })} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Homepage · trust row</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {(h.trust_badges ?? []).map((row, i) => (
              <Field
                key={i}
                label={`Trust point ${i + 1}`}
                value={row.label}
                onChange={(v) => {
                  const trust_badges = [...(h.trust_badges ?? [])];
                  trust_badges[i] = { label: v };
                  setDraft({ ...draft, homepage: { ...h, trust_badges } });
                }}
              />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Homepage · how it works grid</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Section title" value={h.how_section_title} onChange={(v) => setDraft({ ...draft, homepage: { ...h, how_section_title: v } })} />
            <Area label="Section lead" value={h.how_section_lead} onChange={(v) => setDraft({ ...draft, homepage: { ...h, how_section_lead: v } })} />
            <Field label="“More detail” button" value={h.how_section_more_label} onChange={(v) => setDraft({ ...draft, homepage: { ...h, how_section_more_label: v } })} />
            {(h.how_steps ?? []).map((step, i) => (
              <div key={step.step} className="rounded-lg border p-3 space-y-2">
                <div className="text-xs font-medium text-muted-foreground">Step {step.step}</div>
                <Field
                  label="Title"
                  value={step.title}
                  onChange={(v) => {
                    const how_steps = [...(h.how_steps ?? [])];
                    how_steps[i] = { ...how_steps[i], title: v };
                    setDraft({ ...draft, homepage: { ...h, how_steps } });
                  }}
                />
                <Area
                  label="Body"
                  value={step.body}
                  onChange={(v) => {
                    const how_steps = [...(h.how_steps ?? [])];
                    how_steps[i] = { ...how_steps[i], body: v };
                    setDraft({ ...draft, homepage: { ...h, how_steps } });
                  }}
                  rows={2}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Homepage · who it&apos;s for &amp; benefits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Who for · title" value={h.who_for_title} onChange={(v) => setDraft({ ...draft, homepage: { ...h, who_for_title: v } })} />
            <Area label="Who for · lead" value={h.who_for_lead} onChange={(v) => setDraft({ ...draft, homepage: { ...h, who_for_lead: v } })} />
            <Area
              label="Who for · labels (one per line)"
              value={(h.who_for_labels ?? []).join("\n")}
              onChange={(v) =>
                setDraft({
                  ...draft,
                  homepage: { ...h, who_for_labels: v.split("\n").map((s) => s.trim()).filter(Boolean) },
                })
              }
              rows={4}
            />
            <Field label="Benefits · title" value={h.benefits_title} onChange={(v) => setDraft({ ...draft, homepage: { ...h, benefits_title: v } })} />
            {(h.benefits ?? []).map((b, i) => (
              <div key={i} className="rounded-lg border p-3 space-y-2">
                <Field
                  label={`Benefit ${i + 1} · title`}
                  value={b.title}
                  onChange={(v) => {
                    const benefits = [...(h.benefits ?? [])];
                    benefits[i] = { ...benefits[i], title: v };
                    setDraft({ ...draft, homepage: { ...h, benefits } });
                  }}
                />
                <Area
                  label="Body"
                  value={b.body}
                  onChange={(v) => {
                    const benefits = [...(h.benefits ?? [])];
                    benefits[i] = { ...benefits[i], body: v };
                    setDraft({ ...draft, homepage: { ...h, benefits } });
                  }}
                  rows={2}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Homepage · areas, pricing strip, closing CTA</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field label="Areas title" value={h.areas_section_title} onChange={(v) => setDraft({ ...draft, homepage: { ...h, areas_section_title: v } })} />
            <Field label="Areas · see coverage CTA" value={h.areas_see_coverage} onChange={(v) => setDraft({ ...draft, homepage: { ...h, areas_see_coverage: v } })} />
            <div className="md:col-span-2">
              <Area label="Areas lead" value={h.areas_section_lead} onChange={(v) => setDraft({ ...draft, homepage: { ...h, areas_section_lead: v } })} />
            </div>
            <Field label="Pricing section title" value={h.pricing_section_title} onChange={(v) => setDraft({ ...draft, homepage: { ...h, pricing_section_title: v } })} />
            <div className="md:col-span-2">
              <Area label="Pricing section lead" value={h.pricing_section_lead} onChange={(v) => setDraft({ ...draft, homepage: { ...h, pricing_section_lead: v } })} />
            </div>
            <Field label="PAYG label" value={h.pricing_section_payg_label} onChange={(v) => setDraft({ ...draft, homepage: { ...h, pricing_section_payg_label: v } })} />
            <Field label="Programme label" value={h.pricing_section_programme_label} onChange={(v) => setDraft({ ...draft, homepage: { ...h, pricing_section_programme_label: v } })} />
            <div className="md:col-span-2">
              <Area label="PAYG hint" value={h.pricing_section_payg_hint} onChange={(v) => setDraft({ ...draft, homepage: { ...h, pricing_section_payg_hint: v } })} />
            </div>
            <Field label="PAYG footer" value={h.pricing_section_payg_footer} onChange={(v) => setDraft({ ...draft, homepage: { ...h, pricing_section_payg_footer: v } })} />
            <div className="md:col-span-2">
              <Area label="Programme hint" value={h.pricing_section_programme_hint} onChange={(v) => setDraft({ ...draft, homepage: { ...h, pricing_section_programme_hint: v } })} />
            </div>
            <Field label="Programme footer" value={h.pricing_section_programme_footer} onChange={(v) => setDraft({ ...draft, homepage: { ...h, pricing_section_programme_footer: v } })} />
            <Field label="Subscriptions CTA" value={h.pricing_cta_subscriptions} onChange={(v) => setDraft({ ...draft, homepage: { ...h, pricing_cta_subscriptions: v } })} />
            <Field label="Trade CTA" value={h.pricing_cta_trade} onChange={(v) => setDraft({ ...draft, homepage: { ...h, pricing_cta_trade: v } })} />
            <div className="md:col-span-2">
              <Area label="Footer CTA title" value={h.footer_cta_title} onChange={(v) => setDraft({ ...draft, homepage: { ...h, footer_cta_title: v } })} />
            </div>
            <div className="md:col-span-2">
              <Area label="Footer CTA lead" value={h.footer_cta_lead} onChange={(v) => setDraft({ ...draft, homepage: { ...h, footer_cta_lead: v } })} rows={3} />
            </div>
            <Field label="Footer CTA book" value={h.footer_cta_book} onChange={(v) => setDraft({ ...draft, homepage: { ...h, footer_cta_book: v } })} />
            <Field label="Footer CTA talk" value={h.footer_cta_talk} onChange={(v) => setDraft({ ...draft, homepage: { ...h, footer_cta_talk: v } })} />
            <Field label="Footer CTA register" value={h.footer_cta_register} onChange={(v) => setDraft({ ...draft, homepage: { ...h, footer_cta_register: v } })} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Services &amp; pricing pages</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Services · title" value={draft.services.title} onChange={(v) => setDraft({ ...draft, services: { ...draft.services, title: v } })} />
            <Area label="Services · lead" value={draft.services.lead} onChange={(v) => setDraft({ ...draft, services: { ...draft.services, lead: v } })} rows={3} />
            <Field label="Pricing page · title" value={draft.pricing_page.title} onChange={(v) => setDraft({ ...draft, pricing_page: { ...draft.pricing_page, title: v } })} />
            <Area label="Pricing page · lead" value={draft.pricing_page.lead} onChange={(v) => setDraft({ ...draft, pricing_page: { ...draft.pricing_page, lead: v } })} rows={3} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How it works (standalone page)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Title" value={draft.how_it_works.title} onChange={(v) => setDraft({ ...draft, how_it_works: { ...draft.how_it_works, title: v } })} />
            <Area label="Lead" value={draft.how_it_works.lead} onChange={(v) => setDraft({ ...draft, how_it_works: { ...draft.how_it_works, lead: v } })} rows={3} />
            <Field
              label="Subscriptions intro (before link)"
              value={draft.how_it_works.subscriptions_prompt}
              onChange={(v) => setDraft({ ...draft, how_it_works: { ...draft.how_it_works, subscriptions_prompt: v } })}
            />
            <Field
              label="Subscriptions link label"
              value={draft.how_it_works.subscriptions_link_label}
              onChange={(v) => setDraft({ ...draft, how_it_works: { ...draft.how_it_works, subscriptions_link_label: v } })}
            />
            {(draft.how_it_works.steps ?? []).map((step, i) => (
              <div key={i} className="rounded-lg border p-3 space-y-2">
                <div className="text-xs font-medium text-muted-foreground">Step {i + 1}</div>
                <Field
                  label="Title"
                  value={step.title}
                  onChange={(v) => {
                    const steps = [...(draft.how_it_works.steps ?? [])];
                    steps[i] = { ...steps[i], title: v };
                    setDraft({ ...draft, how_it_works: { ...draft.how_it_works, steps } });
                  }}
                />
                <Area
                  label="Body"
                  value={step.body}
                  onChange={(v) => {
                    const steps = [...(draft.how_it_works.steps ?? [])];
                    steps[i] = { ...steps[i], body: v };
                    setDraft({ ...draft, how_it_works: { ...draft.how_it_works, steps } });
                  }}
                  rows={3}
                />
              </div>
            ))}
            <Field
              label="Sign-in prompt"
              value={draft.how_it_works.customer_signin_prompt}
              onChange={(v) => setDraft({ ...draft, how_it_works: { ...draft.how_it_works, customer_signin_prompt: v } })}
            />
            <Field
              label="Sign-in link label"
              value={draft.how_it_works.customer_signin_link_label}
              onChange={(v) => setDraft({ ...draft, how_it_works: { ...draft.how_it_works, customer_signin_link_label: v } })}
            />
            <Area
              label="After sign-in link"
              value={draft.how_it_works.customer_signin_suffix}
              onChange={(v) => setDraft({ ...draft, how_it_works: { ...draft.how_it_works, customer_signin_suffix: v } })}
              rows={2}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>FAQ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Page title" value={draft.faq_page.title} onChange={(v) => setDraft({ ...draft, faq_page: { ...draft.faq_page, title: v } })} />
            <Area label="Page lead" value={draft.faq_page.lead} onChange={(v) => setDraft({ ...draft, faq_page: { ...draft.faq_page, lead: v } })} rows={2} />
            {(draft.faq ?? []).map((item, i) => (
              <div key={i} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-muted-foreground">Entry {i + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => {
                      const faq = (draft.faq ?? []).filter((_, j) => j !== i);
                      setDraft({ ...draft, faq });
                    }}
                  >
                    Remove
                  </Button>
                </div>
                <Field
                  label="Question"
                  value={item.q}
                  onChange={(v) => {
                    const faq = [...(draft.faq ?? [])];
                    faq[i] = { ...faq[i], q: v };
                    setDraft({ ...draft, faq });
                  }}
                />
                <Area
                  label="Answer"
                  value={item.a}
                  onChange={(v) => {
                    const faq = [...(draft.faq ?? [])];
                    faq[i] = { ...faq[i], a: v };
                    setDraft({ ...draft, faq });
                  }}
                  rows={3}
                />
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() => setDraft({ ...draft, faq: [...(draft.faq ?? []), { q: "", a: "" }] })}
            >
              Add FAQ entry
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact &amp; service areas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Contact · title" value={draft.contact.title} onChange={(v) => setDraft({ ...draft, contact: { ...draft.contact, title: v } })} />
            <Area label="Contact · lead" value={draft.contact.lead} onChange={(v) => setDraft({ ...draft, contact: { ...draft.contact, lead: v } })} rows={2} />
            <Field label="Support email" value={draft.contact.support_email} onChange={(v) => setDraft({ ...draft, contact: { ...draft.contact, support_email: v } })} />
            <Field label="Support phone (optional)" value={draft.contact.support_phone ?? ""} onChange={(v) => setDraft({ ...draft, contact: { ...draft.contact, support_phone: v } })} />
            <Area label="Hint paragraph" value={draft.contact.hint_paragraph} onChange={(v) => setDraft({ ...draft, contact: { ...draft.contact, hint_paragraph: v } })} rows={2} />
            <Field label="Book CTA" value={draft.contact.cta_book} onChange={(v) => setDraft({ ...draft, contact: { ...draft.contact, cta_book: v } })} />
            <Field label="Service areas · title" value={draft.service_areas.title} onChange={(v) => setDraft({ ...draft, service_areas: { ...draft.service_areas, title: v } })} />
            <Area label="Service areas · lead" value={draft.service_areas.lead} onChange={(v) => setDraft({ ...draft, service_areas: { ...draft.service_areas, lead: v } })} rows={2} />
            <Area label="Service areas · footnote" value={draft.service_areas.footnote} onChange={(v) => setDraft({ ...draft, service_areas: { ...draft.service_areas, footnote: v } })} rows={2} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Booking form &amp; notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Booking · page kicker" value={draft.booking.page_kicker} onChange={(v) => setDraft({ ...draft, booking: { ...draft.booking, page_kicker: v } })} />
            <Field label="Booking · page title" value={draft.booking.page_title} onChange={(v) => setDraft({ ...draft, booking: { ...draft.booking, page_title: v } })} />
            <Area label="Booking · page lead" value={draft.booking.page_lead} onChange={(v) => setDraft({ ...draft, booking: { ...draft.booking, page_lead: v } })} rows={3} />
            <Field label="Success · kicker" value={draft.booking.success_kicker} onChange={(v) => setDraft({ ...draft, booking: { ...draft.booking, success_kicker: v } })} />
            <Field label="Success · title" value={draft.booking.success_title} onChange={(v) => setDraft({ ...draft, booking: { ...draft.booking, success_title: v } })} />
            <Area label="Success · intro" value={draft.booking.success_intro} onChange={(v) => setDraft({ ...draft, booking: { ...draft.booking, success_intro: v } })} rows={3} />
            <Area
              label="Success bullets (one per line)"
              value={(draft.booking.success_bullets ?? []).join("\n")}
              onChange={(v) =>
                setDraft({
                  ...draft,
                  booking: { ...draft.booking, success_bullets: v.split("\n").map((s) => s.trim()).filter(Boolean) },
                })
              }
              rows={4}
            />
            <Field label="Business hours line" value={draft.business.hours_line} onChange={(v) => setDraft({ ...draft, business: { ...draft.business, hours_line: v } })} />
            <Area
              label="Email footer line (below app name; leave blank for name only)"
              value={draft.email.footer_line ?? ""}
              onChange={(v) => setDraft({ ...draft, email: { ...draft.email, footer_line: v } })}
              rows={2}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const uid = useId();
  return (
    <div className="space-y-1.5">
      <Label htmlFor={uid} className="text-xs font-medium">
        {label}
      </Label>
      <Input id={uid} className="h-10" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Area({
  label,
  value,
  onChange,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  const uid = useId();
  return (
    <div className="space-y-1.5">
      <Label htmlFor={uid} className="text-xs font-medium">
        {label}
      </Label>
      <Textarea id={uid} rows={rows} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
