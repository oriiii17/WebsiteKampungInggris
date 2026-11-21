import "server-only";
import type { SessionPayload } from "@/lib/types";
import { readLocalDb } from "@/lib/db";
import { isSupabaseConfigured } from "@/lib/supabase";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export type GuestApprovalStatus = "pending" | "approved" | "rejected";

/** Fail closed: a Guest gets the public shell only after an explicit approval. */
export async function getGuestApprovalStatus(session: SessionPayload): Promise<GuestApprovalStatus> {
  if (!session.guestSessionId || !session.guestRegistrationId) return "pending";

  try {
    const supabase = await getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase
        .from("class_session_guests")
        .select("status")
        .eq("id", session.guestRegistrationId)
        .eq("session_id", session.guestSessionId)
        .maybeSingle();
      if (!error && data?.status === "approved") return "approved";
      if (!error && data?.status === "rejected") return "rejected";
      if (!error && data?.status === "pending") return "pending";
      return "pending";
    }

    if (isSupabaseConfigured()) return "pending";

    const db = await readLocalDb();
    const registration = db.classSessionGuests?.find((guest) =>
      guest.id === session.guestRegistrationId && guest.sessionId === session.guestSessionId
    );
    if (registration?.status === "approved" || registration?.status === "rejected" || registration?.status === "pending") {
      return registration.status;
    }
  } catch {
    // A failed or unavailable status check must never expose the class prematurely.
  }

  return "pending";
}
