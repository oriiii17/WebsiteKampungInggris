import GameCatalogClient from "@/components/games/GameCatalogClient";
import { getSessionWithGuestContext } from "@/lib/auth";
import { canSavePersonalGameHistory } from "@/lib/game-score-history";
import { publicPageMetadata } from "@/lib/site";

export const metadata = publicPageMetadata({
  title: "Permainan dan Kuis Bahasa Inggris",
  description: "Mainkan kuis dan permainan untuk berlatih kosakata, membaca, dan menyusun kalimat. Aktivitas belajar dari Kampung Inggris Sapen dapat diikuti sesuai kelas yang tersedia.",
  pathname: "/games",
});

export default async function GamesPage() {
  const session = await getSessionWithGuestContext();
  const isGuest = session?.role === "guest" || session?.origin === "guest";
  const isSessionParticipant = Boolean(session?.guestSessionId);
  return <GameCatalogClient isGuest={isSessionParticipant} guestParticipantId={isGuest ? session?.guestRegistrationId : undefined} initialName={session?.name} showHistory={canSavePersonalGameHistory(session)} />;
}
