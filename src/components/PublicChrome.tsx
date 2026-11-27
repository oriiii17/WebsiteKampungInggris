"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import type { SessionPayload } from "@/lib/types";
import { clearAuthBrowserStorage, subscribeToSessionChanges } from "@/lib/session-sync";

type SessionParticipation = "outside" | "waiting" | "approved";

export default function PublicChrome({ session, guestSession, initialParticipantPending = false, sessionExpired = false, expiredAdmin = false }: { session: SessionPayload | null; guestSession: SessionPayload | null; initialParticipantPending?: boolean; sessionExpired?: boolean; expiredAdmin?: boolean }) {
  const pathname = usePathname();
  const isSessionEntryRoute = /^\/sesi\/[^/]+$/.test(pathname);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeAccountSession, setActiveAccountSession] = useState(session);
  const [activeGuestSession, setActiveGuestSession] = useState(guestSession);
  const [participantPending, setParticipantPending] = useState(initialParticipantPending);
  const [sessionJoinStatus, setSessionJoinStatus] = useState<SessionParticipation>(isSessionEntryRoute ? "waiting" : "outside");
  const [sessionExitRequested, setSessionExitRequested] = useState(false);
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
    if (isSessionEntryRoute) {
      setSessionExitRequested(false);
      setSessionJoinStatus((current) => current === "approved" ? current : "waiting");
    }
    else if (!activeSessionId) setSessionJoinStatus((current) => current === "approved" ? current : "outside");
  }, [activeSessionId, isSessionEntryRoute, pathname]);

  useEffect(() => {
    const onParticipationChange = (event: Event) => {
      const status = (event as CustomEvent<{ status?: SessionParticipation }>).detail?.status;
      if (status === "outside" || status === "waiting" || status === "approved") {
        setSessionJoinStatus(status);
        setSessionExitRequested(status === "outside");
      }
    };
    window.addEventListener("sapen:session-participation-changed", onParticipationChange);
    return () => window.removeEventListener("sapen:session-participation-changed", onParticipationChange);
  }, []);

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
    const syncGuestSession = async (force = false) => {
      if (!force && !activeSessionId && !activeGuestSession) return;
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
          if (data.session?.guestSessionId) {
            setSessionJoinStatus(data.approvalStatus === "approved" ? "approved" : "waiting");
            setSessionExitRequested(false);
          } else if (force) {
            setSessionJoinStatus("outside");
            setSessionExitRequested(true);
          }
          if (!nextPending && data.approvalStatus === "approved" && participantPending) router.refresh();
        }
      } catch {
        // Keep the last server-provided session when a temporary request fails.
      }
      requestInFlight = false;
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void syncGuestSession();
    };
    const onFocus = () => { void syncGuestSession(); };
    const onRegistrationUpdated = () => {
      setParticipantPending(true);
      void syncGuestSession(true);
    };
    const onGuestSessionUpdated = () => { void syncGuestSession(true); };

    void syncGuestSession();
    const poll = window.setInterval(() => { if (document.visibilityState === "visible") void syncGuestSession(); }, 5000);
    window.addEventListener("focus", onFocus);
    window.addEventListener("sapen:guest-session-updated", onGuestSessionUpdated);
    window.addEventListener("sapen:session-registration-updated", onRegistrationUpdated);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      active = false;
      window.clearInterval(poll);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("sapen:guest-session-updated", onGuestSessionUpdated);
      window.removeEventListener("sapen:session-registration-updated", onRegistrationUpdated);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [activeGuestSession, activeSessionId, pathname, participantPending, router]);

  useEffect(() => {
    if (!activeSessionId) return;
    let active = true;
    let inFlight = false;
    const checkSessionStatus = async () => {
      if (!active || inFlight || document.visibilityState !== "visible") return;
      inFlight = true;
      try {
        const response = await fetch("/api/class-sessions/current", { cache: "no-store" });
        const data = await response.json();
        window.dispatchEvent(new CustomEvent("sapen:active-class-session-updated", { detail: data }));
        if (active && (data.status === "closed" || data.status === null)) {
          setSessionJoinStatus("outside");
          setSessionExitRequested(true);
          setSessionEnded(true);
        }
      } catch {
        // Keep the page available during temporary network failures.
      } finally {
        inFlight = false;
      }
    };
    const onVisibilityChange = () => { if (document.visibilityState === "visible") void checkSessionStatus(); };
    void checkSessionStatus();
    const poll = window.setInterval(() => void checkSessionStatus(), 12_000);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      active = false;
      window.clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [activeSessionId]);

  const isAdminRoute = pathname.startsWith("/admin");
  const visibleSession = isAdminRoute || pathname.startsWith("/game/host") ? activeAccountSession : activeSession;
  const isAdminHostRoute = (visibleSession?.role === "admin" || visibleSession?.role === "pengurus" || visibleSession?.role === "developer") && pathname.startsWith("/game/host");
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
      setSessionJoinStatus("outside");
      setSessionExitRequested(true);
      setActiveAccountSession((current) => current ? { ...current, guestSessionId: undefined, guestRegistrationId: undefined, guestClassHref: undefined } : null);
      setActiveGuestSession(null);
      setSessionEnded(false);
      router.refresh();
      router.replace("/");
    } catch (error) {
      setEndError(error instanceof Error ? error.message : "Belum dapat kembali ke beranda. Tekan OK untuk mencoba lagi.");
      setAcknowledgingEnd(false);
    }
  };

  const participationForNavbar: SessionParticipation = sessionEnded
    ? "outside"
    : sessionExitRequested
      ? "outside"
    : activeSessionId
      ? participantPending ? "waiting" : "approved"
      : sessionJoinStatus;
  const navbar = isAdminRoute || isAdminHostRoute ? null : <Navbar session={visibleSession} sessionParticipation={participationForNavbar} />;
  return <>{!isAdminRoute && <div className="site-background" aria-hidden="true" />}{navbar}{sessionChanged && <div className="session-ended-backdrop" role="presentation"><section role="alertdialog" aria-modal="true" aria-labelledby="session-changed-title" className="session-ended-panel"><h2 id="session-changed-title" className="session-ended-title">Sesi Anda telah berubah</h2><p className="session-ended-message">Sesi Anda telah berubah, silakan muat ulang halaman.</p><div className="session-ended-actions"><button data-session-reload type="button" autoFocus onClick={() => window.location.reload()}>Muat ulang halaman</button></div></section></div>}{sessionEnded && <div className="session-ended-backdrop" role="presentation"><section role="alertdialog" aria-modal="true" aria-labelledby="guest-session-ended-title" aria-describedby="guest-session-ended-description" className="session-ended-panel"><h2 id="guest-session-ended-title" className="session-ended-title">Sesi sudah berakhir</h2><p id="guest-session-ended-description" className="session-ended-message">Sesi sudah ditutup. Silakan kembali ke beranda.</p>{endError && <p role="alert" className="session-ended-error">{endError}</p>}<div className="session-ended-actions"><button type="button" autoFocus disabled={acknowledgingEnd} onClick={() => void acknowledgeSessionEnd()}>{acknowledgingEnd ? "Menyiapkan…" : "OK"}</button></div></section></div>}</>;
}
