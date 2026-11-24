import { cookies } from "next/headers";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseProjectUrl, getSupabasePublicConfig } from "./supabase";
import { createSupabaseAdminClient } from "./supabase/admin";

export const SUPABASE_ACCESS_TOKEN_COOKIE = "sapen_supabase_access";
export const SUPABASE_REFRESH_TOKEN_COOKIE = "sapen_supabase_refresh";

/** Prefer the server-only service key. Otherwise carry the verified admin JWT into RLS. */
export async function getSupabaseServerClient(): Promise<SupabaseClient | null> {
  const url = getSupabaseProjectUrl();
  if (!url) return null;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (serviceKey) return createSupabaseAdminClient();
  const config = getSupabasePublicConfig();
  if (!config) return null;

  const cookieStore = await cookies();
  let token = cookieStore.get(SUPABASE_ACCESS_TOKEN_COOKIE)?.value;
  if (!token) return null;
  const refreshToken = cookieStore.get(SUPABASE_REFRESH_TOKEN_COOKIE)?.value;
  const jwtPayload = token.split(".")[1];
  let expiresAt = 0;
  try { expiresAt = Number(JSON.parse(Buffer.from(jwtPayload || "", "base64url").toString("utf8")).exp || 0) * 1000; } catch { /* Keep the current token if its expiry cannot be decoded. */ }
  if (refreshToken && expiresAt > 0 && expiresAt < Date.now() + 5 * 60 * 1000) {
    try {
      const response = await fetch(url + "/auth/v1/token?grant_type=refresh_token", {
        method: "POST",
        headers: { apikey: config.anonKey, "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
        cache: "no-store",
        signal: AbortSignal.timeout(2500),
      });
      if (response.ok) {
        const refreshed = await response.json() as { access_token?: string; refresh_token?: string };
        if (refreshed.access_token && refreshed.refresh_token) {
          token = refreshed.access_token;
          const authSession = (await import("./auth")).getServerSession;
          const session = await authSession();
          if (session) {
            const { supabaseAccessCookieOptions, supabaseRefreshCookieOptions } = await import("./auth");
            const secure = process.env.NODE_ENV === "production";
            cookieStore.set(SUPABASE_ACCESS_TOKEN_COOKIE, refreshed.access_token, supabaseAccessCookieOptions(session, secure));
            cookieStore.set(SUPABASE_REFRESH_TOKEN_COOKIE, refreshed.refresh_token, supabaseRefreshCookieOptions(session, secure));
          }
        }
      }
    } catch { /* The current request can still attempt its existing token. */ }
  }
  return createClient(config.url, config.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}
