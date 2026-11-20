"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import GuestNavbar from "@/components/GuestNavbar";
import type { SessionPayload } from "@/lib/types";

export default function PublicChrome({ session, guestSession, guestClassHref }: { session: SessionPayload | null; guestSession: SessionPayload | null; guestClassHref?: string }) {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith("/admin");
  const visibleSession = isAdminRoute || pathname.startsWith("/game/host") ? session : guestSession || session;
  const isGuest = visibleSession?.role === "guest" || visibleSession?.origin === "guest";
  const isAdminHostRoute = (visibleSession?.role === "admin" || visibleSession?.role === "pengurus" || visibleSession?.role === "developer") && pathname.startsWith("/game/host");
  const isStandaloneRoute = pathname.startsWith("/sesi/") || pathname.startsWith("/game/play/") || pathname.startsWith("/game/join") || (!isGuest && pathname.startsWith("/games/"));
  if (isAdminRoute || isAdminHostRoute || isStandaloneRoute) return null;
  if (isGuest) return <GuestNavbar guestClassHref={guestClassHref || "/kelas"} />;
  return <Navbar session={visibleSession} />;
}
