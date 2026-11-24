import { NextRequest, NextResponse } from "next/server";

const sessionCookie = "sapen_session";
const guestSessionCookie = "sapen_guest_session";
const supabaseAccessCookie = "sapen_supabase_access";
const supabaseRefreshCookie = "sapen_supabase_refresh";
const idleLimitMs = 90 * 60 * 1000;

function isProtectedRoute(pathname: string) {
  return pathname === "/akun" || pathname.startsWith("/akun/") ||
    pathname === "/kelas-saya" || pathname.startsWith("/kelas-saya/") ||
    pathname === "/checkout" || pathname.startsWith("/checkout/") ||
    pathname === "/bayar" || pathname.startsWith("/bayar/") ||
    pathname === "/admin" || (pathname.startsWith("/admin/") && pathname !== "/admin/masuk");
}

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
  const activityRequest = !["GET", "HEAD"].includes(request.method) || request.headers.get("accept")?.includes("text/html") === true || request.headers.has("rsc");
  const forwardedHeaders = new Headers(request.headers);
  forwardedHeaders.set("x-sapen-session-activity", activityRequest ? "1" : "0");
  const continueRequest = () => NextResponse.next({ request: { headers: forwardedHeaders } });
  const accountToken = request.cookies.get(sessionCookie)?.value;
  const guestToken = request.cookies.get(guestSessionCookie)?.value;
  const cookieName = accountToken ? sessionCookie : guestSessionCookie;
  const rawToken = accountToken || guestToken;
  const secret = process.env.APP_SESSION_SECRET?.trim();
  if (!rawToken || !secret) return continueRequest();

  const [payloadPart, signature, ...rest] = rawToken.split(".");
  if (!payloadPart || !signature || rest.length) return continueRequest();
  let session: Record<string, unknown>;
  try {
    const expected = await sign(payloadPart, secret);
    if (signature !== expected) return continueRequest();
    session = JSON.parse(new TextDecoder().decode(decodeBase64Url(payloadPart)));
  } catch {
    return continueRequest();
  }

  const role = String(session.role || "");
  const origin = String(session.origin || "");
  const guest = role === "guest" || origin === "guest";
  // Avatar data URLs belong in persistent profile storage, never in browser cookies.
  delete session.avatarDataUrl;
  const privileged = ["admin", "pengurus", "developer", "tutor"].includes(role) || origin === "admin" || origin === "tutor";
  const now = Date.now();
  const secure = process.env.NODE_ENV === "production" || request.nextUrl.protocol === "https:" || request.headers.get("x-forwarded-proto") === "https";
  const lastActivity = Number(session.lastActivityAt || 0);
  const expired = !lastActivity || now - lastActivity > idleLimitMs;
  const clearCookies = (response: NextResponse) => {
    const names = request.cookies.getAll().map((cookie) => cookie.name).filter((name) =>
      name === sessionCookie || name === guestSessionCookie || name === supabaseAccessCookie || name === supabaseRefreshCookie ||
      /^sapen_.*(?:session|auth|token)/i.test(name) || /^sb-.*auth-token/i.test(name) ||
      name === "supabase.auth.token" || name === "supabase-auth-token"
    );
    for (const name of new Set([...names, sessionCookie, guestSessionCookie, supabaseAccessCookie, supabaseRefreshCookie])) {
      request.cookies.delete(name);
      response.cookies.set(name, "", { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: 0, expires: new Date(0) });
    }
  };
  if (expired) {
    const isPageNavigation = !request.nextUrl.pathname.startsWith("/api/") && request.headers.get("accept")?.includes("text/html");
    let response: NextResponse;
    if (isPageNavigation && !guest && isProtectedRoute(request.nextUrl.pathname)) {
      const destination = privileged ? "/admin/masuk" : "/masuk";
      const login = new URL(destination, request.url);
      if (!privileged) login.searchParams.set("expired", "1");
      if (request.nextUrl.pathname.startsWith("/admin/") && request.nextUrl.pathname !== "/admin/masuk") {
        login.searchParams.set("next", request.nextUrl.pathname);
      }
      response = NextResponse.redirect(login);
    } else {
      response = NextResponse.next({ request: { headers: request.headers } });
    }
    clearCookies(response);
    return response;
  }

  if (!activityRequest) return continueRequest();
  session.lastActivityAt = now;
  const encodedPayload = encodeBase64Url(new TextEncoder().encode(JSON.stringify(session)));
  const token = `${encodedPayload}.${await sign(encodedPayload, secret)}`;
  request.cookies.set(cookieName, token);
  const response = continueRequest();
  response.cookies.set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    ...(privileged ? {} : { maxAge: Math.floor(idleLimitMs / 1000) }),
  });
  for (const name of [supabaseAccessCookie, supabaseRefreshCookie]) {
    const value = request.cookies.get(name)?.value;
    if (!value) continue;
    response.cookies.set(name, value, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      ...(privileged ? {} : { maxAge: Math.floor(idleLimitMs / 1000) }),
    });
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
