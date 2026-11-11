import { createClient, SupabaseClient } from "@supabase/supabase-js";

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function isMidtransConfigured(): boolean {
  return Boolean(
    process.env.MIDTRANS_SERVER_KEY && process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY
  );
}

export function createPublicSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

let serviceClient: SupabaseClient | null = null;
let cachedAuthToken: { accessToken: string; expiresAtMs: number } | null = null;

/**
 * Mengembalikan Supabase client berhak penuh untuk operasi server Next.js:
 * 1. Memakai SUPABASE_SERVICE_ROLE_KEY bila tersedia di .env.local
 * 2. Atau memakai sesi Supabase Auth server resmi (role developer) dengan RLS penuh
 */
export async function getSupabaseAdmin(): Promise<SupabaseClient | null> {
  if (!isSupabaseConfigured()) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const pubKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (serviceKey) {
    if (!serviceClient) {
      serviceClient = createClient(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
    }
    return serviceClient;
  }

  const now = Date.now();
  if (!cachedAuthToken || cachedAuthToken.expiresAtMs - now < 120_000) {
    const authClient = createClient(url, pubKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const devEmail = process.env.ADMIN_DEVELOPER_EMAIL || "dev@kampungsapen.id";
    const devPassword = process.env.ADMIN_DEVELOPER_PASSWORD || "devsapen2026";

    const { data, error } = await authClient.auth.signInWithPassword({
      email: devEmail,
      password: devPassword,
    });
    if (error || !data.session) {
      return authClient;
    }

    cachedAuthToken = {
      accessToken: data.session.access_token,
      expiresAtMs: (data.session.expires_at || Math.floor(now / 1000) + 3600) * 1000,
    };
  }

  return createClient(url, pubKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      headers: {
        Authorization: `Bearer ${cachedAuthToken.accessToken}`,
      },
    },
  });
}
