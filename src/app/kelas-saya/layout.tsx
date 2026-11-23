import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kelas Saya | Kampung Inggris Sapen",
  robots: { index: false, follow: false },
};

export default function KelasSayaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
