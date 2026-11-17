import React, { Suspense } from "react";
import JoinGameClient from "@/components/game/JoinGameClient";

export default async function JoinGamePage() {
  return (
    <div className="workbook-page flex min-h-screen flex-col justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Suspense fallback={<div className="text-center p-8 text-gray-500">Memuat formulir...</div>}>
          <JoinGameClient />
        </Suspense>
      </div>
    </div>
  );
}
