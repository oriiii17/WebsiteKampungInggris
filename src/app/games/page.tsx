import type { Metadata } from "next";
import GameCatalogClient from "@/components/games/GameCatalogClient";
import { getSessionWithGuestContext } from "@/lib/auth";
import { canSavePersonalGameHistory } from "@/lib/game-score-history";

export const metadata: Metadata = { title: "Kuis Bahasa Inggris | Sapen English", description: "Pilih permainan Bahasa Inggris untuk belajar kosakata, membaca, dan menyusun kalimat." };

export default async function GamesPage() {
  const session = await getSessionWithGuestContext();
  const isGuest = session?.role === "guest" || session?.origin === "guest";
  const isSessionParticipant = Boolean(session?.guestSessionId);
  return <GameCatalogClient isGuest={isSessionParticipant} guestParticipantId={isGuest ? session?.guestRegistrationId : undefined} showHistory={canSavePersonalGameHistory(session)} />;
}
