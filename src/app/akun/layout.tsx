import type { Metadata } from "next";

export const metadata: Metadata = { title: "Akun Saya | Kampung Inggris Sapen", robots: { index: false, follow: false } };
export default function AkunLayout({ children }: { children: React.ReactNode }) { return children; }
