import crypto from "crypto";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { SessionPayload } from "./types";

const SESSION_COOKIE_NAME = "sapen_session";
const SUPABASE_ACCESS_TOKEN_COOKIE = "sapen_supabase_access";
export const GUEST_SESSION_COOKIE_NAME = "sapen_guest_session";
let ephemeralSessionSecret: string | null = null;

function getSecret(): string {
  const configured = process.env.APP_SESSION_SECRET?.trim();
  if (configured) return configured;
  // Avoid a shipped signing secret; sessions naturally expire on process restart
  // until a deployment provides APP_SESSION_SECRET.
  ephemeralSessionSecret ??= crypto.randomBytes(32).toString("base64url");
  return ephemeralSessionSecret;
}

function signHmac(data: string): string {
  return crypto.createHmac("sha256", getSecret()).update(data).digest("base64url");
}

export function encodeSessionToken(payload: SessionPayload): string {
  const json = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = signHmac(json);
  return `${json}.${sig}`;
}

export function decodeSessionToken(token: string | undefined): SessionPayload | null {
  if (!token || !token.includes(".")) return null;
  const [json, sig] = token.split(".");
  if (!json || !sig) return null;
  const expected = signHmac(json);
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return null;
  }
  try {
    return JSON.parse(Buffer.from(json, "base64url").toString("utf8")) as SessionPayload;
  } catch {
    return null;
  }
}

export async function getServerSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = decodeSessionToken(raw);
  if (session && !(session.expiresAt && new Date(session.expiresAt).getTime() <= Date.now())) {
    const hasSupabaseUserId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(session.id);
    if (!(session.origin === "admin" || session.origin === "tutor" || session.origin === "luar_belum_aktif" || session.origin === "luar_langganan") || hasSupabaseUserId) return session;
  }
  return getVerifiedSupabaseSession(cookieStore.get(SUPABASE_ACCESS_TOKEN_COOKIE)?.value);
}

/** Rebuilds the app session from Supabase's verified access token when the app cookie is stale. */
async function getVerifiedSupabaseSession(accessToken?: string): Promise<SessionPayload | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!accessToken || !url || !anonKey) return null;
  try {
    const supabase = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (error || !user) return null;
    const { data: profile } = await supabase.from("profiles").select("role,full_name").eq("id", user.id).maybeSingle();
    const role = profile?.role || user.app_metadata?.role;
    if (role !== "admin" && role !== "pengurus" && role !== "developer" && role !== "tutor") return null;
    const name = profile?.full_name || user.user_metadata?.full_name || (role === "developer" ? "Developer Sistem Sapen" : role === "tutor" ? "Tutor Sapen" : "Pengurus Kampung Sapen");
    return {
      id: user.id,
      name,
      email: user.email || undefined,
      role,
      origin: role === "tutor" ? "tutor" : "admin",
      watermarkText: `PREVIEW ADMIN • ${name.toUpperCase()}`,
    };
  } catch {
    return null;
  }
}

/** Guest attendance is scoped separately so it cannot replace an account session in another tab. */
export async function getGuestServerSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const session = decodeSessionToken(cookieStore.get(GUEST_SESSION_COOKIE_NAME)?.value);
  if (!session || session.role !== "guest" || session.origin !== "guest") return null;
  if (session.expiresAt && new Date(session.expiresAt).getTime() <= Date.now()) return null;
  return session;
}

/** Prefer guest identity on public learning routes while preserving the account cookie for admin tabs. */
export async function getSessionWithGuestContext(): Promise<SessionPayload | null> {
  return (await getGuestServerSession()) || await getServerSession();
}

export function hasActiveMaterialAccess(session: SessionPayload | null): boolean {
  if (!session) return false;
  if (session.role === "pengurus" || session.role === "developer") return true;
  if (session.origin === "warga_kode") return true;
  if (session.origin === "luar_belum_aktif") return false;
  if (session.expiresAt) {
    return new Date(session.expiresAt).getTime() > Date.now();
  }
  return false;
}

export function isAdminSession(session: SessionPayload | null): boolean {
  return Boolean(session && (session.role === "admin" || session.role === "pengurus" || session.role === "developer"));
}

export function isTutorSession(session: SessionPayload | null): boolean {
  return session?.role === "tutor";
}

export function canManageSessions(session: SessionPayload | null): boolean {
  return isAdminSession(session) || isTutorSession(session);
}

/**
 * Membuat Signed URL gambar halaman modul yang cepat kedaluwarsa (default 120 detik)
 * serta terikat pada ID sesi peserta aktif (Poin 5 Rancangan).
 */
export function createSignedPageUrl(
  moduleId: string,
  pageNumber: number,
  sessionId: string,
  ttlSeconds = 120
): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${moduleId}:${pageNumber}:${sessionId}:${exp}`;
  const sig = signHmac(payload);
  return `/api/secure-page/${encodeURIComponent(moduleId)}/${pageNumber}?exp=${exp}&sig=${encodeURIComponent(sig)}`;
}

export function verifySignedPageRequest(
  moduleId: string,
  pageNumber: number,
  sessionId: string,
  expStr: string | null,
  sig: string | null
): boolean {
  if (!expStr || !sig) return false;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) {
    return false;
  }
  const payload = `${moduleId}:${pageNumber}:${sessionId}:${exp}`;
  const expected = signHmac(payload);
  if (sig.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

export { SESSION_COOKIE_NAME };
