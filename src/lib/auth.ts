import crypto from "crypto";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { SessionPayload } from "./types";

const SESSION_COOKIE_NAME = "sapen_session";
const SUPABASE_ACCESS_TOKEN_COOKIE = "sapen_supabase_access";
export const GUEST_SESSION_COOKIE_NAME = "sapen_guest_session";
export const SESSION_IDLE_LIMIT_MS = 90 * 60 * 1000;
const SUPABASE_REFRESH_TOKEN_COOKIE = "sapen_supabase_refresh";
const AUTH_COOKIE_NAMES = new Set([SESSION_COOKIE_NAME, GUEST_SESSION_COOKIE_NAME, SUPABASE_ACCESS_TOKEN_COOKIE, SUPABASE_REFRESH_TOKEN_COOKIE, "sapen_admin_session", "supabase.auth.token", "supabase-auth-token"]);
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

export function sessionCookieOptions(session: SessionPayload, secure: boolean) {
  const privileged = session.role === "admin" || session.role === "pengurus" || session.role === "developer" || session.role === "tutor" || session.origin === "admin" || session.origin === "tutor";
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure,
    ...(privileged ? {} : { maxAge: Math.floor(SESSION_IDLE_LIMIT_MS / 1000) }),
  };
}

export function guestSessionCookieOptions(secure: boolean) {
  return { httpOnly: true, sameSite: "lax" as const, path: "/", secure, maxAge: Math.floor(SESSION_IDLE_LIMIT_MS / 1000) };
}

export function supabaseAccessCookieOptions(session: SessionPayload, secure: boolean) {
  const privileged = session.role === "admin" || session.role === "pengurus" || session.role === "developer" || session.role === "tutor" || session.origin === "admin" || session.origin === "tutor";
  return { httpOnly: true, sameSite: "lax" as const, path: "/", secure, ...(privileged ? {} : { maxAge: Math.floor(SESSION_IDLE_LIMIT_MS / 1000) }) };
}

export function supabaseRefreshCookieOptions(session: SessionPayload, secure: boolean) {
  return supabaseAccessCookieOptions(session, secure);
}

function isAuthCookieName(name: string) {
  return AUTH_COOKIE_NAMES.has(name) || /^sapen_.*(?:session|auth|token)/i.test(name) || /^sb-.*auth-token/i.test(name);
}

export function clearAuthCookies(response: NextResponse, req: Request) {
  const names = new Set(AUTH_COOKIE_NAMES);
  for (const part of (req.headers.get("cookie") || "").split(";")) {
    const name = part.slice(0, part.indexOf("=")).trim();
    if (name && isAuthCookieName(name)) names.add(name);
  }
  const secure = process.env.NODE_ENV === "production" || new URL(req.url).protocol === "https:";
  for (const name of names) response.cookies.set(name, "", { httpOnly: true, sameSite: "lax", path: "/", secure, maxAge: 0, expires: new Date(0) });
}

export async function revokeSupabaseSession(req: Request, exceptAccessToken?: string, suppliedPreviousToken?: string, currentUserId?: string) {
  const config = (await import("./supabase")).getSupabasePublicConfig();
  if (!config) return;
  const prefix = "sapen_supabase_access=";
  const part = (req.headers.get("cookie") || "").split(";").map((value) => value.trim()).find((value) => value.startsWith(prefix));
  let token = "";
  try { token = part ? decodeURIComponent(part.slice(prefix.length)) : ""; } catch { return; }
  if (!token) token = suppliedPreviousToken || req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1] || "";
  if (!token || token === exceptAccessToken) return;
  if (currentUserId) {
    try {
      const payload = JSON.parse(Buffer.from(token.split(".")[1] || "", "base64url").toString("utf8")) as { sub?: string };
      if (payload.sub === currentUserId) return;
    } catch { /* Continue with global revocation when token identity cannot be decoded. */ }
  }
  let refreshToken = "";
  try {
    const refreshPart = (req.headers.get("cookie") || "").split(";").map((value) => value.trim()).find((value) => value.startsWith("sapen_supabase_refresh="));
    refreshToken = refreshPart ? decodeURIComponent(refreshPart.slice("sapen_supabase_refresh=".length)) : "";
    const payload = JSON.parse(Buffer.from(token.split(".")[1] || "", "base64url").toString("utf8")) as { exp?: number };
    if (refreshToken && Number(payload.exp || 0) * 1000 < Date.now() + 30_000) {
      const refreshed = await fetch(config.url + "/auth/v1/token?grant_type=refresh_token", {
        method: "POST",
        headers: { apikey: config.anonKey, "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
        cache: "no-store",
        signal: AbortSignal.timeout(2500),
      });
      if (refreshed.ok) {
        const session = await refreshed.json() as { access_token?: string };
        if (session.access_token) token = session.access_token;
      }
    }
  } catch { /* Use the existing access token for the sign-out attempt. */ }
  try {
    await fetch(config.url + "/auth/v1/logout?scope=global", { method: "POST", headers: { apikey: config.anonKey, Authorization: "Bearer " + token }, cache: "no-store", signal: AbortSignal.timeout(2500) });
  } catch { /* Local cookie removal remains authoritative during network failures. */ }
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
  if (!raw) return null;
  const current = decodeSessionToken(raw);
  const now = Date.now();
  if (!current || current.role === "guest" || current.origin === "guest" || !current.lastActivityAt || now - current.lastActivityAt > SESSION_IDLE_LIMIT_MS) {
    for (const cookie of cookieStore.getAll()) {
      if (isAuthCookieName(cookie.name)) try { cookieStore.set(cookie.name, "", { httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production", maxAge: 0, expires: new Date(0) }); } catch { /* Server component cookie stores are read-only. */ }
    }
    return null;
  }
  const requestHeaders = await headers();
  if (requestHeaders.get("x-sapen-session-activity") !== "1") return current;
  const refreshed = { ...current, lastActivityAt: now };
  try { cookieStore.set(SESSION_COOKIE_NAME, encodeSessionToken(refreshed), sessionCookieOptions(refreshed, process.env.NODE_ENV === "production")); } catch { /* API requests can renew cookies; page renders are read-only. */ }
  return refreshed;
}

export async function getGuestServerSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const session = decodeSessionToken(cookieStore.get(GUEST_SESSION_COOKIE_NAME)?.value);
  if (!session || session.role !== "guest" || session.origin !== "guest") return null;
  const now = Date.now();
  if ((session.expiresAt && Date.parse(session.expiresAt) <= now) || !session.lastActivityAt || now - session.lastActivityAt > SESSION_IDLE_LIMIT_MS) {
    try { cookieStore.set(GUEST_SESSION_COOKIE_NAME, "", { httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production", maxAge: 0, expires: new Date(0) }); } catch { /* Server component cookie stores are read-only. */ }
    return null;
  }
  const requestHeaders = await headers();
  if (requestHeaders.get("x-sapen-session-activity") !== "1") return session;
  const refreshed = { ...session, lastActivityAt: now };
  try { cookieStore.set(GUEST_SESSION_COOKIE_NAME, encodeSessionToken(refreshed), guestSessionCookieOptions(process.env.NODE_ENV === "production")); } catch { /* API requests can renew cookies. */ }
  return refreshed;
}

/** Account identities always win; use Guest context only when no account session is active. */
export async function getSessionWithGuestContext(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  if (cookieStore.get(SESSION_COOKIE_NAME)?.value) return getServerSession();
  return getGuestServerSession();
}

export async function getSessionExpiryStatus(): Promise<{ expired: boolean; admin: boolean }> {
  const raw = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const session = decodeSessionToken(raw);
  const now = Date.now();
  const expired = Boolean(raw && (!session || !session.lastActivityAt || now - session.lastActivityAt > SESSION_IDLE_LIMIT_MS));
  return { expired, admin: Boolean(expired && session && ["admin", "pengurus", "developer", "tutor"].includes(session.role)) };
}

export function hasActiveMaterialAccess(session: SessionPayload | null): boolean {
  if (!session) return false;
  if (session.role === "pengurus" || session.role === "developer") return true;
  if (session.email && !session.emailVerified && session.role !== "admin") return false;
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
