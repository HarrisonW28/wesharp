import { describe, expect, it } from "vitest";

import { PaginatedCompaniesResponseSchema } from "@/lib/api/admin-crm-schema";
import { adminCreateBookingFormSchema } from "@/lib/forms/admin-create-booking-form-schema";
import { PUBLIC_BOOKING_ENQUIRY_SCHEMA } from "@/lib/public-booking-schema";
import { visibleRouteStopActions } from "@/lib/route-manager/route-stop-workflow";

describe("PUBLIC_BOOKING_ENQUIRY_SCHEMA", () => {
  it("requires terms acknowledgement", () => {
    const r = PUBLIC_BOOKING_ENQUIRY_SCHEMA.safeParse({
      business_name: "Test Kitchen PLC",
      contact_name: "Jamie Prep",
      email: "jamie@test.example",
      phone: "+441234567890",
      address_line_1: "1 Wharf Street",
      city: "Manchester",
      postcode: "M1 1AA",
      preferred_date: "2099-01-01",
      time_window_preference: "Morning",
      service_type: "collection",
      message: "Need knives sharpened urgently please.",
      terms_accepted: false,
    });
    expect(r.success).toBe(false);
  });

  it("accepts minimal valid enquiry", () => {
    const r = PUBLIC_BOOKING_ENQUIRY_SCHEMA.safeParse({
      business_name: "Test Kitchen PLC",
      contact_name: "Jamie Prep",
      email: "jamie@test.example",
      phone: "+441234567890",
      address_line_1: "1 Wharf Street",
      city: "Manchester",
      postcode: "M1 1AA",
      preferred_date: "2099-01-02",
      time_window_preference: "Morning",
      service_type: "collection",
      message: "Need knives sharpened urgently please.",
      terms_accepted: true,
    });
    expect(r.success).toBe(true);
  });
});

describe("adminCreateBookingFormSchema", () => {
  it("rejects malformed company UUID", () => {
    const r = adminCreateBookingFormSchema.safeParse({
      company_id: "not-a-uuid",
      location_id: "550e8400-e29b-41d4-a716-446655440000",
      requested_date: "2028-06-01",
      service_type: "collection",
    });
    expect(r.success).toBe(false);
  });
});

describe("PaginatedCompaniesResponseSchema", () => {
  it("parses typical CRM envelope", () => {
    const parsed = PaginatedCompaniesResponseSchema.safeParse({
      success: true,
      data: {
        items: [
          {
            id: "019ad200-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            name: "Demo Ltd",
            slug: "demo-ltd",
            company_status: "active",
            phone: "+440000",
            billing_email: "a@test.test",
            city: "Manchester",
            total_spend_pence: 0,
            last_booking_date: null,
          },
        ],
      },
      meta: {
        pagination: {
          page: 1,
          per_page: 15,
          total: 1,
          has_more_pages: false,
        },
      },
    });
    expect(parsed.success).toBe(true);
  });
});

describe("visibleRouteStopActions", () => {
  it("shows arrived → collected progression", () => {
    expect(visibleRouteStopActions("arrived").map((r) => r.label)).toEqual(["Mark collected"]);
  });

  it("shows travelling handler", () => {
    expect(visibleRouteStopActions("travelling").map((r) => r.path)).toContain("mark-arrived");
  });
});
