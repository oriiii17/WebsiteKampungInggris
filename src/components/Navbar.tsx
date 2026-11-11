"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, CreditCard, ChevronDown, Gamepad2, GraduationCap, KeyRound, LogOut, Settings, User } from "lucide-react";
import { SessionPayload } from "@/lib/types";
import { SITE_CONFIG } from "@/config/site";

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
    <header className={`sticky top-0 z-40 ${scrolled ? "bg-navy-soft/80 backdrop-blur-xl border-b border-navy/10" : "bg-white/95"}`} style={{ backdropFilter: scrolled ? "blur(12px)" : undefined, WebkitBackdropFilter: scrolled ? "blur(12px)" : undefined }}>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-2.5 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#14532D] text-white sm:h-10 sm:w-10">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-sm font-black leading-tight tracking-tight text-[#1A2E1A] sm:text-base">{SITE_CONFIG.name}</span>
            <p className="hidden text-[10px] font-semibold text-[#1A2E1A]/60 sm:block sm:text-[11px]">English Learning Platform</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {publicNavLinks.map((item) => {
            const active = item.href === "/" ? pathname === "/" : item.href.startsWith("/#") ? false : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className={`rounded-md px-3.5 py-2 text-sm font-bold transition-colors ${active ? "bg-[#14532D]/10 text-[#14532D]" : "text-[#1A2E1A]/80 hover:bg-[#FDFBF7] hover:text-[#1A2E1A]"}`}>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {!session ? (
            <>
              <Link href="/login" className="inline-flex min-h-[44px] items-center rounded-full px-4 py-2.5 text-sm font-bold text-[#1A2E1A]/80 transition hover:text-[#14532D]">
                Masuk
              </Link>
              <Link href="/masuk" className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-[#14532D] px-6 py-2.5 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#0F3F22] active:scale-95">
                Daftar
              </Link>
            </>
          ) : (
            <div className="relative" ref={menuRef}>
              <button type="button" onClick={() => setOpen((v) => !v)} className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-[#E5E7EB] bg-white px-3 py-2 text-sm font-bold text-[#1A2E1A] hover:bg-[#FDFBF7]">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#14532D] text-white text-sm font-extrabold">{initial}</span>
                <span className="max-w-[140px] truncate">{displayName}</span>
                <ChevronDown className="h-4 w-4 text-[#1A2E1A]/60" />
              </button>
              {open && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl border border-[#E5E7EB] bg-white p-1.5 shadow-lg">
                  <div className="px-3 py-2 border-b border-[#E5E7EB] mb-1">
                    <p className="text-xs font-extrabold text-[#1A2E1A] truncate">{displayName}</p>
                    <p className="text-[11px] text-[#1A2E1A]/60 capitalize">{session.role}</p>
                  </div>
                  <Link href="/akun" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-[#1A2E1A] hover:bg-[#FDFBF7]"><Settings className="h-4 w-4 text-[#14532D]" />Akun Saya / Pengaturan Akun</Link>
                  <button type="button" onClick={handleLogout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-bold text-red-700 hover:bg-red-50"><LogOut className="h-4 w-4" />Log Out</button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="md:hidden flex items-center gap-2">
          {session ? (
            <button type="button" onClick={() => setOpen((v) => !v)} className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#14532D] text-white font-extrabold" aria-label="Menu akun">{initial}</button>
          ) : (
            <>
              <Link href="/login" className="inline-flex min-h-[40px] items-center px-2 text-sm font-bold text-[#1A2E1A]/80">Masuk</Link>
              <Link href="/masuk" className="inline-flex min-h-[40px] items-center justify-center rounded-full bg-[#14532D] px-4 text-sm font-extrabold text-white shadow-sm">Daftar</Link>
            </>
          )}
        </div>
      </div>

      {open && session && (
        <div className="md:hidden border-t border-[#E5E7EB] bg-white px-3 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#14532D] text-white text-sm font-extrabold">{initial}</span><span className="text-sm font-bold text-[#1A2E1A] truncate">{displayName}</span></div>
            <div className="flex items-center gap-2">
              <Link href="/akun" onClick={() => setOpen(false)} className="inline-flex items-center gap-1 rounded-md border border-[#E5E7EB] px-3 py-2 text-xs font-bold text-[#14532D]"><User className="h-4 w-4" />Akun</Link>
              <button type="button" onClick={handleLogout} className="inline-flex items-center gap-1 rounded-md bg-red-600 px-3 py-2 text-xs font-bold text-white"><LogOut className="h-4 w-4" />Log Out</button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-[#E5E7EB] bg-white py-2 md:hidden">
        <Link href="/" className={`flex flex-col items-center text-[10px] font-bold ${pathname === "/" ? "text-[#14532D]" : "text-[#1A2E1A]/60"}`}><GraduationCap className="mb-0.5 h-4 w-4" />Beranda</Link>
        <Link href="/kelas" className={`flex flex-col items-center text-[10px] font-bold ${pathname.startsWith("/kelas") ? "text-[#14532D]" : "text-[#1A2E1A]/60"}`}><BookOpen className="mb-0.5 h-4 w-4" />Kelas</Link>
        <Link href="/game" className={`flex flex-col items-center text-[10px] font-bold ${pathname.startsWith("/game") ? "text-[#14532D]" : "text-[#1A2E1A]/60"}`}><Gamepad2 className="mb-0.5 h-4 w-4" />Game</Link>
        <Link href="/paket" className={`flex flex-col items-center text-[10px] font-bold ${pathname.startsWith("/paket") ? "text-[#14532D]" : "text-[#1A2E1A]/60"}`}><CreditCard className="mb-0.5 h-4 w-4" />Paket</Link>
        {session ? (
          <Link href="/akun" className={`flex flex-col items-center text-[10px] font-bold ${pathname.startsWith("/akun") ? "text-[#14532D]" : "text-[#1A2E1A]/60"}`}><User className="mb-0.5 h-4 w-4" />Akun</Link>
        ) : (
          <Link href="/login" className={`flex flex-col items-center text-[10px] font-bold ${pathname.startsWith("/login") ? "text-[#14532D]" : "text-[#1A2E1A]/60"}`}><KeyRound className="mb-0.5 h-4 w-4" />Masuk</Link>
        )}
      </div>
    </header>
  );
}
