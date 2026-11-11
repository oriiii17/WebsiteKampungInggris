import React from "react";
import { notFound } from "next/navigation";
import { getServerSession, isAdminSession } from "@/lib/auth";
import { getClassByIdOrSlug, getUserEnrollments } from "@/lib/db";
import ModuleViewClient from "./ModuleViewClient";

export default async function ClassModulePage({
  params,
}: {
  params: Promise<{ slug: string; moduleId: string }>;
}) {
  const { slug, moduleId } = await params;
  const [session, cls] = await Promise.all([getServerSession(), getClassByIdOrSlug(slug)]);
  if (!cls) notFound();
  const mod = (cls.modules || []).find((m) => m.id === moduleId);
  if (!mod) notFound();

  let enrolled = isAdminSession(session);
  if (!enrolled && session?.email) {
    const enrs = await getUserEnrollments(session.email);
    enrolled = enrs.some((e) => e.classId === cls.id);
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