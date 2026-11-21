"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, ShoppingCart, ChevronDown, Gamepad2, GraduationCap, KeyRound, LogOut, Settings, User, CalendarDays } from "lucide-react";
import { SessionPayload } from "@/lib/types";
import { SITE_CONFIG } from "@/config/site";
import styles from "./Navbar.module.css";

interface NavbarProps {
  session: SessionPayload | null;
}

export default function Navbar({ session }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = session?.role === "admin" || session?.role === "pengurus" || session?.role === "developer";
  const isWarga = session?.origin === "warga_kode";
  const showCart = !isAdmin && !isWarga;
  const isAdminRoute = pathname.startsWith("/admin");
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setScrolled(window.scrollY > 8);
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => { setOpen(false); }, [pathname, session?.id, session?.role]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  if (isAdminRoute && isAdmin) {
    return <header className="hidden" aria-hidden="true" />;
  }
  if (isAdmin && pathname.startsWith("/game/host")) {
    return <header className="hidden" aria-hidden="true" />;
  }

  const publicNavLinks = [
    { href: "/", label: "Beranda" },
    { href: "/kelas", label: "Kelas" },
    { href: "/games", label: "Games" },
    { href: "/sesi", label: "Sesi Kelas" },
    { href: "/tentang", label: "Tentang" },
    { href: "/faq", label: "FAQ" },
  ];

  async function handleLogout() {
    if (isAdmin) {
      try {
        const { createBrowserSupabaseClient } = await import("@/lib/supabase");
        const supabase = createBrowserSupabaseClient();
        if (supabase) await supabase.auth.signOut({ scope: "local" });
      } catch {}
    }
    try { await fetch("/api/auth/session", { method: "DELETE" }); } catch {}
    try { localStorage.removeItem("sapen_last_quiz_name"); } catch {}
    setOpen(false);
    router.push("/");
    router.refresh();
  }

  const displayName = session?.name || "Pengguna";
  const initial = (displayName.trim()[0] || "U").toUpperCase();

  return (
    <header className={`${styles.navbar} ${scrolled ? styles.navbarScrolled : ""}`}>
      <div className={styles.inner}>
        <Link href="/" className={styles.brand} aria-label="Kembali ke beranda">
          <Image src="/sapen-english-village-logo.jpg" alt={`${SITE_CONFIG.name} — English Village`} width={651} height={453} priority className={styles.brandLogo} />
        </Link>

        <nav className={styles.desktopNav} aria-label="Navigasi utama">
          {publicNavLinks.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return <Link key={item.label} href={item.href} onClick={() => setOpen(false)} aria-current={active ? "page" : undefined} className={`${styles.navLink} ${active ? styles.navLinkActive : ""}`}>{item.label}</Link>;
          })}
        </nav>

        <div className={styles.desktopActions}>
          {showCart && <Link href="/keranjang" className={styles.cartAction} aria-label="Buka keranjang belanja"><ShoppingCart className="h-4 w-4" /><span>Keranjang</span></Link>}
          {!session ? (
            <>
              <Link href="/masuk" className={styles.signIn}>
                Masuk
              </Link>
              <Link href="/daftar" className={styles.signUp}>
                Daftar
              </Link>
            </>
          ) : (
            <div className={styles.accountWrap} ref={menuRef}>
              <button type="button" onClick={() => setOpen((v) => !v)} className={styles.accountButton} aria-expanded={open}>
                <span className={styles.avatar}>{initial}</span>
                <span className={styles.accountName}>{displayName}</span>
                <ChevronDown className={styles.chevron} />
              </button>
              {open && (
                <div className={styles.accountMenu}>
                  <div className={styles.accountSummary}>
                    <strong>{displayName}</strong>
                  <span>{isAdmin ? "Pengurus" : "Peserta"}</span>
                  </div>
                  {!isAdmin && <Link href="/akun" onClick={() => setOpen(false)} className={styles.menuItem}><Settings />Akun Saya / Pengaturan Akun</Link>}
                  {isAdmin && <Link href="/admin" onClick={() => setOpen(false)} className={styles.menuItem}><GraduationCap />Panel Pengurus</Link>}
                  <button type="button" onClick={handleLogout} className={styles.menuLogout}><LogOut />Logout</button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className={styles.mobileActions}>
          {session && <button type="button" onClick={() => setOpen((v) => !v)} className={styles.mobileAccountButton} aria-label="Menu akun" aria-expanded={open}>{initial}</button>}
        </div>
      </div>

      {open && session && (
        <div className={styles.mobileAccountPanel}>
          <div className={styles.mobileIdentity}><span className={styles.avatar}>{initial}</span><span>{displayName} · {isAdmin ? "Pengurus" : "Peserta"}</span></div>
          <div className={styles.mobileAccountLinks}>
              {!isAdmin && <Link href="/akun" onClick={() => setOpen(false)} className={styles.mobileAccountLink}><User />Akun</Link>}
              {isAdmin && <Link href="/admin" onClick={() => setOpen(false)} className={styles.mobileAccountLink}><GraduationCap />Panel Pengurus</Link>}
              <button type="button" onClick={handleLogout} className={styles.mobileLogout}><LogOut />Logout</button>
            </div>
        </div>
      )}

      <nav className={styles.bottomNav} aria-label="Navigasi bawah">
        <Link href="/" aria-current={pathname === "/" ? "page" : undefined} className={`${styles.bottomLink} ${pathname === "/" ? styles.bottomLinkActive : ""}`}><GraduationCap aria-hidden="true" />Beranda</Link>
        <Link href="/kelas" aria-current={pathname.startsWith("/kelas") ? "page" : undefined} onClick={() => setOpen(false)} className={`${styles.bottomLink} ${pathname.startsWith("/kelas") ? styles.bottomLinkActive : ""}`}><BookOpen aria-hidden="true" />Kelas</Link>
        <Link href="/sesi" aria-current={pathname === "/sesi" ? "page" : undefined} onClick={() => setOpen(false)} className={`${styles.bottomLink} ${pathname === "/sesi" || pathname.startsWith("/sesi/") ? styles.bottomLinkActive : ""}`}><CalendarDays aria-hidden="true" />Sesi Kelas</Link>
        <Link href="/games" aria-current={pathname.startsWith("/games") || pathname.startsWith("/game") ? "page" : undefined} onClick={() => setOpen(false)} className={`${styles.bottomLink} ${pathname.startsWith("/games") || pathname.startsWith("/game") ? styles.bottomLinkActive : ""}`}><Gamepad2 aria-hidden="true" />Games</Link>
        <Link href={session ? "/akun" : "/masuk"} aria-current={session ? (pathname.startsWith("/akun") ? "page" : undefined) : (pathname.startsWith("/masuk") ? "page" : undefined)} className={`${styles.bottomLink} ${(session ? pathname.startsWith("/akun") : pathname.startsWith("/masuk")) ? styles.bottomLinkActive : ""}`}>{session ? <User aria-hidden="true" /> : <KeyRound aria-hidden="true" />}{session ? "Akun" : "Masuk"}</Link>
      </nav>
    </header>
  );
}
