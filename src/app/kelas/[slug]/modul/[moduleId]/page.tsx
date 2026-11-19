import React from "react";
import { notFound } from "next/navigation";
import { getSessionWithGuestContext, isAdminSession } from "@/lib/auth";
import { getClassByIdOrSlug, getUserEnrollments } from "@/lib/db";
import ModuleViewClient from "./ModuleViewClient";
import { readLocalDb } from "@/lib/db";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export default async function ClassModulePage({
  params,
}: {
  params: Promise<{ slug: string; moduleId: string }>;
}) {
  const { slug, moduleId } = await params;
  const [session, cls] = await Promise.all([getSessionWithGuestContext(), getClassByIdOrSlug(slug)]);
  if (!cls) notFound();
  if (!cls.isPublished && !isAdminSession(session)) notFound();
  const mod = (cls.modules || []).find((m) => m.id === moduleId);
  if (!mod) notFound();
  if (mod.status !== "terbit" && !isAdminSession(session)) notFound();

  let enrolled = isAdminSession(session) || session?.origin === "warga_kode";
  if (!enrolled && session?.email) {
    const enrs = await getUserEnrollments(session.email);
    enrolled = enrs.some((e) => e.classId === cls.id);
  }
  if (session?.role === "guest") {
    let allowed = false;
    if (session.guestSessionId && session.guestRegistrationId) {
      const supabase = await getSupabaseServerClient();
      if (supabase) {
        const [{ data: guest }, { data: parent }] = await Promise.all([
          supabase.from("class_session_guests").select("session_id,status").eq("id", session.guestRegistrationId).maybeSingle(),
          supabase.from("class_sessions").select("class_id").eq("id", session.guestSessionId).maybeSingle(),
        ]);
        allowed = guest?.status === "approved" && guest.session_id === session.guestSessionId && parent?.class_id === cls.id;
      } else {
        const db = await readLocalDb();
        const guest = db.classSessionGuests?.some((entry) => entry.id === session.guestRegistrationId && entry.sessionId === session.guestSessionId && entry.status === "approved");
        const parent = db.classSessions?.find((entry) => entry.id === session.guestSessionId);
        allowed = Boolean(guest && parent?.classId === cls.id);
      }
    }
    if (!allowed) notFound();
    enrolled = true;
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] py-8 sm:py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <ModuleViewClient
          cls={cls}
          mod={mod}
          initialEnrolled={enrolled}
          isAdmin={isAdminSession(session)}
        />
      </div>
    </div>
  );
}
