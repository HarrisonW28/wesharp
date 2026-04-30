"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Search } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  query: z.string().trim().max(160),
});

type LeadSearchValues = z.infer<typeof schema>;

export function LeadSearchForm() {
  const form = useForm<LeadSearchValues>({
    resolver: zodResolver(schema),
    defaultValues: { query: "" },
  });

  async function onSubmit(values: LeadSearchValues) {
    await new Promise((r) => setTimeout(r, 200));
    void values.query;
    form.reset({ query: "" });
  }

  return (
    <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="flex-1 space-y-2">
        <Label htmlFor="crm-search">Search accounts</Label>
        <Input id="crm-search" placeholder="Venue name, city, postcode…" autoComplete="off" {...form.register("query")} />
      </div>
      <Button type="submit" className="sm:w-36">
        <Search className="mr-2 h-4 w-4" aria-hidden />
        Search
      </Button>
    </form>
  );
}
