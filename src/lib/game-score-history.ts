import type { SessionPayload } from "@/lib/types";

/** Only people with a registered regular account keep personal quiz history. */
export function canSavePersonalGameHistory(session: SessionPayload | null | undefined): session is SessionPayload {
  return Boolean(
    session?.email?.trim() &&
    ["member", "peserta", "umum"].includes(session.role) &&
    session.origin !== "guest" &&
    session.origin !== "warga_kode",
  );
}
