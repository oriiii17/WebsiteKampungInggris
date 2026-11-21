import { cookies } from "next/headers";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseProjectUrl, getSupabasePublicConfig } from "./supabase";
import { createSupabaseAdminClient } from "./supabase/admin";

export const SUPABASE_ACCESS_TOKEN_COOKIE = "sapen_supabase_access";

/** Prefer the server-only service key. Otherwise carry the verified admin JWT into RLS. */
export async function getSupabaseServerClient(): Promise<SupabaseClient | null> {
  const url = getSupabaseProjectUrl();
  if (!url) return null;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (serviceKey) return createSupabaseAdminClient();
  const config = getSupabasePublicConfig();
  if (!config) return null;

  const token = (await cookies()).get(SUPABASE_ACCESS_TOKEN_COOKIE)?.value;
  if (!token) return null;
  return createClient(config.url, config.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}
