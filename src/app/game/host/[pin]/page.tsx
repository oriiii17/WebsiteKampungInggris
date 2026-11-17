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
    <div className="workbook-page min-h-screen w-full text-ink">
      <div className="w-full max-w-[1200px] min-w-0 px-2 sm:px-4 lg:px-6">
        <HostLiveSessionClient initialPin={pin} templateTitle={session.templateTitle} />
      </div>
    </div>
  );
}
