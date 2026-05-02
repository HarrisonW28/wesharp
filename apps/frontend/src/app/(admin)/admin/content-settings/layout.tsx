"use client";

import type { ReactNode } from "react";

import { SiteContentEditorProvider } from "./content-editor-context";

export default function AdminContentSettingsLayout({ children }: { children: ReactNode }) {
  return <SiteContentEditorProvider>{children}</SiteContentEditorProvider>;
}
