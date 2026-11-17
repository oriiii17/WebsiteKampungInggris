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
  FileDown,
} from "lucide-react";
import { ClassItem, ClassModule } from "@/lib/types";
import { useAppDialog } from "@/components/AppDialogProvider";

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
    priceIdr: 0, durationDays: 0, moduleIds: [], modules: [], gameTemplateIds: [],
    isPublished: false, createdAt: new Date().toISOString(),
    tingkat: "Pemula", jadwal: "", kodeAkses: "", status: "draft",
  };
}

export default function AdminClassesManager({ notify }: Props) {
  const dialog = useAppDialog();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ClassItem>(emptyClass());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formStep, setFormStep] = useState(0);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [classView, setClassView] = useState<"active" | "drafts">("active");
  const [exportFormat, setExportFormat] = useState<"excel" | "csv">("excel");

  async function loadClasses() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/classes");
      if (res.ok) {
        const data = await res.json();
        setClasses(data.classes || []);
      }
    } catch {}
    finally { setLoading(false); }
  }

  async function exportClasses() {
    try {
      const response = await fetch(`/api/admin/export?type=classes&format=${exportFormat}`);
      if (!response.ok) throw new Error("Ekspor kelas gagal.");
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = response.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] || `daftar-kelas.${exportFormat === "excel" ? "xlsx" : "csv"}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) { notify(error instanceof Error ? error.message : "Ekspor kelas gagal."); }
  }
  useEffect(() => { loadClasses(); }, []);

  function startEdit(c: ClassItem) {
    setEditingId(c.id);
    setFormStep(0);
    setForm({ ...c, modules: [...(c.modules || [])].sort((a,b)=>a.urutan-b.urutan) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function resetForm() {
    setEditingId(null);
    setFormStep(0);
    setForm(emptyClass());
  }

  function addModule() {
    const m = emptyModule(form.id, (form.modules?.length || 0) + 1);
    setForm((f) => ({ ...f, modules: [...(f.modules || []), m] }));
  }
  function removeModule(id: string) {
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
    if (!form.title.trim()) { notify("Gagal: Nama kelas wajib diisi."); return; }
    if (publish && !(await dialog.confirm("Publikasikan kelas ini sekarang? Kelas akan tampil di katalog dan dapat diakses peserta.", "Publikasikan kelas?"))) return;
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
      setEditingId(saved.id);
      setForm({ ...saved, modules: saved.modules || payload.modules });
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
    } catch (e: any) {
      const msg = e?.message || "Gagal menyimpan kelas.";
      notify(`Gagal menyimpan ke database: ${msg}`);
      await dialog.alert(`Gagal menyimpan kelas:\n${msg}`);
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!(await dialog.confirm("Yakin ingin menghapus kelas ini?", "Hapus kelas?"))) return;
    try {
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

  const visibleClasses = classes.filter((item) => classView === "drafts" ? (!item.isPublished || item.status === "draft") : (item.isPublished && item.status !== "draft"));

  return (
    <div className="mt-6 space-y-6 text-[#1A2E1A]">
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-12">
        <form onSubmit={(event) => { event.preventDefault(); handleSave(false); }} className="space-y-5 rounded-xl border border-[#E5E7EB] bg-white p-5 sm:p-6 xl:col-span-7">
          <div className="flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-base font-extrabold text-[#1A2E1A]"><Plus className="h-4 w-4 text-[#14532D]" /> {editingId ? "Edit Kelas" : "Buat Kelas Baru"}</h3>
            {editingId && <button type="button" onClick={resetForm} className="text-xs font-bold text-[#14532D] hover:underline">Buat Baru</button>}
          </div>

          <ol className="grid grid-cols-3 overflow-hidden rounded-lg border border-rule bg-paper-light text-xs font-bold">
            {["Info kelas", "Bab & materi", "Tinjau & simpan"].map((label, index) => <li key={label}><button type="button" onClick={() => index < formStep && setFormStep(index)} disabled={index > formStep} className={`min-h-11 w-full px-2 ${formStep === index ? "bg-leaf text-white" : index < formStep ? "text-leaf" : "text-muted"}`} aria-current={formStep === index ? "step" : undefined}>{String(index + 1).padStart(2,"0")} · {label}</button></li>)}
          </ol>
          <p className="text-sm text-muted">{["Lengkapi informasi utama kelas.", "Susun bab dan unggah materi; perubahan akan otomatis disimpan sebagai draft.", "Tinjau kelas, lalu simpan sebagai draft atau publikasikan." ][formStep]}</p>

          {formStep === 0 && <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#1A2E1A]/75 sm:col-span-2">Nama Kelas *<input required value={form.title} onChange={(e)=>setForm({...form,title:e.target.value})} className="mt-1 min-h-[44px] w-full rounded-md border border-[#E5E7EB] px-3.5 py-2.5 text-sm font-normal" placeholder="Contoh: Kelas Grammar Basic" /></label>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#1A2E1A]/75 sm:col-span-2">Deskripsi<textarea rows={3} value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})} className="mt-1 w-full rounded-md border border-[#E5E7EB] px-3.5 py-2.5 text-sm font-normal" placeholder="Deskripsi singkat kelas..." /></label>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#1A2E1A]/75">Tingkat<select value={form.tingkat||"Pemula"} onChange={(e)=>setForm({...form,tingkat:e.target.value as any})} className="mt-1 min-h-[44px] w-full rounded-md border border-[#E5E7EB] bg-white px-3.5 py-2.5 text-sm font-normal"><option>Pemula</option><option>Menengah</option><option>Lanjutan</option></select></label>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#1A2E1A]/75">Harga (Rp)<input type="number" min={0} step={1000} value={form.priceIdr} onChange={(e)=>setForm({...form,priceIdr:Number(e.target.value)})} className="mt-1 min-h-[44px] w-full rounded-md border border-[#E5E7EB] px-3.5 py-2.5 text-sm font-normal" /><span className="mt-0.5 block text-[10px] font-normal normal-case text-[#1A2E1A]/55">0 = gratis</span></label>
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
                      <button type="button" onClick={()=>moveModule(idx,-1)} disabled={idx===0} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#E5E7EB] bg-white disabled:opacity-40"><ArrowUp className="h-4 w-4" /></button>
                      <button type="button" onClick={()=>moveModule(idx,1)} disabled={idx===(form.modules||[]).length-1} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#E5E7EB] bg-white disabled:opacity-40"><ArrowDown className="h-4 w-4" /></button>
                      <button type="button" onClick={()=>removeModule(m.id)} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#E5E7EB] bg-white text-[#7A1F1F]"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#1A2E1A]/75">Judul Bab/Materi<input value={m.judulBebas} onChange={(e)=>updateModule(m.id,{judulBebas:e.target.value})} className="mt-1 min-h-[44px] w-full rounded-md border border-[#E5E7EB] bg-white px-3.5 py-2.5 text-sm font-normal" placeholder="Contoh: Bab 1 - Sapaan / Pertemuan 2: Speaking" /></label>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#1A2E1A]/75">Deskripsi / Isi Singkat<textarea rows={2} value={m.deskripsi} onChange={(e)=>updateModule(m.id,{deskripsi:e.target.value})} className="mt-1 w-full rounded-md border border-[#E5E7EB] bg-white px-3.5 py-2.5 text-sm font-normal" placeholder="Bab ini membahas apa / ringkasan materi" /></label>
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
            <div className="grid gap-3 text-sm sm:grid-cols-2"><p><span className="text-muted">Nama kelas</span><br/><strong>{form.title || "Belum diisi"}</strong></p><p><span className="text-muted">Tingkat</span><br/><strong>{form.tingkat}</strong></p><p><span className="text-muted">Harga</span><br/><strong>Rp {form.priceIdr.toLocaleString("id-ID")}</strong></p><p><span className="text-muted">Bab/materi</span><br/><strong>{(form.modules || []).length} bab</strong></p></div>
          </div>}

          <div className="flex flex-wrap justify-between gap-2 border-t border-[#E5E7EB] pt-4">
            <button type="button" onClick={() => setFormStep((s) => Math.max(0,s-1))} disabled={formStep===0} className="min-h-11 rounded-md border border-rule px-4 text-sm font-bold disabled:opacity-40">Sebelumnya</button>
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
        </form>

        <div className="space-y-4 xl:col-span-5">
          <div className="flex items-center justify-between">
            <div><h3 className="flex items-center gap-2 text-base font-extrabold text-[#1A2E1A]"><BookOpen className="h-4 w-4 text-[#14532D]" /> {classView === "active" ? "Kelas Aktif" : "Draft Kelas"} ({visibleClasses.length})</h3><div className="mt-2 inline-flex rounded-lg border border-rule bg-paper-light p-1"><button type="button" onClick={() => setClassView("active")} className={`min-h-9 rounded-md px-3 text-xs font-bold ${classView === "active" ? "bg-leaf text-white" : "text-muted"}`}>Aktif</button><button type="button" onClick={() => setClassView("drafts")} className={`min-h-9 rounded-md px-3 text-xs font-bold ${classView === "drafts" ? "bg-leaf text-white" : "text-muted"}`}>Draft</button></div></div>
            <div className="flex items-center gap-2"><select aria-label="Format ekspor kelas" value={exportFormat} onChange={(event) => setExportFormat(event.target.value as "excel" | "csv")} className="min-h-9 rounded-md border border-rule bg-white px-2 text-xs"><option value="excel">Excel (.xlsx)</option><option value="csv">CSV (.csv)</option></select><button type="button" onClick={exportClasses} className="inline-flex min-h-9 items-center gap-1 rounded-md border border-rule px-2.5 text-xs font-bold text-[#14532D] hover:bg-paper-light"><FileDown className="h-3.5 w-3.5"/>Ekspor</button><button type="button" onClick={loadClasses} className="inline-flex min-h-9 items-center gap-1 text-xs font-bold text-[#14532D] hover:underline"><RefreshCw className="h-3.5 w-3.5" /> Segarkan</button></div>
          </div>
          {loading ? (
            <div className="rounded-xl border border-[#E5E7EB] bg-white p-8 text-center text-sm text-[#1A2E1A]/60">Memuat data kelas...</div>
          ) : visibleClasses.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#E5E7EB] bg-white p-8 text-center text-sm text-[#1A2E1A]/60">{classView === "active" ? "Belum ada kelas yang dipublikasikan." : "Draft kelas masih kosong."}</div>
          ) : (
            <div className="space-y-3">
              {visibleClasses.map((cls) => (
                <div key={cls.id} className={`rounded-xl border bg-white p-4 ${editingId===cls.id?"border-[#14532D]":"border-[#E5E7EB]"}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="rounded-md border border-[#E5E7EB] bg-[#FDFBF7] px-2 py-0.5 text-[11px] font-bold text-[#14532D]">{cls.status || "berjalan"}</span>
                        <span className="rounded-md border border-[#E5E7EB] bg-white px-2 py-0.5 text-[11px] font-bold text-[#1A2E1A]">Rp {cls.priceIdr.toLocaleString("id-ID")}</span>
                        <span className="text-[11px] font-bold text-[#1A2E1A]/60">{cls.isPublished ? "Tayang di katalog" : "Belum dipublikasikan"}</span>
                      </div>
                      <h4 className="text-base font-extrabold text-[#1A2E1A]">{cls.title}</h4>
                      {cls.tingkat && <p className="text-xs font-semibold text-[#14532D]">Tingkat {cls.tingkat}</p>}
                      <p className="mt-1 text-xs text-[#1A2E1A]/70 line-clamp-2">{cls.description}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button type="button" onClick={()=>startEdit(cls)} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#E5E7EB] text-[#14532D] hover:bg-[#FDFBF7]" title="Edit"><Pencil className="h-4 w-4" /></button>
                      <Link href={`/kelas/${cls.slug}`} target="_blank" className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#E5E7EB] text-[#1A2E1A] hover:bg-[#FDFBF7]" title="Lihat Publik"><ExternalLink className="h-4 w-4" /></Link>
                      <button type="button" onClick={()=>handleDelete(cls.id)} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#E5E7EB] text-[#7A1F1F] hover:bg-[#FDFBF7]" title="Hapus"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-[#E5E7EB] pt-3 text-xs text-[#1A2E1A]/70">
                    <span>{(cls.modules?.length || cls.moduleIds?.length || 0)} Modul</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
