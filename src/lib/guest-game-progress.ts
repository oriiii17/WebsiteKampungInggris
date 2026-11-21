const COMPLETED_GUEST_GAMES_PREFIX = "sapen_guest_completed_games:";
export const GUEST_GAME_COMPLETED_EVENT = "sapen:guest-game-completed";

export function readCompletedGuestGames(participantId: string): string[] {
  if (!participantId || typeof window === "undefined") return [];
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(`${COMPLETED_GUEST_GAMES_PREFIX}${participantId}`) || "[]");
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
}

export function markGuestGameCompleted(participantId: string, gameId: string): void {
  if (!participantId || !gameId || typeof window === "undefined") return;
  try {
    const completed = new Set(readCompletedGuestGames(participantId));
    completed.add(gameId);
    window.localStorage.setItem(`${COMPLETED_GUEST_GAMES_PREFIX}${participantId}`, JSON.stringify([...completed]));
    window.dispatchEvent(new Event(GUEST_GAME_COMPLETED_EVENT));
  } catch {
    // The result remains available for this play if storage is unavailable.
  }
}
