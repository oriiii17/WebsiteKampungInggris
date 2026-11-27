import React, { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import PublicChrome from "@/components/PublicChrome";
import PublicFooter from "@/components/PublicFooter";
import { getGuestServerSession, getServerSession, getSessionExpiryStatus } from "@/lib/auth";
import { SITE_CONFIG } from "@/config/site";
import AppDialogProvider from "@/components/AppDialogProvider";
import { ConfirmDialogProvider } from "@/components/ui/ConfirmDialog";
import GuestApprovalGate from "@/components/guest/GuestApprovalGate";
import { getGuestApprovalStatus } from "@/lib/guest-approval";
import { getSiteUrl } from "@/lib/site";
import { readLocalDb } from "@/lib/db";
import AppToastHost from "@/components/ui/AppToast";
import { cookies } from "next/headers";
import { ClassCartProvider } from "@/components/ClassCartProvider";
import { CLASS_CART_SNAPSHOT_COOKIE, getSnapshotCart, parseCartSnapshot, type CartIdentity } from "@/lib/class-cart-snapshot";

export const metadata: Metadata = {
  title: {
    default: `${SITE_CONFIG.name} | ${SITE_CONFIG.tagline}`,
    template: `%s | ${SITE_CONFIG.name}`,
  },
  description: SITE_CONFIG.shortDesc,
  metadataBase: new URL(getSiteUrl()),
  icons: {
    icon: [{ url: "/icon.png", type: "image/png" }],
    shortcut: ["/favicon.ico"],
  },
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: SITE_CONFIG.name,
    title: `${SITE_CONFIG.name} | ${SITE_CONFIG.tagline}`,
    description: SITE_CONFIG.shortDesc,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_CONFIG.name} | ${SITE_CONFIG.tagline}`,
    description: SITE_CONFIG.shortDesc,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [session, guestSession, sessionExpiry] = await Promise.all([getServerSession(), getGuestServerSession(), getSessionExpiryStatus()]);
  const effectiveGuestSession = sessionExpiry.expired ? null : guestSession;
  let chromeSession = session;
  if (session?.email) {
    try {
      const db = await readLocalDb();
      const savedAvatar = db.externalUsers?.find((user) => user.email.toLowerCase() === session.email?.toLowerCase())?.avatarDataUrl;
      if (savedAvatar) chromeSession = { ...session, avatarDataUrl: savedAvatar };
    } catch { /* Keep navigation available if optional profile media is not synchronized yet. */ }
  }
  const sessionParticipant = session?.guestSessionId ? session : !session && effectiveGuestSession ? effectiveGuestSession : null;
  const guestApprovalStatus = sessionParticipant ? await getGuestApprovalStatus(sessionParticipant) : null;
  const participantIsPending = Boolean(sessionParticipant?.guestSessionId && guestApprovalStatus !== "approved");
  const cartIdentity: CartIdentity = session?.email ? { kind: "account", email: session.email.trim().toLowerCase() } : { kind: "guest" };
  const cookieStore = await cookies();
  const initialCartIds = getSnapshotCart(parseCartSnapshot(cookieStore.get(CLASS_CART_SNAPSHOT_COOKIE)?.value), cartIdentity);

  return (
    <html lang="id">
      <body className="flex min-h-dvh flex-col font-sans">
        <ConfirmDialogProvider>
        <ClassCartProvider initialIdentity={cartIdentity} initialIds={initialCartIds}>
        <AppDialogProvider>
        <AppToastHost />
        <a href="#main-content" className="skip-link">Lewati ke konten utama</a>
        <Suspense fallback={null}><PublicChrome session={chromeSession} guestSession={effectiveGuestSession} initialParticipantPending={participantIsPending} sessionExpired={sessionExpiry.expired} expiredAdmin={sessionExpiry.admin} /></Suspense>
        <main id="main-content" tabIndex={-1} className="flex-1">{participantIsPending ? <GuestApprovalGate scope="attendance" initialStatus={guestApprovalStatus || "pending"} /> : children}</main>
        {!participantIsPending && <Suspense fallback={null}><PublicFooter /></Suspense>}
        </AppDialogProvider>
        </ClassCartProvider>
        </ConfirmDialogProvider>
      </body>
    </html>
  );
}
