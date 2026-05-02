"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { Area, Field } from "../_fields";
import { ContentSettingsSectionShell } from "../_section-shell";
import { useSiteContentEditor } from "../content-editor-context";

function HomepageEditor() {
  const { draft, setDraft } = useSiteContentEditor();
  if (!draft) {
    return null;
  }
  const h = draft.homepage;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Hero</CardTitle>
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
          <CardTitle>Trust row</CardTitle>
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
          <CardTitle>How it works grid</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Section title" value={h.how_section_title} onChange={(v) => setDraft({ ...draft, homepage: { ...h, how_section_title: v } })} />
          <Area label="Section lead" value={h.how_section_lead} onChange={(v) => setDraft({ ...draft, homepage: { ...h, how_section_lead: v } })} />
          <Field label="“More detail” button" value={h.how_section_more_label} onChange={(v) => setDraft({ ...draft, homepage: { ...h, how_section_more_label: v } })} />
          {(h.how_steps ?? []).map((step, i) => (
            <div key={step.step} className="space-y-2 rounded-lg border p-3">
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
          <CardTitle>Who it&apos;s for &amp; benefits</CardTitle>
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
            <div key={i} className="space-y-2 rounded-lg border p-3">
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
          <CardTitle>Areas, pricing strip, closing CTA</CardTitle>
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
          <Field
            label="Programme label"
            value={h.pricing_section_programme_label}
            onChange={(v) => setDraft({ ...draft, homepage: { ...h, pricing_section_programme_label: v } })}
          />
          <div className="md:col-span-2">
            <Area label="PAYG hint" value={h.pricing_section_payg_hint} onChange={(v) => setDraft({ ...draft, homepage: { ...h, pricing_section_payg_hint: v } })} />
          </div>
          <Field label="PAYG footer" value={h.pricing_section_payg_footer} onChange={(v) => setDraft({ ...draft, homepage: { ...h, pricing_section_payg_footer: v } })} />
          <div className="md:col-span-2">
            <Area
              label="Programme hint"
              value={h.pricing_section_programme_hint}
              onChange={(v) => setDraft({ ...draft, homepage: { ...h, pricing_section_programme_hint: v } })}
            />
          </div>
          <Field
            label="Programme footer"
            value={h.pricing_section_programme_footer}
            onChange={(v) => setDraft({ ...draft, homepage: { ...h, pricing_section_programme_footer: v } })}
          />
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
    </>
  );
}

export default function AdminContentSettingsHomepagePage() {
  return (
    <ContentSettingsSectionShell title="Homepage" description="Marketing homepage — hero through closing call-to-action.">
      <HomepageEditor />
    </ContentSettingsSectionShell>
  );
}
