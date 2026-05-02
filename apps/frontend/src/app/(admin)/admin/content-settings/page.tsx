"use client";

import Link from "next/link";
import { ChevronRight, Home, Mail, MessageSquareText, HelpCircle, Layers, BookOpen } from "lucide-react";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { ContentSettingsGate, SaveSiteContentButton } from "./content-editor-context";

const SECTIONS = [
  {
    href: "/admin/content-settings/homepage",
    title: "Homepage",
    description: "Hero, trust row, how-it-works grid, audience, benefits, areas, pricing strip, and footer CTA.",
    icon: Home,
  },
  {
    href: "/admin/content-settings/services-pricing",
    title: "Services & pricing pages",
    description: "Services landing copy and the standalone pricing page intro.",
    icon: Layers,
  },
  {
    href: "/admin/content-settings/how-it-works",
    title: "How it works",
    description: "Standalone how-it-works page — steps, subscriptions prompt, and sign-in hints.",
    icon: BookOpen,
  },
  {
    href: "/admin/content-settings/faq",
    title: "FAQ",
    description: "FAQ page title, lead, and question list.",
    icon: HelpCircle,
  },
  {
    href: "/admin/content-settings/contact",
    title: "Contact & service areas",
    description: "Contact page, support details, and service areas copy.",
    icon: Mail,
  },
  {
    href: "/admin/content-settings/booking",
    title: "Booking & notifications",
    description: "Public booking wizard copy, success screen, business hours, and email footer.",
    icon: MessageSquareText,
  },
];

export default function AdminContentSettingsHubPage() {
  return (
    <ContentSettingsGate>
      <Breadcrumbs crumbs={[{ label: "Settings", href: "/admin/dashboard" }, { label: "Site content" }]} />
      <PageHeader
        title="Site content"
        description="Edit public marketing copy in sections. Changes apply to the marketing site and booking flow when you save."
        actions={<SaveSiteContentButton />}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 pb-16">
        {SECTIONS.map((s) => {
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
