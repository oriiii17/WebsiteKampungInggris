import React, { Suspense } from "react";
import JoinGameClient from "@/components/game/JoinGameClient";
import { getGuestServerSession } from "@/lib/auth";

export default async function JoinGamePage() {
  const guestSession = await getGuestServerSession();
  return (
    <div className="workbook-page flex min-h-screen flex-col justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Suspense fallback={<div className="text-center p-8 text-gray-500">Memuat formulir...</div>}>
          <JoinGameClient isGuest={Boolean(guestSession)} />
        </Suspense>
      </div>
    </div>
  );
}
