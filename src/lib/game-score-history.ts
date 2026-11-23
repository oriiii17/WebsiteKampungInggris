import type { SessionPayload } from "@/lib/types";

/** Only verified, permanent accounts keep personal quiz history. Code-only access is temporary. */
export function canSavePersonalGameHistory(session: SessionPayload | null | undefined): session is SessionPayload {
  return Boolean(
    session?.email?.trim() &&
    session.authUserId &&
    session.emailVerified === true &&
    ["member", "peserta", "umum", "warga"].includes(session.role) &&
    session.origin !== "guest",
  );
}
