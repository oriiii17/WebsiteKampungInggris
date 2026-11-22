"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, ChevronDown, Gamepad2, LogOut } from "lucide-react";
import { SITE_CONFIG } from "@/config/site";
import styles from "./Navbar.module.css";
import { publishSessionChanged } from "@/lib/session-sync";

export default function GuestNavbar({ guestClassHref, displayName = "Guest", isGuest = true }: { guestClassHref: string; displayName?: string; isGuest?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const classActive = pathname.startsWith("/kelas") || pathname.startsWith("/sesi/") || pathname.startsWith("/akun");
  const gamesActive = pathname.startsWith("/games") || pathname.startsWith("/game");

  async function logoutGuest() {
    if (loggingOut) return;
    setLoggingOut(true);
    setLogoutError("");
    try {
      const response = await fetch(isGuest ? "/api/auth/session?scope=guest" : "/api/auth/session", { method: "DELETE", cache: "no-store" });
      if (!response.ok) throw new Error("Sesi belum berhasil dihapus. Coba lagi.");
      publishSessionChanged();
      window.dispatchEvent(new Event("sapen:guest-session-updated"));
      setOpen(false);
      router.replace("/");
      router.refresh();
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : "Belum dapat keluar. Periksa koneksi lalu coba lagi.");
      setLoggingOut(false);
    }
  }

  const initial = (displayName.trim()[0] || "G").toUpperCase();
  const roleLabel = isGuest ? "Peserta sesi" : "Dalam sesi kelas";
  const classLink = <Link href={guestClassHref} aria-current={classActive ? "page" : undefined} onClick={() => setOpen(false)} className={`${styles.navLink} ${classActive ? styles.navLinkActive : ""}`}><BookOpen aria-hidden="true" className="mr-2 h-4 w-4" />Kelas</Link>;
  const gamesLink = <Link href="/games" aria-current={gamesActive ? "page" : undefined} onClick={() => setOpen(false)} className={`${styles.navLink} ${gamesActive ? styles.navLinkActive : ""}`}><Gamepad2 aria-hidden="true" className="mr-2 h-4 w-4" />Kuis</Link>;

  return <header className={`${styles.navbar} ${styles.navbarGuest}`}>
    <div className={styles.inner}>
      <Link href={guestClassHref} className={styles.brand} aria-label="Buka kelas sesi Guest">
        <Image src="/sapen-english-village-logo.jpg" alt={`${SITE_CONFIG.name} — English Village`} width={651} height={453} priority className={styles.brandLogo} />
      </Link>
      <nav className={styles.desktopNav} aria-label="Navigasi ruang Guest">{classLink}{gamesLink}</nav>
      <div className={styles.desktopActions}>
        <div className={styles.accountWrap}>
          <button type="button" onClick={() => setOpen((value) => !value)} className={styles.accountButton} aria-expanded={open}>
            <span className={styles.avatar}>{initial}</span><span className={styles.accountName}>{isGuest ? "Guest" : displayName}</span><ChevronDown aria-hidden="true" className={styles.chevron} />
          </button>
          {open && <div className={styles.accountMenu}><div className={styles.accountSummary}><strong>{isGuest ? "Guest" : displayName}</strong><span>{roleLabel}</span></div>{logoutError && <p role="alert" className="px-3 py-2 text-xs font-semibold text-[#943520]">{logoutError}</p>}<button type="button" disabled={loggingOut} onClick={() => void logoutGuest()} className={styles.menuLogout}><LogOut aria-hidden="true" />{loggingOut ? "Keluar…" : "Logout"}</button></div>}
        </div>
      </div>
    <div className={styles.mobileActions}><button type="button" onClick={() => setOpen((value) => !value)} className={styles.mobileAccountButton} aria-label={`Menu ${isGuest ? "Guest" : displayName}`} aria-expanded={open}>{initial}</button></div>
    </div>
    {open && <div className={`${styles.mobileAccountPanel} flex-wrap`}><div className={styles.mobileIdentity}><span className={styles.avatar}>{initial}</span><span>{isGuest ? "Guest" : displayName} · {roleLabel}</span></div><div className={styles.mobileAccountLinks}><button type="button" disabled={loggingOut} onClick={() => void logoutGuest()} className={styles.mobileLogout}><LogOut aria-hidden="true" />{loggingOut ? "Keluar…" : "Logout"}</button></div>{logoutError && <p role="alert" className="basis-full text-xs font-semibold text-[#943520]">{logoutError}</p>}</div>}
    <nav className={styles.bottomNav} aria-label="Navigasi ruang Guest">
      <Link href={guestClassHref} aria-current={classActive ? "page" : undefined} onClick={() => setOpen(false)} className={`${styles.bottomLink} ${classActive ? styles.bottomLinkActive : ""}`}><BookOpen aria-hidden="true" />Kelas</Link>
      <Link href="/games" aria-current={gamesActive ? "page" : undefined} onClick={() => setOpen(false)} className={`${styles.bottomLink} ${gamesActive ? styles.bottomLinkActive : ""}`}><Gamepad2 aria-hidden="true" />Kuis</Link>
    </nav>
  </header>;
}
