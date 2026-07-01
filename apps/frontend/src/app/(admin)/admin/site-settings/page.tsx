"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { NavBreadcrumbs } from "@/components/layout/NavBreadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { ContentSettingsGate, ResetSiteContentButton, SaveSiteContentButton } from "./content-editor-context";
import { SITE_SETTINGS_SECTIONS } from "./site-settings-sections";

function SiteSettingsHeaderActions() {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <ResetSiteContentButton />
      <SaveSiteContentButton />
    </div>
  );
}

export default function AdminSiteSettingsHubPage() {
  return (
    <ContentSettingsGate>
      <NavBreadcrumbs />
      <PageHeader
        title="Site settings"
        description="Edit public marketing copy in sections. Changes apply to the marketing site and booking flow when you save."
        actions={<SiteSettingsHeaderActions />}
      />

      <div className="grid gap-3 pb-16 sm:grid-cols-2 xl:grid-cols-3">
        {SITE_SETTINGS_SECTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.href}
              href={s.href}
              className="group block rounded-xl border bg-card text-card-foreground shadow-sm outline-offset-2 transition-colors hover:bg-muted/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
            >
              <Card className="border-0 bg-transparent shadow-none">
                <CardHeader className="flex flex-row items-start gap-3 space-y-0">
                  <div className="rounded-lg border bg-muted/60 p-2.5 text-muted-foreground group-hover:text-foreground">
                    <Icon className="h-4 w-4" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1 pr-1">
                    <CardTitle className="text-base leading-snug">{s.title}</CardTitle>
                    <CardDescription className="line-clamp-3 text-sm leading-snug">{s.description}</CardDescription>
                  </div>
                  <ChevronRight
                    className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>
    </ContentSettingsGate>
  );
}
