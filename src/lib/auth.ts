import crypto from "crypto";
import { cookies } from "next/headers";
import { SessionPayload } from "./types";

const SESSION_COOKIE_NAME = "sapen_session";

function getSecret(): string {
  return process.env.APP_SESSION_SECRET || "kampung-inggris-sapen-secret-2026-dev";
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
  return decodeSessionToken(raw);
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
  return Boolean(session && (session.role === "pengurus" || session.role === "developer"));
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

export function hashPassword(password: string): string {
  return crypto.createHmac("sha256", getSecret()).update(`pwd:${password}`).digest("hex");
}

export function getAdminCredentials() {
  return {
    pengurus: {
      email: (process.env.ADMIN_PENGURUS_EMAIL || "pengurus@kampungsapen.id").toLowerCase(),
      password: process.env.ADMIN_PENGURUS_PASSWORD || "sapen2026",
      name: "Pengurus Kampung Sapen",
    },
    developer: {
      email: (process.env.ADMIN_DEVELOPER_EMAIL || "dev@kampungsapen.id").toLowerCase(),
      password: process.env.ADMIN_DEVELOPER_PASSWORD || "devsapen2026",
      name: "Developer Sistem Sapen",
    },
  };
}

export { SESSION_COOKIE_NAME };
