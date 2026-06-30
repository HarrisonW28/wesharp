"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

export type FaqItem = {
  q: string;
  a: string;
};

type FaqAccordionProps = {
  items: FaqItem[];
  className?: string;
  /** First item open by default; set false for all collapsed initially. */
  defaultOpenFirst?: boolean;
};

export function FaqAccordion({ items, className, defaultOpenFirst = true }: FaqAccordionProps) {
  if (items.length === 0) return null;

  const defaultValue = defaultOpenFirst ? "item-0" : undefined;

  return (
    <Accordion type="single" collapsible defaultValue={defaultValue} className={cn("space-y-4", className)}>
      {items.map(({ q, a }, i) => (
        <AccordionItem
          key={`${i}-${q.slice(0, 24)}`}
          value={`item-${i}`}
          className="rounded-xl border border-b bg-card px-5"
        >
          <AccordionTrigger className="hover:no-underline">{q}</AccordionTrigger>
          <AccordionContent className="md:text-base">{a}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
