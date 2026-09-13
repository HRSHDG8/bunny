import type { PostgrestError } from "@supabase/supabase-js";

export function decodeJwt(token: string) {
  try {
    const [head, payload] = token.split(".");
    const header = JSON.parse(Buffer.from(head, "base64url").toString("utf-8"));
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
    return {
      alg: header?.alg ?? null,
      kid: header?.kid ?? null,
      sub: claims?.sub ?? null,
      role: claims?.role ?? null,
      aud: claims?.aud ?? null,
      iat: claims?.iat ?? null,
      exp: claims?.exp ?? null,
    };
  } catch {
    return null;
  }
}

function messageText(error?: PostgrestError | null): string {
  let raw = error?.message?.trim() || "";
  if (raw && raw.startsWith("{")) {
    try {
      const body = JSON.parse(raw) as {
        message?: string;
        error?: string;
        msg?: string;
      };
      raw = body?.message ?? body?.error ?? body?.msg ?? raw;
    } catch {
      // not JSON - keep the raw message
    }
  }
  if (
    !raw ||
    /timed?\s?out|gateway|network|fetch failed|econnreset|502|504/i.test(raw)
  ) {
    return "Supabase is unreachable right now, please retry.";
  }
  return raw;
}

export function apiError(
  label: string,
  error?: PostgrestError | null,
  detail?: string,
): Error {
  const bits = [error?.code, messageText(error), error?.details, error?.hint, detail].filter(
    (b): b is string => Boolean(b),
  );
  const suffix = bits.length ? ` [${bits.join(" | ")}]` : "";
  return new Error(`${label}${suffix}`);
}