import Link from "next/link";
import { ArrowUpRight, BookOpen, Gamepad2, MapPin } from "lucide-react";
import { SITE_CONFIG } from "@/config/site";

export default function Footer() {
  return (
    <footer className="site-footer pb-24 md:pb-0">
      <div className="workbook-wrap site-footer-main">
        <div className="site-footer-brand">
          <Link href="/" className="site-footer-name">{SITE_CONFIG.name}</Link>
          <p>Ruang belajar Bahasa Inggris yang tumbuh bersama warga Kampung Sapen.</p>
          <span><MapPin aria-hidden="true" className="h-4 w-4" /> {SITE_CONFIG.location}</span>
        </div>

        <nav aria-label="Jelajahi website" className="site-footer-nav">
          <h2>Jelajahi</h2>
          <Link href="/kelas"><BookOpen aria-hidden="true" />Kelas</Link>
          <Link href="/games"><Gamepad2 aria-hidden="true" />Permainan</Link>
          <Link href="/sesi">Sesi kelas</Link>
        </nav>

        <nav aria-label="Informasi" className="site-footer-nav">
          <h2>Informasi</h2>
          <Link href="/tentang">Tentang Sapen English</Link>
          <Link href="/faq">Pertanyaan umum</Link>
          <Link href="/masuk">Masuk</Link>
        </nav>

        <div className="site-footer-cta">
          <p>Belajar dimulai dari satu percakapan.</p>
          <Link href="/kelas">Temukan kelas <ArrowUpRight aria-hidden="true" className="h-4 w-4" /></Link>
        </div>
      </div>
      <div className="workbook-wrap site-footer-bottom">
        <span>{SITE_CONFIG.location}</span>
        <span>© {new Date().getFullYear()} {SITE_CONFIG.name}. Hak cipta dilindungi.</span>
      </div>
    </footer>
  );
}
