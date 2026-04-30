import { z } from "zod";

export const LookupItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string().nullable().optional(),
  meta: z.record(z.unknown()).optional(),
});

export const LookupListResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    items: z.array(LookupItemSchema),
  }),
});

export type LookupItem = z.infer<typeof LookupItemSchema>;

export type LookupResource =
  | "companies"
  | "users"
  | "bookings"
  | "routes"
  | "orders"
  | "knives"
  | "locations"
  | "contacts";

export type LookupInitialOption = {
  id: string;
  label: string;
  description?: string | null;
};

export function lookupQueryString(
  extra: Record<string, string | boolean | undefined> | undefined,
  q: string,
  resolveId?: string | null,
): string {
  const p = new URLSearchParams();
  if (resolveId !== undefined && resolveId !== null && resolveId !== "") {
    p.set("id", resolveId);
  }
  if (q !== "") {
    p.set("q", q);
  }
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      if (v === undefined || v === null || v === "") {
        continue;
      }
      if (typeof v === "boolean") {
        if (v) {
          p.set(k, "1");
        }
        continue;
      }
      p.set(k, v);
    }
  }
  return p.toString();
}
