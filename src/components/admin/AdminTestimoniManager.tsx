"use client";

import React, { useState } from "react";
import {
  Check,
  Clock,
  MessageSquare,
  Plus,
  Trash2,
} from "lucide-react";
import { TestimoniRecord } from "@/lib/types";
import { useAppDialog } from "@/components/AppDialogProvider";
import ResponsiveTable from "@/components/admin/ResponsiveTable";
import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader";

interface AdminTestimoniManagerProps {
  testimoni: TestimoniRecord[];
  onRefresh: () => void;
  notify: (msg: string) => void;
}

export default function AdminTestimoniManager({
  testimoni,
  onRefresh,
  notify,
}: AdminTestimoniManagerProps) {
  const dialog = useAppDialog();
  const [showAddForm, setShowAddForm] = useState(false);
  const [nama, setNama] = useState("");
  const [rw, setRw] = useState("RW 06");
  const [komentar, setKomentar] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleToggleStatus(t: TestimoniRecord) {
    const res = await fetch("/api/admin/testimoni", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: t.id, isApproved: !t.isApproved }),
    });
    if (res.ok) {
      notify(t.isApproved ? "Ulasan disembunyikan." : "Ulasan disetujui & tayang di Beranda.");
      onRefresh();
    }
  }

  async function handleDelete(t: TestimoniRecord) {
    if (!(await dialog.confirm(`Hapus ulasan dari "${t.nama}"?`, "Hapus ulasan?"))) return;
    const res = await fetch(`/api/admin/testimoni?id=${encodeURIComponent(t.id)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      notify("Ulasan berhasil dihapus.");
      onRefresh();
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/testimoni", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama, rw, komentar }),
      });
      if (res.ok) {
        const data = await res.json();
        await fetch("/api/admin/testimoni", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: data.id, isApproved: true }),
        });
        notify("Testimoni baru berhasil ditambahkan dan disetujui.");
        setNama("");
        setKomentar("");
        setShowAddForm(false);
        onRefresh();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-6 space-y-4 bg-[#FDFBF7] p-1 text-[#1A2E1A]">
      <AdminSectionHeader
        title={<h3 className="flex items-center gap-2 text-lg font-extrabold text-[#1A2E1A]"><MessageSquare className="h-5 w-5 text-[#14532D]" />Kelola Testimoni & Cerita Warga</h3>}
        description={<>Tinjau ulasan warga, setujui untuk ditayangkan di beranda, atau tambahkan ulasan manual. Total: {testimoni.length}.</>}
        actions={<button type="button" onClick={() => setShowAddForm(!showAddForm)} className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-md border border-[#14532D] bg-[#14532D] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#0F3F22] sm:w-auto"><Plus className="h-4 w-4" />Tambah Ulasan Warga</button>}
        className="border-b border-[#E5E7EB] pb-4"
      />

      {showAddForm && (
        <form onSubmit={handleCreate} className="max-w-2xl space-y-4 rounded-xl border border-[#E5E7EB] bg-white p-5">
          <h4 className="text-sm font-extrabold text-[#1A2E1A]">Tambah Ulasan Warga Baru</h4>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-[#1A2E1A]">Nama Panggilan</label>
              <input
                type="text"
                required
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Contoh: Pak Budi"
                className="mt-1 min-h-[44px] w-full rounded-md border border-[#E5E7EB] bg-white px-3 py-2 text-xs text-[#1A2E1A] focus:border-[#14532D] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#1A2E1A]">Asal RW</label>
              <select
                value={rw}
                onChange={(e) => setRw(e.target.value)}
                className="mt-1 min-h-[44px] w-full rounded-md border border-[#E5E7EB] bg-white px-3 py-2 text-xs text-[#1A2E1A] focus:border-[#14532D] focus:outline-none"
              >
                <option value="RW 06">RW 06</option>
                <option value="RW 07">RW 07</option>
                <option value="RW 08">RW 08</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-[#1A2E1A]">Isi Cerita / Komentar</label>
            <textarea
              required
              rows={3}
              value={komentar}
              onChange={(e) => setKomentar(e.target.value)}
              placeholder="Ceritakan pengalaman belajar di sini..."
              className="mt-1 w-full rounded-md border border-[#E5E7EB] bg-white px-3 py-2 text-xs text-[#1A2E1A] focus:border-[#14532D] focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="min-h-[44px] rounded-md border border-[#E5E7EB] bg-white px-4 py-2 text-xs font-bold text-[#1A2E1A] hover:bg-[#FDFBF7]"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="min-h-[44px] rounded-md border border-[#14532D] bg-[#14532D] px-5 py-2 text-xs font-bold text-white hover:bg-[#0F3F22] disabled:opacity-50"
            >
              {saving ? "Menyimpan..." : "Simpan & Publikasikan"}
            </button>
          </div>
        </form>
      )}

      <ResponsiveTable
        rows={testimoni}
        getRowKey={(item) => item.id}
        ariaLabel="Daftar testimoni warga"
        emptyMessage="Belum ada ulasan yang masuk dari warga."
        tableMinWidthClassName="min-w-[720px]"
        tableClassName="text-xs text-[#1A2E1A]"
        columns={[
          { id: "number", label: "No.", cellClassName: "text-[#1A2E1A]/70", render: (_item, index) => index + 1 },
          { id: "name", label: "Nama", cellClassName: "font-extrabold text-[#1A2E1A]", render: (item) => item.nama },
          { id: "area", label: "RW", render: (item) => <span className="inline-flex rounded-md border border-[#E5E7EB] bg-[#FDFBF7] px-2 py-1 text-[11px] font-bold text-[#14532D]">{item.rw || "Warga Sapen"}</span> },
          { id: "comment", label: "Cerita / Komentar", cellClassName: "max-w-sm text-[#1A2E1A]/80", render: (item) => <span title={item.komentar}>“{item.komentar}”</span> },
          { id: "date", label: "Tanggal", cellClassName: "text-[11px] text-[#1A2E1A]/65", render: (item) => new Date(item.createdAt).toLocaleDateString("id-ID") },
          { id: "status", label: "Status", render: (item) => item.isApproved ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-[#E5E7EB] bg-[#14532D]/10 px-2 py-1 text-[10px] font-bold text-[#14532D]"><Check className="h-3 w-3" /> Tayang</span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-md border border-[#E5E7EB] bg-[#FDFBF7] px-2 py-1 text-[10px] font-bold text-[#1A2E1A]/75"><Clock className="h-3 w-3" /> Menunggu</span>
          ) },
          { id: "actions", label: "Aksi", action: true, cellClassName: "text-right", headerClassName: "text-right", render: (item) => (
            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              <button type="button" onClick={() => handleToggleStatus(item)} title={item.isApproved ? "Sembunyikan" : "Setujui & Publikasikan"} className={`min-h-[44px] rounded-md border px-3 py-2 text-[11px] font-bold transition ${item.isApproved ? "border-[#E5E7EB] bg-white text-[#1A2E1A] hover:bg-[#FDFBF7]" : "border-[#14532D] bg-[#14532D] text-white hover:bg-[#0F3F22]"}`}>
                {item.isApproved ? "Sembunyikan" : "Setujui"}
              </button>
              <button type="button" onClick={() => handleDelete(item)} title={`Hapus ulasan dari ${item.nama}`} aria-label={`Hapus ulasan dari ${item.nama}`} className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-[#a23b27]/30 bg-[#fff2ec] text-[#a23b27] transition hover:bg-[#f9e1d8]">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ) },
        ]}
      />
    </div>
  );
}
