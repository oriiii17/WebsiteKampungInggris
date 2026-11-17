import React from "react";
import { notFound } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { getClassByIdOrSlug, getModules, getUserEnrollments } from "@/lib/db";
import ClassDetailClient from "./ClassDetailClient";
import type { Metadata } from "next";
import { canonicalUrl } from "@/lib/seo";

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
    getServerSession(),
    getClassByIdOrSlug(slug),
    getModules(false),
  ]);

  if (!classItem) {
    notFound();
  }
  if (!classItem.isPublished && session?.role !== "pengurus" && session?.role !== "developer") notFound();

  const includedModules = allModules.filter((m) => (classItem.moduleIds || []).includes(m.id));

  let isEnrolled = false;
  if (session?.role === "pengurus" || session?.role === "developer") {
    isEnrolled = true;
  } else if (session?.origin === "warga_kode") {
    isEnrolled = true;
  } else if (session?.email) {
    const activeEnrs = await getUserEnrollments(session.email);
    isEnrolled = activeEnrs.some((e) => e.classId === classItem.id);
  }

  return (
    <div className="bg-[#FDFBF7] py-10 sm:py-14">
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
