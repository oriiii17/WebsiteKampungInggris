"use client";

import React, { useEffect, useRef, useState } from "react";
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
  Users,
} from "lucide-react";
import { WargaRecord } from "@/lib/types";
import { useAppDialog } from "@/components/AppDialogProvider";
import SixBoxCodeInput, { toCodeString } from "@/components/SixBoxCodeInput";
import ReportDownloadDialog from "@/components/admin/ReportDownloadDialog";
import ResponsiveTable from "@/components/admin/ResponsiveTable";
import { AdminSectionHeader, AdminToolbar } from "@/components/admin/AdminSectionHeader";

interface RwCodeItem {
  id: string;
  rw: "RW 06" | "RW 07" | "RW 08";
  codeDisplay: string;
  isActive: boolean;
  updatedAt: string;
  forceLogoutAt?: string;
}

interface AdminWargaManagerProps {
  warga: WargaRecord[];
  stats: {
    totalWarga?: number;
    wargaRw06?: number;
    wargaRw07?: number;
    wargaRw08?: number;
    activeThisWeek?: number;
    mostPlayedGame?: string;
  };
  onRefresh: () => void;
  notify: (msg: string) => void;
}

export default function AdminWargaManager({
  warga,
  stats,
  onRefresh,
  notify,
}: AdminWargaManagerProps) {
  const dialog = useAppDialog();
  const [search, setSearch] = useState("");
  const [filterRw, setFilterRw] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"newest" | "name" | "score" | "games">("newest");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [localWarga, setLocalWarga] = useState(warga);
  const [editingWarga, setEditingWarga] = useState<WargaRecord | null>(null);
  const [editedName, setEditedName] = useState("");
  const [savingName, setSavingName] = useState(false);

  useEffect(() => { setLocalWarga(warga); }, [warga]);

  const [selectedRw, setSelectedRw] = useState<"RW 06" | "RW 07" | "RW 08">("RW 06");
  const [selectedCodeId, setSelectedCodeId] = useState("");
  const [customCodeDigits, setCustomCodeDigits] = useState<string[]>(Array(6).fill(""));
  const customCodeRefs = useRef<(HTMLInputElement | null)[]>([]);
  const customCode = toCodeString(customCodeDigits);
  const [savingCode, setSavingCode] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [codes, setCodes] = useState<RwCodeItem[]>([]);
  const [codePrefix, setCodePrefix] = useState("SAP");
  const [savingPrefix, setSavingPrefix] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [registeredWarga, setRegisteredWarga] = useState<Array<{ id: string; name: string; rw: string; createdAt: string }>>([]);
  const [registeredTotal, setRegisteredTotal] = useState(0);
  const [registeredPage, setRegisteredPage] = useState(1);
  const [registeredPerPage, setRegisteredPerPage] = useState(20);
  const [registeredSearch, setRegisteredSearch] = useState("");
  const [registeredRw, setRegisteredRw] = useState("ALL");
  const [registeredSort, setRegisteredSort] = useState<"newest" | "name">("newest");
  const [exportFormat, setExportFormat] = useState<"excel" | "pdf" | "csv">("excel");

  useEffect(() => {
    const params = new URLSearchParams({ page: String(registeredPage), perPage: String(registeredPerPage), search: registeredSearch, rw: registeredRw, sort: registeredSort });
    let active = true;
    fetch(`/api/admin/registered-warga?${params}`, { cache: "no-store" }).then(async (response) => { const result = await response.json().catch(() => ({})); if (!response.ok) throw new Error(result.error || "Daftar warga terdaftar belum dapat dimuat."); if (active) { setRegisteredWarga(Array.isArray(result.warga) ? result.warga : []); setRegisteredTotal(Number(result.total) || 0); if (result.page && result.page !== registeredPage) setRegisteredPage(result.page); } }).catch((error) => { if (active) notify(error instanceof Error ? error.message : "Daftar warga terdaftar belum dapat dimuat."); });
    return () => { active = false; };
  }, [registeredPage, registeredPerPage, registeredSearch, registeredRw, registeredSort, notify]);

  async function exportRegisteredWarga() {
    const response = await fetch(`/api/admin/export?type=registered-warga&format=${exportFormat}`);
    if (!response.ok) { notify("Ekspor daftar warga belum dapat disiapkan."); return; }
    const url = URL.createObjectURL(await response.blob()); const link = document.createElement("a"); link.href = url; link.download = response.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] || `daftar-warga.${exportFormat === "excel" ? "xlsx" : exportFormat}`; link.click(); URL.revokeObjectURL(url);
  }

  useEffect(() => {
    let active = true;
    fetch("/api/admin/rw-codes", { cache: "no-store" }).then(async (res) => {
      const payload = await res.json();
      if (!active) return;
      if (res.ok && Array.isArray(payload.codes)) setCodes(payload.codes);
      else notify(payload.error || "Kode akses belum dapat dimuat.");
    }).catch((error) => {
      if (active) notify(error instanceof Error ? `Gagal memuat kode akses: ${error.message}` : "Gagal memuat kode akses dari database.");
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/admin/rw-code-settings", { cache: "no-store" }).then(async (response) => {
      const result = await response.json().catch(() => ({}));
      if (!active) return;
      if (response.ok && typeof result.prefix === "string") setCodePrefix(result.prefix);
      else notify(result.error || "Awalan kode akses belum dapat dimuat.");
    }).catch(() => { if (active) notify("Awalan kode akses belum dapat dimuat."); });
    return () => { active = false; };
  }, [notify]);

  async function saveCodePrefix() {
    const prefix = codePrefix.trim().toUpperCase();
    if (!/^[A-Z0-9]{3}$/.test(prefix)) { notify("Awalan harus tepat 3 huruf dan/atau angka."); return; }
    setSavingPrefix(true);
    try {
      const response = await fetch("/api/admin/rw-code-settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prefix }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Awalan belum dapat disimpan.");
      setCodePrefix(result.prefix);
      notify(`Awalan kode akses diperbarui menjadi ${result.prefix}.`);
    } catch (error) { notify(error instanceof Error ? error.message : "Awalan belum dapat disimpan."); }
    finally { setSavingPrefix(false); }
  }

  const filteredWarga = localWarga
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

  async function handleRename() {
    if (!editingWarga) return;
    const namaBaru = editedName.trim();
    if (namaBaru.length < 3) { notify("Nama panggilan minimal 3 karakter."); return; }
    const target = editingWarga;
    const previousName = target.namaPanggilan;
    setLocalWarga((rows) => rows.map((row) => row.id === target.id ? { ...row, namaPanggilan: namaBaru } : row));
    setEditingWarga(null);
    setSavingName(true);
    try {
      const res = await fetch("/api/admin/warga", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: target.id, action: "rename", namaBaru }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Gagal mengubah nama.");
      notify(`Nama diubah menjadi "${namaBaru}".`);
    } catch (error) {
      setLocalWarga((rows) => rows.map((row) => row.id === target.id ? { ...row, namaPanggilan: previousName } : row));
      notify(error instanceof Error ? error.message : "Gagal mengubah nama. Perubahan dibatalkan.");
    } finally { setSavingName(false); }
  }

  async function handleToggleBlock(w: WargaRecord) {
    const action = w.isBlocked ? "unblock" : "block";
    const confirmMsg = w.isBlocked
      ? `Buka blokir akun "${w.namaPanggilan}"?`
      : `Blokir akun "${w.namaPanggilan}"? Warga ini tidak akan bisa login lagi.`;
    if (!(await dialog.confirm(confirmMsg, "Perbarui akun?"))) return;
    const res = await fetch("/api/admin/warga", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: w.id, action }),
    });
    if (res.ok) { notify(w.isBlocked ? "Akun dibuka blokir." : "Akun berhasil diblokir."); onRefresh(); }
  }

  async function handleResetStats(w: WargaRecord) {
    if (!(await dialog.confirm(`Reset skor dan riwayat kuis untuk "${w.namaPanggilan}"?`, "Reset Riwayat kuis?"))) return;
    const res = await fetch("/api/admin/warga", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: w.id, action: "reset" }),
    });
    if (res.ok) { notify(`Skor akun "${w.namaPanggilan}" berhasil direset.`); onRefresh(); }
  }

  async function handleDelete(w: WargaRecord) {
    if (!(await dialog.confirm(`Hapus akun warga "${w.namaPanggilan}" (${w.rw}) secara permanen?`, "Hapus akun warga?"))) return;
    const res = await fetch(`/api/admin/warga?id=${encodeURIComponent(w.id)}`, { method: "DELETE" });
    if (res.ok) { notify(`Akun "${w.namaPanggilan}" telah dihapus.`); onRefresh(); }
  }

  async function handleUpdateRwCode(generateNew = false) {
    const codesForRw = codes.filter((code) => code.rw === selectedRw);
    const selectedCode = codesForRw.find((code) => code.id === selectedCodeId) || codesForRw[0];
    if (generateNew) {
      setGeneratingCode(true);
      try {
        const res = await fetch("/api/admin/rw-codes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: selectedCode?.id, rw: selectedRw, generateNew: true }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal membuat kode akses.");
        setCodes((current) => [...current.filter((item) => item.id !== data.code.id), data.code]);
        setSelectedCodeId(data.code.id);
        setCustomCodeDigits(data.code.codeDisplay.replace("-", "").split(""));
        notify(`Kode ${selectedRw} tersimpan: ${data.code.codeDisplay}`);
        onRefresh();
      } catch (error) {
        notify(error instanceof Error ? error.message : "Gagal membuat kode akses.");
      } finally { setGeneratingCode(false); }
      return;
    }
    const targetCode = customCode.trim();
    if (!targetCode) { notify("Masukkan kode baru terlebih dahulu atau pilih Acak Otomatis."); return; }
    if (selectedCode && !(await dialog.confirm(`Ganti kode ${selectedCode.codeDisplay} untuk ${selectedRw}?`, "Ganti kode akses?"))) return;
    setSavingCode(true);
    try {
      const res = await fetch("/api/admin/rw-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedCode?.id, rw: selectedRw, newCode: targetCode, generateNew: false }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan kode.");
      setCodes((current) => [...current.filter((item) => item.id !== data.code.id), data.code]);
      setSelectedCodeId(data.code.id);
      notify(`Kode ${selectedRw} tersimpan: ${data.code.codeDisplay}`);
      setCustomCodeDigits(Array(6).fill(""));
      onRefresh();
    } catch (error) { notify(error instanceof Error ? error.message : "Gagal menyimpan kode."); }
    finally { setSavingCode(false); }
  }

  async function handleRwCodeStatus(code: RwCodeItem) {
    try {
      const res = await fetch("/api/admin/rw-codes", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: code.id, action: "toggle" }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Status kode gagal diperbarui.");
      setCodes((current) => current.map((item) => item.id === code.id ? { ...item, isActive: data.isActive } : item));
      notify(data.isActive ? `Kode ${code.rw} diaktifkan.` : `Kode ${code.rw} dinonaktifkan.`);
      onRefresh();
    } catch (error) { notify(error instanceof Error ? error.message : "Status kode gagal diperbarui."); }
  }

  async function handleDeleteRwCode(code: RwCodeItem) {
    if (!(await dialog.confirm(`Hapus kode ${code.codeDisplay} untuk ${code.rw}? Warga tidak dapat menggunakannya lagi.`, "Hapus kode akses?"))) return;
    try {
      const res = await fetch(`/api/admin/rw-codes?id=${encodeURIComponent(code.id)}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Kode gagal dihapus.");
      setCodes((current) => current.filter((item) => item.id !== code.id));
      if (selectedCodeId === code.id) { setSelectedCodeId(""); setCustomCodeDigits(Array(6).fill("")); }
      notify(`Kode ${code.codeDisplay} dihapus.`);
      onRefresh();
    } catch (error) { notify(error instanceof Error ? error.message : "Kode gagal dihapus."); }
  }

  return (
    <div className="space-y-8 mt-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total Warga" value={stats.totalWarga || 0} icon={Users} iconColor="text-[#14532D]" subLabel="Total login kode akses" />
        <StatCard label="Warga RW 06" value={stats.wargaRw06 || 0} icon={Users} iconColor="text-[#14532D]" subLabel="Login kode akses 06" />
        <StatCard label="Warga RW 07" value={stats.wargaRw07 || 0} icon={Users} iconColor="text-[#14532D]" subLabel="Login kode akses 07" />
        <StatCard label="Warga RW 08" value={stats.wargaRw08 || 0} icon={Users} iconColor="text-[#14532D]" subLabel="Login kode akses 08" />
        <StatCard label="Aktif Minggu Ini" value={stats.activeThisWeek || 0} icon={Users} iconColor="text-[#14532D]" subLabel="Sejak Senin pekan ini" />
        <StatCard label="Kuis Terpopuler" value={stats.mostPlayedGame || "Belum ada"} icon={ShieldAlert} iconColor="text-gray-400" subLabel="Paling sering dimainkan" isText />
      </div>

      {/* Kelola Kode Akses */}
      <section className="rounded-xl border border-[#d8d0c2] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><h3 className="text-lg font-extrabold text-[#183b2d]">Awalan Kode Verifikasi Warga</h3><p className="mt-1 max-w-2xl text-sm leading-6 text-[#625f54]">Awalan ini dipakai saat warga meminta kode akses baru. Mengubahnya tidak mencabut kode lama yang sudah diterbitkan.</p></div>
          <div className="flex items-center gap-2"><label className="sr-only" htmlFor="rw-code-prefix">Awalan alfanumerik, tepat 3 karakter</label><input id="rw-code-prefix" autoCapitalize="characters" maxLength={3} value={codePrefix} onChange={(event) => setCodePrefix(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} placeholder="SAP" className="min-h-11 w-32 rounded-lg border border-[#c9bda7] bg-[#fffdf8] px-3 text-center font-mono font-bold tracking-widest text-[#183b2d] focus:border-[#244b3a] focus:outline-none focus:ring-2 focus:ring-[#244b3a]/20" /><button type="button" onClick={() => void saveCodePrefix()} disabled={savingPrefix || !/^[A-Z0-9]{3}$/.test(codePrefix)} className="min-h-11 rounded-lg bg-[#244b3a] px-4 text-sm font-bold text-white hover:bg-[#183b2d] disabled:opacity-50">{savingPrefix ? "Menyimpan…" : "Simpan awalan"}</button></div>
        </div>
        <p className="mt-2 text-xs text-[#625f54]">Tepat 3 karakter huruf/angka, contoh: K12 atau 99X. Kode lengkap berbentuk AWALAN-RW-RT.</p>
      </section>

      <section className="rounded-xl border border-[#E5E7EB] bg-white p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="text-lg font-extrabold text-gray-900 flex items-center gap-2"><KeyRound className="h-5 w-5 text-[#14532D]" /> Kelola Kode Akses Warga per RW</h3>
            <p className="text-xs text-gray-500 mt-0.5">Kode yang tampil diambil langsung dari database. Kode tanpa tanggal kedaluwarsa berlaku permanen.</p>
          </div>
          <span className="text-xs font-bold bg-green-50 text-[#14532D] px-3 py-1 rounded-full border border-green-200 shrink-0">Format Baku: XXX-XXX</span>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 mb-6">
          {(["RW 06", "RW 07", "RW 08"] as const).map((rwName) => {
            const codesForRw = codes.filter((c) => c.rw === rwName);
            const isSelected = selectedRw === rwName;
            return (
              <section key={rwName} className={`rounded-xl border p-4 ${isSelected ? "border-[#14532D] bg-green-50/40" : "border-[#E5E7EB] bg-gray-50/40"}`}>
                <button type="button" onClick={() => { setSelectedRw(rwName); setSelectedCodeId(""); }} className="flex w-full items-center justify-between text-left">
                  <span className="text-sm font-extrabold uppercase tracking-wider text-gray-700">{rwName}</span>
                  <span className="text-xs font-bold text-[#14532D]">{codesForRw.length} kode</span>
                </button>
                <div className="mt-3 space-y-1.5">
                  {codesForRw.map((code, index) => <div key={code.id} className={`flex min-h-11 items-center gap-2 rounded-md px-2 ${selectedCodeId === code.id ? "bg-white ring-1 ring-[#14532D]" : "hover:bg-white"}`}><button type="button" onClick={() => { setSelectedRw(rwName); setSelectedCodeId(code.id); setCustomCodeDigits(code.codeDisplay.replace("-", "").split("")); }} className="flex min-w-0 flex-1 items-center justify-between gap-2 py-1 text-left"><span className="truncate font-mono text-xs font-extrabold tracking-wider text-[#14532D]">{String(index + 1).padStart(2, "0")} · {code.codeDisplay}</span><span className={`shrink-0 text-[10px] font-bold ${code.isActive ? "text-emerald-700" : "text-slate-500"}`}>{code.isActive ? "Aktif" : "Nonaktif"}</span></button><button type="button" aria-label={`Edit kode ${code.codeDisplay}`} title={`Edit kode ${code.codeDisplay}`} onClick={() => { setSelectedRw(rwName); setSelectedCodeId(code.id); setCustomCodeDigits(code.codeDisplay.replace("-", "").split("")); }} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded p-1.5 text-slate-500 hover:bg-slate-100"><Edit2 className="h-3.5 w-3.5" /></button><button type="button" aria-label={`${code.isActive ? "Nonaktifkan" : "Aktifkan"} kode ${code.codeDisplay}`} title={`${code.isActive ? "Nonaktifkan" : "Aktifkan"} kode ${code.codeDisplay}`} onClick={() => handleRwCodeStatus(code)} className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded p-1.5 ${code.isActive ? "text-amber-700 hover:bg-amber-50" : "text-emerald-700 hover:bg-emerald-50"}`}><Ban className="h-3.5 w-3.5" /></button><button type="button" aria-label={`Hapus kode ${code.codeDisplay}`} title={`Hapus kode ${code.codeDisplay}`} onClick={() => handleDeleteRwCode(code)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded p-1.5 text-red-600 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></button></div>)}
                  {codesForRw.length === 0 && <p className="text-xs text-slate-500">Belum ada kode yang tersimpan.</p>}
                </div>
              </section>
            );
          })}
        </div>

        <div className="rounded-lg border border-[#E5E7EB] bg-gray-50 p-4 sm:p-5">
          <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">{codes.some((code) => code.id === selectedCodeId) ? "Ubah" : "Buat"} kode {selectedRw}</p>
          <div className="grid grid-cols-1 gap-3 items-center sm:grid-cols-12">
            <div className="sm:col-span-4"><SixBoxCodeInput value={customCodeDigits} onChange={setCustomCodeDigits} inputRefs={customCodeRefs} /></div>
            <div className="sm:col-span-4 flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => handleUpdateRwCode(false)} disabled={savingCode || !customCode.trim()} className="min-h-11 rounded-lg bg-[#14532D] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#0F3F22] disabled:opacity-50">Simpan Kode</button>
              <button type="button" onClick={() => handleUpdateRwCode(true)} disabled={savingCode || generatingCode} className="min-h-11 rounded-lg border border-[#14532D] bg-white px-4 py-2.5 text-xs font-bold text-[#14532D] transition hover:bg-green-50">{generatingCode ? "Membuat..." : "Acak Otomatis"}</button>
            </div>
          </div>
        </div>
      </section>

      {/* Daftar Warga */}
      <section className="rounded-xl border border-[#E5E7EB] bg-white p-4 sm:p-6">
        <AdminSectionHeader
          title={<h3 className="flex items-center gap-2 text-lg font-extrabold text-gray-900"><Users className="h-5 w-5 text-[#14532D]" /> Daftar Warga Terdaftar ({registeredTotal})</h3>}
          description="Akun permanen yang dibuat menggunakan Kode Akses warga."
          actions={<AdminToolbar className="w-full sm:w-auto"><select aria-label="Format ekspor warga" value={exportFormat} onChange={(event) => setExportFormat(event.target.value as typeof exportFormat)} className="min-h-11 min-w-0 rounded-lg border border-[#E5E7EB] bg-white px-3 text-xs"><option value="excel">Ekspor Excel (.xlsx)</option><option value="pdf">Ekspor PDF</option><option value="csv">Ekspor CSV</option></select><button type="button" onClick={() => void exportRegisteredWarga()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#14532D] px-4 text-xs font-extrabold text-white hover:bg-[#0f3d21]"><Download className="h-4 w-4" />Unduh</button></AdminToolbar>}
          className="mb-5"
        />

        <AdminToolbar className="sticky top-0 z-10 mb-4 grid grid-cols-1 gap-2 rounded-lg border border-[#e5e7eb] bg-white/95 p-2 shadow-sm sm:grid-cols-4 sm:justify-start">
          <div className="relative min-w-0 sm:col-span-2"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input type="text" value={registeredSearch} onChange={(e) => { setRegisteredSearch(e.target.value); setRegisteredPage(1); }} placeholder="Cari nama warga..." className="min-h-11 w-full rounded-lg border border-[#E5E7EB] py-2 pl-9 pr-3 text-xs focus:border-[#14532D] focus:outline-none" /></div>
          <select aria-label="Filter berdasarkan RW" value={registeredRw} onChange={(e) => { setRegisteredRw(e.target.value); setRegisteredPage(1); }} className="min-h-11 w-full min-w-0 rounded-lg border border-[#E5E7EB] bg-white px-3 text-xs font-semibold"><option value="ALL">Semua RW</option><option value="RW 06">RW 06</option><option value="RW 07">RW 07</option><option value="RW 08">RW 08</option></select>
          <select aria-label="Urutkan warga" value={registeredSort} onChange={(e) => { setRegisteredSort(e.target.value as "newest" | "name"); setRegisteredPage(1); }} className="min-h-11 w-full min-w-0 rounded-lg border border-[#E5E7EB] bg-white px-3 text-xs font-semibold"><option value="newest">Terbaru</option><option value="name">Nama A–Z</option></select>
        </AdminToolbar>

        <ResponsiveTable
          rows={registeredWarga}
          getRowKey={(w) => w.id}
          ariaLabel="Daftar warga terdaftar"
          emptyMessage="Tidak ada warga yang sesuai dengan kriteria pencarian."
          tableMinWidthClassName="min-w-[560px]"
          tableClassName="text-xs text-gray-700"
          columns={[
            { id: "name", label: "Nama", cellClassName: "font-extrabold text-gray-900", render: (w) => w.name },
            { id: "area", label: "Wilayah", render: (w) => <span className="inline-flex rounded border border-green-200 bg-green-50 px-2 py-0.5 text-[11px] font-bold text-[#14532D]">{w.rw}</span> },
            { id: "created", label: "Tanggal Daftar", cellClassName: "text-[11px] text-gray-500", render: (w) => w.createdAt ? new Date(w.createdAt).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "—" },
          ]}
        />

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-600"><label className="flex items-center gap-2">Baris per halaman<select value={registeredPerPage} onChange={(e) => { setRegisteredPerPage(Number(e.target.value)); setRegisteredPage(1); }} className="min-h-10 rounded-md border border-[#E5E7EB] bg-white px-2"><option>10</option><option>20</option><option>50</option></select></label><span>Menampilkan {registeredTotal ? (registeredPage - 1) * registeredPerPage + 1 : 0}-{Math.min(registeredPage * registeredPerPage, registeredTotal)} dari {registeredTotal}</span><div className="flex items-center gap-1"><button type="button" disabled={registeredPage <= 1} onClick={() => setRegisteredPage((value) => value - 1)} className="min-h-10 rounded border border-[#E5E7EB] px-3 font-bold disabled:opacity-40">‹ Prev</button><span className="px-2">{registeredPage} / {Math.max(1, Math.ceil(registeredTotal / registeredPerPage))}</span><button type="button" disabled={registeredPage >= Math.ceil(registeredTotal / registeredPerPage)} onClick={() => setRegisteredPage((value) => value + 1)} className="min-h-10 rounded border border-[#E5E7EB] px-3 font-bold disabled:opacity-40">Next ›</button></div></div>
      </section>

      {editingWarga && <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditingWarga(null); }}><section role="dialog" aria-modal="true" aria-labelledby="edit-warga-title" className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"><h3 id="edit-warga-title" className="text-lg font-extrabold text-gray-900">Ubah nama warga</h3><p className="mt-1 text-sm text-gray-600">Perbarui nama panggilan {editingWarga.namaPanggilan}.</p><label htmlFor="warga-name" className="mt-5 block text-xs font-bold text-gray-700">Nama panggilan baru</label><input id="warga-name" autoFocus value={editedName} onChange={(event) => setEditedName(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-lg border border-[#E5E7EB] px-3 text-sm focus:border-[#14532D] focus:outline-none" /><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setEditingWarga(null)} className="min-h-10 rounded-lg border border-[#E5E7EB] px-4 text-sm font-bold">Batal</button><button type="button" disabled={savingName} onClick={handleRename} className="min-h-10 rounded-lg bg-[#14532D] px-4 text-sm font-bold text-white disabled:opacity-60">{savingName ? "Menyimpan..." : "Konfirmasi"}</button></div></section></div>}

      {showReport && <ReportDownloadDialog type="warga" onClose={() => setShowReport(false)} />}
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
