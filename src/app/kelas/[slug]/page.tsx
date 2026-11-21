import React from "react";
import { notFound } from "next/navigation";
import { getSessionWithGuestContext } from "@/lib/auth";
import { getClassByIdOrSlug, getModules, getUserEnrollments } from "@/lib/db";
import ClassDetailClient from "./ClassDetailClient";
import type { Metadata } from "next";
import { canonicalUrl } from "@/lib/seo";
import { readLocalDb } from "@/lib/db";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const classItem = await getClassByIdOrSlug(slug);
  if (!classItem || !classItem.isPublished) return { title: "Kelas | Kampung Inggris Sapen", robots: { index: false, follow: false } };
  return {
    title: `${classItem.title} | Kelas Kampung Inggris Sapen`,
    description: `Lihat materi, latihan, dan informasi kelas ${classItem.title} di Kampung Inggris Sapen, Yogyakarta.`,
    alternates: canonicalUrl(`/kelas/${encodeURIComponent(classItem.slug || classItem.id)}`)
      ? { canonical: canonicalUrl(`/kelas/${encodeURIComponent(classItem.slug || classItem.id)}`) }
      : undefined,
  };
}

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [session, classItem, allModules] = await Promise.all([
    getSessionWithGuestContext(),
    getClassByIdOrSlug(slug),
    getModules(false),
  ]);

  if (!classItem) {
    notFound();
  }
  if (!classItem.isPublished && session?.role !== "pengurus" && session?.role !== "developer") notFound();

  // Guest access is bound server-side to the class of the attended session.
  if (session?.role === "guest") {
    let allowed = false;
    if (session.guestSessionId && session.guestRegistrationId) {
      const supabase = await getSupabaseServerClient();
      if (supabase) {
        const { data } = await supabase.from("class_session_guests").select("session_id,status").eq("id", session.guestRegistrationId).maybeSingle();
        if (data?.status === "approved" && data.session_id === session.guestSessionId) {
          const { data: parent } = await supabase.from("class_sessions").select("class_id").eq("id", session.guestSessionId).maybeSingle();
          allowed = parent?.class_id === classItem.id;
        }
      } else {
        const db = await readLocalDb();
        const guest = db.classSessionGuests?.find((entry) => entry.id === session.guestRegistrationId && entry.sessionId === session.guestSessionId && entry.status === "approved");
        const parent = db.classSessions?.find((entry) => entry.id === session.guestSessionId);
        allowed = Boolean(guest && parent?.classId === classItem.id);
      }
    }
    if (!allowed) notFound();
  }

  const includedModules = allModules.filter((m) => (classItem.moduleIds || []).includes(m.id));
  let isEnrolled = false;
  if (session?.role === "pengurus" || session?.role === "developer") {
    isEnrolled = true;
  } else if (session?.origin === "warga_kode") {
    isEnrolled = true;
  } else if (session?.role === "guest") {
    isEnrolled = true;
  } else if (session?.email) {
    const activeEnrs = await getUserEnrollments(session.email);
    isEnrolled = activeEnrs.some((e) => e.classId === classItem.id);
  }

  return (
    <div className={`bg-[#FDFBF7] pt-8 pb-24 sm:pt-12 sm:pb-24 lg:py-14${session?.role === "guest" ? " lg:pb-14" : ""}`}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <ClassDetailClient
          classItem={classItem}
          includedModules={includedModules}
          isEnrolled={isEnrolled}
          sessionUser={session}
        />
      </div>
    </div>
  );
}
