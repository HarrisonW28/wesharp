"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { Area, Field } from "../_fields";
import { ContentSettingsSectionShell } from "../_section-shell";
import { useSiteContentEditor } from "../content-editor-context";

function SafetyEditor() {
  const { draft, setDraft } = useSiteContentEditor();
  if (!draft) {
    return null;
  }
  const sp = draft.safety_page;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Safety &amp; trust (public)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Field label="Page title" value={sp.title} onChange={(v) => setDraft({ ...draft, safety_page: { ...sp, title: v } })} />
        <Area label="Lead" value={sp.lead} onChange={(v) => setDraft({ ...draft, safety_page: { ...sp, lead: v } })} rows={3} />
        {(sp.points ?? []).map((pt, i) => (
          <div key={i} className="space-y-2 rounded-lg border p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">Bullet {i + 1}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => {
                  const points = (sp.points ?? []).filter((_, j) => j !== i);
                  setDraft({ ...draft, safety_page: { ...sp, points } });
                }}
              >
                Remove
              </Button>
            </div>
            <Area
              label="Text"
              value={pt}
              onChange={(v) => {
                const points = [...(sp.points ?? [])];
                points[i] = v;
                setDraft({ ...draft, safety_page: { ...sp, points } });
              }}
              rows={2}
            />
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() => setDraft({ ...draft, safety_page: { ...sp, points: [...(sp.points ?? []), ""] } })}
        >
          Add bullet
        </Button>
      </CardContent>
    </Card>
  );
}

export default function AdminContentSettingsSafetyPage() {
  return (
    <ContentSettingsSectionShell title="Safety & trust" description="Public /safety page — intro and bullet list.">
      <SafetyEditor />
    </ContentSettingsSectionShell>
  );
}
