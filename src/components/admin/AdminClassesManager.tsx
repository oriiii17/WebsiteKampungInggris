"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  GraduationCap,
  Loader2,
  Lock,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  Unlock,
  Upload,
  Gamepad2,
  X,
} from "lucide-react";
import { ClassItem, ClassModule } from "@/lib/types";
import { useAppDialog } from "@/components/AppDialogProvider";
import type { GameBlueprint } from "@/lib/game-blueprint";
import CurrencyInput from "@/components/ui/CurrencyInput";
import { formatIDR, MAX_PRICE_IDR } from "@/lib/currency";
import { AdminToolbar } from "@/components/admin/AdminSectionHeader";

interface Props {
  modules?: any[]; // legacy prop (unused in new flow)
  notify: (msg: string) => void;
}

function emptyModule(kelasId: string, urutan: number): ClassModule {
  return { id: `cm-${Date.now()}-${Math.random().toString(36).slice(2,6)}`, kelasId, judulBebas: `Bab ${urutan}`, deskripsi: "", urutan, status: "draft",  };
}
function emptyClass(): ClassItem {
  const id = `class-${Date.now()}`;
  return {
    id, slug: "", title: "", subtitle: "", description: "", coverTheme: "emerald",
    priceIdr: 0, durationDays: 0, moduleIds: [], modules: [], gameTemplateIds: [], gameBlueprintIds: [],
    isPublished: false, createdAt: new Date().toISOString(),
    tingkat: "Pemula", jadwal: "", kodeAkses: "", status: "draft",
  };
}

export default function AdminClassesManager({ notify }: Props) {
  const dialog = useAppDialog();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [publishedGames, setPublishedGames] = useState<GameBlueprint[]>([]);
  const [gamePickerOpen, setGamePickerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ClassItem>(emptyClass());
  const [priceInputValid, setPriceInputValid] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formStep, setFormStep] = useState(0);
  const [editorOpen, setEditorOpen] = useState(false);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [classView, setClassView] = useState<"active" | "drafts">("active");
  const [exportFormat, setExportFormat] = useState<"excel" | "csv" | "pdf">("excel");
  const [classQuery, setClassQuery] = useState("");
  const [classLevel, setClassLevel] = useState("all");

  async function loadClasses() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/classes");
      if (res.ok) {
        const data = await res.json();
        setClasses(data.classes || []);
      }
      const gameResponse = await fetch("/api/admin/game-builder", { cache: "no-store" });
      if (gameResponse.ok) {
        const availableGames = (await gameResponse.json()).games || [];
        setPublishedGames(availableGames.filter((game: GameBlueprint) => game.status === "published" && game.destination === "independent"));
      }
    } catch {}
    finally { setLoading(false); }
  }

  async function exportClasses(format: "excel" | "csv" | "pdf" = exportFormat) {
    try {
      const response = await fetch(`/api/admin/export?type=classes&format=${format}`);
      if (!response.ok) throw new Error("Ekspor kelas gagal.");
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = response.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] || `daftar-kelas.${format === "excel" ? "xlsx" : format}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) { notify(error instanceof Error ? error.message : "Ekspor kelas gagal."); }
  }
  useEffect(() => { loadClasses(); }, []);

  function startEdit(c: ClassItem) {
    setEditorOpen(true);
    setEditingId(c.id);
    setFormStep(0);
    setForm({ ...c, modules: [...(c.modules || [])].sort((a,b)=>a.urutan-b.urutan) });
    setPriceInputValid(Number.isSafeInteger(c.priceIdr) && c.priceIdr >= 0 && c.priceIdr <= MAX_PRICE_IDR);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function resetForm() {
    setEditorOpen(false);
    setEditingId(null);
    setFormStep(0);
    setForm(emptyClass());
    setPriceInputValid(true);
  }

  function addModule() {
    const m = emptyModule(form.id, (form.modules?.length || 0) + 1);
    setForm((f) => ({ ...f, modules: [...(f.modules || []), m] }));
  }
  async function removeModule(id: string) {
    const classModule = (form.modules || []).find((item) => item.id === id);
    if (!classModule || !(await dialog.confirm(`Hapus “${classModule.judulBebas || "materi ini"}” dari kelas? Perubahan berlaku setelah kelas disimpan.`, "Hapus materi?"))) return;
    setForm((f) => ({ ...f, modules: (f.modules || []).filter((m) => m.id !== id).map((m, i) => ({ ...m, urutan: i + 1 })) }));
  }
  function moveModule(idx: number, dir: -1 | 1) {
    setForm((f) => {
      const arr = [...(f.modules || [])];
      const j = idx + dir;
      if (j < 0 || j >= arr.length) return f;
      [arr[idx], arr[j]] = [arr[j], arr[idx]];
      return { ...f, modules: arr.map((m, i) => ({ ...m, urutan: i + 1 })) };
    });
  }
  function updateModule(id: string, patch: Partial<ClassModule>) {
    setForm((f) => ({ ...f, modules: (f.modules || []).map((m) => (m.id === id ? { ...m, ...patch } : m)) }));
  }

  async function saveDraftSnapshot(): Promise<boolean> {
    if (!priceInputValid || !Number.isSafeInteger(form.priceIdr) || form.priceIdr < 0 || form.priceIdr > MAX_PRICE_IDR) { notify(`Harga harus berupa bilangan bulat dari Rp 0 sampai ${formatIDR(MAX_PRICE_IDR)}.`); return false; }
    if (!form.title.trim()) { notify("Isi nama kelas sebelum mengunggah materi."); return false; }
    try {
      const payload = { ...form, status: editingId ? form.status : "draft", isPublished: editingId ? form.isPublished : false, modules: (form.modules || []).map((m, i) => ({ ...m, urutan: i + 1, kelasId: form.id })) };
      const res = await fetch("/api/admin/classes", { method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Gagal menyimpan draft kelas.");
      setEditingId(data.class.id);
      setForm(data.class);
      setClasses(data.classes || []);
      return true;
    } catch (error) {
      notify(error instanceof Error ? error.message : "Gagal menyimpan draft kelas.");
      return false;
    }
  }

  async function uploadFile(modId: string, file: File) {
    setUploading((u) => ({ ...u, [modId]: true }));
    try {
      if (!(await saveDraftSnapshot())) return;
      const fd = new FormData();
      fd.append("classId", form.id);
      fd.append("moduleId", modId);
      fd.append("file", file);
      const res = await fetch("/api/admin/classes/upload-module-file", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal upload.");
      updateModule(modId, { fileAsli: data.storagePath, fileAsliName: data.fileName || file.name, fileType: data.fileType, filePDF: data.pdfPath || (data.fileType === "pdf" ? data.storagePath : undefined) });
      notify("File modul berhasil diunggah.");
    } catch (e: any) { notify(e.message || "Gagal mengunggah file modul."); }
    finally { setUploading((u) => ({ ...u, [modId]: false })); }
  }

  async function handleSave(publish: boolean) {
    if (!priceInputValid || !Number.isSafeInteger(form.priceIdr) || form.priceIdr < 0 || form.priceIdr > MAX_PRICE_IDR) { notify(`Harga harus berupa bilangan bulat dari Rp 0 sampai ${formatIDR(MAX_PRICE_IDR)}.`); setFormStep(0); return; }
    if (!form.title.trim()) { notify("Gagal: Nama kelas wajib diisi."); return; }
    if (publish && !(await dialog.confirm("Publikasikan kelas ini sekarang? Kelas akan tampil di katalog dan dapat diakses peserta.", "Publikasikan kelas?"))) return;
    const isNewClass = !editingId;
    setSaving(true);
    try {
      const payload = { ...form, status: publish ? "berjalan" : "draft", isPublished: publish, durationDays: 0, jadwal: "", kodeAkses: "", modules: (form.modules || []).map((m, i) => ({ ...m, status: publish ? ("terbit" as const) : ("draft" as const), urutan: i + 1, kelasId: form.id })) };
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch("/api/admin/classes", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        const msg = data?.error || `Gagal menyimpan kelas (HTTP ${res.status}).`;
        notify(`Gagal menyimpan ke database: ${msg}`);
        await dialog.alert(`Gagal menyimpan kelas ke database:\n${msg}`);
        return;
      }
      if (!data.verified || !data.class) {
        notify("Peringatan: respons server tidak mengonfirmasi verifikasi simpan. Segarkan dan cek daftar kelas.");
      }
      const saved: ClassItem = data.class || payload;
      if (!isNewClass) {
        setEditingId(saved.id);
        setForm({ ...saved, modules: saved.modules || payload.modules });
      }
      if (Array.isArray(data.classes)) setClasses(data.classes);
      // verifikasi ulang dari DB
      const check = await fetch("/api/admin/classes", { cache: "no-store" }).then(r => r.json()).catch(() => null);
      if (check?.ok && Array.isArray(check.classes)) {
        setClasses(check.classes);
        const found = check.classes.find((c: any) => c.id === saved.id);
        if (!found) {
          notify("Gagal verifikasi: kelas tidak ditemukan di database setelah simpan.");
          await dialog.alert("Kelas tidak ditemukan di database setelah simpan. Periksa koneksi/database.");
          return;
        }
      }
      notify(publish ? `Kelas "${saved.title}" berhasil dipublikasikan.` : `Kelas "${saved.title}" tersimpan di Draft Kelas.`);
      setClassView(publish ? "active" : "drafts");
      await loadClasses();
      if (isNewClass) resetForm();
    } catch (e: any) {
      const msg = e?.message || "Gagal menyimpan kelas.";
      notify(`Gagal menyimpan ke database: ${msg}`);
      await dialog.alert(`Gagal menyimpan kelas:\n${msg}`);
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    try {
      const impactRes = await fetch(`/api/admin/classes?impact=${encodeURIComponent(id)}`, { cache: "no-store" });
      const impactData = await impactRes.json().catch(() => ({}));
      if (!impactRes.ok || !impactData.ok) throw new Error(impactData.error || "Gagal memeriksa sesi dan presensi kelas.");
      const { sessions = 0, attendance = 0 } = impactData.impact || {};
      if (sessions > 0) {
        await dialog.alert(`Kelas ini masih digunakan oleh ${sessions} sesi dan memiliki ${attendance} catatan presensi. Sesi dan presensi harus tetap tersimpan. Pindahkan sesi ke kelas lain sebelum menghapus kelas ini.`, "Kelas masih digunakan");
        return;
      }
      if (!(await dialog.confirm("Kelas ini tidak memiliki sesi atau presensi. Hapus kelas beserta materi dan kuis yang terpasang? Tindakan ini tidak dapat dibatalkan.", "Hapus kelas?"))) return;
      const res = await fetch(`/api/admin/classes?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        const msg = data?.error || `Gagal menghapus kelas (HTTP ${res.status}).`;
        notify(`Gagal menghapus dari database: ${msg}`);
        await dialog.alert(`Gagal menghapus kelas:\n${msg}`);
        return;
      }
      const check = await fetch("/api/admin/classes", { cache: "no-store" }).then(r => r.json()).catch(() => null);
      if (check?.ok && Array.isArray(check.classes)) {
        setClasses(check.classes);
        const still = check.classes.find((c: any) => c.id === id);
        if (still) {
          notify("Gagal verifikasi: kelas masih ada di database setelah hapus.");
          await dialog.alert("Kelas masih ditemukan di database setelah hapus.");
          return;
        }
      }
      if (editingId === id) resetForm();
      notify("Kelas terhapus & terverifikasi hilang dari database.");
      await loadClasses();
    } catch (e: any) {
      const msg = e?.message || "Gagal menghapus kelas.";
      notify(`Gagal menghapus: ${msg}`);
      await dialog.alert(`Gagal menghapus kelas:\n${msg}`);
    }
  }

  const visibleClasses = classes.filter((item) => (classView === "drafts" ? (!item.isPublished || item.status === "draft") : (item.isPublished && item.status !== "draft")) && (!classQuery.trim() || `${item.title} ${item.description}`.toLocaleLowerCase("id-ID").includes(classQuery.trim().toLocaleLowerCase("id-ID"))) && (classLevel === "all" || item.tingkat === classLevel));

  return (
    <div className="mt-6 space-y-6 text-[#1A2E1A]">
      <div className="flex flex-wrap items-center justify-between gap-4"><div className="min-w-0"><h2 className="max-w-full text-xl font-extrabold text-[#183b2d]">Kelas</h2><p className="mt-2 text-sm text-muted">Atur kelas, bab, materi, dan latihan mandiri.</p></div><button type="button" onClick={() => { resetForm(); setEditorOpen(true); }} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg bg-[#244b3a] px-4 text-sm font-bold text-white hover:bg-[#183b2d]"><Plus className="h-4 w-4" />Buat Kelas Baru</button></div>
      <div className="grid grid-cols-1 items-start gap-6">
        {editorOpen && <form onSubmit={(event) => { event.preventDefault(); handleSave(false); }} className="mx-auto w-full max-w-3xl space-y-5 rounded-xl border border-[#E5E7EB] bg-white p-5 pb-28 sm:p-6 sm:pb-28 md:pb-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-base font-extrabold text-[#1A2E1A]"><Plus className="h-4 w-4 text-[#14532D]" /> {editingId ? "Edit Kelas" : "Buat Kelas Baru"}</h3>
            {editingId && <button type="button" onClick={resetForm} className="text-xs font-bold text-[#14532D] hover:underline">Buat Baru</button>}
            <button type="button" onClick={resetForm} className="ml-auto min-h-11 px-3 text-sm font-bold text-[#244b3a] underline">Kembali ke Daftar Kelas</button>
          </div>

          <ol className="grid grid-cols-3 overflow-hidden rounded-lg border border-rule bg-paper-light text-xs font-bold">
            {["Info kelas", "Bab & materi", "Tinjau & simpan"].map((label, index) => <li key={label}><button type="button" onClick={() => index < formStep && setFormStep(index)} disabled={index > formStep} className={`min-h-11 w-full px-2 ${formStep === index ? "bg-leaf text-white" : index < formStep ? "text-leaf" : "text-muted"}`} aria-current={formStep === index ? "step" : undefined}>{String(index + 1).padStart(2,"0")} · {label}</button></li>)}
          </ol>
          <p className="text-sm text-muted">{["Lengkapi informasi utama kelas.", "Susun bab dan unggah materi; perubahan akan otomatis disimpan sebagai draft.", "Tinjau kelas, lalu simpan sebagai draft atau publikasikan." ][formStep]}</p>

          {formStep === 0 && <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#1A2E1A]/75 sm:col-span-2">Judul Kelas *<input required value={form.title} onChange={(e)=>setForm({...form,title:e.target.value})} className="mt-1 min-h-[44px] w-full rounded-md border border-[#E5E7EB] px-3.5 py-2.5 text-sm font-normal" placeholder="Contoh: Kelas Grammar Basic" /></label>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#1A2E1A]/75 sm:col-span-2">Subjudul <span className="font-normal normal-case text-muted">(opsional)</span><input value={form.subtitle || ""} onChange={(e)=>setForm({...form,subtitle:e.target.value})} className="mt-1 min-h-[44px] w-full rounded-md border border-[#E5E7EB] px-3.5 py-2.5 text-sm font-normal normal-case tracking-normal" placeholder="Contoh: Materi praktis untuk percakapan sehari-hari" /></label>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#1A2E1A]/75 sm:col-span-2">Deskripsi<textarea rows={3} value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})} className="mt-1 w-full rounded-md border border-[#E5E7EB] px-3.5 py-2.5 text-sm font-normal" placeholder="Deskripsi singkat kelas..." /></label>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#1A2E1A]/75">Tingkat<select value={form.tingkat||"Pemula"} onChange={(e)=>setForm({...form,tingkat:e.target.value as any})} className="mt-1 min-h-[44px] w-full rounded-md border border-[#E5E7EB] bg-white px-3.5 py-2.5 text-sm font-normal"><option>Pemula</option><option>Menengah</option><option>Lanjutan</option></select></label>
            <CurrencyInput label="Harga kelas" value={form.priceIdr} onChange={(priceIdr) => setForm((current) => ({ ...current, priceIdr }))} onValidityChange={setPriceInputValid} />
            <fieldset className="sm:col-span-2"><legend className="text-xs font-bold uppercase tracking-wider text-[#1A2E1A]/75">Latihan mandiri kelas</legend><p className="mt-1 text-xs font-normal normal-case text-muted">Pilih kuis Latihan Mandiri yang sudah diterbitkan. Kuis Sesi dan draft tidak tersedia di sini.</p><div className="mt-3 flex flex-wrap items-center gap-3"><button type="button" onClick={() => setGamePickerOpen(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#244b3a] px-4 text-sm font-bold text-white transition hover:bg-[#183b2d]"><Gamepad2 className="h-4 w-4" />Pilih latihan</button><span className="text-sm font-semibold text-[#514b3e]">{(form.gameBlueprintIds || []).filter((id) => publishedGames.some((game) => game.id === id)).length} kuis dipilih</span></div></fieldset>
          </div>}

          {formStep === 1 && <div className="border-t border-[#E5E7EB] pt-4">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-extrabold text-[#1A2E1A]">Bab & Materi dalam Kelas ({(form.modules||[]).length})</h4>
              <button type="button" onClick={addModule} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-md border border-[#14532D] bg-white px-3 py-2 text-xs font-bold text-[#14532D] hover:bg-[#FDFBF7]"><Plus className="h-4 w-4" /> Tambah Bab/Materi</button>
            </div>
            <p className="mb-3 text-xs text-[#1A2E1A]/70">Tambahkan bab, susun urutannya, lalu unggah materi PDF atau PPT. Kelas akan disimpan sebagai draft saat materi diunggah; peserta belum dapat melihatnya sampai kelas dipublikasikan.</p>
            <div className="space-y-4">
              {(form.modules||[]).map((m, idx) => (
                <div key={m.id} className="rounded-xl border border-[#E5E7EB] bg-[#FDFBF7] p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-extrabold text-[#14532D]">Bab {idx + 1}</span>
                    <div className="flex items-center gap-1">
                      <button type="button" aria-label={`Pindahkan Bab ${idx + 1} ke atas`} title={`Pindahkan Bab ${idx + 1} ke atas`} onClick={()=>moveModule(idx,-1)} disabled={idx===0} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-[#E5E7EB] bg-white disabled:opacity-40"><ArrowUp className="h-4 w-4" /></button>
                      <button type="button" aria-label={`Pindahkan Bab ${idx + 1} ke bawah`} title={`Pindahkan Bab ${idx + 1} ke bawah`} onClick={()=>moveModule(idx,1)} disabled={idx===(form.modules||[]).length-1} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-[#E5E7EB] bg-white disabled:opacity-40"><ArrowDown className="h-4 w-4" /></button>
                      <button type="button" aria-label={`Hapus Bab ${idx + 1}`} title={`Hapus Bab ${idx + 1}`} onClick={()=>removeModule(m.id)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-[#a23b27]/30 bg-[#fff2ec] text-[#a23b27] hover:bg-[#f9e1d8]"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#1A2E1A]/75">Judul bab atau materi<input value={m.judulBebas} onChange={(e)=>updateModule(m.id,{judulBebas:e.target.value})} className="mt-1 min-h-[44px] w-full rounded-md border border-[#E5E7EB] bg-white px-3.5 py-2.5 text-sm font-normal" placeholder="Contoh: Bab 1 — Sapaan" /></label>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#1A2E1A]/75">Ringkasan materi<textarea rows={2} value={m.deskripsi} onChange={(e)=>updateModule(m.id,{deskripsi:e.target.value})} className="mt-1 w-full rounded-md border border-[#E5E7EB] bg-white px-3.5 py-2.5 text-sm font-normal" placeholder="Tuliskan ringkasan materi bab ini." /></label>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#1A2E1A]/75">Upload Materi (PDF/PPT/PPTX/Flipbook)</label>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <label className={`inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-md border border-[#E5E7EB] bg-white px-3 py-2 text-xs font-bold hover:bg-[#FDFBF7] ${uploading[m.id]?"opacity-60":""}`}>
                          {uploading[m.id]?<Loader2 className="h-4 w-4 animate-spin"/>:<Upload className="h-4 w-4" />} {uploading[m.id]?"Mengunggah...":"Pilih File"}
                          <input type="file" accept=".pdf,.ppt,.pptx" className="hidden" disabled={uploading[m.id]} onChange={(e)=>{const f=e.target.files?.[0]; if(f) uploadFile(m.id,f); e.currentTarget.value="";}} />
                        </label>
                        {(m.fileAsliName || m.filePDF) && <span className="text-[11px] text-[#14532D]">{m.fileAsliName || "File tersimpan"} {m.filePDF?"(PDF siap)":""}</span>}
                      </div>
                    </div>
                    <div className="flex items-end text-xs text-muted">Materi akan ikut status publikasi kelas.</div>
                  </div>

                </div>
              ))}
            </div>
          </div>}

          {formStep === 2 && <div className="space-y-4 rounded-lg border border-rule bg-paper-light p-5">
            <h4 className="text-lg font-extrabold">Tinjau kelas</h4>
            <div className="grid gap-3 text-sm sm:grid-cols-2"><p><span className="text-muted">Judul kelas</span><br/><strong>{form.title || "Belum diisi"}</strong></p>{form.subtitle && <p><span className="text-muted">Subjudul</span><br/><strong>{form.subtitle}</strong></p>}<p><span className="text-muted">Tingkat</span><br/><strong>{form.tingkat}</strong></p><p><span className="text-muted">Harga</span><br/><strong>{formatIDR(form.priceIdr)}</strong></p><p><span className="text-muted">Bab/materi</span><br/><strong>{(form.modules || []).length} bab</strong></p></div>
          </div>}

          {gamePickerOpen && <div role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setGamePickerOpen(false); }} className="fixed inset-0 z-[120] grid place-items-center bg-[#13271f]/60 p-3 sm:p-6"><section role="dialog" aria-modal="true" aria-labelledby="class-independent-games-title" className="flex max-h-[min(88dvh,680px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[#c9bda7] bg-[#fdf9f0] shadow-2xl"><header className="flex items-start justify-between gap-4 border-b border-[#e2d8c7] p-5 sm:p-6"><div><h3 id="class-independent-games-title" className="text-xl font-bold text-[#183b2d]">Pilih latihan mandiri</h3><p className="mt-1 text-sm leading-6 text-[#514b3e]">Hanya kuis terbit dengan kategori Latihan Mandiri yang bisa dipasang ke kelas.</p></div><button type="button" aria-label="Tutup pemilih latihan" onClick={() => setGamePickerOpen(false)} className="grid min-h-11 min-w-11 shrink-0 place-items-center rounded-lg border border-[#b8aa8e] bg-white text-[#244b3a] hover:bg-[#e8eee5]"><X className="h-4 w-4" /></button></header><div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">{publishedGames.length ? <ul className="space-y-2">{publishedGames.map((game) => <li key={game.id}><label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-[#c9bda7] bg-white px-4 py-3 text-sm font-semibold text-[#183b2d] transition hover:border-[#244b3a] hover:bg-[#f5f5ed]"><input type="checkbox" checked={(form.gameBlueprintIds || []).includes(game.id)} onChange={(event) => setForm((current) => ({ ...current, gameBlueprintIds: event.target.checked ? [...new Set([...(current.gameBlueprintIds || []), game.id])] : (current.gameBlueprintIds || []).filter((id) => id !== game.id) }))} className="h-4 w-4 accent-[#244b3a]" /><span className="min-w-0 flex-1">{game.title}<span className="mt-1 block text-xs font-normal text-[#514b3e]">{game.topic} · {game.level} · {game.items.length} soal</span></span><span className="rounded-full bg-[#e6eadf] px-2.5 py-1 text-xs font-bold text-[#183b2d]">Terbit</span></label></li>)}</ul> : <div className="rounded-xl border border-dashed border-[#b8aa8e] bg-white px-5 py-8 text-center"><Gamepad2 className="mx-auto h-8 w-8 text-[#244b3a]" /><p className="mt-3 font-bold text-[#183b2d]">Belum ada latihan mandiri terbit</p><p className="mt-1 text-sm leading-6 text-[#514b3e]">Terbitkan kuis dengan tujuan Latihan Mandiri di Kelola Kuis, lalu pilih di sini.</p></div>}</div><footer className="flex items-center justify-between gap-3 border-t border-[#e2d8c7] bg-white/60 p-4"><span className="text-sm font-semibold text-[#514b3e]">{(form.gameBlueprintIds || []).filter((id) => publishedGames.some((game) => game.id === id)).length} dipilih</span><button type="button" onClick={() => setGamePickerOpen(false)} className="min-h-11 rounded-lg bg-[#244b3a] px-5 text-sm font-bold text-white transition hover:bg-[#183b2d]">Selesai</button></footer></section></div>}

          <div className="fixed inset-x-0 bottom-0 z-30 flex flex-wrap justify-between gap-2 border-t border-[#d8d0c2] bg-[#fffdf8] px-4 pt-3 pb-[calc(.75rem+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(26,46,26,.12)] md:static md:z-auto md:border-t md:bg-transparent md:px-0 md:py-0 md:pt-4 md:shadow-none">
            <p className="w-full text-center text-xs font-bold text-[#514b3e] md:hidden" aria-live="polite">Langkah {formStep + 1} dari 3</p>
            {formStep > 0 && <button type="button" onClick={() => setFormStep((s) => Math.max(0,s-1))} className="min-h-11 rounded-md border border-rule px-4 text-sm font-bold">Sebelumnya</button>}
            {formStep < 2 ? <button type="button" onClick={() => { if(formStep===0 && !form.title.trim()){notify("Isi nama kelas sebelum lanjut.");return;} setFormStep((s)=>Math.min(2,s+1)); }} className="min-h-11 rounded-md bg-leaf px-5 text-sm font-extrabold text-white">Lanjut</button> : <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => handleSave(false)} disabled={saving} className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md border border-rule-strong bg-paper-light px-4 py-2.5 text-sm font-extrabold text-leaf disabled:opacity-60">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Simpan ke Draft
            </button>
            <button type="button" onClick={() => handleSave(true)} disabled={saving} className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md border border-[#14532D] bg-[#14532D] px-5 py-2.5 text-sm font-extrabold text-white hover:bg-[#0F3F22] disabled:opacity-60">
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Menyimpan...</> : <><Save className="h-4 w-4" /> Publikasi</>}
            </button>
            {editingId && <button type="button" onClick={resetForm} className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm font-bold hover:bg-[#FDFBF7]">Batal Edit</button>}
            </div>}
          </div>
        </form>}

        {!editorOpen && <div className="space-y-4">
          <div className="flex flex-col gap-3">
            <h2 className="text-base font-extrabold text-[#1A2E1A]">{classView === "active" ? "Kelas Aktif" : "Draft Kelas"} ({visibleClasses.length})</h2>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div role="group" aria-label="Filter status kelas" className="grid w-full grid-cols-2 rounded-lg border border-rule bg-paper-light p-1 sm:w-auto"><button type="button" aria-pressed={classView === "active"} onClick={() => setClassView("active")} className={`min-h-11 rounded-md px-3 text-xs font-bold ${classView === "active" ? "bg-leaf text-white" : "text-muted"}`}>Aktif</button><button type="button" aria-pressed={classView === "drafts"} onClick={() => setClassView("drafts")} className={`min-h-11 rounded-md px-3 text-xs font-bold ${classView === "drafts" ? "bg-leaf text-white" : "text-muted"}`}>Draft</button></div>
              <AdminToolbar className="w-full sm:w-auto"><details className="relative col-span-2 sm:col-span-1"><summary className="inline-flex min-h-11 w-full cursor-pointer list-none items-center justify-center rounded-lg border border-rule bg-white px-4 text-sm font-bold text-[#14532D] sm:w-auto">Aksi</summary><div className="absolute right-0 z-20 mt-1 grid min-w-52 rounded-lg border border-rule bg-white p-1 shadow-lg">{([["excel", "Ekspor Excel (.xlsx)"], ["pdf", "Ekspor PDF"], ["csv", "Ekspor CSV"]] as const).map(([format, label]) => <button key={format} type="button" onClick={() => { setExportFormat(format); void exportClasses(format); }} className="min-h-11 rounded-md px-3 text-left text-sm font-semibold text-[#14532D] hover:bg-paper-light">{label}</button>)}</div></details><button type="button" onClick={loadClasses} className="col-span-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-rule bg-white px-4 text-sm font-bold text-[#14532D] hover:bg-paper-light sm:col-span-1"><RefreshCw className="h-4 w-4"/>Segarkan</button></AdminToolbar>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_13rem]"><label className="block text-xs font-bold text-[#514b3e]">Cari kelas<input value={classQuery} onChange={(event) => setClassQuery(event.target.value)} placeholder="Cari judul kelas" className="mt-1 min-h-11 w-full rounded-lg border border-rule bg-white px-3 text-sm" /></label><label className="block text-xs font-bold text-[#514b3e]">Tingkat<select value={classLevel} onChange={(event) => setClassLevel(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-rule bg-white px-3 text-sm"><option value="all">Semua tingkat</option><option>Pemula</option><option>Menengah</option><option value="Lanjutan">Mahir</option></select></label></div>
          {loading ? (
            <div className="rounded-xl border border-[#E5E7EB] bg-white p-8 text-center text-sm text-[#1A2E1A]/60">Memuat data kelas...</div>
          ) : visibleClasses.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#E5E7EB] bg-white p-8 text-center text-sm text-[#1A2E1A]/60">{classView === "active" ? "Belum ada kelas yang dipublikasikan." : "Draft kelas masih kosong."}</div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visibleClasses.map((cls) => (
                <div key={cls.id} className={`flex min-w-0 flex-col rounded-xl border bg-white p-4 ${editingId===cls.id?"border-[#14532D]":"border-[#E5E7EB]"}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="rounded-md border border-[#E5E7EB] bg-[#FDFBF7] px-2 py-0.5 text-[11px] font-bold text-[#14532D]">{cls.status || "berjalan"}</span>
                        <span className="rounded-md border border-[#E5E7EB] bg-white px-2 py-0.5 text-[11px] font-bold text-[#1A2E1A]">{cls.priceIdr ? formatIDR(cls.priceIdr) : "Gratis"}</span>
                        <span className="rounded-full bg-[#e6eadf] px-2 py-1 text-[11px] font-bold text-[#244b3a]">{cls.isPublished ? "Terbit" : "Draft"}</span>
                      </div>
                      <h4 className="text-base font-extrabold text-[#1A2E1A]">{cls.title}</h4>
                      {cls.tingkat && <p className="text-xs font-semibold text-[#14532D]">Tingkat {cls.tingkat}</p>}
                      <p className="mt-1 text-xs text-[#1A2E1A]/70 line-clamp-2">{cls.description}</p>
                    </div>
                    <div className="mt-auto flex shrink-0 flex-wrap items-center justify-end gap-1.5 pt-3">
                      {cls.isPublished && <Link href={`/sesi/kelola?classId=${encodeURIComponent(cls.id)}`} className="inline-flex min-h-11 items-center gap-1.5 rounded-md bg-[#244b3a] px-3 text-xs font-bold text-white hover:bg-[#183b2d]"><Plus className="h-3.5 w-3.5" />Buat sesi</Link>}
                      <button type="button" onClick={()=>startEdit(cls)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-[#E5E7EB] text-[#14532D] hover:bg-[#FDFBF7]" title={`Edit kelas ${cls.title}`} aria-label={`Edit kelas ${cls.title}`}><Pencil className="h-4 w-4" /></button>
                      <Link href={`/kelas/${cls.slug}`} target="_blank" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-[#E5E7EB] text-[#1A2E1A] hover:bg-[#FDFBF7]" title={`Lihat kelas ${cls.title}`} aria-label={`Lihat kelas ${cls.title}`}><ExternalLink className="h-4 w-4" /></Link>
                      <button type="button" onClick={()=>handleDelete(cls.id)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-[#E5E7EB] bg-[#fff2ec] text-[#7A1F1F] hover:bg-[#f9e1d8]" title={`Hapus kelas ${cls.title}`} aria-label={`Hapus kelas ${cls.title}`}><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-[#E5E7EB] pt-3 text-xs text-[#1A2E1A]/70">
                    <span>{(cls.modules?.length ? cls.modules.filter((module) => module.status === "terbit").length : cls.moduleIds?.length || 0)} Bab</span>
                    <span>{(cls.gameBlueprintIds || []).length} Latihan Mandiri</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>}
      </div>
    </div>
  );
}
