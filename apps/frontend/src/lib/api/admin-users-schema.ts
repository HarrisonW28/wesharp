import { z } from "zod";

export const UserRoleEnum = z.enum([
  "super_admin",
  "admin",
  "route_manager",
  "finance",
  "customer_owner",
  "customer_staff",
]);

export type UserRoleValue = z.infer<typeof UserRoleEnum>;

export const UserStatusEnum = z.enum(["invited", "active", "suspended"]);

export type UserStatusValue = z.infer<typeof UserStatusEnum>;

export const UserDirectoryRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  clerk_user_id: z.string().nullable(),
  role: UserRoleEnum,
  status: UserStatusEnum.nullable(),
  company_id: z.string().uuid().nullable(),
  company_name: z.string().nullable(),
});

export type UserDirectoryRow = z.infer<typeof UserDirectoryRowSchema>;

export const PaginatedUsersResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    items: z.array(UserDirectoryRowSchema),
  }),
  meta: z.object({
    pagination: z.object({
      page: z.number(),
      per_page: z.number(),
      total: z.number().optional(),
      total_pages: z.number().optional(),
      has_more_pages: z.boolean().optional(),
    }),
  }),
});

export const UserCompanySchema = z.object({
  id: z.string(),
  name: z.string(),
  city: z.string().nullable(),
});

export const UserDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  clerk_user_id: z.string().nullable(),
  role: UserRoleEnum,
  status: UserStatusEnum.nullable(),
  company_id: z.string().uuid().nullable(),
  company: UserCompanySchema.nullable(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
});

export type UserDetail = z.infer<typeof UserDetailSchema>;

export const UserDetailResponseSchema = z.object({
  success: z.literal(true),
  data: UserDetailSchema,
});
