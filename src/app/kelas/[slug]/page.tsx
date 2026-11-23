import React from "react";
import { notFound } from "next/navigation";
import { getSessionWithGuestContext } from "@/lib/auth";
import { getClassByIdOrSlug, getModules, getPublishedIndependentGameCounts, getUserEnrollments } from "@/lib/db";
import ClassDetailClient from "./ClassDetailClient";
import type { Metadata } from "next";
import { publicPageMetadata } from "@/lib/site";
import { getApprovedActiveClassSession } from "@/lib/active-class-session";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const classItem = await getClassByIdOrSlug(slug);
  if (!classItem || !classItem.isPublished) return { title: "Kelas | Kampung Inggris Sapen", robots: { index: false, follow: false } };
  return publicPageMetadata({
    title: `${classItem.title} · Kelas Bahasa Inggris`,
    description: `Pelajari materi, latihan, dan informasi kelas ${classItem.title} di Kampung Inggris Sapen, Yogyakarta. Kenali pilihan belajar dan akses kelas yang tersedia.`,
    pathname: `/kelas/${encodeURIComponent(classItem.slug || classItem.id)}`,
  });
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

  const activeClassSession = await getApprovedActiveClassSession(session);
  // Session access is bound server-side to the class of the active, approved session.
  if (session?.role === "guest") {
    if (activeClassSession?.classId !== classItem.id) notFound();
  }

  const includedModules = allModules.filter((m) => (classItem.moduleIds || []).includes(m.id));
  const independentGameCount = (await getPublishedIndependentGameCounts([classItem.id]))[classItem.id] || 0;
  let isEnrolled = false;
  if (session?.role === "pengurus" || session?.role === "developer") {
    isEnrolled = true;
  } else if (session?.origin === "warga_kode") {
    isEnrolled = true;
  } else if (session?.role === "guest") {
    isEnrolled = true;
  } else if (activeClassSession?.classId === classItem.id) {
    isEnrolled = true;
  } else if (session?.email) {
    const activeEnrs = await getUserEnrollments(session.email);
    isEnrolled = activeEnrs.some((e) => e.classId === classItem.id);
  }

  return (
    <div className={`pt-8 pb-24 sm:pt-12 sm:pb-24 lg:py-14${session?.role === "guest" ? " lg:pb-14" : ""}`}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <ClassDetailClient
          classItem={classItem}
          includedModules={includedModules}
          isEnrolled={isEnrolled}
          sessionUser={session}
          independentGameCount={independentGameCount}
        />
      </div>
    </div>
  );
}
