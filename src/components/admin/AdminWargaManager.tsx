"use client";

import React, { useState } from "react";
import {
  Ban,
  CheckCircle2,
  Download,
  Edit2,
  KeyRound,
  LogOut,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  Trash2,
  UserCheck,
  Users,
} from "lucide-react";
import { WargaRecord, LoginLogEntry } from "@/lib/types";

interface RwCodeItem {
  rw: "RW 06" | "RW 07" | "RW 08";
  codeDisplay: string;
  isActive: boolean;
  updatedAt: string;
  forceLogoutAt?: string;
}

interface AdminWargaManagerProps {
  warga: WargaRecord[];
  rwCodes: RwCodeItem[];
  loginLog: LoginLogEntry[];
  stats: {
    totalWarga?: number;
    wargaRw06?: number;
    wargaRw07?: number;
    wargaRw08?: number;
    activeToday?: number;
    activeThisWeek?: number;
    mostPlayedGame?: string;
  };
  onRefresh: () => void;
  notify: (msg: string) => void;
}

export default function AdminWargaManager({
  warga,
  rwCodes,
  loginLog,
  stats,
  onRefresh,
  notify,
}: AdminWargaManagerProps) {
  const [search, setSearch] = useState("");
  const [filterRw, setFilterRw] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"newest" | "name" | "score" | "games">("newest");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [selectedRw, setSelectedRw] = useState<"RW 06" | "RW 07" | "RW 08">("RW 06");
  const [customCode, setCustomCode] = useState("");
  const [forceLogout, setForceLogout] = useState(false);
  const [savingCode, setSavingCode] = useState(false);

  const filteredWarga = warga
    .filter((w) => {
      const matchSearch = w.namaPanggilan.toLowerCase().includes(search.toLowerCase());
      const matchRw = filterRw === "ALL" || w.rw === filterRw;
      return matchSearch && matchRw;
    })
    .sort((a, b) => {
      if (sortBy === "name") return a.namaPanggilan.localeCompare(b.namaPanggilan);
      if (sortBy === "score") return (b.highScore || 0) - (a.highScore || 0);
      if (sortBy === "games") return (b.totalGamesPlayed || 0) - (a.totalGamesPlayed || 0);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const totalPages = Math.max(1, Math.ceil(filteredWarga.length / pageSize));
  const paginatedWarga = filteredWarga.slice((page - 1) * pageSize, page * pageSize);

  async function handleRename(w: WargaRecord) {
    const baru = prompt(`Ubah nama panggilan "${w.namaPanggilan}" menjadi:`, w.namaPanggilan);
    if (!baru || baru.trim() === w.namaPanggilan) return;
    if (baru.trim().length < 3) { alert("Nama panggilan minimal 3 karakter!"); return; }
    const res = await fetch("/api/admin/warga", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: w.id, action: "rename", namaBaru: baru.trim() }),
    });
    if (res.ok) { notify(`Nama diubah menjadi "${baru.trim()}"`); onRefresh(); }
  }

  async function handleToggleBlock(w: WargaRecord) {
    const action = w.isBlocked ? "unblock" : "block";
    const confirmMsg = w.isBlocked
      ? `Buka blokir akun "${w.namaPanggilan}"?`
      : `Blokir akun "${w.namaPanggilan}"? Warga ini tidak akan bisa login lagi.`;
    if (!confirm(confirmMsg)) return;
    const res = await fetch("/api/admin/warga", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: w.id, action }),
    });
    if (res.ok) { notify(w.isBlocked ? "Akun dibuka blokir." : "Akun berhasil diblokir."); onRefresh(); }
  }

  async function handleResetStats(w: WargaRecord) {
    if (!confirm(`Reset skor dan riwayat game untuk "${w.namaPanggilan}"?`)) return;
    const res = await fetch("/api/admin/warga", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: w.id, action: "reset" }),
    });
    if (res.ok) { notify(`Skor akun "${w.namaPanggilan}" berhasil direset.`); onRefresh(); }
  }

  async function handleDelete(w: WargaRecord) {
    if (!confirm(`PERINGATAN: Hapus akun warga "${w.namaPanggilan}" (${w.rw}) secara permanen?`)) return;
    const res = await fetch(`/api/admin/warga?id=${encodeURIComponent(w.id)}`, { method: "DELETE" });
    if (res.ok) { notify(`Akun "${w.namaPanggilan}" telah dihapus.`); onRefresh(); }
  }

  async function handleUpdateRwCode(generateNew = false) {
    const targetCode = generateNew ? "" : customCode.trim();
    if (!generateNew && !targetCode) { alert("Masukkan kode baru terlebih dahulu atau pilih Buat Acak."); return; }
    const confirmMsg = `Ganti kode akses ${selectedRw}${forceLogout ? " DAN PAKSA KELUAR SEMUA WARGA" : ""}?`;
    if (!confirm(confirmMsg)) return;
    setSavingCode(true);
    try {
      const res = await fetch("/api/admin/rw-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rw: selectedRw, newCode: targetCode, generateNew, forceLogout }),
      });
      const data = await res.json();
      if (res.ok) { notify(`Kode ${selectedRw} berhasil diperbarui: ${data.codeDisplay}`); setCustomCode(""); setForceLogout(false); onRefresh(); }
      else { alert(data.error || "Gagal memperbarui kode."); }
    } finally { setSavingCode(false); }
  }

  function exportCsv() {
    if (warga.length === 0) { alert("Belum ada data warga untuk diekspor."); return; }
    const headers = ["ID", "Nama Panggilan", "RW", "Tanggal Daftar", "Login Terakhir", "Games Dimainkan", "Skor Tertinggi", "Status"];
    const rows = warga.map((w) => [
      `"${w.id}"`, `"${w.namaPanggilan}"`, `"${w.rw}"`,
      `"${new Date(w.createdAt).toLocaleString("id-ID")}"`, `"${new Date(w.lastLoginAt).toLocaleString("id-ID")}"`,
      w.totalGamesPlayed || 0, w.highScore || 0, w.isBlocked ? '"Diblokir"' : '"Aktif"',
    ]);
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `daftar-warga-sapen-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click(); URL.revokeObjectURL(url);
    notify("File CSV warga berhasil diunduh.");
  }

  return (
    <div className="space-y-8 mt-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
        <StatCard label="Total Warga" value={stats.totalWarga || 0} icon={Users} iconColor="text-[#14532D]" subLabel="Terdaftar aktif" />
        <StatCard label="Warga RW 06" value={stats.wargaRw06 || 0} icon={Users} iconColor="text-[#14532D]" subLabel="Akun terdaftar" />
        <StatCard label="Warga RW 07" value={stats.wargaRw07 || 0} icon={Users} iconColor="text-[#14532D]" subLabel="Akun terdaftar" />
        <StatCard label="Warga RW 08" value={stats.wargaRw08 || 0} icon={Users} iconColor="text-[#14532D]" subLabel="Akun terdaftar" />
        <StatCard label="Aktif Hari Ini" value={stats.activeToday || 0} icon={UserCheck} iconColor="text-[#F59E0B]" subLabel={`${stats.activeThisWeek || 0} minggu ini`} />
        <StatCard label="Game Terpopuler" value={stats.mostPlayedGame || "Belum ada"} icon={ShieldAlert} iconColor="text-gray-400" subLabel="Paling sering dimainkan" isText />
      </div>

      {/* Kelola Kode RW */}
      <section className="rounded-xl border border-[#E5E7EB] bg-white p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="text-lg font-extrabold text-gray-900 flex items-center gap-2"><KeyRound className="h-5 w-5 text-[#14532D]" /> Kelola Kode Akses Warga per RW</h3>
            <p className="text-xs text-gray-500 mt-0.5">Satu kode digunakan bersama oleh seluruh warga satu RW. Admin dapat mengganti kode kapan saja jika bocor.</p>
          </div>
          <span className="text-xs font-bold bg-green-50 text-[#14532D] px-3 py-1 rounded-full border border-green-200 shrink-0">Format Baku: XXX-XXX</span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
          {(["RW 06", "RW 07", "RW 08"] as const).map((rwName) => {
            const codeObj = rwCodes.find((c) => c.rw === rwName);
            const isSelected = selectedRw === rwName;
            return (
              <button
                key={rwName}
                onClick={() => setSelectedRw(rwName)}
                className={`text-left p-4 transition ${isSelected ? "border-2 border-[#14532D] bg-green-50/50" : "border border-[#E5E7EB] bg-gray-50/40 hover:bg-gray-50"}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-gray-600">{rwName}</span>
                  <span className="text-[10px] font-bold bg-white px-2 py-0.5 rounded border border-[#E5E7EB] text-gray-600">{codeObj?.isActive ? "Aktif" : "Nonaktif"}</span>
                </div>
                <p className="mt-2 text-xl font-extrabold font-mono tracking-widest text-[#14532D]">{codeObj?.codeDisplay || "BELUM ADA"}</p>
                <p className="mt-1 text-[11px] text-gray-400">Diperbarui: {codeObj ? new Date(codeObj.updatedAt).toLocaleDateString("id-ID") : "-"}</p>
              </button>
            );
          })}
        </div>

        <div className="rounded-lg border border-[#E5E7EB] bg-gray-50 p-4 sm:p-5">
          <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Ubah Kode untuk: <strong className="text-[#14532D]">{selectedRw}</strong></p>
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
            <div className="sm:col-span-5"><input type="text" value={customCode} onChange={(e) => setCustomCode(e.target.value.toUpperCase())} placeholder="Ketik kode baru (cth: QTU-OP3)" className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3.5 py-2.5 font-mono text-sm uppercase tracking-wider focus:border-[#14532D] focus:outline-none" /></div>
            <div className="sm:col-span-4 flex items-center gap-2">
              <button type="button" onClick={() => handleUpdateRwCode(false)} disabled={savingCode || !customCode.trim()} className="rounded-lg bg-[#14532D] hover:bg-[#0F3F22] px-4 py-2.5 text-xs font-bold text-white transition disabled:opacity-50">Simpan Kode</button>
              <button type="button" onClick={() => handleUpdateRwCode(true)} disabled={savingCode} className="rounded-lg border border-[#14532D] bg-white hover:bg-green-50 px-4 py-2.5 text-xs font-bold text-[#14532D] transition">Acak Otomatis</button>
            </div>
            <div className="sm:col-span-3"><label className="flex items-center gap-2 text-xs font-bold text-red-700 cursor-pointer"><input type="checkbox" checked={forceLogout} onChange={(e) => setForceLogout(e.target.checked)} className="rounded border-gray-300 text-red-600 focus:ring-red-500" /> Paksa keluar semua warga RW ini</label></div>
          </div>
        </div>
      </section>

      {/* Daftar Warga */}
      <section className="rounded-xl border border-[#E5E7EB] bg-white p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <h3 className="text-lg font-extrabold text-gray-900 flex items-center gap-2"><Users className="h-5 w-5 text-[#14532D]" /> Daftar Warga Terdaftar ({filteredWarga.length})</h3>
            <p className="text-xs text-gray-500 mt-0.5">Kelola nama panggilan warga, reset skor, atau blokir akun yang melanggar aturan.</p>
          </div>
          <button type="button" onClick={exportCsv} className="inline-flex items-center gap-2 rounded-lg bg-[#F59E0B] hover:bg-[#D97706] px-4 py-2.5 text-xs font-extrabold text-gray-950 transition shrink-0"><Download className="h-4 w-4" /> Ekspor Data ke CSV</button>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Cari nama panggilan..." className="w-full rounded-lg border border-[#E5E7EB] py-2 pl-9 pr-3 text-xs focus:border-[#14532D] focus:outline-none" /></div>
          <select value={filterRw} onChange={(e) => { setFilterRw(e.target.value); setPage(1); }} className="rounded-lg border border-[#E5E7EB] px-3 py-2 text-xs font-semibold bg-white"><option value="ALL">Semua RW</option><option value="RW 06">RW 06</option><option value="RW 07">RW 07</option><option value="RW 08">RW 08</option></select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="rounded-lg border border-[#E5E7EB] px-3 py-2 text-xs font-semibold bg-white"><option value="newest">Terbaru Terdaftar</option><option value="name">Nama Panggilan</option><option value="score">Skor Tertinggi</option><option value="games">Paling Banyak Main</option></select>
        </div>

        <div className="overflow-x-auto rounded-lg border border-[#E5E7EB]">
          <table className="w-full text-left text-xs text-gray-700"><thead className="border-b border-[#E5E7EB] bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-500"><tr><th className="px-4 py-3">Nama Panggilan</th><th className="px-4 py-3">Wilayah</th><th className="px-4 py-3">Tgl Daftar</th><th className="px-4 py-3">Login Terakhir</th><th className="px-4 py-3 text-center">Game Dimainkan</th><th className="px-4 py-3 text-center">Skor Tertinggi</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Aksi</th></tr></thead><tbody className="divide-y divide-[#E5E7EB]">{paginatedWarga.length === 0 ? (<tr><td colSpan={8} className="py-8 text-center text-xs text-gray-400">Tidak ada warga yang sesuai dengan kriteria pencarian.</td></tr>) : (paginatedWarga.map((w) => (<tr key={w.id} className="hover:bg-gray-50/70 transition"><td className="px-4 py-3 font-extrabold text-gray-900">{w.namaPanggilan}</td><td className="px-4 py-3"><span className="rounded bg-green-50 px-2 py-0.5 text-[11px] font-bold text-[#14532D] border border-green-200">{w.rw}</span></td><td className="px-4 py-3 text-gray-500 text-[11px]">{new Date(w.createdAt).toLocaleDateString("id-ID")}</td><td className="px-4 py-3 text-gray-500 text-[11px]">{new Date(w.lastLoginAt).toLocaleDateString("id-ID")}</td><td className="px-4 py-3 text-center font-bold text-gray-700">{w.totalGamesPlayed || 0}</td><td className="px-4 py-3 text-center font-bold text-[#F59E0B]">{w.highScore || 0}</td><td className="px-4 py-3">{w.isBlocked ? (<span className="rounded bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-800">Diblokir</span>) : (<span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">Aktif</span>)}</td><td className="px-4 py-3 text-right"><div className="flex items-center justify-end gap-1"><button type="button" onClick={() => handleRename(w)} title="Ubah Nama Panggilan" className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900"><Edit2 className="h-3.5 w-3.5" /></button><button type="button" onClick={() => handleResetStats(w)} title="Reset Skor" className="rounded p-1.5 text-amber-600 hover:bg-amber-50"><RotateCcw className="h-3.5 w-3.5" /></button><button type="button" onClick={() => handleToggleBlock(w)} title={w.isBlocked ? "Buka Blokir" : "Blokir Akun"} className={`rounded p-1.5 ${w.isBlocked ? "text-emerald-600 hover:bg-emerald-50" : "text-red-500 hover:bg-red-50"}`}><Ban className="h-3.5 w-3.5" /></button><button type="button" onClick={() => handleDelete(w)} title="Hapus Akun" className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button></div></td></tr>)))}</tbody></table>
        </div>

        {totalPages > 1 && (<div className="mt-4 flex items-center justify-between text-xs text-gray-500"><span>Halaman {page} dari {totalPages}</span><div className="flex gap-1"><button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded border border-[#E5E7EB] px-3 py-1 font-bold disabled:opacity-40">Sebelumnya</button><button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="rounded border border-[#E5E7EB] px-3 py-1 font-bold disabled:opacity-40">Berikutnya</button></div></div>)}
      </section>

      {/* Riwayat Login */}
      <section className="rounded-xl border border-[#E5E7EB] bg-white p-6">
        <h3 className="text-lg font-extrabold text-gray-900 mb-3 flex items-center gap-2"><UserCheck className="h-5 w-5 text-[#14532D]" /> Riwayat Login Terbaru ({loginLog.length})</h3>
        <div className="overflow-x-auto rounded-lg border border-[#E5E7EB]"><table className="w-full text-left text-xs text-gray-700"><thead className="border-b border-[#E5E7EB] bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-500"><tr><th className="px-4 py-2.5">Waktu</th><th className="px-4 py-2.5">Nama Panggilan</th><th className="px-4 py-2.5">RW</th><th className="px-4 py-2.5">Device Token</th><th className="px-4 py-2.5">IP Hint</th></tr></thead><tbody className="divide-y divide-[#E5E7EB]">{loginLog.length === 0 ? (<tr><td colSpan={5} className="py-6 text-center text-xs text-gray-400">Belum ada aktivitas login yang tercatat.</td></tr>) : (loginLog.slice(0, 15).map((log) => (<tr key={log.id} className="hover:bg-gray-50/50"><td className="px-4 py-2 text-gray-500 text-[11px]">{new Date(log.loginAt).toLocaleString("id-ID")}</td><td className="px-4 py-2 font-bold text-gray-900">{log.namaPanggilan}</td><td className="px-4 py-2"><span className="font-semibold text-[#14532D]">{log.rw}</span></td><td className="px-4 py-2 font-mono text-[11px] text-gray-400 truncate max-w-[150px]">{log.deviceId}</td><td className="px-4 py-2 text-gray-400 text-[11px]">{log.ipHint || "-"}</td></tr>)))}</tbody></table></div>
      </section>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, iconColor, subLabel, isText }: { label: string; value: string | number; icon: React.ComponentType<any>; iconColor: string; subLabel?: string; isText?: boolean }) {
  return (
    <div className="rounded-lg border border-[#E5E7EB] bg-white p-4">
      <div className="flex items-center justify-between"><p className="text-xs font-bold text-gray-500 uppercase">{label}</p><span className={`p-2 rounded-lg ${iconColor} bg-white/50`}><Icon className="h-5 w-5" /></span></div>
      <p className="mt-2 text-2xl font-extrabold text-gray-900" style={{ whiteSpace: isText ? "normal" : "nowrap" }}>{value}</p>
      {subLabel && <p className="text-[11px] text-gray-500 mt-0.5">{subLabel}</p>}
    </div>
  );
}