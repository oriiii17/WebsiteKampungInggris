import React from "react";
import { redirect } from "next/navigation";
import { getServerSession, isAdminSession } from "@/lib/auth";
import HostCreateClient from "@/components/game/HostCreateClient";

export default async function GameHostCreatePage() {
  const session = await getServerSession();
  if (!isAdminSession(session)) {
    redirect("/admin/masuk?next=/game/host");
  }

  return (
    <div className="workbook-page min-h-screen pb-24 md:pb-16">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <HostCreateClient sessionUser={session} />
      </div>
    </div>
  );
}
