import React, { Suspense } from "react";
import JoinGameClient from "@/components/game/JoinGameClient";

export default async function JoinGamePage() {
  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Suspense fallback={<div className="text-center p-8 text-gray-500">Memuat formulir...</div>}>
          <JoinGameClient />
        </Suspense>
      </div>
    </div>
  );
}
