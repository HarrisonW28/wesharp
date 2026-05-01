import { z } from "zod";

const TableBlockSchema = z.object({
  columns: z.array(z.object({ key: z.string(), label: z.string() })),
  rows: z.array(z.record(z.unknown())),
  meta: z.record(z.unknown()).optional(),
});

export const KnifeServiceReportPayloadSchema = z.object({
  report: z.literal("knives"),
  filters: z.record(z.unknown()),
  kpis: z.object({
    knives_activity_count: z.number(),
    knives_completed_workshop_count: z.number(),
    knives_in_progress_snapshot_count: z.number(),
    knives_inspected_count: z.number(),
    sharpened_throughput_count: z.number(),
    average_knives_per_order: z.number().nullable(),
    reservice_assignments_count: z.number(),
    damage_reports_created_count: z.number(),
  }),
  series: z.object({
    knives_by_day: z.array(z.object({ date: z.string(), count: z.number() })),
    knife_type_breakdown: z.array(z.object({ knife_type: z.string(), count: z.number() })),
    service_type_breakdown: z.array(z.object({ service_type: z.string(), count: z.number() })),
    knife_status_breakdown: z.array(z.object({ status: z.string(), count: z.number() })),
    service_kind_breakdown: z.array(z.object({ service_kind: z.string(), count: z.number() })),
    top_companies_by_knife_volume: z.array(
      z.object({
        company_id: z.string(),
        company_name: z.string(),
        knife_count: z.number(),
      }),
    ),
    damage_by_severity: z.array(z.object({ severity: z.string(), count: z.number() })),
    damage_by_status: z.array(z.object({ status: z.string(), count: z.number() })),
  }),
  table: TableBlockSchema.nullable(),
  definitions: z.record(z.string()),
  export: z.record(z.unknown()),
});

export const KnifeServiceReportResponseSchema = z.object({
  success: z.literal(true),
  data: KnifeServiceReportPayloadSchema,
  meta: z.record(z.unknown()).optional(),
});

export type KnifeServiceReportPayload = z.infer<typeof KnifeServiceReportPayloadSchema>;
