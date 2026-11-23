import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kuis Bahasa Inggris | Kampung Inggris Sapen",
  description: "Latihan Bahasa Inggris melalui permainan kelas interaktif Kampung Inggris Sapen.",
  openGraph: { title: "Kuis Bahasa Inggris | Kampung Inggris Sapen", description: "Latihan Bahasa Inggris melalui permainan kelas interaktif Kampung Inggris Sapen." },
};

export default function GameLayout({ children }: { children: React.ReactNode }) { return children; }
