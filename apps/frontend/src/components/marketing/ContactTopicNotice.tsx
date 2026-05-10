"use client";

import { useSearchParams } from "next/navigation";
import { Building2 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/**
 * Contextual guidance when arriving from marketing links (e.g. Business → Multi-site enquiries).
 */
export function ContactTopicNotice() {
  const topic = useSearchParams().get("topic");
  if (topic !== "trade") {
    return null;
  }

  return (
    <Alert className="border-primary/25 bg-primary/5">
      <Building2 className="h-4 w-4 text-primary" aria-hidden />
      <AlertTitle>Trade &amp; multi-site</AlertTitle>
      <AlertDescription>
        Mention how many sites you run, whether you need consolidated invoicing, and who should receive portal invites.
        We&apos;ll come back with coverage, cadence, and next steps.
      </AlertDescription>
    </Alert>
  );
}
