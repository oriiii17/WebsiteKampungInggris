import React from "react";
import { getLiveSession } from "@/lib/game-session";
import { notFound } from "next/navigation";
import HostLiveSessionClient from "@/components/game/HostLiveSessionClient";

export default async function HostLiveSessionPage({
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
      <HostLiveSessionClient initialPin={pin} templateTitle={session.templateTitle} />
    </div>
  );
}
