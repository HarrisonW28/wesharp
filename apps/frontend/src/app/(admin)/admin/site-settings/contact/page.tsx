"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Area, Field } from "../_fields";
import { ContentSettingsSectionShell } from "../_section-shell";
import { useSiteContentEditor } from "../content-editor-context";

function ContactEditor() {
  const { draft, setDraft } = useSiteContentEditor();
  if (!draft) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contact &amp; service areas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Field label="Contact · title" value={draft.contact.title} onChange={(v) => setDraft({ ...draft, contact: { ...draft.contact, title: v } })} />
        <Area label="Contact · lead" value={draft.contact.lead} onChange={(v) => setDraft({ ...draft, contact: { ...draft.contact, lead: v } })} rows={2} />
        <Field label="Support email" value={draft.contact.support_email} onChange={(v) => setDraft({ ...draft, contact: { ...draft.contact, support_email: v } })} />
        <Field
          label="Support phone (optional)"
          value={draft.contact.support_phone ?? ""}
          onChange={(v) => setDraft({ ...draft, contact: { ...draft.contact, support_phone: v } })}
        />
        <Area label="Hint paragraph" value={draft.contact.hint_paragraph} onChange={(v) => setDraft({ ...draft, contact: { ...draft.contact, hint_paragraph: v } })} rows={2} />
        <Field label="Book CTA" value={draft.contact.cta_book} onChange={(v) => setDraft({ ...draft, contact: { ...draft.contact, cta_book: v } })} />
        <Field label="Service areas · title" value={draft.service_areas.title} onChange={(v) => setDraft({ ...draft, service_areas: { ...draft.service_areas, title: v } })} />
        <Area label="Service areas · lead" value={draft.service_areas.lead} onChange={(v) => setDraft({ ...draft, service_areas: { ...draft.service_areas, lead: v } })} rows={2} />
        <Area
          label="Service areas · footnote"
          value={draft.service_areas.footnote}
          onChange={(v) => setDraft({ ...draft, service_areas: { ...draft.service_areas, footnote: v } })}
          rows={2}
        />
      </CardContent>
    </Card>
  );
}

export default function AdminContentSettingsContactPage() {
  return (
    <ContentSettingsSectionShell
      title="Contact & service areas"
      description="Contact page, support details, and service areas copy."
    >
      <ContactEditor />
    </ContentSettingsSectionShell>
  );
}
