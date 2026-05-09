"use client";

import type { ReactNode } from "react";

import { SiteContentEditorProvider } from "./content-editor-context";
import { SiteSettingsChrome } from "./site-settings-chrome";

export default function AdminSiteSettingsLayout({ children }: { children: ReactNode }) {
  return (
    <SiteContentEditorProvider>
      <SiteSettingsChrome>{children}</SiteSettingsChrome>
    </SiteContentEditorProvider>
  );
}
