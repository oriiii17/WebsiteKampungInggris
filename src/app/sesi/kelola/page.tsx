import { redirect } from "next/navigation";
import ClassSessionManager from "@/components/admin/ClassSessionManager";
import { getServerSession, isTutorSession } from "@/lib/auth";

export default async function ManageClassSessionsPage({ searchParams }: { searchParams: Promise<{ classId?: string }> }) {
  const session = await getServerSession();
  if (!isTutorSession(session)) redirect("/masuk?next=/sesi/kelola");
  const { classId } = await searchParams;
  return <main className="min-h-screen px-4 py-8 sm:px-8 sm:py-12"><div className="mx-auto max-w-6xl"><ClassSessionManager initialClassId={classId} /></div></main>;
}
