"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Area, Field } from "../_fields";
import { ContentSettingsSectionShell } from "../_section-shell";
import { useSiteContentEditor } from "../content-editor-context";

function ServicesPricingEditor() {
  const { draft, setDraft } = useSiteContentEditor();
  if (!draft) {
    return null;
  }

  return (
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
  );
}

export default function AdminContentSettingsServicesPricingPage() {
  return (
    <ContentSettingsSectionShell
      title="Services & pricing"
      description="Services landing copy and the standalone pricing page intro."
    >
      <ServicesPricingEditor />
    </ContentSettingsSectionShell>
  );
}
