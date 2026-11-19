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
      <div className="flex flex-col gap-3 border-b border-[#E5E7EB] pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl space-y-1">
          <h3 className="flex items-center gap-2 text-lg font-extrabold text-[#1A2E1A]">
            <MessageSquare className="h-5 w-5 text-[#14532D]" />
            Kelola Testimoni & Cerita Warga
          </h3>
          <p className="text-xs text-[#1A2E1A]/70">
            Tinjau ulasan warga, setujui untuk ditayangkan di beranda, atau tambahkan ulasan manual. Total: {testimoni.length}.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-md border border-[#14532D] bg-[#14532D] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#0F3F22]"
        >
          <Plus className="h-4 w-4" />
          Tambah Ulasan Warga
        </button>
      </div>

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

      <div className="overflow-x-auto rounded-xl border border-[#E5E7EB] bg-white">
        <table className="w-full min-w-[720px] text-left text-xs text-[#1A2E1A]">
          <thead className="border-b border-[#E5E7EB] bg-[#FDFBF7] text-[11px] font-bold uppercase tracking-wider text-[#1A2E1A]/70">
            <tr>
              <th className="px-4 py-3">No.</th>
              <th className="px-4 py-3">Nama</th>
              <th className="px-4 py-3">RW</th>
              <th className="px-4 py-3">Cerita / Komentar</th>
              <th className="px-4 py-3">Tanggal</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {testimoni.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-xs text-[#1A2E1A]/60">
                  Belum ada ulasan yang masuk dari warga.
                </td>
              </tr>
            ) : (
              testimoni.map((t, index) => (
                <tr key={t.id} className="align-top hover:bg-[#FDFBF7]/70">
                  <td className="px-4 py-3 text-[#1A2E1A]/70">{index + 1}</td>
                  <td className="px-4 py-3 font-extrabold text-[#1A2E1A]">{t.nama}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-md border border-[#E5E7EB] bg-[#FDFBF7] px-2 py-1 text-[11px] font-bold text-[#14532D]">
                      {t.rw || "Warga Sapen"}
                    </span>
                  </td>
                  <td className="max-w-sm px-4 py-3 text-[#1A2E1A]/80" title={t.komentar}>
                    “{t.komentar}”
                  </td>
                  <td className="px-4 py-3 text-[11px] text-[#1A2E1A]/65">
                    {new Date(t.createdAt).toLocaleDateString("id-ID")}
                  </td>
                  <td className="px-4 py-3">
                    {t.isApproved ? (
                      <span className="inline-flex items-center gap-1 rounded-md border border-[#E5E7EB] bg-[#14532D]/10 px-2 py-1 text-[10px] font-bold text-[#14532D]">
                        <Check className="h-3 w-3" /> Tayang
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md border border-[#E5E7EB] bg-[#FDFBF7] px-2 py-1 text-[10px] font-bold text-[#1A2E1A]/75">
                        <Clock className="h-3 w-3" /> Menunggu
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(t)}
                        title={t.isApproved ? "Sembunyikan" : "Setujui & Publikasikan"}
                        className={`min-h-[44px] rounded-md border px-3 py-2 text-[11px] font-bold transition ${
                          t.isApproved
                            ? "border-[#E5E7EB] bg-white text-[#1A2E1A] hover:bg-[#FDFBF7]"
                            : "border-[#14532D] bg-[#14532D] text-white hover:bg-[#0F3F22]"
                        }`}
                      >
                        {t.isApproved ? "Sembunyikan" : "Setujui"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(t)}
                        title="Hapus"
                        className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-[#E5E7EB] bg-white text-[#1A2E1A]/70 hover:border-[#14532D] hover:text-[#14532D]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
