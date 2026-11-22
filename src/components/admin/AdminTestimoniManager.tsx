"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Check, Clock, MessageSquare, Star, Trash2 } from "lucide-react";
import type { TestimoniRecord } from "@/lib/types";
import { useAppDialog } from "@/components/AppDialogProvider";
import ResponsiveTable from "@/components/admin/ResponsiveTable";
import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader";

export default function AdminTestimoniManager({ testimoni: initial, onRefresh, notify }: { testimoni: TestimoniRecord[]; onRefresh: () => void; notify: (message: string) => void }) {
  const dialog = useAppDialog();
  const [reviews, setReviews] = useState(initial);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");

  const refreshReviews = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/testimoni?all=true", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Daftar ulasan belum dapat dimuat.");
      setReviews(data.testimoni || []);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Daftar ulasan belum dapat dimuat.");
    } finally { setLoading(false); }
  }, [notify]);

  useEffect(() => { void refreshReviews(); }, [refreshReviews]);

  async function postReview(review: TestimoniRecord) {
    if (review.status === "terbit" || review.isApproved) return;
    setBusyId(review.id);
    try {
      const response = await fetch("/api/admin/testimoni", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: review.id }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Ulasan belum dapat diposting.");
      notify("Ulasan diposting di Beranda.");
      await refreshReviews(); onRefresh();
    } catch (error) { notify(error instanceof Error ? error.message : "Ulasan belum dapat diposting."); }
    finally { setBusyId(""); }
  }

  async function deleteReview(review: TestimoniRecord) {
    if (!(await dialog.confirm(`Ulasan dari ${review.nama} akan dihapus permanen.`, "Hapus ulasan?"))) return;
    setBusyId(review.id);
    try {
      const response = await fetch(`/api/admin/testimoni?id=${encodeURIComponent(review.id)}`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Ulasan belum dapat dihapus.");
      setReviews((current) => current.filter((item) => item.id !== review.id));
      notify("Ulasan dihapus."); onRefresh();
    } catch (error) { notify(error instanceof Error ? error.message : "Ulasan belum dapat dihapus."); }
    finally { setBusyId(""); }
  }

  const pendingCount = reviews.filter((item) => item.status !== "terbit" && !item.isApproved).length;
  return <div className="mt-6 space-y-4 bg-[#FDFBF7] p-1 text-[#1A2E1A]">
    <AdminSectionHeader title={<h3 className="flex items-center gap-2 text-lg font-extrabold text-[#1A2E1A]"><MessageSquare className="h-5 w-5 text-[#14532D]" />Ulasan peserta</h3>} description={`${pendingCount} menunggu posting · ${reviews.length} ulasan tersimpan`} className="border-b border-[#E5E7EB] pb-4" />
    <ResponsiveTable rows={reviews} getRowKey={(item) => item.id} ariaLabel="Daftar ulasan peserta" emptyMessage={loading ? "Memuat ulasan…" : "Belum ada ulasan yang masuk."} tableMinWidthClassName="min-w-[720px]" tableClassName="text-xs text-[#1A2E1A]" columns={[
      { id: "name", label: "Nama", cellClassName: "font-extrabold", render: (item) => item.nama },
      { id: "rating", label: "Rating", render: (item) => <span className="inline-flex items-center gap-1 text-[#9b6d00]">{item.rating || 0}<Star aria-hidden="true" className="h-3.5 w-3.5 fill-current" /></span> },
      { id: "content", label: "Kesan & cerita belajar", cellClassName: "max-w-lg whitespace-normal", render: (item) => item.isi || item.komentar },
      { id: "date", label: "Tanggal", render: (item) => new Date(item.createdAt).toLocaleDateString("id-ID") },
      { id: "status", label: "Status", render: (item) => (item.status === "terbit" || item.isApproved) ? <span className="inline-flex items-center gap-1 rounded-md bg-[#e6eadf] px-2 py-1 font-bold text-[#244b3a]"><Check className="h-3 w-3" />Terbit</span> : <span className="inline-flex items-center gap-1 rounded-md bg-[#f3e9d5] px-2 py-1 font-bold text-[#625f54]"><Clock className="h-3 w-3" />Menunggu</span> },
      { id: "actions", label: "Aksi", action: true, render: (item) => <div className="flex flex-wrap gap-2"><button type="button" disabled={busyId === item.id || item.status === "terbit" || item.isApproved} onClick={() => void postReview(item)} className="min-h-11 rounded-md bg-[#244b3a] px-3 text-xs font-bold text-white hover:bg-[#183b2d] disabled:cursor-not-allowed disabled:opacity-50">{busyId === item.id ? "Memproses…" : "Posting"}</button><button type="button" disabled={busyId === item.id} onClick={() => void deleteReview(item)} aria-label={`Hapus ulasan dari ${item.nama}`} title="Hapus ulasan" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-[#a23b27]/40 bg-[#fff2ec] text-[#943520] hover:bg-[#f9e1d8] disabled:opacity-50"><Trash2 aria-hidden="true" className="h-4 w-4" /></button></div> },
    ]} />
  </div>;
}
