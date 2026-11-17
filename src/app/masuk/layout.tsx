import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Masuk | Kampung Inggris Sapen",
  description: "Masuk sebagai peserta umum atau warga Kampung Inggris Sapen.",
  robots: { index: false, follow: false },
};

export default function MasukLayout({ children }: { children: React.ReactNode }) { return children; }
