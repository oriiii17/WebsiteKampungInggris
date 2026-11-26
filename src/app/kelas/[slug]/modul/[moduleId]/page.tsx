import React from "react";
import { notFound } from "next/navigation";
import { getSessionWithGuestContext, isAdminSession } from "@/lib/auth";
import { getClassByIdOrSlug, getUserEnrollments } from "@/lib/db";
import ModuleViewClient from "./ModuleViewClient";
import { getApprovedActiveClassSession } from "@/lib/active-class-session";

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

  let enrolled = isAdminSession(session) || (session?.origin === "warga_kode" && !session.guestSessionId);
  const activeClassSession = await getApprovedActiveClassSession(session);
  if (activeClassSession?.classId === cls.id) enrolled = true;
  if (!enrolled && session?.email) {
    const enrs = await getUserEnrollments(session.email);
    enrolled = enrs.some((e) => e.classId === cls.id);
  }
  if (session?.role === "guest") {
    if (activeClassSession?.classId !== cls.id) notFound();
    enrolled = true;
  }

  return (
    <div className="min-h-screen py-8 sm:py-12">
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
