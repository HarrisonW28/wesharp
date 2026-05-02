"use client";

import type { ReactNode } from "react";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";

import { ContentSettingsGate, ResetSiteContentButton, SaveSiteContentButton } from "./content-editor-context";

function SiteContentSectionActions() {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <ResetSiteContentButton />
      <SaveSiteContentButton />
    </div>
  );
}

export function ContentSettingsSectionShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <ContentSettingsGate>
      <Breadcrumbs
        crumbs={[
          { label: "Settings", href: "/admin/dashboard" },
          { label: "Site content", href: "/admin/content-settings" },
          { label: title },
        ]}
      />
      <PageHeader title={title} description={description} actions={<SiteContentSectionActions />} />
      <div className="flex flex-col gap-6 pb-16">{children}</div>
    </ContentSettingsGate>
  );
}
