import { NextRequest, NextResponse } from "next/server";
import { getServerSession, isAdminSession } from "@/lib/auth";
import { getApprovedTestimoni, readLocalDb, writeLocalDb } from "@/lib/db";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import type { TestimoniRecord } from "@/lib/types";

function canReview(session: Awaited<ReturnType<typeof getServerSession>>) {
  return Boolean(session && session.email && session.emailVerified === true && session.authUserId && ["peserta", "umum", "member"].includes(session.role));
}

function cleanReview(value: unknown) {
  return String(value ?? "").normalize("NFC").replace(/<[^>]*>/g, " ").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 500);
}

function mapRow(row: Record<string, unknown>): TestimoniRecord {
  const isi = String(row.isi || "");
  const status = row.status === "terbit" ? "terbit" : "menunggu";
  return { id: String(row.id), userId: String(row.user_id || ""), rating: Number(row.rating || 0), isi, status, nama: String(row.display_name || "Peserta Sapen"), komentar: isi, rw: "", isApproved: status === "terbit", createdAt: String(row.created_at || new Date().toISOString()) };
}

export async function GET(req: NextRequest) {
  const params = new URL(req.url).searchParams;
  const session = await getServerSession();
  if (params.get("mine") === "true") {
    if (!canReview(session)) return NextResponse.json({ error: "Ulasan hanya tersedia untuk akun peserta terverifikasi." }, { status: 403 });
    const supabase = await getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from("reviews").select("id,user_id,rating,isi,status,display_name,created_at").eq("user_id", session!.authUserId!).maybeSingle();
      if (error) return NextResponse.json({ error: "Ulasan Anda belum dapat dimuat." }, { status: 503 });
      return NextResponse.json({ review: data ? mapRow(data) : null });
    }
    const db = await readLocalDb();
    const review = (db.testimoni || []).find((item) => item.userId === session!.authUserId) || null;
    return NextResponse.json({ review });
  }
  if (params.get("all") === "true") {
    if (!isAdminSession(session)) return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    const supabase = await getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from("reviews").select("id,user_id,rating,isi,status,display_name,created_at").order("created_at", { ascending: false });
      if (error) return NextResponse.json({ error: "Daftar ulasan belum dapat dimuat." }, { status: 503 });
      return NextResponse.json({ testimoni: (data || []).map(mapRow) });
    }
    const db = await readLocalDb();
    return NextResponse.json({ testimoni: db.testimoni || [] });
  }
  return NextResponse.json({ testimoni: await getApprovedTestimoni() });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Masuk untuk menulis ulasan." }, { status: 401 });
  if (!canReview(session) || !session.authUserId) return NextResponse.json({ error: "Ulasan hanya dapat ditulis oleh peserta dengan email terverifikasi." }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const rating = Number(body.rating);
  const isi = cleanReview(body.isi);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return NextResponse.json({ error: "Pilih nilai bintang dari 1 sampai 5." }, { status: 400 });
  if (!isi) return NextResponse.json({ error: "Tulis kesan dan cerita belajar Anda." }, { status: 400 });
  if (String(body.isi ?? "").length > 500) return NextResponse.json({ error: "Ulasan maksimal 500 karakter." }, { status: 400 });
  if (session.name.trim().length < 2) return NextResponse.json({ error: "Nama akun belum lengkap. Perbarui profil sebelum menulis ulasan." }, { status: 400 });

  const supabase = await getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.from("reviews").upsert({ user_id: session.authUserId, display_name: session.name.trim().slice(0, 120), rating, isi, status: "menunggu", created_at: new Date().toISOString() }, { onConflict: "user_id" }).select("id,user_id,rating,isi,status,display_name,created_at").single();
    if (error || !data) return NextResponse.json({ error: "Ulasan belum tersimpan. Pastikan migrasi ulasan sudah diterapkan lalu coba lagi." }, { status: 503 });
    return NextResponse.json({ ok: true, review: mapRow(data) });
  }

  const db = await readLocalDb();
  db.testimoni ||= [];
  const existing = db.testimoni.find((item) => item.userId === session.authUserId);
  const review: TestimoniRecord = { id: existing?.id || `review-${session.authUserId}`, userId: session.authUserId, rating, isi, status: "menunggu", nama: session.name.trim().slice(0, 120), rw: "", komentar: isi, isApproved: false, createdAt: new Date().toISOString() };
  if (existing) Object.assign(existing, review); else db.testimoni.push(review);
  await writeLocalDb(db);
  return NextResponse.json({ ok: true, review });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession();
  if (!isAdminSession(session)) return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const id = String(body.id || "");
  if (!id) return NextResponse.json({ error: "Ulasan tidak ditemukan." }, { status: 400 });
  const supabase = await getSupabaseServerClient();
  if (supabase) {
    const { error } = await supabase.from("reviews").update({ status: "terbit" }).eq("id", id);
    if (error) return NextResponse.json({ error: "Ulasan belum dapat diposting." }, { status: 503 });
    return NextResponse.json({ ok: true });
  }
  const db = await readLocalDb();
  const review = (db.testimoni || []).find((item) => item.id === id);
  if (!review) return NextResponse.json({ error: "Ulasan tidak ditemukan." }, { status: 404 });
  review.status = "terbit"; review.isApproved = true;
  await writeLocalDb(db);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession();
  if (!isAdminSession(session)) return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID diperlukan." }, { status: 400 });
  const supabase = await getSupabaseServerClient();
  if (supabase) {
    const { error } = await supabase.from("reviews").delete().eq("id", id);
    if (error) return NextResponse.json({ error: "Ulasan belum dapat dihapus." }, { status: 503 });
    return NextResponse.json({ ok: true });
  }
  const db = await readLocalDb();
  const before = (db.testimoni || []).length;
  db.testimoni = (db.testimoni || []).filter((item) => item.id !== id);
  if (db.testimoni.length === before) return NextResponse.json({ error: "Ulasan tidak ditemukan." }, { status: 404 });
  await writeLocalDb(db);
  return NextResponse.json({ ok: true });
}
