"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, ShoppingCart, Gamepad2, GraduationCap, KeyRound, LogOut, Settings, User, CalendarDays, Menu, X } from "lucide-react";
import { SessionPayload } from "@/lib/types";
import { SITE_CONFIG } from "@/config/site";
import styles from "./Navbar.module.css";
import { clearAuthBrowserStorage, getStoredSupabaseAccessToken, publishSessionChanged } from "@/lib/session-sync";
import { useClassCart } from "@/components/ClassCartProvider";

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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { ids: cartIds, clear: clearCart } = useClassCart();
  const cartCount = cartIds.length;
  const [cartBump, setCartBump] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [avatarDataUrl, setAvatarDataUrl] = useState(session?.avatarDataUrl);
  const [logoutError, setLogoutError] = useState("");
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
    let bumpTimer = 0;
    const flights = new Map<string, { dot: HTMLSpanElement; animation: Animation }>();
    const onCartFly = (event: Event) => {
      const detail = (event as CustomEvent<{ classId?: string; source?: { left: number; top: number; width: number; height: number } | null }>).detail;
      const target = [...document.querySelectorAll<HTMLElement>("[data-cart-target]")].find((node) => node.getBoundingClientRect().width > 0);
      const finish = () => {
        window.dispatchEvent(new CustomEvent("sapen:cart-fly-complete", { detail: { classId: detail?.classId } }));
        setCartBump(true);
        window.clearTimeout(bumpTimer);
        bumpTimer = window.setTimeout(() => setCartBump(false), 500);
      };
      if (!target || !detail?.source) { finish(); return; }
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduceMotion) { finish(); return; }
      const targetRect = target.getBoundingClientRect();
      const source = detail.source;
      const dot = document.createElement("span");
      dot.setAttribute("aria-hidden", "true");
      dot.style.cssText = `position:fixed;z-index:9999;left:${source.left + source.width / 2 - 18}px;top:${source.top + source.height / 2 - 18}px;width:36px;height:36px;border-radius:50%;display:grid;place-items:center;color:white;background:#244b3a;pointer-events:none;`;
      dot.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>';
      document.body.appendChild(dot);
      const dx = targetRect.left + targetRect.width / 2 - (source.left + source.width / 2);
      const dy = targetRect.top + targetRect.height / 2 - (source.top + source.height / 2);
      if (typeof dot.animate !== "function") { dot.remove(); finish(); return; }
      const animation = dot.animate([{ transform: "translate(0,0) scale(1)", opacity: 1 }, { transform: `translate(${dx * .55}px,${dy - 55}px) scale(.8)`, opacity: 1, offset: .65 }, { transform: `translate(${dx}px,${dy}px) scale(.35)`, opacity: .3 }], { duration: 600, easing: "cubic-bezier(.2,.75,.25,1)", fill: "forwards" });
      if (detail?.classId) flights.set(detail.classId, { dot, animation });
      animation.onfinish = () => { dot.remove(); if (detail?.classId) flights.delete(detail.classId); finish(); };
    };
    const onCartFailed = (event: Event) => {
      const classId = (event as CustomEvent<{ classId?: string }>).detail?.classId;
      const flight = classId ? flights.get(classId) : undefined;
      if (!flight) return;
      flight.animation.cancel();
      flight.dot.remove();
      flights.delete(classId!);
    };
    window.addEventListener("sapen:cart-fly", onCartFly);
    window.addEventListener("sapen:cart-failed", onCartFailed);
    return () => { window.clearTimeout(bumpTimer); window.removeEventListener("sapen:cart-fly", onCartFly); window.removeEventListener("sapen:cart-failed", onCartFailed); for (const flight of flights.values()) { flight.animation.cancel(); flight.dot.remove(); } };
  }, []);

  useEffect(() => { setOpen(false); setDrawerOpen(false); }, [pathname, session?.id, session?.role]);

  useEffect(() => {
    setAvatarDataUrl(session?.avatarDataUrl);
    const onProfileUpdated = (event: Event) => {
      const updated = (event as CustomEvent<{ avatarDataUrl?: string }>).detail?.avatarDataUrl;
      setAvatarDataUrl(updated);
    };
    window.addEventListener("sapen:profile-avatar-updated", onProfileUpdated);
    return () => window.removeEventListener("sapen:profile-avatar-updated", onProfileUpdated);
  }, [session?.id, session?.avatarDataUrl]);

  useEffect(() => {
    if (!drawerOpen) return;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setDrawerOpen(false); };
    window.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = oldOverflow; window.removeEventListener("keydown", onKeyDown); };
  }, [drawerOpen]);

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
    { href: "/games", label: "Kuis" },
    { href: "/sesi", label: "Sesi Kelas" },
    { href: "/tentang", label: "Tentang" },
    { href: "/faq", label: "FAQ" },
  ];

  async function handleLogout() {
    setLogoutError("");
    const accessToken = getStoredSupabaseAccessToken();
    try {
      const response = await fetch("/api/auth/session", { method: "DELETE", headers: accessToken ? { Authorization: "Bearer " + accessToken } : undefined, cache: "no-store" });
      if (!response.ok) throw new Error("Keluar belum berhasil. Periksa koneksi lalu coba lagi.");
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : "Keluar belum berhasil. Periksa koneksi lalu coba lagi.");
      return;
    }
    clearCart();
    clearAuthBrowserStorage();
    publishSessionChanged();
    setOpen(false);
    window.location.replace("/");
  }

  const displayName = session?.name || "Pengguna";
  const initial = (displayName.trim()[0] || "U").toUpperCase();
  const hasPermanentAccount = Boolean(session && (isAdmin || (session.email && session.role !== "guest" && session.origin !== "guest")));
  const hasAccountDestination = hasPermanentAccount || isWarga;

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
          {showCart && <Link href="/keranjang" data-cart-target className={styles.cartAction} aria-label={`Buka keranjang belanja, ${cartCount} item`}><ShoppingCart className="h-4 w-4" /><span>Keranjang</span>{cartCount > 0 && <span className={`${styles.cartBadge} ${styles.desktopCartBadge} ${cartBump ? styles.cartBadgeBump : ""}`}>{cartCount > 99 ? "99+" : cartCount}</span>}</Link>}
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
                {avatarDataUrl ? <Image src={avatarDataUrl} alt="" width={32} height={32} unoptimized className={`${styles.avatar} aspect-square rounded-full object-cover`} /> : <span className={styles.avatar}>{initial}</span>}
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
          {showCart && <Link href="/keranjang" data-cart-target className={styles.mobileCartAction} aria-label={`Keranjang, ${cartCount} item`} title="Keranjang"><ShoppingCart aria-hidden="true" />{cartCount > 0 && <span className={`${styles.cartBadge} ${cartBump ? styles.cartBadgeBump : ""}`}>{cartCount > 99 ? "99+" : cartCount}</span>}</Link>}
          <button type="button" onClick={() => setDrawerOpen(true)} className={styles.mobileMenuButton} aria-label="Buka menu" aria-controls="public-mobile-drawer" aria-expanded={drawerOpen}><Menu aria-hidden="true" /></button>
        </div>
      </div>

      {drawerOpen && <div className={styles.drawerRoot}>
        <button type="button" className={styles.drawerScrim} aria-label="Tutup menu" onClick={() => setDrawerOpen(false)} />
        <aside id="public-mobile-drawer" role="dialog" aria-modal="true" aria-label="Menu navigasi" className={styles.drawerPanel}>
          <div className={styles.drawerHeader}><strong>Jelajahi Sapen</strong><button type="button" aria-label="Tutup menu" title="Tutup menu" onClick={() => setDrawerOpen(false)} className={styles.drawerClose}><X aria-hidden="true" /></button></div>
          <nav className={styles.drawerLinks} aria-label="Navigasi lainnya">
            <Link href="/tentang" onClick={() => setDrawerOpen(false)}>Tentang</Link>
            <Link href="/faq" onClick={() => setDrawerOpen(false)}>FAQ</Link>
            {!session && <Link href="/daftar" onClick={() => setDrawerOpen(false)}>Daftar</Link>}
            {session && <>{isAdmin && <Link href="/admin" onClick={() => setDrawerOpen(false)}>Panel Pengurus</Link>}<button type="button" onClick={() => { setDrawerOpen(false); void handleLogout(); }}><LogOut aria-hidden="true" />Logout</button></>}
          </nav>
        </aside>
      </div>}

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
        <Link href="/games" aria-current={pathname.startsWith("/games") || pathname.startsWith("/game") ? "page" : undefined} onClick={() => setOpen(false)} className={`${styles.bottomLink} ${pathname.startsWith("/games") || pathname.startsWith("/game") ? styles.bottomLinkActive : ""}`}><Gamepad2 aria-hidden="true" />Kuis</Link>
        {hasAccountDestination ? <Link href="/akun" aria-label="Akun saya" title="Akun saya" aria-current={pathname.startsWith("/akun") ? "page" : undefined} className={`${styles.bottomLink} ${styles.bottomAccountLink} ${pathname.startsWith("/akun") ? styles.bottomLinkActive : ""}`}>
          {avatarDataUrl ? <Image src={avatarDataUrl} alt="" width={32} height={32} unoptimized className={`${styles.bottomAvatar} aspect-square rounded-full`} /> : <span className={styles.bottomAvatarInitial}>{initial}</span>}
        </Link> : <Link href="/masuk" aria-current={pathname.startsWith("/masuk") ? "page" : undefined} className={`${styles.bottomLink} ${pathname.startsWith("/masuk") ? styles.bottomLinkActive : ""}`}><KeyRound aria-hidden="true" />Masuk</Link>}
      </nav>
      {logoutError && <p role="alert" className="mx-auto max-w-5xl px-4 py-2 text-sm font-semibold text-red-800">{logoutError}</p>}
    </header>
  );
}
