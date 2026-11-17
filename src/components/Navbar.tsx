"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, ShoppingCart, ChevronDown, Gamepad2, GraduationCap, KeyRound, LogOut, Settings, User } from "lucide-react";
import { SessionPayload } from "@/lib/types";
import { SITE_CONFIG } from "@/config/site";
import styles from "./Navbar.module.css";

interface NavbarProps {
  session: SessionPayload | null;
}

export default function Navbar({ session }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = session?.role === "pengurus" || session?.role === "developer";
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
    { href: "/game", label: "Game" },
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
        <Link href="/" className={styles.brand}>
          <Image src="/sapen-english-village-logo.jpg" alt={`${SITE_CONFIG.name} — English Village`} width={651} height={453} priority className={styles.brandLogo} />
        </Link>

        <nav className={styles.desktopNav} aria-label="Navigasi utama">
          {publicNavLinks.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return <Link key={item.href} href={item.href} className={`${styles.navLink} ${active ? styles.navLinkActive : ""}`}>{item.label}</Link>;
          })}
        </nav>

        <div className={styles.desktopActions}>
          <Link href="/keranjang" className={styles.cartAction} aria-label="Buka keranjang belanja"><ShoppingCart className="h-4 w-4" /><span>Keranjang</span></Link>
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
                  <Link href="/akun" onClick={() => setOpen(false)} className={styles.menuItem}><Settings />Akun Saya / Pengaturan Akun</Link>
                  {isAdmin && <Link href="/admin" onClick={() => setOpen(false)} className={styles.menuItem}><GraduationCap />Panel Pengurus</Link>}
                  <button type="button" onClick={handleLogout} className={styles.menuLogout}><LogOut />Keluar</button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className={styles.mobileActions}>
          <Link href="/keranjang" className={styles.mobileCartAction} aria-label="Buka keranjang belanja"><ShoppingCart className="h-5 w-5" /></Link>
          {session ? (
            <button type="button" onClick={() => setOpen((v) => !v)} className={styles.mobileAccountButton} aria-label="Menu akun" aria-expanded={open}>{initial}</button>
          ) : (
            <>
              <Link href="/masuk" className={styles.mobileSignIn}>Masuk</Link>
              <Link href="/daftar" className={styles.mobileSignUp}>Daftar</Link>
            </>
          )}
        </div>
      </div>

      {open && session && (
        <div className={styles.mobileAccountPanel}>
          <div className={styles.mobileIdentity}><span className={styles.avatar}>{initial}</span><span>{displayName}</span></div>
          <div className={styles.mobileAccountLinks}>
              <Link href="/akun" onClick={() => setOpen(false)} className={styles.mobileAccountLink}><User />Akun</Link>
              {isAdmin && <Link href="/admin" onClick={() => setOpen(false)} className={styles.mobileAccountLink}><GraduationCap />Panel Pengurus</Link>}
              <button type="button" onClick={handleLogout} className={styles.mobileLogout}><LogOut />Keluar</button>
            </div>
        </div>
      )}

      <nav className={styles.bottomNav} aria-label="Navigasi bawah">
        <Link href="/" className={`${styles.bottomLink} ${pathname === "/" ? styles.bottomLinkActive : ""}`}><GraduationCap />Beranda</Link>
        <Link href="/kelas" className={`${styles.bottomLink} ${pathname.startsWith("/kelas") ? styles.bottomLinkActive : ""}`}><BookOpen />Kelas</Link>
        <Link href="/game" className={`${styles.bottomLink} ${pathname.startsWith("/game") ? styles.bottomLinkActive : ""}`}><Gamepad2 />Game</Link>
        {session ? (
          <Link href="/akun" className={`${styles.bottomLink} ${pathname.startsWith("/akun") ? styles.bottomLinkActive : ""}`}><User />Akun</Link>
        ) : (
          <Link href="/masuk" className={`${styles.bottomLink} ${pathname.startsWith("/masuk") ? styles.bottomLinkActive : ""}`}><KeyRound />Masuk</Link>
        )}
      </nav>
    </header>
  );
}
