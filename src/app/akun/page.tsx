import React from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { readLocalDb } from "@/lib/db";
import AccountClient from "./AccountClient";

export default async function AkunPage() {
  const session = await getServerSession();
  if (!session) {
    redirect("/masuk?next=/akun");
  }
  const db = await readLocalDb();
  const storedPhoto = session.email
    ? (db.externalUsers || []).find((user) => user.email.toLowerCase() === session.email?.toLowerCase())?.avatarDataUrl
    : (db.warga || []).find((warga) => warga.id === session.id)?.avatarDataUrl;
  return <AccountClient initialSession={{ ...session, avatarDataUrl: storedPhoto || session.avatarDataUrl }} />;
}
