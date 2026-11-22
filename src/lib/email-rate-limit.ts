import "server-only";
import { createHmac } from "node:crypto";
import { checkApiRateLimit } from "@/lib/api-rate-limit";
import type { SupabaseClient } from "@supabase/supabase-js";

function subjectHash(value: string) {
  const secret = process.env.APP_SESSION_SECRET?.trim();
  return secret ? createHmac("sha256", secret).update(value).digest("hex") : null;
}

/** Uses the shared Supabase limiter when its migration is installed, with the existing process limiter as fallback. */
export async function checkEmailRateLimit(client: SupabaseClient | null, email: string, ip: string, emailLimit: number, ipLimit: number, windowSeconds: number) {
  const emailHash = subjectHash(`email:${email}`);
  const ipHash = subjectHash(`ip:${ip}`);
  if (client && emailHash && ipHash) {
    try {
      const { data, error } = await client.rpc("consume_auth_email_rate_limit", {
        p_email_hash: emailHash,
        p_ip_hash: ipHash,
        p_email_limit: emailLimit,
        p_ip_limit: ipLimit,
        p_window_seconds: windowSeconds,
      });
      if (!error && typeof data === "boolean") return data;
    } catch { /* Use the local limiter until the optional migration is applied. */ }
  }
  const emailAllowed = checkApiRateLimit(`email-limit:${emailHash || email}`, emailLimit, windowSeconds * 1000).allowed;
  const ipAllowed = checkApiRateLimit(`ip-limit:${ipHash || ip}`, ipLimit, windowSeconds * 1000).allowed;
  return emailAllowed && ipAllowed;
}
