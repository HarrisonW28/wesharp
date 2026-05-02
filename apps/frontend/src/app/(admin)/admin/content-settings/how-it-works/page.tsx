"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Area, Field } from "../_fields";
import { ContentSettingsSectionShell } from "../_section-shell";
import { useSiteContentEditor } from "../content-editor-context";

function HowItWorksEditor() {
  const { draft, setDraft } = useSiteContentEditor();
  if (!draft) {
    return null;
  }

  return (
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
          <div key={i} className="space-y-2 rounded-lg border p-3">
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
  );
}

export default function AdminContentSettingsHowItWorksPage() {
  return (
    <ContentSettingsSectionShell
      title="How it works"
      description="Standalone how-it-works page — steps, subscriptions prompt, and sign-in hints."
    >
      <HowItWorksEditor />
    </ContentSettingsSectionShell>
  );
}
