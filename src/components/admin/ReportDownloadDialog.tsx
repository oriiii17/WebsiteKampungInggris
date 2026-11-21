"use client";

import { useState } from "react";
import { Download, X } from "lucide-react";

type ReportType = "warga" | "participants";

export default function ReportDownloadDialog({ type, onClose }: { type: ReportType; onClose: () => void }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [format, setFormat] = useState<"pdf" | "csv" | "excel">("excel");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function download() {
    if (from && to && from > to) { setError("Tanggal awal harus sebelum atau sama dengan tanggal akhir."); return; }
    setBusy(true); setError("");
    try {
      const params = new URLSearchParams({ type, format });
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const response = await fetch(`/api/admin/export?${params}`);
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || "Laporan belum dapat diunduh.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = response.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] || `laporan-${type}.${format}`;
      link.click(); URL.revokeObjectURL(url); onClose();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Laporan belum dapat diunduh."); }
    finally { setBusy(false); }
  }

  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#18251f]/55 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="report-download-title" className="w-full max-w-md rounded-2xl border border-[#d8d0c2] bg-[#fffdf8] p-5 shadow-2xl">
      <div className="flex items-start justify-between gap-4"><div><h2 id="report-download-title" className="text-lg font-bold text-[#183b2d]">Unduh laporan</h2><p className="mt-1 text-sm text-[#625f54]">Pilih rentang tanggal dan format file.</p></div><button type="button" onClick={onClose} aria-label="Tutup" className="grid h-11 w-11 place-items-center rounded-lg text-[#514b3e] hover:bg-[#f0eadf]"><X className="h-5 w-5" /></button></div>
      <div className="mt-5 grid grid-cols-2 gap-3"><label className="space-y-1 text-sm font-semibold text-[#34362f]">Dari tanggal<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-[#c9bda7] bg-white px-3" /></label><label className="space-y-1 text-sm font-semibold text-[#34362f]">Sampai tanggal<input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-[#c9bda7] bg-white px-3" /></label></div>
      <label className="mt-4 block space-y-1 text-sm font-semibold text-[#34362f]">Format file<select value={format} onChange={(event) => setFormat(event.target.value as typeof format)} className="mt-1 min-h-11 w-full rounded-lg border border-[#c9bda7] bg-white px-3"><option value="pdf">PDF</option><option value="csv">CSV</option><option value="excel">Excel (.xlsx)</option></select></label>
      {error && <p role="alert" className="mt-3 rounded-lg bg-[#fff1eb] p-3 text-sm text-[#8e321f]">{error}</p>}
      <button type="button" onClick={download} disabled={busy} className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#b9442c] px-4 font-bold text-white hover:bg-[#9e3824] disabled:opacity-60"><Download className="h-4 w-4" />{busy ? "Menyiapkan laporan…" : "Unduh laporan"}</button>
    </section>
  </div>;
}
