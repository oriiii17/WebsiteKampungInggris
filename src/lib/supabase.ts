import { createClient, SupabaseClient } from "@supabase/supabase-js";

export function isSupabaseConfigured(): boolean {
  return getSupabasePublicConfig() !== null;
}

export function getSupabaseProjectUrl(): string | null {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!value) return null;

  try {
    const parsed = new URL(value);
    if (!(parsed.protocol === "https:" || parsed.protocol === "http:") || !parsed.hostname) return null;
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export function getSupabasePublicConfig(): { url: string; anonKey: string } | null {
  const url = getSupabaseProjectUrl();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  return url && anonKey ? { url, anonKey } : null;
}

export function isMidtransConfigured(): boolean {
  return Boolean(
    process.env.MIDTRANS_SERVER_KEY && process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY
  );
}

export function createPublicSupabaseClient(): SupabaseClient | null {
  const config = getSupabasePublicConfig();
  if (!config) return null;
  return createClient(config.url, config.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function createBrowserSupabaseClient(): SupabaseClient | null {
  if (typeof window === "undefined") return null;
  const config = getSupabasePublicConfig();
  if (!config) return null;
  return createClient(config.url, config.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: true },
  });
}

/** Temporary storage is limited to the email callback/reset flow and disappears when its tab closes. */
export function createBrowserSupabaseFlowClient(): SupabaseClient | null {
  if (typeof window === "undefined") return null;
  const config = getSupabasePublicConfig();
  if (!config) return null;
  return createClient(config.url, config.anonKey, {
    auth: { autoRefreshToken: false, persistSession: true, detectSessionInUrl: true, storage: window.sessionStorage },
  });
}

