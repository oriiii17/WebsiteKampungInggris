"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, MessageSquarePlus, Send, Star } from "lucide-react";
import type { TestimoniRecord } from "@/lib/types";

const PAGE_SIZE = 5;

export default function TestimoniSection({ initialTestimoni, isEligible, isLoggedIn, userId }: {
  initialTestimoni: TestimoniRecord[];
  isEligible: boolean;
  isLoggedIn: boolean;
  userId?: string;
}) {
  const [list, setList] = useState(initialTestimoni);
  const [myReview, setMyReview] = useState<TestimoniRecord | null>(null);
  const [rating, setRating] = useState(0);
  const [isi, setIsi] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    if (!isEligible || !userId) return;
    fetch("/api/admin/testimoni?mine=true", { cache: "no-store" }).then((response) => response.json()).then((data) => {
      if (active && data.review) {
        setMyReview(data.review);
        setRating(data.review.rating || 0);
        setIsi(data.review.isi || data.review.komentar || "");
      }
    }).catch(() => undefined);
    return () => { active = false; };
  }, [isEligible, userId]);

  const pageCount = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const visibleReviews = useMemo(() => list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [list, page]);

  function openForm() {
    if (!isEligible) return;
    setError(""); setMessage(""); setShowForm(true);
    setRating(myReview?.rating || 0);
    setIsi(myReview?.isi || myReview?.komentar || "");
  }

  async function submitReview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage("");
    if (!rating) { setError("Pilih bintang 1 sampai 5 terlebih dahulu."); return; }
    if (!isi.trim()) { setError("Isi kesan dan cerita belajar Anda."); return; }
    setSaving(true);
    try {
      const response = await fetch("/api/admin/testimoni", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rating, isi }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Ulasan belum dapat dikirim. Coba lagi.");
      setMyReview(data.review);
      setList((current) => current.filter((review) => review.userId !== userId));
      setPage(1); setMessage("Ulasan tersimpan dan menunggu peninjauan admin."); setShowForm(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Ulasan belum dapat dikirim. Periksa koneksi lalu coba lagi.");
    } finally { setSaving(false); }
  }

  const writeAction = !isLoggedIn
    ? <Link href="/masuk" className="home-review-action inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-earth px-5 py-2.5 text-sm font-extrabold text-white"><MessageSquarePlus className="h-4 w-4" />Tulis ulasan</Link>
    : isEligible
      ? <button type="button" onClick={openForm} className="home-review-action inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-earth px-5 py-2.5 text-sm font-extrabold text-white"><MessageSquarePlus className="h-4 w-4" />Tulis ulasan</button>
      : <p className="text-sm font-semibold text-muted">Verifikasi email akun Anda untuk menulis ulasan.</p>;

  return <div className="home-reviews-content">
    {message && <p role="status" className="mb-4 rounded-xl border border-[#cdd8c9] bg-[#edf3e9] p-4 text-sm font-bold text-forest-deep">{message}</p>}
    {list.length === 0 ? <div className="home-empty-review"><span className="home-review-mark"><MessageSquarePlus aria-hidden="true" /></span><h3 className="font-display">Belum ada ulasan yang diterbitkan</h3><p>Jadilah yang pertama berbagi kesan belajar di Kampung Inggris Sapen.</p>{writeAction}</div> : <>
      <div className="home-review-grid">
        {visibleReviews.map((review) => <article key={review.id} className="home-review-card">
          <div className="home-review-card-head">
            <div className="home-review-avatar" aria-label={`Foto profil ${review.nama}`}>
              {review.avatarDataUrl ? <Image src={review.avatarDataUrl} alt={`Foto profil ${review.nama}`} width={48} height={48} unoptimized /> : <span aria-hidden="true">{review.nama.trim().slice(0, 1).toLocaleUpperCase("id-ID") || "P"}</span>}
            </div>
            <div className="home-review-person"><h3>{review.nama}</h3><p>Peserta terverifikasi</p></div>
            <time dateTime={review.createdAt}>{new Date(review.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</time>
          </div>
          <div className="home-review-stars" aria-label={`Rating ${review.rating || 5} dari 5`}>{Array.from({ length: 5 }, (_, index) => <Star key={index} aria-hidden="true" className={index < (review.rating || 5) ? "is-filled" : ""} />)}</div>
          <p className="home-review-copy">“{review.isi || review.komentar}”</p>
        </article>)}
      </div>
      {pageCount > 1 && <nav className="home-review-pagination" aria-label="Halaman ulasan">
        <button type="button" disabled={page === 1} onClick={() => setPage((current) => current - 1)} aria-label="Halaman sebelumnya"><ChevronLeft aria-hidden="true" /></button>
        {Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => <button type="button" key={number} aria-current={page === number ? "page" : undefined} onClick={() => setPage(number)}>{number}</button>)}
        <button type="button" disabled={page === pageCount} onClick={() => setPage((current) => current + 1)} aria-label="Halaman berikutnya"><ChevronRight aria-hidden="true" /></button>
      </nav>}
      <div className="home-reviews-write">{writeAction}</div>
    </>}

    {showForm && <form onSubmit={submitReview} className="home-review-form">
      <div><h3 className="font-display">Kesan & cerita belajar</h3><p>Ulasan ditinjau sebelum ditampilkan di Beranda. Anda dapat mengedit ulasan; perubahan akan ditinjau kembali.</p></div>
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p>}
      <fieldset><legend className="text-sm font-bold text-body">Beri bintang <span aria-hidden="true">*</span></legend><div className="home-review-rating" role="radiogroup" aria-label="Pilih rating">
        {Array.from({ length: 5 }, (_, index) => { const value = index + 1; return <button key={value} type="button" role="radio" aria-checked={rating === value} aria-label={`${value} bintang`} onClick={() => setRating(value)}><Star aria-hidden="true" className={value <= rating ? "is-filled" : ""} /></button>; })}
      </div></fieldset>
      <label className="block text-sm font-bold text-body">Kesan & cerita belajar <span aria-hidden="true">*</span><textarea required maxLength={500} rows={4} value={isi} onChange={(event) => setIsi(event.target.value)} placeholder="Ceritakan pengalaman belajar Anda…" className="mt-2 min-h-28 w-full resize-y rounded-xl border border-rule-strong bg-white p-3 text-sm font-normal text-ink" /></label>
      <div className="flex items-center justify-between gap-3 text-xs text-muted"><span>Maksimal 500 karakter</span><span>{isi.length}/500</span></div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={() => setShowForm(false)} className="min-h-11 rounded-lg border border-rule-strong bg-white px-4 text-sm font-bold text-body">Batal</button><button type="submit" disabled={saving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-earth px-5 text-sm font-extrabold text-white disabled:opacity-60"><Send aria-hidden="true" className="h-4 w-4" />{saving ? "Menyimpan…" : myReview ? "Simpan perubahan" : "Kirim ulasan"}</button></div>
    </form>}
  </div>;
}
