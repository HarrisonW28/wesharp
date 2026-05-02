"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Area, Field } from "../_fields";
import { ContentSettingsSectionShell } from "../_section-shell";
import { useSiteContentEditor } from "../content-editor-context";

function BookingEditor() {
  const { draft, setDraft } = useSiteContentEditor();
  if (!draft) {
    return null;
  }

  return (
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
  );
}

export default function AdminContentSettingsBookingPage() {
  return (
    <ContentSettingsSectionShell
      title="Booking & notifications"
      description="Public booking wizard copy, success screen, business hours, and email footer."
    >
      <BookingEditor />
    </ContentSettingsSectionShell>
  );
}
