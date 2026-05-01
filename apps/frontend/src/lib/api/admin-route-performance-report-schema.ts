import { z } from "zod";

const TableBlockSchema = z.object({
  columns: z.array(z.object({ key: z.string(), label: z.string() })),
  rows: z.array(z.record(z.unknown())),
  meta: z.record(z.unknown()).optional(),
});

export const RoutePerformanceReportPayloadSchema = z.object({
  report: z.literal("routes"),
  filters: z.record(z.unknown()),
  kpis: z.object({
    routes_count: z.number(),
    routes_completed_count: z.number(),
    total_stops: z.number(),
    completed_stops: z.number(),
    failed_collections: z.number(),
    completion_rate: z.number().nullable(),
    average_stops_per_route: z.number().nullable(),
    photos_captured_count: z.number(),
  }),
  series: z.object({
    routes_by_day: z.array(z.object({ date: z.string(), count: z.number() })),
    route_status_breakdown: z.array(z.object({ status: z.string(), count: z.number() })),
    stop_status_breakdown: z.array(z.object({ status: z.string(), count: z.number() })),
    failed_collection_reasons: z.array(z.object({ reason: z.string(), count: z.number() })),
    driver_performance: z.array(
      z.object({
        driver_user_id: z.number().nullable(),
        routes_count: z.number(),
        stops_count: z.number(),
        completed_stops: z.number(),
      }),
    ),
  }),
  table: TableBlockSchema.nullable(),
  definitions: z.record(z.string()),
  export: z.record(z.unknown()),
});

export const RoutePerformanceReportResponseSchema = z.object({
  success: z.literal(true),
  data: RoutePerformanceReportPayloadSchema,
  meta: z.record(z.unknown()).optional(),
});

export type RoutePerformanceReportPayload = z.infer<typeof RoutePerformanceReportPayloadSchema>;

