import React from "react";
import { notFound } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { getClassByIdOrSlug, getModules, getUserEnrollments } from "@/lib/db";
import ClassDetailClient from "./ClassDetailClient";

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

  const includedModules = allModules.filter((m) => (classItem.moduleIds || []).includes(m.id));

  let isEnrolled = false;
  if (session?.role === "pengurus" || session?.role === "developer") {
    isEnrolled = true;
  } else if (session?.email) {
    const activeEnrs = await getUserEnrollments(session.email);
    isEnrolled = activeEnrs.some((e) => e.classId === classItem.id);
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] py-10 sm:py-14">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
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
