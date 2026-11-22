import type { Metadata } from "next";
import { canonicalUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Kuis Bahasa Inggris | Kampung Inggris Sapen",
  description: "Latihan Bahasa Inggris melalui permainan kelas interaktif Kampung Inggris Sapen.",
  alternates: canonicalUrl("/game") ? { canonical: canonicalUrl("/game") } : undefined,
  openGraph: { title: "Kuis Bahasa Inggris | Kampung Inggris Sapen", description: "Latihan Bahasa Inggris melalui permainan kelas interaktif Kampung Inggris Sapen." },
};

export default function GameLayout({ children }: { children: React.ReactNode }) { return children; }
