"use client";

import { useAuth } from "@clerk/nextjs";
import { useMemo } from "react";

import { apiOrigin } from "@/lib/env";
import { safeApiErrorMessage } from "@/lib/api/safe-api-error-message";

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
          return {
            ok: false,
            status: res.status,
            message: safeApiErrorMessage(raw, "Request failed."),
            payload: raw,
          };
        }

        return { ok: true, status: res.status, data: raw as T };
      },

      /** Authenticated binary fetch (e.g. private evidence photos). Use blob URLs, not raw paths in <img src>. */
      async fetchBlob(path: string): Promise<Blob> {
        const origin = apiOrigin();
        const token = await getToken();

        if (!origin) {
          throw new Error("Set NEXT_PUBLIC_API_ORIGIN.");
        }
        if (!token) {
          throw new Error("Not signed in.");
        }

        const res = await fetch(`${origin}${path}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });

        if (!res.ok) {
          const raw = await res.json().catch(() => null);
          throw new Error(safeApiErrorMessage(raw, `Download failed (${res.status}).`));
        }

        return res.blob();
      },
    }),
    [getToken],
  );
}
