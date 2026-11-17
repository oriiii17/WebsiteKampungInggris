"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import type { SessionPayload } from "@/lib/types";

export default function PublicChrome({ session }: { session: SessionPayload | null }) {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith("/admin");
  const isAdminHostRoute = (session?.role === "pengurus" || session?.role === "developer") && pathname.startsWith("/game/host");
  if (isAdminRoute || isAdminHostRoute) return null;
  return <><Navbar session={session} /><Footer /></>;
}
