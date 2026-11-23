import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kelola Sesi | Kampung Inggris Sapen",
  robots: { index: false, follow: false },
};

export default function KelolaSesiLayout({ children }: { children: React.ReactNode }) {
  return children;
}
