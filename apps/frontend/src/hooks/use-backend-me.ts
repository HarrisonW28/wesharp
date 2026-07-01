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
    queryKey: ["backend-me", userId],
    staleTime: 60_000,
    queryFn: async (): Promise<BackendMePayload> => {
      const origin = apiOrigin();

      const token = await getToken({ template: undefined });

      if (!token || origin === "") {
        throw new Error("Missing Clerk session or NEXT_PUBLIC_API_ORIGIN.");
      }

      const url = `${origin}/api/v1/me`;
      let res: Response;
      try {
        res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        });
      } catch (e) {
        const isNetwork =
          e instanceof TypeError && (e.message === "Failed to fetch" || e.name === "TypeError");
        const hint = isNetwork
          ? ` Network error (browser could not reach ${url}). Use HTTPS for the API when the app is on Vercel; check NEXT_PUBLIC_API_ORIGIN; open /api/health on the API host in this tab to verify TLS; if that works, fix CORS (FRONTEND_ORIGIN / nginx OPTIONS).`
          : ` ${e instanceof Error ? e.message : String(e)}`;
        throw new Error(`Failed to fetch.${hint}`);
      }

      const body = (await res.json().catch(() => ({}))) as BackendMePayload & {
        error?: { message?: string; code?: string };
      };

      if (!res.ok) {
        const apiMsg = body?.error?.message;
        const apiCode = body?.error?.code;
        const codePart =
          apiCode != null && apiCode !== "" && apiCode !== "unauthenticated"
            ? ` [${apiCode}]`
            : "";
        const suffix =
          apiMsg != null && apiMsg !== ""
            ? ` ${apiMsg}`
            : "";
        throw new Error(`API /me failed (${res.status}).${codePart}${suffix}`.trim());
      }

      return body;
    },
  });
}
