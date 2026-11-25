import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ClassDetailClient from "./ClassDetailClient";
import { getPublicClasses } from "@/lib/public-data-cache";
import { publicPageMetadata } from "@/lib/site";
import { getSessionWithGuestContext, isAdminSession } from "@/lib/auth";
import { getUserEnrollments } from "@/lib/db";
import { getApprovedActiveClassSession } from "@/lib/active-class-session";

export const revalidate = 60;

async function withinTenSeconds<T>(task: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([task, new Promise<T>((_, reject) => { timer = setTimeout(() => reject(new Error("Class data request timed out")), 10_000); })]);
  } finally { if (timer) clearTimeout(timer); }
}

async function findPublicClass(slug: string) {
  const classes = await withinTenSeconds(getPublicClasses());
  return classes.find((item) => item.id === slug || item.slug === slug) || null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const classItem = await findPublicClass(slug);
  if (!classItem) return { title: "Kelas | Kampung Inggris Sapen", robots: { index: false, follow: false } };
  return publicPageMetadata({
    title: `${classItem.title} · Kelas Bahasa Inggris`,
    description: `Pelajari materi, latihan, dan informasi kelas ${classItem.title} di Kampung Inggris Sapen, Yogyakarta. Kenali pilihan belajar dan akses kelas yang tersedia.`,
    pathname: `/kelas/${encodeURIComponent(classItem.slug || classItem.id)}`,
  });
}

export default async function ClassDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const classItem = await findPublicClass(slug);
  if (!classItem) notFound();

  const session = await getSessionWithGuestContext();
  const [enrollments, activeSessionClass] = await Promise.all([
    session?.email ? getUserEnrollments(session.email) : Promise.resolve([]),
    session?.guestSessionId ? getApprovedActiveClassSession(session) : Promise.resolve(null),
  ]);
  const isEnrolled = Boolean(isAdminSession(session)
    || session?.origin === "warga_kode"
    || enrollments.some((enrollment) => enrollment.classId === classItem.id)
    || activeSessionClass?.classId === classItem.id);

  return <div className="pt-8 pb-[calc(var(--bottom-nav-h,64px)+150px)] sm:pt-12 md:pb-24 lg:py-14">
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <ClassDetailClient
        classItem={classItem}
        includedModules={[]}
        isEnrolled={isEnrolled}
        sessionUser={session}
        independentGameCount={0}
      />
    </div>
  </div>;
}
