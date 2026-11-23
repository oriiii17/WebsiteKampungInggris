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
      <div className="mx-auto w-full max-w-[1600px] min-w-0 px-3 sm:px-6 lg:px-8">
        <HostLiveSessionClient initialPin={pin} templateTitle={session.templateTitle} />
      </div>
    </div>
  );
}
