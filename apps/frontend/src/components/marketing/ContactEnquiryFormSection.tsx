"use client";

import { useSearchParams } from "next/navigation";

import { ContactEnquiryForm } from "@/components/marketing/ContactEnquiryForm";

export function ContactEnquiryFormSection() {
  const topic = useSearchParams().get("topic");
  const defaultTopic =
    topic === "trade"
      ? "trade"
      : topic === "subscription"
        ? "subscription"
        : topic === "coverage"
          ? "coverage"
          : "general";

  return <ContactEnquiryForm defaultTopic={defaultTopic} className="my-6" />;
}
