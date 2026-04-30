"use client";

import { useAuth } from "@clerk/nextjs";
import { useMemo } from "react";

import { apiOrigin } from "@/lib/env";

export type AccountFetchJsonResult<T> =
  | { ok: true; data: T; status: number }
  | {
      ok: false;
      status: number;
      message: string;
      payload: unknown;
    };

/** Bearer-auth helper for Laravel tenant routes (`/api/account/*`). */
export function useAccountApi() {
  const { getToken } = useAuth();

  return useMemo(
    () => ({
      origin: apiOrigin(),
      async json<T>(
        path: string,
        init?: RequestInit & {
          parseJson?: boolean;
        },
      ): Promise<AccountFetchJsonResult<T>> {
        const origin = apiOrigin();
        const token = await getToken();
        const parseJson = init?.parseJson ?? true;

        if (!origin) {
          return { ok: false, status: 0, message: "Set NEXT_PUBLIC_API_ORIGIN.", payload: null };
        }
        if (!token) {
          return { ok: false, status: 401, message: "Not signed in.", payload: null };
        }

        const hdrs = init?.headers;
        const fetchInit = init ? ({ ...init } as RequestInit & { parseJson?: boolean }) : undefined;
        if (fetchInit !== undefined && "parseJson" in fetchInit) {
          delete fetchInit.parseJson;
        }

        const res = await fetch(`${origin}${path}`, {
          ...(fetchInit ?? {}),
          headers: {
            Accept: "application/json",
            ...(fetchInit?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
            Authorization: `Bearer ${token}`,
            ...hdrs,
          },
          cache: "no-store",
        });

        if (res.status === 204 || res.status === 205) {
          return { ok: true, status: res.status, data: undefined as T };
        }

        const raw = parseJson ? await res.json().catch(() => null) : null;

        if (!res.ok) {
          const message =
            raw &&
            typeof raw === "object" &&
            raw !== null &&
            "error" in raw &&
            typeof (raw as { error?: unknown }).error === "object"
              ? String((raw as { error?: { message?: unknown } }).error?.message ?? "Request failed.")
              : "Request failed.";
          return { ok: false, status: res.status, message, payload: raw };
        }

        return { ok: true, status: res.status, data: raw as T };
      },
    }),
    [getToken],
  );
}
