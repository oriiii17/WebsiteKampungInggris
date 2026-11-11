import React from "react";
import { getLiveSession } from "@/lib/game-session";
import { notFound } from "next/navigation";
import PlayerLiveGameClient from "@/components/game/PlayerLiveGameClient";

export default async function PlayerGamePage({
  params,
}: {
  params: Promise<{ pin: string }>;
}) {
  const { pin } = await params;
  const session = getLiveSession(pin);

  if (!session) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#0F172A] text-white">
      <PlayerLiveGameClient pin={pin} />
    </div>
  );
}
