import { z } from "zod";

const keyBlock = z.object({
  database_override: z.boolean(),
  masked: z.string().nullable(),
  effective_configured: z.boolean(),
});

const boolBlock = z.object({
  database_value: z.boolean().nullable(),
  effective: z.boolean(),
});

const urlBlock = z.object({
  database_value: z.string().nullable(),
  effective: z.string(),
});

export const AdminStripeSettingsResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      integration: z.object({
        secret_key: keyBlock,
        public_key: keyBlock,
        webhook_secret: keyBlock,
        hosted_checkout_enabled: boolBlock,
        allow_live: boolBlock,
        checkout_success_url: urlBlock,
        checkout_cancel_url: urlBlock,
      }),
    }),
  })
  .passthrough();

export type AdminStripeSettingsIntegration = z.infer<
  typeof AdminStripeSettingsResponseSchema
>["data"]["integration"];
