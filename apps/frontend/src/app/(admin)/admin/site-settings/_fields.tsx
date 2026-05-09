"use client";

import { useId } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const uid = useId();
  return (
    <div className="space-y-1.5">
      <Label htmlFor={uid} className="text-xs font-medium">
        {label}
      </Label>
      <Input id={uid} className="h-10" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export function Area({
  label,
  value,
  onChange,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  const uid = useId();
  return (
    <div className="space-y-1.5">
      <Label htmlFor={uid} className="text-xs font-medium">
        {label}
      </Label>
      <Textarea id={uid} rows={rows} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
