"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";

import { apiOrigin } from "@/lib/env";

export type BackendMePayload = {
  success: boolean;
  data?: {
    user: {
      id: string;
      clerk_user_id: string | null;
      email: string;
      name: string;
      role: string;
      role_bucket: "internal" | "customer";
      company_id: string | null;
      status: string | null;
    };
    permissions: string[];
  };
};

export function useBackendMe() {
  const { getToken, isLoaded, userId } = useAuth();

  return useQuery({
    enabled: Boolean(isLoaded && userId),
    queryKey: ["backend-me"],
    staleTime: 60_000,
    queryFn: async (): Promise<BackendMePayload> => {
      const origin = apiOrigin();

      const token = await getToken({ template: undefined });

      if (!token || origin === "") {
        throw new Error("Missing Clerk session or NEXT_PUBLIC_API_ORIGIN.");
      }

      const res = await fetch(`${origin}/api/v1/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const body = (await res.json().catch(() => ({}))) as BackendMePayload & {
        error?: { message?: string; code?: string };
      };

      if (!res.ok) {
        const apiMsg = body?.error?.message;
        const suffix =
          apiMsg != null && apiMsg !== ""
            ? ` ${apiMsg}`
            : "";
        throw new Error(`API /me failed (${res.status}).${suffix}`.trim());
      }

      return body;
    },
  });
}
