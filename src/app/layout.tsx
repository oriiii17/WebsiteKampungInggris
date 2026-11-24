import React, { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
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

const dmSans = DM_Sans({ subsets: ["latin"], display: "swap", variable: "--font-dm-sans" });
const fraunces = Fraunces({ subsets: ["latin"], display: "swap", variable: "--font-fraunces" });

export const metadata: Metadata = {
  title: {
    default: `${SITE_CONFIG.name} | ${SITE_CONFIG.tagline}`,
    template: `%s | ${SITE_CONFIG.name}`,
  },
  description: SITE_CONFIG.shortDesc,
  metadataBase: new URL(getSiteUrl()),
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

  return (
    <html lang="id">
      <body className={`${dmSans.variable} ${fraunces.variable} flex min-h-dvh flex-col font-sans`}>
        <ConfirmDialogProvider>
        <AppDialogProvider>
        <AppToastHost />
        <a href="#main-content" className="skip-link">Lewati ke konten utama</a>
        <Suspense fallback={null}><PublicChrome session={chromeSession} guestSession={effectiveGuestSession} guestClassHref={sessionParticipant?.guestClassHref || effectiveGuestSession?.guestClassHref} initialParticipantPending={participantIsPending} sessionExpired={sessionExpiry.expired} expiredAdmin={sessionExpiry.admin} /></Suspense>
        <main id="main-content" tabIndex={-1} className="flex-1">{participantIsPending ? <GuestApprovalGate scope="attendance" initialStatus={guestApprovalStatus || "pending"} /> : children}</main>
        {!participantIsPending && <Suspense fallback={null}><PublicFooter isGuest={Boolean(effectiveGuestSession && !session)} /></Suspense>}
        </AppDialogProvider>
        </ConfirmDialogProvider>
      </body>
    </html>
  );
}
