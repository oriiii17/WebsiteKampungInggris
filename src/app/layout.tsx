import React, { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import PublicChrome from "@/components/PublicChrome";
import PublicFooter from "@/components/PublicFooter";
import { getGuestServerSession, getServerSession } from "@/lib/auth";
import { SITE_CONFIG } from "@/config/site";
import AppDialogProvider from "@/components/AppDialogProvider";
import { ConfirmDialogProvider } from "@/components/ui/ConfirmDialog";
import GuestApprovalGate from "@/components/guest/GuestApprovalGate";
import { getGuestApprovalStatus } from "@/lib/guest-approval";

export const metadata: Metadata = {
  title: `${SITE_CONFIG.name} | ${SITE_CONFIG.tagline}`,
  description: SITE_CONFIG.shortDesc,
  metadataBase: process.env.NEXT_PUBLIC_SITE_URL
    ? new URL(process.env.NEXT_PUBLIC_SITE_URL)
    : undefined,
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

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: "Sapen English Village / Kampung Inggris Sapen",
  description: "Platform belajar Bahasa Inggris untuk warga RW 06, RW 07, dan RW 08 Kelurahan Demangan serta peserta umum.",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Kelurahan Demangan, Gondokusuman, Yogyakarta",
    addressRegion: "Daerah Istimewa Yogyakarta",
    addressCountry: "ID",
  },
  areaServed: ["RW 06 Demangan", "RW 07 Demangan", "RW 08 Demangan", "Yogyakarta"],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [session, guestSession] = await Promise.all([getServerSession(), getGuestServerSession()]);
  const sessionParticipant = session?.guestSessionId ? session : !session && guestSession ? guestSession : null;
  const guestApprovalStatus = sessionParticipant ? await getGuestApprovalStatus(sessionParticipant) : null;
  const participantIsPending = Boolean(sessionParticipant?.guestSessionId && guestApprovalStatus !== "approved");

  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Fraunces:opsz,wght,SOFT,WONK@9..144,400,20,1;9..144,500,20,1;9..144,600,20,1;9..144,700,20,1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="flex min-h-dvh flex-col font-sans">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema).replace(/</g, "\\u003c") }} />
        <ConfirmDialogProvider>
        <AppDialogProvider>
        <a href="#main-content" className="skip-link">Lewati ke konten utama</a>
        <Suspense fallback={null}><PublicChrome session={session} guestSession={guestSession} guestClassHref={sessionParticipant?.guestClassHref || guestSession?.guestClassHref} initialParticipantPending={participantIsPending} /></Suspense>
        <main id="main-content" tabIndex={-1} className="flex-1">{participantIsPending ? <GuestApprovalGate scope="attendance" initialStatus={guestApprovalStatus || "pending"} /> : children}</main>
        {!participantIsPending && <Suspense fallback={null}><PublicFooter isGuest={Boolean(guestSession && !session)} /></Suspense>}
        </AppDialogProvider>
        </ConfirmDialogProvider>
      </body>
    </html>
  );
}
