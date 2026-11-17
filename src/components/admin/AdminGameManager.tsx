"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Save, ImagePlus, ChevronUp, ChevronDown, Loader2 } from "lucide-react";
import type { GameKind, GameQuestion, GameRecord } from "@/lib/types";
import { emptyQuestion } from "@/lib/builtin-games";

const KIND_LABEL: Record<GameKind,string> = {
  kuis_live: "Kuis Live",
  tebak_kata: "Tebak Kata",
  pasangkan_kata: "Pasangkan Kata",
  susun_kalimat: "Susun Kalimat",
  tebak_gambar: "Tebak Gambar",
  kata_hilang: "Kata Hilang",
  duel_kata_cepat: "Duel Kata Cepat",
};
const KIND_GUIDE: Record<GameKind, string> = {
  kuis_live: "Peserta memilih jawaban dari beberapa opsi.",
  tebak_kata: "Peserta mengetik jawaban dengan bantuan petunjuk.",
  pasangkan_kata: "Peserta mencocokkan setiap istilah dengan pasangannya.",
  susun_kalimat: "Peserta menyusun potongan kata menjadi kalimat utuh.",
  tebak_gambar: "Gunakan gambar sebagai petunjuk; jawaban bisa diketik atau dipilih.",
  kata_hilang: "Peserta mengisi bagian kosong pada kalimat.",
  duel_kata_cepat: "Peserta mengetik jawaban secepat mungkin dalam batas waktu.",
};
const PROMPT_LABEL: Record<GameKind, string> = {
  kuis_live: "Pertanyaan",
  tebak_kata: "Kata atau arti yang harus ditebak",
  pasangkan_kata: "Instruksi mencocokkan",
  susun_kalimat: "Instruksi menyusun kalimat",
  tebak_gambar: "Pertanyaan tentang gambar",
  kata_hilang: "Petunjuk kalimat",
  duel_kata_cepat: "Tantangan cepat",
};
const TIMES = [5,10,20,30,60];
function uid(p="id"){return `${p}-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;}

export default function AdminGameManager({ notify }: { notify: (m:string)=>void }) {
  const [games, setGames] = useState<GameRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string|null>(null);
  const [qIndex, setQIndex] = useState(0);
  const [tab, setTab] = useState<"games" | "questions">("games");
  const [dirty, setDirty] = useState(false);
  const [pendingDestination, setPendingDestination] = useState<"games" | string | null>(null);

  async function load(selectId?: string) {
    setLoading(true);
    try {
      const res = await fetch(selectId ? `/api/admin/games?gameId=${encodeURIComponent(selectId)}` : "/api/admin/games");
      const data = await res.json();
      if (selectId && data.game) {
        setGames((current) => current.map((game) => game.id === selectId ? data.game : game));
        setSelectedId(selectId);
      } else {
        const list: GameRecord[] = data.games || [];
        setGames(list);
        if (selectedId) setSelectedId(selectedId);
      }
    } catch {}
    setLoading(false);
  }
  useEffect(()=>{ load(); },[]);

  const selected = useMemo(()=> games.find(g=>g.id===selectedId) || null, [games, selectedId]);
  const q = selected?.questions?.[qIndex] as GameQuestion | undefined;
  const [mediaPreviewError, setMediaPreviewError] = useState(false);
  useEffect(() => setMediaPreviewError(false), [q?.mediaUrl]);

  function updateSelected(mut: (g: GameRecord)=>GameRecord, markDirty = true) {
    if (!selected) return;
    setGames(gs => gs.map(g => g.id===selected.id ? mut(JSON.parse(JSON.stringify(g))) : g));
    if (markDirty) setDirty(true);
  }
  function updateQuestion(mut: (qq: any)=>any) {
    if (!selected) return;
    updateSelected(g => { g.questions[qIndex] = mut(g.questions[qIndex]); g.updatedAt = new Date().toISOString(); return g; });
  }

  async function saveGame() {
    if (!selected) return;
    const ids = selected.questions.map((question) => question.id);
    if (new Set(ids).size !== ids.length) { notify("ID soal duplikat terdeteksi. Muat ulang game lalu coba lagi."); return; }
    const orders = selected.questions.map((_, index) => index + 1);
    if (new Set(orders).size !== orders.length) { notify("Urutan soal duplikat terdeteksi."); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/games", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ action:"upsert", game: selected }) });
      const data = await res.json();
      if (!res.ok) { notify(data.error||"Gagal menyimpan."); return; }
      notify("Soal game tersimpan.");
      setDirty(false);
      await load(selected.id);
    } catch { notify("Gagal menyimpan soal. Perubahan tetap tersimpan di formulir."); }
    finally { setSaving(false); }
  }

  function switchToGames() {
    if (dirty) { setPendingDestination("games"); return; }
    setTab("games");
  }

  async function selectGame(id: string) {
    if (id === selectedId && tab === "questions") return;
    if (dirty) { setPendingDestination(id); return; }
    await load(id);
    setQIndex(0);
    setTab("questions");
  }

  async function confirmDestination() {
    const destination = pendingDestination;
    setPendingDestination(null);
    setDirty(false);
    if (destination === "games") {
      if (selectedId) await load(selectedId);
      setTab("games");
    } else if (destination) {
      await load(destination);
      setQIndex(0);
      setTab("questions");
    }
  }

  function addQuestion() {
    if (!selected) return;
    const nq = emptyQuestion(selected.kind, uid("q"));
    updateSelected(g => { g.questions.push(nq as any); g.updatedAt=new Date().toISOString(); return g; }, false);
    setQIndex((selected.questions||[]).length);
  }
  function removeQuestion(i: number) {
    if (!selected) return;
    if ((selected.questions||[]).length <= 1) { notify("Minimal 1 soal."); return; }
    updateSelected(g => { g.questions.splice(i,1); g.updatedAt=new Date().toISOString(); return g; });
    setQIndex(Math.max(0, i-1));
  }
  function moveQuestion(i:number, dir:-1|1){
    if(!selected) return; const j=i+dir; if(j<0||j>=selected.questions.length) return;
    updateSelected(g=>{ const a=g.questions; [a[i],a[j]]=[a[j],a[i]]; return g; }); setQIndex(j);
  }
  function applyTimeAll(sec:number){ if(!selected) return; updateSelected(g=>{ g.questions=g.questions.map(x=>({...x, timeLimitSec:sec} as any)); return g; }); notify(`Batas waktu ${sec} detik diterapkan ke semua soal.`); }

  async function uploadMedia(file: File) {
    if (!selected || !q) return;
    if (file.size > 5 * 1024 * 1024) { notify("Ukuran gambar maksimal 5 MB."); return; }
    const fd = new FormData(); fd.append("file", file); fd.append("gameId", selected.id); fd.append("questionId", q.id);
    try {
      const res = await fetch("/api/admin/games/media", { method:"POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengunggah media.");
      updateQuestion(qq=>({ ...qq, mediaUrl: data.url }));
      notify("Gambar soal berhasil diunggah.");
    } catch (error) { notify(error instanceof Error ? error.message : "Gagal mengunggah gambar."); }
  }

  async function removeMedia() {
    if (!selected || !q?.mediaUrl) return;
    try {
      const mediaUrl = q.mediaUrl;
      const updatedGame: GameRecord = {
        ...selected,
        questions: selected.questions.map((question) => question.id === q.id ? { ...question, mediaUrl: undefined } as GameQuestion : question),
        updatedAt: new Date().toISOString(),
      };
      const saveRes = await fetch("/api/admin/games", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ game: updatedGame }) });
      const saveData = await saveRes.json();
      if (!saveRes.ok) throw new Error(saveData.error || "Gagal menyimpan penghapusan gambar.");
      setGames((current) => current.map((game) => game.id === updatedGame.id ? saveData.game : game));
      setDirty(false);
      const res = await fetch("/api/admin/games/media", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: q.mediaUrl }) });
      const data = await res.json();
      if (!res.ok) throw new Error(`Soal sudah diperbarui, tetapi objek media belum terhapus: ${data.error || "Gagal menghapus gambar."}`);
      notify("Gambar soal dan file di Storage dihapus.");
    } catch (error) { notify(error instanceof Error ? error.message : "Gagal menghapus gambar."); }
  }

  if (loading) return <div className="p-8 text-sm text-gray-500 flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin"/>Memuat game...</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-[#1A2E1A]">Kelola Game</h2>
          <p className="text-xs text-[#1A2E1A]/70">Pilih game terlebih dahulu, lalu atur soal pada langkah berikutnya.</p>
        </div>
        <div className="flex gap-2">
          {selected && <button type="button" onClick={saveGame} disabled={saving || !dirty} className="inline-flex min-h-[40px] items-center gap-2 rounded-md border border-[#14532D] bg-white px-4 py-2 text-xs font-extrabold text-[#14532D] disabled:opacity-60">{saving?<Loader2 className="h-4 w-4 animate-spin"/>:<Save className="h-4 w-4"/>}Simpan Soal</button>}
        </div>
      </div>

      <div className="flex gap-2 border-b border-rule"><button type="button" onClick={switchToGames} className={`min-h-11 border-b-2 px-4 text-sm font-bold ${tab === "games" ? "border-leaf text-leaf" : "border-transparent text-muted"}`}>1. Memilih Game</button><button type="button" onClick={()=>selected && setTab("questions")} disabled={!selected} aria-disabled={!selected} className={`min-h-11 border-b-2 px-4 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-45 ${tab === "questions" ? "border-leaf text-leaf" : "border-transparent text-muted"}`}>2. Soal Game{!selected && " · Terkunci"}</button></div>

      {tab === "games" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {games.length === 0 ? <div className="rounded-xl border border-dashed border-rule bg-paper-light p-8 text-sm text-muted">Master game belum tersedia. Jalankan migrasi database untuk mengisinya.</div> : games.map((game) => <article key={game.id} className={`flex min-w-0 flex-col rounded-xl border bg-white p-5 transition-shadow hover:shadow-md ${selectedId === game.id ? "border-leaf shadow-sm" : "border-rule"}`}><button type="button" onClick={() => selectGame(game.id)} className="w-full min-w-0 flex-1 text-left"><span className="inline-flex rounded-full bg-[#edf3ef] px-3 py-1 text-xs font-bold text-[#1A3C34]">{KIND_LABEL[game.kind]}</span><h3 className="mt-3 break-words text-lg font-extrabold leading-snug text-ink">{game.title}</h3><p className="mt-2 text-sm leading-6 text-body">{game.description?.trim() || KIND_GUIDE[game.kind]}</p><p className="mt-3 text-sm leading-6 text-muted">{KIND_GUIDE[game.kind]}</p></button><button type="button" onClick={() => selectGame(game.id)} className="mt-5 min-h-11 w-full rounded-lg bg-leaf px-4 text-sm font-bold text-white">Atur soal {KIND_LABEL[game.kind]}</button></article>)}
        </div>
      )}

      {tab === "questions" && (
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 min-h-[60vh]">
          {!selected ? (
            <div className="text-sm text-gray-500">Pilih game master untuk mengelola soalnya.</div>
          ) : !q ? (
            <div className="rounded-lg border border-dashed border-rule bg-paper-light p-8 text-center text-sm text-muted">Belum ada soal, isi soal pertama.<div className="mt-4"><button type="button" onClick={addQuestion} className="min-h-11 rounded-md bg-leaf px-4 text-sm font-bold text-white">Isi soal pertama · {KIND_LABEL[selected.kind]}</button></div></div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
              {/* Kiri: daftar soal */}
              <div className="xl:col-span-3 space-y-2">
                <div className="flex items-center justify-between"><p className="text-xs font-extrabold">Soal ({selected.questions.length})</p><button type="button" onClick={addQuestion} className="inline-flex items-center gap-1 rounded-md bg-[#14532D] px-2.5 py-1.5 text-[11px] font-bold text-white"><Plus className="h-3.5 w-3.5"/>Tambahkan</button></div>
                <div className="space-y-1.5 max-h-[55vh] overflow-auto pr-1">
                  {selected.questions.map((qq,i)=> (
                    <button key={qq.id} type="button" onClick={()=>setQIndex(i)} className={`w-full text-left rounded-lg border px-2.5 py-2 text-xs ${i===qIndex?"border-[#14532D] bg-emerald-50":"border-gray-200"}`}>
                      <div className="flex items-center justify-between gap-1"><span className="font-bold">Soal {i+1}</span><span className="text-[10px] text-gray-500">{qq.timeLimitSec}s</span></div>
                      <p className="truncate text-[11px] text-gray-600">{qq.prompt || "(tanpa judul)"}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tengah: editor soal */}
              <div className="xl:col-span-6 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div><span className="text-sm font-extrabold text-[#14532D]">{KIND_LABEL[selected.kind]} · Soal {qIndex + 1}</span><p className="mt-1 text-sm leading-5 text-gray-600">{KIND_GUIDE[selected.kind]}</p></div>
                  <div className="flex gap-1">
                    <button type="button" onClick={()=>moveQuestion(qIndex,-1)} className="p-1.5 rounded border border-gray-200" title="Naik"><ChevronUp className="h-4 w-4"/></button>
                    <button type="button" onClick={()=>moveQuestion(qIndex,1)} className="p-1.5 rounded border border-gray-200" title="Turun"><ChevronDown className="h-4 w-4"/></button>
                    <button type="button" onClick={()=>removeQuestion(qIndex)} className="p-1.5 rounded border border-gray-200 text-red-600" title="Hapus soal"><Trash2 className="h-4 w-4"/></button>
                  </div>
                </div>

                <label className="block text-sm font-bold text-[#1A2E1A]/75">{PROMPT_LABEL[selected.kind]} (maks 120 karakter)
                  <textarea maxLength={120} value={q.prompt} onChange={e=>updateQuestion(qq=>({...qq,prompt:e.target.value}))} className="mt-1 w-full rounded-md border border-[#E5E7EB] px-3 py-2 text-sm" rows={3} placeholder={`Tulis ${PROMPT_LABEL[selected.kind].toLowerCase()}...`}/>
                  <span className="text-[10px] text-gray-500">{(q.prompt||"").length}/120</span>
                </label>

                <div>
                  <p className="mb-1 text-sm font-bold text-[#1A2E1A]/75">Gambar pendukung (opsional)</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-[#14532D] px-3 py-2 text-xs font-bold text-[#14532D] hover:bg-emerald-50">
                      <ImagePlus className="h-4 w-4"/>Pilih / Drag & Drop / HP
                      <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={e=>{const f=e.target.files?.[0]; if(f) uploadMedia(f); e.currentTarget.value="";}}/>
                    </label>
                    {q.mediaUrl && <a href={q.mediaUrl} target="_blank" rel="noreferrer" className="text-[11px] text-[#14532D] underline">Lihat media</a>}
                    {q.mediaUrl && <button type="button" onClick={removeMedia} className="text-[11px] text-red-600 underline">Hapus media</button>}
                  </div>
                  <p className="mt-2 text-[11px] text-gray-500">JPEG, PNG, WebP, atau GIF · maksimal 5 MB</p>
                  {q.mediaUrl && (mediaPreviewError ? <p role="status" className="mt-2 rounded-md bg-amber-50 p-3 text-xs text-amber-900">Pratinjau gagal dimuat. Periksa koneksi atau unggah ulang gambar.</p> : <img src={q.mediaUrl} alt="Pratinjau gambar soal" onError={() => setMediaPreviewError(true)} className="mt-2 max-h-32 rounded border"/>)}
                </div>

                {/* Per-type answer editor */}
                {selected.kind === "kuis_live" && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-[#1A2E1A]/75">Pilihan jawaban · pilih satu jawaban benar</p>
                    {((q as any).options||["","","",""]).map((opt:string, oi:number)=> (
                      <div key={oi} className="flex items-center gap-2">
                        <input type="radio" name={`correct-answer-${q.id}`} checked={((q as any).correctIndexes||[0])[0]===oi} onChange={()=>updateQuestion(qq=>({...qq, correctIndexes:[oi], choiceMode:"single"}))} aria-label={`Tandai pilihan ${String.fromCharCode(65+oi)} sebagai jawaban benar`} className="h-4 w-4"/>
                        <span className="w-5 text-xs font-bold text-gray-500">{String.fromCharCode(65+oi)}.</span>
                        <input value={opt} onChange={e=>{ const ops=((q as any).options||["","","",""]).slice(); ops[oi]=e.target.value; updateQuestion(qq=>({...qq,options:ops})); }} placeholder={`Pilihan ${String.fromCharCode(65+oi)}`} className="flex-1 rounded-md border border-[#E5E7EB] px-3 py-2 text-sm"/>
                      </div>
                    ))}
                  </div>
                )}
                {selected.kind === "tebak_kata" && (
                  <div className="grid grid-cols-1 gap-2">
                    <label className="text-xs font-bold">Petunjuk<input value={(q as any).hint||""} onChange={e=>updateQuestion(qq=>({...qq,hint:e.target.value}))} className="mt-1 w-full rounded-md border border-[#E5E7EB] px-3 py-2 text-sm"/></label>
                    <label className="text-xs font-bold">Jawaban Benar<input value={(q as any).answer||""} onChange={e=>updateQuestion(qq=>({...qq,answer:e.target.value}))} className="mt-1 w-full rounded-md border border-[#E5E7EB] px-3 py-2 text-sm"/></label>
                  </div>
                )}
                {selected.kind === "pasangkan_kata" && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold">Pasangan Kiri - Kanan</p>
                    {((q as any).pairs||[]).map((p:any,pi:number)=> (
                      <div key={pi} className="flex gap-2 items-center">
                        <input value={p.left||""} onChange={e=>{ const pairs=((q as any).pairs||[]).slice(); pairs[pi]={...pairs[pi],left:e.target.value}; updateQuestion(qq=>({...qq,pairs})); }} placeholder="Kiri" className="flex-1 rounded-md border border-[#E5E7EB] px-3 py-2 text-sm"/>
                        <span className="text-gray-400">?</span>
                        <input value={p.right||""} onChange={e=>{ const pairs=((q as any).pairs||[]).slice(); pairs[pi]={...pairs[pi],right:e.target.value}; updateQuestion(qq=>({...qq,pairs})); }} placeholder="Kanan" className="flex-1 rounded-md border border-[#E5E7EB] px-3 py-2 text-sm"/>
                        <button type="button" onClick={()=>{ const pairs=((q as any).pairs||[]).slice(); pairs.splice(pi,1); updateQuestion(qq=>({...qq,pairs})); }} className="p-1.5 text-red-600"><Trash2 className="h-4 w-4"/></button>
                      </div>
                    ))}
                    <button type="button" onClick={()=>updateQuestion(qq=>({...qq,pairs:[...((qq as any).pairs||[]),{left:"",right:""}]}))} className="text-xs font-bold text-[#14532D]">+ Tambah pasangan</button>
                  </div>
                )}
                {selected.kind === "susun_kalimat" && (
                  <div className="space-y-2">
                    <label className="block text-xs font-bold">Kalimat benar (urutan kata dipisah spasi)<input value={(q as any).sentence|| ((q as any).words||[]).join(" ")} onChange={e=>updateQuestion(qq=>({...qq,sentence:e.target.value, words:e.target.value.split(/\s+/).filter(Boolean)}))} className="mt-1 w-full rounded-md border border-[#E5E7EB] px-3 py-2 text-sm"/></label>
                    <p className="text-[11px] text-gray-500">Kata akan diacak saat dimainkan: {((q as any).words||[]).join(" · ")}</p>
                  </div>
                )}
                {selected.kind === "tebak_gambar" && (
                  <div className="space-y-2">
                    <label className="block text-xs font-bold">Jawaban Benar<input value={(q as any).answer||""} onChange={e=>updateQuestion(qq=>({...qq,answer:e.target.value}))} className="mt-1 w-full rounded-md border border-[#E5E7EB] px-3 py-2 text-sm"/></label>
                    <p className="text-xs font-bold">Pilihan jawaban (opsional, tandai jawaban benar)</p>
                    {((q as any).options||["","","",""]).map((opt:string, oi:number)=> (
                      <div key={oi} className="flex items-center gap-2">{q.choiceMode === "multiple" ? <input type="checkbox" checked={((q as any).correctIndexes||[0]).includes(oi)} onChange={e=>updateQuestion(qq=>{ const current:number[]=(qq as any).correctIndexes||[0]; const next=e.target.checked?Array.from(new Set([...current,oi])):current.filter((index:number)=>index!==oi); return {...qq,correctIndexes:next.length?next:current}; })} aria-label={`Tandai opsi ${oi+1} sebagai jawaban benar`} className="h-4 w-4"/> : <input type="radio" name={`image-answer-${q.id}`} checked={((q as any).correctIndexes||[0])[0]===oi} onChange={()=>updateQuestion(qq=>({...qq,correctIndexes:[oi],choiceMode:"single"}))} aria-label={`Tandai opsi ${oi+1} sebagai jawaban benar`} className="h-4 w-4"/>}<input value={opt} onChange={e=>{ const ops=((q as any).options||["","","",""]).slice(); ops[oi]=e.target.value; updateQuestion(qq=>({...qq,options:ops})); }} placeholder={`Pilihan ${oi+1}`} className="mb-1 w-full rounded-md border border-[#E5E7EB] px-3 py-2 text-sm"/></div>
                    ))}
                  </div>
                )}
                {selected.kind === "kata_hilang" && (
                  <div className="space-y-2">
                    <label className="block text-xs font-bold">Kalimat (gunakan ___ untuk bagian kosong)<input value={(q as any).sentence||""} onChange={e=>updateQuestion(qq=>({...qq,sentence:e.target.value}))} placeholder="Contoh: I ___ to school every day." className="mt-1 w-full rounded-md border border-[#E5E7EB] px-3 py-2 text-sm"/></label>
                    <label className="block text-xs font-bold">Kata Jawaban<input value={(q as any).answer||""} onChange={e=>updateQuestion(qq=>({...qq,answer:e.target.value}))} className="mt-1 w-full rounded-md border border-[#E5E7EB] px-3 py-2 text-sm"/></label>
                    <p className="text-xs leading-5 text-gray-600">Peserta menjawab dengan mengetik kata yang mengisi bagian kosong.</p>
                  </div>
                )}
                {selected.kind === "duel_kata_cepat" && (
                  <div className="grid grid-cols-1 gap-2">
                    <label className="text-xs font-bold">Petunjuk<input value={(q as any).hint||""} onChange={e=>updateQuestion(qq=>({...qq,hint:e.target.value}))} className="mt-1 w-full rounded-md border border-[#E5E7EB] px-3 py-2 text-sm"/></label>
                    <label className="text-xs font-bold">Jawaban Cepat (benar)<input value={(q as any).answer||""} onChange={e=>updateQuestion(qq=>({...qq,answer:e.target.value}))} className="mt-1 w-full rounded-md border border-[#E5E7EB] px-3 py-2 text-sm"/></label>
                  </div>
                )}
              </div>

              {/* Kanan: properti */}
              <div className="xl:col-span-3 space-y-3">
                <div className="rounded-lg border border-[#E5E7EB] bg-[#FDFBF7] p-3 space-y-3">
                  <p className="text-xs font-extrabold text-[#1A2E1A]">Properti Soal</p>
                  <label className="block text-xs font-bold">Jenis Soal<input readOnly value={KIND_LABEL[selected.kind]} className="mt-1 w-full rounded-md border border-[#E5E7EB] bg-gray-50 px-3 py-2 text-sm"/></label>
                  <div>
                    <label className="block text-xs font-bold mb-1">Batas Waktu</label>
                    <div className="flex flex-wrap gap-1.5">
                      {TIMES.map(t=> (
                        <button key={t} type="button" onClick={()=>updateQuestion(qq=>({...qq,timeLimitSec:t}))} className={`rounded-md px-2.5 py-1.5 text-xs font-bold border ${q.timeLimitSec===t?"bg-[#14532D] text-white border-[#14532D]":"border-gray-200"}`}>{t}s</button>
                      ))}
                    </div>
                    <button type="button" onClick={()=>applyTimeAll(q.timeLimitSec||20)} className="mt-1.5 text-[11px] font-bold text-[#14532D] underline">Terapkan ke semua soal</button>
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1">Poin</label>
                    <div className="flex flex-wrap gap-1.5">
                      {[{v:"standard",l:"Standar"},{v:"double",l:"2x"},{v:"none",l:"Tanpa"}].map(o=> (
                        <button key={o.v} type="button" onClick={()=>updateQuestion(qq=>({...qq,points:o.v}))} className={`rounded-md px-2.5 py-1.5 text-xs font-bold border ${q.points===o.v?"bg-[#14532D] text-white border-[#14532D]":"border-gray-200"}`}>{o.l}</button>
                      ))}
                    </div>
                  </div>
                  {selected.kind === "tebak_gambar" && <div>
                    <label className="block text-xs font-bold mb-1">Opsi Jawaban</label>
                    <div className="flex gap-1.5">
                      <button type="button" onClick={()=>updateQuestion(qq=>({...qq,choiceMode:"single"}))} className={`flex-1 rounded-md px-2 py-1.5 text-xs font-bold border ${q.choiceMode!=="multiple"?"bg-[#14532D] text-white border-[#14532D]":"border-gray-200"}`}>Tunggal</button>
                      <button type="button" onClick={()=>updateQuestion(qq=>({...qq,choiceMode:"multiple"}))} className={`flex-1 rounded-md px-2 py-1.5 text-xs font-bold border ${q.choiceMode==="multiple"?"bg-[#14532D] text-white border-[#14532D]":"border-gray-200"}`}>Ganda</button>
                    </div>
                  </div>}
                </div>
                <button type="button" onClick={saveGame} disabled={saving} className="w-full rounded-md bg-[#14532D] px-4 py-2.5 text-sm font-extrabold text-white disabled:opacity-60">{saving?"Menyimpan...":"Simpan Perubahan"}</button>
              </div>
            </div>
          )}
        </div>
      )}
      {pendingDestination && <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4" role="presentation"><section role="dialog" aria-modal="true" aria-labelledby="unsaved-title" className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"><h3 id="unsaved-title" className="text-lg font-extrabold text-[#1A2E1A]">Perubahan belum disimpan</h3><p className="mt-2 text-sm leading-6 text-gray-600">Perubahan belum disimpan, yakin ingin kembali? Perubahan akan hilang.</p><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={()=>setPendingDestination(null)} className="min-h-10 rounded-lg border border-gray-200 px-4 text-sm font-bold">Batal</button><button type="button" onClick={confirmDestination} className="min-h-10 rounded-lg bg-[#14532D] px-4 text-sm font-bold text-white">Ya, Kembali</button></div></section></div>}
    </div>
  );
}
