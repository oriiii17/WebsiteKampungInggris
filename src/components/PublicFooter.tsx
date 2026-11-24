"use client";

import { usePathname } from "next/navigation";
import Footer from "@/components/Footer";

export default function PublicFooter({ isGuest = false }: { isGuest?: boolean }) {
  const pathname = usePathname();
  const hidden = isGuest || pathname.startsWith("/admin") || pathname.startsWith("/game/host") || pathname.startsWith("/game/play") || pathname.startsWith("/game/join") || pathname.startsWith("/games/") || pathname.startsWith("/sesi/") || ["/masuk", "/daftar", "/lupa-password", "/reset-password"].includes(pathname);
  return hidden ? null : <Footer />;
}
