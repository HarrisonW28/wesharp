import { apiOrigin } from "@/lib/env";

type BackendHealthReport = {
  ok: boolean;
  apiOrigin: string;
  healthUrl: string;
  healthOk: boolean;
  tlsOk: boolean;
  issues: string[];
  hints: string[];
};

function tlsHint(origin: string): string {
  return `TLS certificate for ${origin} does not match the hostname. In Plesk: Domains → api host → SSL/TLS → issue Let's Encrypt for that domain, then retry.`;
}

function corsHint(): string {
  return "If /api/health works in your browser tab but sign-in fails, set FRONTEND_ORIGIN and CORS_ALLOWED_ORIGINS on Laravel to your frontend URL (exact scheme + host), then run php artisan config:cache.";
}

export async function GET(): Promise<Response> {
  const origin = apiOrigin();
  const issues: string[] = [];
  const hints: string[] = [];

  if (origin === "") {
    return Response.json({
      ok: false,
      apiOrigin: "",
      healthUrl: "",
      healthOk: false,
      tlsOk: false,
      issues: ["NEXT_PUBLIC_API_ORIGIN is not set on the frontend build."],
      hints: ["Set NEXT_PUBLIC_API_ORIGIN=https://api.wesharp.co.uk in Vercel and redeploy."],
    } satisfies BackendHealthReport);
  }

  const healthUrl = `${origin}/api/health`;
  let healthOk = false;
  let tlsOk = true;

  try {
    const res = await fetch(healthUrl, { cache: "no-store" });
    healthOk = res.ok;
    if (!res.ok) {
      issues.push(`GET ${healthUrl} returned HTTP ${res.status}.`);
    }
  } catch (e) {
    const err = e as Error & { cause?: { code?: string; message?: string } };
    const causeCode = err.cause?.code ?? "";
    const causeMsg = err.cause?.message ?? err.message;

    if (
      causeCode === "ERR_TLS_CERT_ALTNAME_INVALID" ||
      /certificate|cert's altnames|SSL|TLS/i.test(causeMsg)
    ) {
      tlsOk = false;
      issues.push(`TLS certificate mismatch for ${origin}.`);
      hints.push(tlsHint(origin));
    } else {
      issues.push(`Could not reach ${healthUrl}: ${causeMsg}`);
      hints.push("Confirm DNS points at the API server and the Laravel vhost is running.");
    }
  }

  if (healthOk) {
    hints.push(corsHint());
  }

  const report: BackendHealthReport = {
    ok: healthOk && tlsOk,
    apiOrigin: origin,
    healthUrl,
    healthOk,
    tlsOk,
    issues,
    hints,
  };

  return Response.json(report);
}
