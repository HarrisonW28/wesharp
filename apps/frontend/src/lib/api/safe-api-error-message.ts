/**
 * Laravel `ApiResponses` error envelope — avoids surfacing nested exception payloads to users.
 */
export function safeApiErrorMessage(raw: unknown, fallback = "Request failed."): string {
  if (!raw || typeof raw !== "object") {
    return fallback;
  }

  const envelope = raw as {
    error?: { message?: unknown; errors?: Record<string, string[]> };
  };

  if (envelope.error && typeof envelope.error.message === "string" && envelope.error.message !== "") {
    return envelope.error.message;
  }

  const fieldErrors = envelope.error?.errors;
  if (fieldErrors && typeof fieldErrors === "object") {
    for (const msgs of Object.values(fieldErrors)) {
      if (Array.isArray(msgs) && msgs[0] !== undefined && msgs[0] !== "") {
        return String(msgs[0]);
      }
    }
  }

  return fallback;
}
