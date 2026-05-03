import {
  PublicServiceAreaCheckResponseSchema,
  type PublicServiceAreaCheckResponse,
} from "@/lib/public-service-area-schema";

export type PublicBookingServiceAreaCheckOutcome =
  | { ok: true; data: PublicServiceAreaCheckResponse }
  | { ok: false; status: number; code?: string; message: string };

export async function postPublicBookingServiceAreaCheck(
  origin: string,
  postcode: string,
): Promise<PublicBookingServiceAreaCheckOutcome> {
  const res = await fetch(`${origin}/api/public/service-area/check`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ postcode }),
  });

  const json: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const err =
      json !== null && typeof json === "object" && "error" in json
        ? (json as { error?: { message?: string; code?: string } }).error
        : undefined;
    return {
      ok: false,
      status: res.status,
      code: typeof err?.code === "string" ? err.code : undefined,
      message:
        typeof err?.message === "string" && err.message !== ""
          ? err.message
          : "Could not verify coverage for that postcode.",
    };
  }

  const data =
    json !== null && typeof json === "object" && "data" in json ? (json as { data: unknown }).data : json;
  const parsed = PublicServiceAreaCheckResponseSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, status: 500, message: "Unexpected response while checking coverage." };
  }

  return { ok: true, data: parsed.data };
}
