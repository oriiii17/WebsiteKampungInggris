import React from "react";
import { getLiveSession } from "@/lib/game-session";
import { notFound } from "next/navigation";
import PlayerLiveGameClient from "@/components/game/PlayerLiveGameClient";
import { getGuestServerSession } from "@/lib/auth";

export default async function PlayerGamePage({
  params,
}: {
  params: Promise<{ pin: string }>;
}) {
  const { pin } = await params;
  const session = getLiveSession(pin);
  const guestSession = await getGuestServerSession();

  if (!session) {
    notFound();
  }

  return (
    <div className="workbook-page flex min-h-screen w-full justify-center text-ink">
      <div className="w-full max-w-[1200px] min-w-0 px-2 sm:px-4 lg:px-6">
        <PlayerLiveGameClient pin={pin} guestMode={Boolean(guestSession)} guestParticipantId={guestSession?.guestRegistrationId} />
      </div>
    </div>
  );
}
