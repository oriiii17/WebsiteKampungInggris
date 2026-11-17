import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null = null;

/** Privileged Supabase access for authenticated server routes only. */
export function createSupabaseAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL belum dikonfigurasi.");
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi di server.");
  if (!adminClient) adminClient = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  return adminClient;
}
