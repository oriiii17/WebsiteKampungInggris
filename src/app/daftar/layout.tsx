import type { Metadata } from "next";

export const metadata: Metadata = { title: "Daftar | Kampung Inggris Sapen", description: "Buat akun peserta umum Kampung Inggris Sapen.", robots: { index: false, follow: false } };
export default function DaftarLayout({ children }: { children: React.ReactNode }) { return children; }
