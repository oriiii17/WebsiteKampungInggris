import type { Metadata } from "next";
import GameCatalogClient from "@/components/games/GameCatalogClient";
import { getSessionWithGuestContext } from "@/lib/auth";

export const metadata: Metadata = { title: "Games Bahasa Inggris | Sapen English", description: "Pilih permainan Bahasa Inggris untuk belajar kosakata, membaca, dan menyusun kalimat." };

export default async function GamesPage() {
  const session = await getSessionWithGuestContext();
  return <GameCatalogClient isGuest={session?.role === "guest" || session?.origin === "guest"} />;
}
