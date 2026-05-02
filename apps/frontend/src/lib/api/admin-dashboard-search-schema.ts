import { z } from "zod";

export const DashboardSearchKindSchema = z.enum([
  "company",
  "booking",
  "order",
  "knife",
  "user",
  "route",
  "contact",
  "location",
]);

export type DashboardSearchKind = z.infer<typeof DashboardSearchKindSchema>;

export const DashboardSearchItemSchema = z.object({
  kind: DashboardSearchKindSchema,
  id: z.string(),
  label: z.string(),
  description: z.string().nullable().optional(),
  path: z.string(),
  image_url: z.string().nullable().optional(),
});

export const DashboardSearchResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    items: z.array(DashboardSearchItemSchema),
  }),
});

export type DashboardSearchItem = z.infer<typeof DashboardSearchItemSchema>;

/** Section headings in the dashboard search dialog. */
export const DASHBOARD_SEARCH_SECTION_LABEL: Record<DashboardSearchKind, string> = {
  company: "Companies",
  booking: "Bookings",
  order: "Orders",
  knife: "Knives",
  user: "Users",
  route: "Routes",
  contact: "Contacts",
  location: "Locations",
};
