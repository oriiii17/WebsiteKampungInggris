"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import GuestNavbar from "@/components/GuestNavbar";
import type { SessionPayload } from "@/lib/types";
import { clearAuthBrowserStorage, subscribeToSessionChanges } from "@/lib/session-sync";

export default function PublicChrome({ session, guestSession, guestClassHref, initialParticipantPending = false, sessionExpired = false, expiredAdmin = false }: { session: SessionPayload | null; guestSession: SessionPayload | null; guestClassHref?: string; initialParticipantPending?: boolean; sessionExpired?: boolean; expiredAdmin?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeAccountSession, setActiveAccountSession] = useState(session);
  const [activeGuestSession, setActiveGuestSession] = useState(guestSession);
  const [participantPending, setParticipantPending] = useState(initialParticipantPending);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [acknowledgingEnd, setAcknowledgingEnd] = useState(false);
  const [endError, setEndError] = useState("");
  const [sessionChanged, setSessionChanged] = useState(false);
  const initialAccountUserId = useRef(session && session.origin !== "guest" && session.role !== "guest" ? (session.authUserId || session.id) : null).current;
  const activeSession = activeAccountSession || activeGuestSession;
  const activeSessionId = activeSession?.guestSessionId;
  const activeGuest = !session && (activeGuestSession?.role === "guest" || activeGuestSession?.origin === "guest");

  const protectedRoute = pathname === "/akun" || pathname.startsWith("/akun/") || pathname === "/kelas-saya" || pathname.startsWith("/kelas-saya/") || pathname === "/checkout" || pathname.startsWith("/checkout/") || pathname === "/bayar" || pathname.startsWith("/bayar/") || pathname === "/admin" || (pathname.startsWith("/admin/") && pathname !== "/admin/masuk");

  useEffect(() => {
    if (!sessionExpired || !protectedRoute) return;
    void fetch("/api/auth/session", { cache: "no-store" }).catch(() => undefined);
    const loginPath = expiredAdmin ? "/admin/masuk" : "/masuk?expired=1";
    const current = pathname + (searchParams.toString() ? "?" + searchParams.toString() : "");
    if (current !== loginPath) router.replace(loginPath);
  }, [expiredAdmin, pathname, protectedRoute, router, searchParams, sessionExpired]);

  useEffect(() => {
    setActiveAccountSession(session);
    setActiveGuestSession(guestSession);
    setParticipantPending(initialParticipantPending);
  }, [guestSession, initialParticipantPending, session]);

  useEffect(() => {
    if (!initialAccountUserId) return;
    return subscribeToSessionChanges((nextUserId) => {
      if (!nextUserId || nextUserId !== initialAccountUserId) setSessionChanged(true);
    });
  }, [initialAccountUserId]);

  useEffect(() => {
    if (!sessionChanged) return;
    const blockStaleAction = (event: Event) => {
      if ((event.target as HTMLElement | null)?.closest?.("[data-session-reload]")) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    document.addEventListener("click", blockStaleAction, true);
    document.addEventListener("submit", blockStaleAction, true);
    document.addEventListener("keydown", blockStaleAction, true);
    return () => {
      document.removeEventListener("click", blockStaleAction, true);
      document.removeEventListener("submit", blockStaleAction, true);
      document.removeEventListener("keydown", blockStaleAction, true);
    };
  }, [sessionChanged]);

  useEffect(() => {
    let active = true;
    let latestRequest = 0;
    let requestInFlight = false;
    const syncGuestSession = async () => {
      if (!activeSessionId && !activeGuestSession) return;
      if (requestInFlight) return;
      requestInFlight = true;
      const requestId = ++latestRequest;
      try {
        const response = await fetch("/api/auth/session?scope=attendance", { cache: "no-store" });
        if (!response.ok) throw new Error("Status akses sesi belum dapat diperbarui.");
        const data = await response.json();
        if (active && requestId === latestRequest) {
          const nextGuest = data.session?.role === "guest" && data.session?.origin === "guest" ? data.session : null;
          const nextAccount = data.session && !nextGuest ? data.session as SessionPayload : null;
          setActiveGuestSession((previous) => previous?.id === nextGuest?.id && previous?.guestSessionId === nextGuest?.guestSessionId && previous?.guestClassHref === nextGuest?.guestClassHref ? previous : nextGuest);
          setActiveAccountSession((previous) => previous?.id === nextAccount?.id && previous?.guestSessionId === nextAccount?.guestSessionId && previous?.guestClassHref === nextAccount?.guestClassHref ? previous : nextAccount);
          const nextPending = Boolean(data.session?.guestSessionId && data.approvalStatus !== "approved");
          setParticipantPending(nextPending);
          if (!nextPending && data.approvalStatus === "approved" && participantPending) router.refresh();
        }
      } catch {
        // Keep the last server-provided session when a temporary request fails.
      }
      if (activeSessionId && !pathname.startsWith("/sesi/")) {
        try {
          const response = await fetch("/api/class-sessions/current", { cache: "no-store" });
          const data = await response.json();
          if (active && requestId === latestRequest && data.status === "closed") setSessionEnded(true);
        } catch {
          // Keep the current page usable if the status check is temporarily unavailable.
        }
      }
      requestInFlight = false;
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void syncGuestSession();
    };
    const onRegistrationUpdated = () => {
      setParticipantPending(true);
      void syncGuestSession();
    };

    void syncGuestSession();
    const poll = window.setInterval(() => { if (document.visibilityState === "visible") void syncGuestSession(); }, 5000);
    window.addEventListener("focus", syncGuestSession);
    window.addEventListener("sapen:guest-session-updated", syncGuestSession);
    window.addEventListener("sapen:session-registration-updated", onRegistrationUpdated);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      active = false;
      window.clearInterval(poll);
      window.removeEventListener("focus", syncGuestSession);
      window.removeEventListener("sapen:guest-session-updated", syncGuestSession);
      window.removeEventListener("sapen:session-registration-updated", onRegistrationUpdated);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [activeGuestSession, activeSessionId, pathname, participantPending, router]);

  const isAdminRoute = pathname.startsWith("/admin");
  const visibleSession = isAdminRoute || pathname.startsWith("/game/host") ? activeAccountSession : activeSession;
  const isGuest = visibleSession?.role === "guest" || visibleSession?.origin === "guest";
  const isAdminHostRoute = (visibleSession?.role === "admin" || visibleSession?.role === "pengurus" || visibleSession?.role === "developer") && pathname.startsWith("/game/host");
  const isGameJoinRoute = pathname.startsWith("/game/join");
  const isStandaloneRoute = pathname.startsWith("/sesi/") || pathname.startsWith("/game/play/") || (isGameJoinRoute && !isGuest) || (!isGuest && pathname.startsWith("/games/"));
  const acknowledgeSessionEnd = async () => {
    if (acknowledgingEnd) return;
    setAcknowledgingEnd(true);
    setEndError("");
    try {
      if (activeGuest) {
        const response = await fetch("/api/auth/session?scope=guest", { method: "DELETE", cache: "no-store" });
        if (!response.ok) throw new Error("Sesi Guest belum berhasil dibersihkan. Tekan OK untuk mencoba lagi.");
        clearAuthBrowserStorage();
      } else if (activeSession?.guestSessionId) {
        const response = await fetch("/api/auth/session", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "clear_class_session" }), cache: "no-store" });
        if (!response.ok) throw new Error("Konteks sesi belum berhasil dibersihkan. Tekan OK untuk mencoba lagi.");
      }
      window.dispatchEvent(new Event("sapen:guest-session-updated"));
      setActiveAccountSession((current) => current ? { ...current, guestSessionId: undefined, guestRegistrationId: undefined, guestClassHref: undefined } : null);
      setActiveGuestSession(null);
      setSessionEnded(false);
      router.replace("/");
    } catch (error) {
      setEndError(error instanceof Error ? error.message : "Belum dapat kembali ke beranda. Tekan OK untuk mencoba lagi.");
      setAcknowledgingEnd(false);
    }
  };

  const inClassSession = Boolean(visibleSession?.guestSessionId);
  const navbar = isAdminRoute || isAdminHostRoute || participantPending ? null
    : inClassSession && !pathname.startsWith("/game/play/") ? <GuestNavbar guestClassHref={visibleSession?.guestClassHref || activeGuestSession?.guestClassHref || guestClassHref || "/kelas"} displayName={isGuest ? "Guest" : visibleSession?.name || "Peserta"} isGuest={isGuest} />
      : isGuest && !pathname.startsWith("/game/play/") ? <GuestNavbar guestClassHref={activeGuestSession?.guestClassHref || guestClassHref || "/kelas"} displayName="Guest" isGuest />
      : isStandaloneRoute ? null
        : <Navbar session={visibleSession} />;
  return <>{!isAdminRoute && <div className="site-background" aria-hidden="true" />}{navbar}{sessionChanged && <div className="session-ended-backdrop" role="presentation"><section role="alertdialog" aria-modal="true" aria-labelledby="session-changed-title" className="session-ended-panel"><h2 id="session-changed-title" className="session-ended-title">Sesi Anda telah berubah</h2><p className="session-ended-message">Sesi Anda telah berubah, silakan muat ulang halaman.</p><div className="session-ended-actions"><button data-session-reload type="button" autoFocus onClick={() => window.location.reload()}>Muat ulang halaman</button></div></section></div>}{sessionEnded && <div className="session-ended-backdrop" role="presentation"><section role="alertdialog" aria-modal="true" aria-labelledby="guest-session-ended-title" aria-describedby="guest-session-ended-description" className="session-ended-panel"><h2 id="guest-session-ended-title" className="session-ended-title">Sesi sudah ditutup</h2><p id="guest-session-ended-description" className="session-ended-message">Sesi sudah ditutup. Silakan kembali ke beranda.</p>{endError && <p role="alert" className="session-ended-error">{endError}</p>}<div className="session-ended-actions"><button type="button" autoFocus disabled={acknowledgingEnd} onClick={() => void acknowledgeSessionEnd()}>{acknowledgingEnd ? "Menyiapkan…" : "OK"}</button></div></section></div>}</>;
}
