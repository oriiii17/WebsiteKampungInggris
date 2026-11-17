import Link from "next/link";
import { SITE_CONFIG } from "@/config/site";

export default function Footer() {
  return (
    <footer className="border-t border-rule bg-paper-light pb-24 text-muted md:pb-0">
      <div className="workbook-wrap flex flex-col gap-3 py-5 text-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="text-center sm:text-left">
          <p className="font-bold text-ink">{SITE_CONFIG.name}</p>
          <p className="mt-1">{SITE_CONFIG.location} · © {new Date().getFullYear()} Seluruh hak cipta dilindungi.</p>
        </div>
        <nav aria-label="Navigasi footer" className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 font-semibold text-leaf">
          <Link href="/" className="underline underline-offset-4 hover:text-leaf-dark">Beranda</Link>
          <Link href="/tentang" className="underline underline-offset-4 hover:text-leaf-dark">Tentang</Link>
          <Link href="/faq" className="underline underline-offset-4 hover:text-leaf-dark">FAQ</Link>
        </nav>
      </div>
    </footer>
  );
}
