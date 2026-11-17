import React from "react";
import { notFound } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { getClassByIdOrSlug, getModules, getUserEnrollments } from "@/lib/db";
import ClassDetailClient from "./ClassDetailClient";
import type { Metadata } from "next";
import { canonicalUrl } from "@/lib/seo";
import { readLocalDb } from "@/lib/db";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import type { GameBlueprint } from "@/lib/game-blueprint";

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
  let attachedGames: GameBlueprint[] = [];
  const supabase = await getSupabaseServerClient();
  if (supabase) {
    const { data: links } = await supabase.from("class_games").select("game_id").eq("class_id", classItem.id);
    const gameIds = (links || []).map((link) => link.game_id);
    if (gameIds.length) {
      const { data } = await supabase.from("game_blueprints").select("*").in("id", gameIds).eq("status", "published");
      attachedGames = (data || []).map((row) => ({ id: row.id, title: row.title, template: row.template, level: row.level, topic: row.topic, language: row.language, status: row.status, plays: row.play_count, settings: row.settings, items: row.items, createdAt: row.created_at, updatedAt: row.updated_at } as GameBlueprint));
    }
  } else {
    const db = await readLocalDb();
    attachedGames = (db.gameBlueprints || []).filter((game) => game.status === "published" && (classItem.gameBlueprintIds || []).includes(game.id));
  }

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
    <div className="bg-[#FDFBF7] py-10 sm:py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <ClassDetailClient
          classItem={classItem}
          includedModules={includedModules}
          isEnrolled={isEnrolled}
          sessionUser={session}
          blueprintGames={attachedGames}
        />
      </div>
    </div>
  );
}
