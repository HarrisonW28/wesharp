"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { Area, Field } from "../_fields";
import { ContentSettingsSectionShell } from "../_section-shell";
import { useSiteContentEditor } from "../content-editor-context";

function FaqEditor() {
  const { draft, setDraft } = useSiteContentEditor();
  if (!draft) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>FAQ</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Field label="Page title" value={draft.faq_page.title} onChange={(v) => setDraft({ ...draft, faq_page: { ...draft.faq_page, title: v } })} />
        <Area label="Page lead" value={draft.faq_page.lead} onChange={(v) => setDraft({ ...draft, faq_page: { ...draft.faq_page, lead: v } })} rows={2} />
        {(draft.faq ?? []).map((item, i) => (
          <div key={i} className="space-y-2 rounded-lg border p-3">
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
        <Button type="button" variant="outline" onClick={() => setDraft({ ...draft, faq: [...(draft.faq ?? []), { q: "", a: "" }] })}>
          Add FAQ entry
        </Button>
      </CardContent>
    </Card>
  );
}

export default function AdminContentSettingsFaqPage() {
  return (
    <ContentSettingsSectionShell title="FAQ" description="FAQ page title, lead, and question list.">
      <FaqEditor />
    </ContentSettingsSectionShell>
  );
}
