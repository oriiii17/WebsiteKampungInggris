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
} from "lucide-react";
import { ClassItem, ClassModule } from "@/lib/types";

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
    priceIdr: 0, durationDays: 30, moduleIds: [], modules: [], gameTemplateIds: [],
    isPublished: true, createdAt: new Date().toISOString(),
    tingkat: "Pemula", jadwal: "", kodeAkses: "", status: "draft",
  };
}

export default function AdminClassesManager({ notify }: Props) {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ClassItem>(emptyClass());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});

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
  useEffect(() => { loadClasses(); }, []);

  function startEdit(c: ClassItem) {
    setEditingId(c.id);
    setForm({ ...c, modules: [...(c.modules || [])].sort((a,b)=>a.urutan-b.urutan) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function resetForm() {
    setEditingId(null);
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

  async function uploadFile(modId: string, file: File) {
    if (!editingId) { notify("Simpan kelas terlebih dahulu sebelum mengunggah file modul."); return; }
    setUploading((u) => ({ ...u, [modId]: true }));
    try {
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

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { notify("Nama kelas wajib diisi."); return; }
    setSaving(true);
    try {
      const payload = { ...form, modules: (form.modules || []).map((m, i) => ({ ...m, urutan: i + 1, kelasId: form.id })) };
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch("/api/admin/classes", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan kelas.");
      notify(editingId ? `Kelas "${form.title}" diperbarui.` : `Kelas "${form.title}" dibuat.`);
      // keep editing the saved class so admin can upload files / manage materi
      const saved: ClassItem = data.class || payload;
      setEditingId(saved.id);
      setForm({ ...saved, modules: saved.modules || payload.modules });
      loadClasses();
    } catch (e: any) { notify(e.message || "Gagal menyimpan kelas."); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Yakin ingin menghapus kelas ini?")) return;
    const res = await fetch(`/api/admin/classes?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (res.ok) { notify("Kelas dihapus."); if (editingId === id) resetForm(); loadClasses(); }
  }

  return (
    <div className="mt-6 space-y-6 text-[#1A2E1A]">
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-12">
        <form onSubmit={handleSave} className="space-y-5 rounded-xl border border-[#E5E7EB] bg-white p-5 sm:p-6 xl:col-span-7">
          <div className="flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-base font-extrabold text-[#1A2E1A]"><Plus className="h-4 w-4 text-[#14532D]" /> {editingId ? "Edit Kelas" : "Buat Kelas Baru"}</h3>
            {editingId && <button type="button" onClick={resetForm} className="text-xs font-bold text-[#14532D] hover:underline">Buat Baru</button>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#1A2E1A]/75 sm:col-span-2">Nama Kelas *<input required value={form.title} onChange={(e)=>setForm({...form,title:e.target.value})} className="mt-1 min-h-[44px] w-full rounded-md border border-[#E5E7EB] px-3.5 py-2.5 text-sm font-normal" placeholder="Contoh: Kelas Grammar Basic" /></label>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#1A2E1A]/75 sm:col-span-2">Deskripsi<textarea rows={3} value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})} className="mt-1 w-full rounded-md border border-[#E5E7EB] px-3.5 py-2.5 text-sm font-normal" placeholder="Deskripsi singkat kelas..." /></label>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#1A2E1A]/75">Tingkat<select value={form.tingkat||"Pemula"} onChange={(e)=>setForm({...form,tingkat:e.target.value as any})} className="mt-1 min-h-[44px] w-full rounded-md border border-[#E5E7EB] bg-white px-3.5 py-2.5 text-sm font-normal"><option>Pemula</option><option>Menengah</option><option>Lanjutan</option></select></label>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#1A2E1A]/75">Jadwal<input value={form.jadwal||""} onChange={(e)=>setForm({...form,jadwal:e.target.value})} className="mt-1 min-h-[44px] w-full rounded-md border border-[#E5E7EB] px-3.5 py-2.5 text-sm font-normal" placeholder="Contoh: Senin & Rabu, 19.00" /></label>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#1A2E1A]/75">Harga (Rp)<input type="number" min={0} step={1000} value={form.priceIdr} onChange={(e)=>setForm({...form,priceIdr:Number(e.target.value)})} className="mt-1 min-h-[44px] w-full rounded-md border border-[#E5E7EB] px-3.5 py-2.5 text-sm font-normal" /><span className="mt-0.5 block text-[10px] font-normal normal-case text-[#1A2E1A]/55">0 = gratis</span></label>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#1A2E1A]/75">Durasi Akses (hari)<input type="number" min={1} value={form.durationDays} onChange={(e)=>setForm({...form,durationDays:Number(e.target.value)})} className="mt-1 min-h-[44px] w-full rounded-md border border-[#E5E7EB] px-3.5 py-2.5 text-sm font-normal" /></label>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#1A2E1A]/75">Kode Akses Kelas<input value={form.kodeAkses||""} onChange={(e)=>setForm({...form,kodeAkses:e.target.value})} className="mt-1 min-h-[44px] w-full rounded-md border border-[#E5E7EB] px-3.5 py-2.5 text-sm font-normal" placeholder="Contoh: SAPEN-ABC123" /></label>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#1A2E1A]/75">Status Kelas<select value={form.status||"draft"} onChange={(e)=>setForm({...form,status:e.target.value as any, isPublished: e.target.value!=="draft"})} className="mt-1 min-h-[44px] w-full rounded-md border border-[#E5E7EB] bg-white px-3.5 py-2.5 text-sm font-normal"><option value="draft">Draft</option><option value="berjalan">Berjalan</option><option value="selesai">Selesai</option></select></label>
          </div>

          <div className="border-t border-[#E5E7EB] pt-4">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-extrabold text-[#1A2E1A]">Bab & Materi dalam Kelas ({(form.modules||[]).length})</h4>
              <button type="button" onClick={addModule} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-md border border-[#14532D] bg-white px-3 py-2 text-xs font-bold text-[#14532D] hover:bg-[#FDFBF7]"><Plus className="h-4 w-4" /> Tambah Bab/Materi</button>
            </div>
            <p className="mb-3 text-xs text-[#1A2E1A]/70">Struktur: 1 Kelas memiliki banyak Bab. Setiap Bab dapat berisi materi (Flipbook/PDF/PPT, teks, video/link). Tambah, hapus, dan urutkan Bab/Materi sefleksibel mungkin. Upload file materi di sini. Kuis live dikelola terpisah di menu Host Kuis / Game. Simpan kelas dulu sebelum upload file.</p>
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
                        <label className={`inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-md border border-[#E5E7EB] bg-white px-3 py-2 text-xs font-bold hover:bg-[#FDFBF7] ${uploading[m.id]||!editingId?"opacity-60":""}`}>
                          {uploading[m.id]?<Loader2 className="h-4 w-4 animate-spin"/>:<Upload className="h-4 w-4" />} {uploading[m.id]?"Mengunggah...":"Pilih File"}
                          <input type="file" accept=".pdf,.ppt,.pptx" className="hidden" disabled={uploading[m.id]||!editingId} onChange={(e)=>{const f=e.target.files?.[0]; if(f) uploadFile(m.id,f); e.currentTarget.value="";}} />
                        </label>
                        {(m.fileAsliName || m.filePDF) && <span className="text-[11px] text-[#14532D]">{m.fileAsliName || "File tersimpan"} {m.filePDF?"(PDF siap)":""}</span>}
                      </div>
                      {!editingId && <p className="mt-1 text-[10px] text-[#1A2E1A]/60">Simpan kelas dulu untuk mengaktifkan upload.</p>}
                    </div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#1A2E1A]/75">Status<select value={m.status} onChange={(e)=>updateModule(m.id,{status:e.target.value as any})} className="mt-1 min-h-[40px] w-full rounded-md border border-[#E5E7EB] bg-white px-3.5 py-2 text-sm font-normal"><option value="draft">Draft</option><option value="terbit">Terbit</option></select></label>
                  </div>

                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 border-t border-[#E5E7EB] pt-4">
            <button type="submit" disabled={saving} className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md border border-[#14532D] bg-[#14532D] px-5 py-2.5 text-sm font-extrabold text-white hover:bg-[#0F3F22] disabled:opacity-60">
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Menyimpan...</> : <><Save className="h-4 w-4" /> {editingId ? "Simpan Perubahan Kelas" : "Simpan Kelas (Draft/Berjalan)"}</>}
            </button>
            {editingId && <button type="button" onClick={resetForm} className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm font-bold hover:bg-[#FDFBF7]">Batal Edit</button>}
          </div>
          <p className="text-[11px] text-[#1A2E1A]/65">Kelas berstatus &quot;berjalan&quot; tetap bisa diedit: tambah/hapus/urutkan bab & materi serta upload file kapan saja selama kelas berjalan.</p>
        </form>

        <div className="space-y-4 xl:col-span-5">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-base font-extrabold text-[#1A2E1A]"><BookOpen className="h-4 w-4 text-[#14532D]" /> Daftar Kelas ({classes.length})</h3>
            <button type="button" onClick={loadClasses} className="inline-flex items-center gap-1 text-xs font-bold text-[#14532D] hover:underline"><RefreshCw className="h-3.5 w-3.5" /> Segarkan</button>
          </div>
          {loading ? (
            <div className="rounded-xl border border-[#E5E7EB] bg-white p-8 text-center text-sm text-[#1A2E1A]/60">Memuat data kelas...</div>
          ) : classes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#E5E7EB] bg-white p-8 text-center text-sm text-[#1A2E1A]/60">Belum ada kelas. Buat kelas pertama di formulir.</div>
          ) : (
            <div className="space-y-3">
              {classes.map((cls) => (
                <div key={cls.id} className={`rounded-xl border bg-white p-4 ${editingId===cls.id?"border-[#14532D]":"border-[#E5E7EB]"}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="rounded-md border border-[#E5E7EB] bg-[#FDFBF7] px-2 py-0.5 text-[11px] font-bold text-[#14532D]">{cls.status || "berjalan"}</span>
                        <span className="rounded-md border border-[#E5E7EB] bg-white px-2 py-0.5 text-[11px] font-bold text-[#1A2E1A]">Rp {cls.priceIdr.toLocaleString("id-ID")}</span>
                        <span className="text-[11px] font-bold text-[#1A2E1A]/60">{cls.durationDays} hari</span>
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
                    {cls.kodeAkses && <span>Kode: {cls.kodeAkses}</span>}
                    {cls.jadwal && <span>{cls.jadwal}</span>}
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
