"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import type { SessionPayload } from "@/lib/types";

export default function PublicChrome({ session, guestSession, guestClassHref }: { session: SessionPayload | null; guestSession: SessionPayload | null; guestClassHref?: string }) {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith("/admin");
  const visibleSession = isAdminRoute || pathname.startsWith("/game/host") ? session : guestSession || session;
  const isAdminHostRoute = (visibleSession?.role === "pengurus" || visibleSession?.role === "developer") && pathname.startsWith("/game/host");
  const isStandaloneRoute = pathname.startsWith("/sesi/") || pathname.startsWith("/game/play/") || pathname.startsWith("/game/join") || pathname.startsWith("/games/");
  if (isAdminRoute || isAdminHostRoute || isStandaloneRoute) return null;
  return <Navbar session={visibleSession} guestClassHref={guestClassHref} />;
}
