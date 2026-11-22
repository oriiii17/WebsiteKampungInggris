import { NextRequest, NextResponse } from "next/server";

const sessionCookie = "sapen_session";
const supabaseAccessCookie = "sapen_supabase_access";

function decodeBase64Url(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function encodeBase64Url(value: Uint8Array) {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sign(value: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return encodeBase64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value))));
}

export async function middleware(request: NextRequest) {
  const rawToken = request.cookies.get(sessionCookie)?.value;
  const secret = process.env.APP_SESSION_SECRET?.trim();
  if (!rawToken || !secret) return NextResponse.next();

  const [payloadPart, signature, ...rest] = rawToken.split(".");
  if (!payloadPart || !signature || rest.length) return NextResponse.next();
  let session: Record<string, unknown>;
  try {
    const expected = await sign(payloadPart, secret);
    if (signature !== expected) return NextResponse.next();
    session = JSON.parse(new TextDecoder().decode(decodeBase64Url(payloadPart)));
  } catch {
    return NextResponse.next();
  }

  const role = String(session.role || "");
  const origin = String(session.origin || "");
  if (role === "guest" || origin === "guest") return NextResponse.next();
  // Avatar data URLs belong in persistent profile storage, never in browser cookies.
  delete session.avatarDataUrl;
  const privileged = ["admin", "pengurus", "developer", "tutor"].includes(role) || origin === "admin" || origin === "tutor";
  const idleMs = privileged ? 40 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const secure = request.nextUrl.protocol === "https:" || request.headers.get("x-forwarded-proto") === "https";
  const lastActivity = Number(session.lastActivityAt || 0);
  const expiresAt = session.expiresAt ? new Date(String(session.expiresAt)).getTime() : Number.POSITIVE_INFINITY;
  if ((lastActivity > 0 && now - lastActivity > idleMs) || expiresAt <= now) {
    request.cookies.delete(sessionCookie);
    request.cookies.delete(supabaseAccessCookie);
    const response = NextResponse.next({ request: { headers: request.headers } });
    response.cookies.set(sessionCookie, "", { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: 0, expires: new Date(0) });
    response.cookies.set(supabaseAccessCookie, "", { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: 0, expires: new Date(0) });
    return response;
  }

  session.lastActivityAt = now;
  const encodedPayload = encodeBase64Url(new TextEncoder().encode(JSON.stringify(session)));
  const token = `${encodedPayload}.${await sign(encodedPayload, secret)}`;
  request.cookies.set(sessionCookie, token);
  const response = NextResponse.next({ request: { headers: request.headers } });
  response.cookies.set(sessionCookie, token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    ...(privileged ? {} : { maxAge: 60 * 60 * 24 * 7 }),
  });
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
