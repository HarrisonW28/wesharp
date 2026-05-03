import { z } from "zod";

export const AdminServiceAreaRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  city: z.string(),
  region: z.string().nullable(),
  country: z.string(),
  postcode_prefix: z.string().nullable(),
  centre_latitude: z.number().nullable(),
  centre_longitude: z.number().nullable(),
  radius_metres: z.number().nullable(),
  active: z.boolean(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type AdminServiceAreaRow = z.infer<typeof AdminServiceAreaRowSchema>;

export const AdminServiceAreasIndexResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    items: z.array(AdminServiceAreaRowSchema),
  }),
});

export const AdminServiceAreaMutationResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    area: AdminServiceAreaRowSchema,
  }),
});
