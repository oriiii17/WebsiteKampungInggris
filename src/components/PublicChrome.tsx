"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import type { SessionPayload } from "@/lib/types";

export default function PublicChrome({ session }: { session: SessionPayload | null }) {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith("/admin");
  const isAdminHostRoute = (session?.role === "pengurus" || session?.role === "developer") && pathname.startsWith("/game/host");
  const isStandaloneRoute = pathname.startsWith("/sesi/") || pathname.startsWith("/game/play/") || pathname.startsWith("/game/join") || pathname.startsWith("/games/");
  if (isAdminRoute || isAdminHostRoute || isStandaloneRoute) return null;
  return <Navbar session={session} />;
}
