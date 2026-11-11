import React from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import AccountClient from "./AccountClient";

export default async function AkunPage() {
  const session = await getServerSession();
  if (!session) {
    redirect("/login?next=/akun");
  }
  return <AccountClient initialSession={session} />;
}
