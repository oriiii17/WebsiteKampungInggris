"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, CreditCard, ChevronDown, Gamepad2, GraduationCap, KeyRound, LogOut, Settings, User } from "lucide-react";
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

  const publicNavLinks = [
    { href: "/", label: "Beranda" },
    { href: "/kelas", label: "Kelas" },
    { href: "/materi", label: "Materi" },
    { href: "/game", label: "Game" },
    { href: "/paket", label: "Paket" },
    { href: "/#tentang", label: "Tentang" },
    { href: "/#faq", label: "FAQ" },
  ];

  async function handleLogout() {
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
          <span className={styles.brandCopy}>
            <span className={styles.brandName}>{SITE_CONFIG.name}</span>
            <span className={styles.brandTagline}>Belajar bahasa Inggris bersama</span>
          </span>
        </Link>

        <nav className={styles.desktopNav} aria-label="Navigasi utama">
          {publicNavLinks.map((item) => {
            const active = item.href === "/" ? pathname === "/" : item.href.startsWith("/#") ? false : pathname.startsWith(item.href);
            return <Link key={item.href} href={item.href} className={`${styles.navLink} ${active ? styles.navLinkActive : ""}`}>{item.label}</Link>;
          })}
        </nav>

        <div className={styles.desktopActions}>
          {!session ? (
            <>
              <Link href="/login" className={styles.signIn}>
                Masuk
              </Link>
              <Link href="/masuk" className={styles.signUp}>
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
                  <button type="button" onClick={handleLogout} className={styles.menuLogout}><LogOut />Log Out</button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className={styles.mobileActions}>
          {session ? (
            <button type="button" onClick={() => setOpen((v) => !v)} className={styles.mobileAccountButton} aria-label="Menu akun" aria-expanded={open}>{initial}</button>
          ) : (
            <>
              <Link href="/login" className={styles.mobileSignIn}>Masuk</Link>
              <Link href="/masuk" className={styles.mobileSignUp}>Daftar</Link>
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
              <button type="button" onClick={handleLogout} className={styles.mobileLogout}><LogOut />Log Out</button>
            </div>
        </div>
      )}

      <nav className={styles.bottomNav} aria-label="Navigasi bawah">
        <Link href="/" className={`${styles.bottomLink} ${pathname === "/" ? styles.bottomLinkActive : ""}`}><GraduationCap />Beranda</Link>
        <Link href="/kelas" className={`${styles.bottomLink} ${pathname.startsWith("/kelas") ? styles.bottomLinkActive : ""}`}><BookOpen />Kelas</Link>
        <Link href="/game" className={`${styles.bottomLink} ${pathname.startsWith("/game") ? styles.bottomLinkActive : ""}`}><Gamepad2 />Game</Link>
        <Link href="/paket" className={`${styles.bottomLink} ${pathname.startsWith("/paket") ? styles.bottomLinkActive : ""}`}><CreditCard />Paket</Link>
        {session ? (
          <Link href="/akun" className={`${styles.bottomLink} ${pathname.startsWith("/akun") ? styles.bottomLinkActive : ""}`}><User />Akun</Link>
        ) : (
          <Link href="/login" className={`${styles.bottomLink} ${pathname.startsWith("/login") ? styles.bottomLinkActive : ""}`}><KeyRound />Masuk</Link>
        )}
      </nav>
    </header>
  );
}
