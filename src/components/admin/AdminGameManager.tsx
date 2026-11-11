"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2, Copy, Save, ImagePlus, ChevronUp, ChevronDown, Loader2, GripVertical } from "lucide-react";
import type { GameKind, GameQuestion, GameRecord, QuizLiveQuestion } from "@/lib/types";
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
const TIMES = [5,10,20,30,60];
const KINDS = Object.keys(KIND_LABEL) as GameKind[];

function uid(p="id"){return `${p}-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;}

export default function AdminGameManager({ notify }: { notify: (m:string)=>void }) {
  const [games, setGames] = useState<GameRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string|null>(null);
  const [qIndex, setQIndex] = useState(0);
  const [creatingKind, setCreatingKind] = useState<GameKind>("kuis_live");
  const [showPicker, setShowPicker] = useState(false);
  const fileRef = useRef<HTMLInputElement|null>(null);

  async function load(selectId?: string) {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/games");
      const data = await res.json();
      const list: GameRecord[] = data.games || [];
      setGames(list);
      const sid = selectId || selectedId || (list[0]?.id ?? null);
      if (sid) { setSelectedId(sid); }
    } catch {}
    setLoading(false);
  }
  useEffect(()=>{ load(); },[]);

  const selected = useMemo(()=> games.find(g=>g.id===selectedId) || null, [games, selectedId]);
  const q = selected?.questions?.[qIndex] as GameQuestion | undefined;

  function updateSelected(mut: (g: GameRecord)=>GameRecord) {
    if (!selected) return;
    setGames(gs => gs.map(g => g.id===selected.id ? mut(JSON.parse(JSON.stringify(g))) : g));
  }
  function updateQuestion(mut: (qq: any)=>any) {
    if (!selected) return;
    updateSelected(g => { g.questions[qIndex] = mut(g.questions[qIndex]); g.updatedAt = new Date().toISOString(); return g; });
  }

  async function createGame() {
    const res = await fetch("/api/admin/games", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ kind: creatingKind, title: `Game ${KIND_LABEL[creatingKind]} Baru` }) });
    const data = await res.json();
    if (!res.ok) { notify(data.error||"Gagal membuat game."); return; }
    setShowPicker(false);
    await load(data.game?.id);
    setQIndex(0);
    notify(`Game "${data.game?.title}" dibuat.`);
  }

  async function saveGame() {
    if (!selected) return;
    setSaving(true);
    const res = await fetch("/api/admin/games", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ action:"upsert", game: selected }) });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { notify(data.error||"Gagal menyimpan."); return; }
    notify("Game tersimpan.");
    await load(selected.id);
  }

  async function deleteGame(id: string) {
    if (!confirm("Hapus game ini?")) return;
    await fetch(`/api/admin/games?id=${encodeURIComponent(id)}`, { method:"DELETE" });
    notify("Game dihapus.");
    setSelectedId(null); setQIndex(0); load();
  }
  async function duplicateGame(id: string) {
    const res = await fetch("/api/admin/games", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ action:"duplicate", id }) });
    const data = await res.json();
    if (res.ok) { notify("Game diduplikasi."); await load(data.game?.id); }
  }

  function addQuestion() {
    if (!selected) return;
    const nq = emptyQuestion(selected.kind, uid("q"));
    updateSelected(g => { g.questions.push(nq as any); g.updatedAt=new Date().toISOString(); return g; });
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
    const fd = new FormData(); fd.append("file", file); fd.append("gameId", selected.id);
    const res = await fetch("/api/admin/games/media", { method:"POST", body: fd });
    const data = await res.json();
    if (!res.ok) { notify(data.error||"Gagal upload media."); return; }
    updateQuestion(qq=>({ ...qq, mediaUrl: data.url }));
    notify("Media berhasil diunggah.");
  }

  if (loading) return <div className="p-8 text-sm text-gray-500 flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin"/>Memuat game...</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-[#1A2E1A]">Kelola Game</h2>
          <p className="text-xs text-[#1A2E1A]/70">Buat, edit, duplikat, dan hapus game (7 jenis). Semua tersimpan di database.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={()=>setShowPicker(v=>!v)} className="inline-flex min-h-[40px] items-center gap-2 rounded-md bg-[#14532D] px-4 py-2 text-xs font-extrabold text-white"><Plus className="h-4 w-4"/>Buat Game Baru</button>
          {selected && <button type="button" onClick={saveGame} disabled={saving} className="inline-flex min-h-[40px] items-center gap-2 rounded-md border border-[#14532D] bg-white px-4 py-2 text-xs font-extrabold text-[#14532D] disabled:opacity-60">{saving?<Loader2 className="h-4 w-4 animate-spin"/>:<Save className="h-4 w-4"/>}Simpan Game</button>}
        </div>
      </div>

      {showPicker && (
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
          <p className="text-sm font-bold text-[#1A2E1A] mb-2">Pilih jenis game</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            {KINDS.map(k=> (
              <button key={k} type="button" onClick={()=>setCreatingKind(k)} className={`rounded-lg border-2 px-3 py-3 text-left text-xs font-bold ${creatingKind===k?"border-[#14532D] bg-emerald-50 text-[#14532D]":"border-gray-200"}`}>{KIND_LABEL[k]}</button>
            ))}
          </div>
          <button type="button" onClick={createGame} className="rounded-md bg-[#14532D] px-4 py-2 text-xs font-extrabold text-white">Buat ({KIND_LABEL[creatingKind]})</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* List games */}
        <div className="lg:col-span-3 rounded-xl border border-[#E5E7EB] bg-white p-3 space-y-2 max-h-[70vh] overflow-auto">
          <p className="text-xs font-extrabold text-[#1A2E1A] px-1">Daftar Game ({games.length})</p>
          {games.length===0 && <p className="text-xs text-gray-500 px-1">Belum ada game.</p>}
          {games.map(g=> (
            <div key={g.id} className={`rounded-lg border p-2 ${selectedId===g.id?"border-[#14532D] bg-emerald-50/40":"border-[#E5E7EB]"}`}>
              <button type="button" onClick={()=>{setSelectedId(g.id); setQIndex(0);}} className="w-full text-left">
                <p className="text-xs font-extrabold text-[#1A2E1A] truncate">{g.title}</p>
                <p className="text-[11px] text-gray-500">{KIND_LABEL[g.kind]} � {(g.questions||[]).length} soal</p>
              </button>
              <div className="mt-1 flex gap-1">
                <button type="button" onClick={()=>duplicateGame(g.id)} className="p-1.5 rounded border border-gray-200" title="Duplikat"><Copy className="h-3.5 w-3.5"/></button>
                <button type="button" onClick={()=>deleteGame(g.id)} className="p-1.5 rounded border border-gray-200 text-red-600" title="Hapus"><Trash2 className="h-3.5 w-3.5"/></button>
              </div>
            </div>
          ))}
        </div>

        {/* Editor */}
        <div className="lg:col-span-9 rounded-xl border border-[#E5E7EB] bg-white p-4 min-h-[60vh]">
          {!selected || !q ? (
            <div className="text-sm text-gray-500">Pilih game untuk diedit, atau buat game baru.</div>
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
                  <span className="text-xs font-bold text-[#14532D]">Soal {qIndex+1} � {KIND_LABEL[selected.kind]}</span>
                  <div className="flex gap-1">
                    <button type="button" onClick={()=>moveQuestion(qIndex,-1)} className="p-1.5 rounded border border-gray-200" title="Naik"><ChevronUp className="h-4 w-4"/></button>
                    <button type="button" onClick={()=>moveQuestion(qIndex,1)} className="p-1.5 rounded border border-gray-200" title="Turun"><ChevronDown className="h-4 w-4"/></button>
                    <button type="button" onClick={()=>removeQuestion(qIndex)} className="p-1.5 rounded border border-gray-200 text-red-600" title="Hapus soal"><Trash2 className="h-4 w-4"/></button>
                  </div>
                </div>

                <label className="block text-xs font-bold text-[#1A2E1A]/75">Judul Game<input value={selected.title} onChange={e=>updateSelected(g=>({...g,title:e.target.value}))} className="mt-1 w-full rounded-md border border-[#E5E7EB] px-3 py-2 text-sm font-semibold"/></label>

                <label className="block text-xs font-bold text-[#1A2E1A]/75">Pertanyaan / Instruksi (maks 120 karakter)
                  <textarea maxLength={120} value={q.prompt} onChange={e=>updateQuestion(qq=>({...qq,prompt:e.target.value}))} className="mt-1 w-full rounded-md border border-[#E5E7EB] px-3 py-2 text-sm" rows={3} placeholder="Tulis pertanyaan di sini..."/>
                  <span className="text-[10px] text-gray-500">{(q.prompt||"").length}/120</span>
                </label>

                <div>
                  <p className="text-xs font-bold text-[#1A2E1A]/75 mb-1">Upload Media (gambar)</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-[#14532D] px-3 py-2 text-xs font-bold text-[#14532D] hover:bg-emerald-50">
                      <ImagePlus className="h-4 w-4"/>Pilih / Drag & Drop / HP
                      <input type="file" accept="image/*" className="hidden" onChange={e=>{const f=e.target.files?.[0]; if(f) uploadMedia(f); e.currentTarget.value="";}}/>
                    </label>
                    {q.mediaUrl && <a href={q.mediaUrl} target="_blank" rel="noreferrer" className="text-[11px] text-[#14532D] underline">Lihat media</a>}
                    {q.mediaUrl && <button type="button" onClick={()=>updateQuestion(qq=>({...qq,mediaUrl:undefined}))} className="text-[11px] text-red-600 underline">Hapus media</button>}
                  </div>
                  {q.mediaUrl && <img src={q.mediaUrl} alt="media" className="mt-2 max-h-32 rounded border"/>}
                </div>

                {/* Per-type answer editor */}
                {selected.kind === "kuis_live" && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-[#1A2E1A]/75">Jawaban (1-4) � centang yang benar</p>
                    {((q as any).options||["","","",""]).map((opt:string, oi:number)=> (
                      <div key={oi} className="flex items-center gap-2">
                        <input type="checkbox" checked={((q as any).correctIndexes||[]).includes(oi)} onChange={e=>{
                          const cur:number[] = ((q as any).correctIndexes||[]).slice();
                          const next = e.target.checked ? Array.from(new Set([...cur,oi])) : cur.filter(x=>x!==oi);
                          updateQuestion(qq=>({...qq, correctIndexes: next.length?next:[0]}));
                        }} className="h-4 w-4"/>
                        <input value={opt} onChange={e=>{ const ops=((q as any).options||["","","",""]).slice(); ops[oi]=e.target.value; updateQuestion(qq=>({...qq,options:ops})); }} placeholder={`Jawaban ${oi+1}`} className="flex-1 rounded-md border border-[#E5E7EB] px-3 py-2 text-sm"/>
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
                    <p className="text-[11px] text-gray-500">Kata akan diacak saat dimainkan: {((q as any).words||[]).join(" � ")}</p>
                  </div>
                )}
                {selected.kind === "tebak_gambar" && (
                  <div className="space-y-2">
                    <label className="block text-xs font-bold">Jawaban Benar<input value={(q as any).answer||""} onChange={e=>updateQuestion(qq=>({...qq,answer:e.target.value}))} className="mt-1 w-full rounded-md border border-[#E5E7EB] px-3 py-2 text-sm"/></label>
                    <p className="text-xs font-bold">Opsi pilihan (opsional, 1-4)</p>
                    {((q as any).options||["","","",""]).map((opt:string, oi:number)=> (
                      <input key={oi} value={opt} onChange={e=>{ const ops=((q as any).options||["","","",""]).slice(); ops[oi]=e.target.value; updateQuestion(qq=>({...qq,options:ops})); }} placeholder={`Opsi ${oi+1}`} className="w-full rounded-md border border-[#E5E7EB] px-3 py-2 text-sm mb-1"/>
                    ))}
                  </div>
                )}
                {selected.kind === "kata_hilang" && (
                  <div className="space-y-2">
                    <label className="block text-xs font-bold">Kalimat (gunakan ___ untuk bagian kosong)<input value={(q as any).sentence||""} onChange={e=>updateQuestion(qq=>({...qq,sentence:e.target.value}))} placeholder="Contoh: I ___ to school every day." className="mt-1 w-full rounded-md border border-[#E5E7EB] px-3 py-2 text-sm"/></label>
                    <label className="block text-xs font-bold">Kata Jawaban<input value={(q as any).answer||""} onChange={e=>updateQuestion(qq=>({...qq,answer:e.target.value}))} className="mt-1 w-full rounded-md border border-[#E5E7EB] px-3 py-2 text-sm"/></label>
                    <p className="text-xs font-bold">Pilihan opsional (1-4)</p>
                    {((q as any).options||["","","",""]).map((opt:string, oi:number)=> (
                      <input key={oi} value={opt} onChange={e=>{ const ops=((q as any).options||["","","",""]).slice(); ops[oi]=e.target.value; updateQuestion(qq=>({...qq,options:ops})); }} placeholder={`Opsi ${oi+1}`} className="w-full rounded-md border border-[#E5E7EB] px-3 py-2 text-sm mb-1"/>
                    ))}
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
                  <div>
                    <label className="block text-xs font-bold mb-1">Opsi Jawaban</label>
                    <div className="flex gap-1.5">
                      <button type="button" onClick={()=>updateQuestion(qq=>({...qq,choiceMode:"single"}))} className={`flex-1 rounded-md px-2 py-1.5 text-xs font-bold border ${q.choiceMode!=="multiple"?"bg-[#14532D] text-white border-[#14532D]":"border-gray-200"}`}>Tunggal</button>
                      <button type="button" onClick={()=>updateQuestion(qq=>({...qq,choiceMode:"multiple"}))} className={`flex-1 rounded-md px-2 py-1.5 text-xs font-bold border ${q.choiceMode==="multiple"?"bg-[#14532D] text-white border-[#14532D]":"border-gray-200"}`}>Ganda</button>
                    </div>
                  </div>
                </div>
                <button type="button" onClick={saveGame} disabled={saving} className="w-full rounded-md bg-[#14532D] px-4 py-2.5 text-sm font-extrabold text-white disabled:opacity-60">{saving?"Menyimpan...":"Simpan Perubahan"}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
