import { cookies } from "next/headers";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "./supabase";
import { createSupabaseAdminClient } from "./supabase/admin";

export const SUPABASE_ACCESS_TOKEN_COOKIE = "sapen_supabase_access";

/** Prefer the server-only service key. Otherwise carry the verified admin JWT into RLS. */
export async function getSupabaseServerClient(): Promise<SupabaseClient | null> {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) return createSupabaseAdminClient();
  if (!isSupabaseConfigured()) return null;

  const token = (await cookies()).get(SUPABASE_ACCESS_TOKEN_COOKIE)?.value;
  if (!token) return null;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}
