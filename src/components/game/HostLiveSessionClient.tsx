"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Users, Play, ArrowRight, Trophy, XCircle, Copy, Check, Sparkles, Award, Crown } from "lucide-react";
import confetti from "canvas-confetti";

interface SessionState {
  pin: string; templateTitle: string; hostName: string; status: "lobby" | "question" | "reveal" | "podium" | "closed";
  currentQuestionIndex: number; totalQuestions: number; questionStartedAt: number; timeLimitSec: number;
  currentQuestion: any; playersList: any[]; answersDetail?: any[]; answerDistribution?: number[];
}
const SHAPES = [
  { symbol: "○", label: "A", color: "bg-red-500" },
  { symbol: "△", label: "B", color: "bg-blue-500" },
  { symbol: "□", label: "C", color: "bg-amber-500" },
  { symbol: "◇", label: "D", color: "bg-emerald-600" },
];

export default function HostLiveSessionClient({ initialPin, templateTitle }: { initialPin: string; templateTitle: string }) {
  const [state, setState] = useState<SessionState | null>(null);
  const [hostId, setHostId] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [remainingTime, setRemainingTime] = useState<number>(20);
  const [actionLoading, setActionLoading] = useState(false);
  const [mediaLoadFailed, setMediaLoadFailed] = useState(false);

  useEffect(() => setMediaLoadFailed(false), [state?.currentQuestionIndex, state?.status]);

  useEffect(() => {
    const savedHostId = localStorage.getItem(`sapen_host_${initialPin}`);
    if (savedHostId) setHostId(savedHostId);
    const evtSource = new EventSource(`/api/game/live/${initialPin}/stream`);
    evtSource.onmessage = (event) => { try { setState(JSON.parse(event.data)); } catch {} };
    return () => evtSource.close();
  }, [initialPin]);

  useEffect(() => {
    if (!state || state.status !== "question" || !state.questionStartedAt) return;
    const tick = () => { const elapsedSec = (Date.now() - state.questionStartedAt) / 1000; setRemainingTime(Math.max(0, Math.ceil(state.timeLimitSec - elapsedSec))); };
    tick(); const interval = setInterval(tick, 250); return () => clearInterval(interval);
  }, [state?.status, state?.questionStartedAt, state?.timeLimitSec, state?.currentQuestionIndex]);

  useEffect(() => {
    if (state?.status === "podium") {
      const end = Date.now() + 3500;
      const frame = () => { confetti({ particleCount: 4, angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, colors: ["#14532D", "#F59E0B", "#ffffff"] }); confetti({ particleCount: 4, angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, colors: ["#14532D", "#F59E0B", "#ffffff"] }); if (Date.now() < end) requestAnimationFrame(frame); };
      frame();
    }
  }, [state?.status]);

  const sendAction = async (action: "start" | "next" | "reveal" | "close" | "kick", targetPlayerId?: string) => {
    if (actionLoading) return; setActionLoading(true);
    try { await fetch(`/api/game/live/${initialPin}/action`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, hostId: hostId || "host-dev", targetPlayerId }) }); } finally { setActionLoading(false); }
  };

  const copyJoinLink = () => { navigator.clipboard.writeText(`${window.location.origin}/game/join?pin=${initialPin}`); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  if (!state) return (<div className="flex h-screen items-center justify-center text-center bg-gradient-to-b from-[#062814] via-[#0F172A] to-[#0b1020]"><div><div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent mx-auto mb-4" /><p className="text-gray-300 font-semibold">Menghubungkan ke Sesi Live #{initialPin}...</p></div></div>);

  const answeredCount = state.playersList.filter((p) => p.hasAnswered).length || 0;
  const totalPlayers = state.playersList.length || 0;
  const timerPct = Math.max(0, Math.min(100, (remainingTime / (state.timeLimitSec || 20)) * 100));
  const timerDanger = remainingTime <= 5;
  const distribution = state.answerDistribution || [0,0,0,0];
  const distMax = Math.max(1, ...distribution);
  const q = state.currentQuestion;
  const qType = q?.type || "kuis_live";
  const opts = Array.isArray(q?.options) ? q.options : [];
  const correctText = q ? (q.correctAnswer || (Array.isArray(q.correctIndexes) ? q.correctIndexes.map((i:number)=>opts[i]).filter(Boolean).join(", ") : (q.correctIndex!=null?opts[q.correctIndex]:"")) || (q.correctPairs ? (q.correctPairs||[]).map((p:any)=>`${p.left}?${p.right}`).join(", ") : "") || (q.correctWords ? (q.correctWords||[]).join(" ") : "")) : "";
  const isChoiceHost = q && (qType === "kuis_live" || (qType === "tebak_gambar" && opts.filter(Boolean).length > 0));

  return (
    <div className="workbook-host flex min-h-screen flex-col bg-paper text-ink">
      <header className="bg-slate-950/80 border-b border-slate-800/80 backdrop-blur px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-emerald-600 text-white font-mono text-xl sm:text-2xl font-black px-4 py-1.5 rounded-xl shadow ring-2 ring-emerald-400/30">PIN: {state.pin}</div>
          <div><h1 className="text-base sm:text-lg font-bold text-white leading-tight">{state.templateTitle || templateTitle}</h1><p className="text-xs text-slate-400">Host: <span className="text-slate-200 font-semibold">{state.hostName}</span></p></div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button onClick={copyJoinLink} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 border border-slate-700 transition">{copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}<span>{copied ? "Tersalin!" : "Salin Link"}</span></button>
          <button onClick={() => sendAction("close")} className="inline-flex items-center gap-1.5 rounded-lg bg-red-950/60 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-900 border border-red-800/60 transition"><XCircle className="h-4 w-4" /><span>Tutup</span></button>
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-8 max-w-6xl mx-auto w-full">
        {state.status === "lobby" && (
          <div className="space-y-8 py-4">
            <div className="text-center space-y-3 animate-[fadeIn_.5s_ease]"><span className="inline-block bg-slate-800/80 border border-slate-700 px-4 py-1 rounded-full text-xs font-bold text-slate-300 uppercase tracking-widest">Ruang Tunggu</span><h2 className="text-3xl sm:text-5xl font-black text-white">Buka HP: <span className="text-emerald-400 underline underline-offset-8">/game/join</span></h2><p className="text-slate-300 text-lg">Masukkan PIN: <span className="text-amber-400 font-black font-mono text-3xl tracking-[0.2em]">{state.pin}</span></p></div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6 backdrop-blur">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800"><div className="flex items-center gap-2 text-slate-200 font-bold"><Users className="h-5 w-5 text-emerald-400" /><span>Peserta Bergabung ({totalPlayers})</span></div>{totalPlayers === 0 && <span className="text-xs text-slate-500 animate-pulse">Menunggu peserta...</span>}</div>
              {totalPlayers === 0 ? (<div className="text-center py-10 text-slate-500"><p>Belum ada peserta. Tampilkan PIN di layar!</p></div>) : (<div className="flex flex-wrap gap-2.5 max-h-[320px] overflow-y-auto pr-1">{state.playersList.map((player:any) => (<div key={player.id} className="group flex items-center gap-2 rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2 text-sm font-bold text-white shadow-sm hover:border-emerald-500/50 transition"><span className="h-6 w-6 rounded-full bg-emerald-600/30 text-emerald-300 text-xs flex items-center justify-center">●</span><span>{player.name}</span><button onClick={() => sendAction("kick", player.id)} title="Keluarkan" aria-label={`Keluarkan ${player.name}`} className="min-h-11 min-w-11 text-red-400 hover:text-red-300 ml-1">×</button></div>))}</div>)}
            </div>
            <div className="text-center pt-2"><button onClick={() => sendAction("start")} disabled={totalPlayers === 0 || actionLoading} className="inline-flex min-h-[56px] items-center gap-3 rounded-md bg-earth px-10 py-5 text-xl font-black text-white shadow-card transition hover:bg-earth-dark active:scale-95 disabled:cursor-not-allowed disabled:bg-paper-deep disabled:text-muted"><Play className="h-6 w-6 fill-white" /><span>Mulai ({totalPlayers} Peserta)</span></button></div>
          </div>
        )}

        {state.status === "question" && q && (
          <div className="space-y-5 animate-[slideUp_.35s_ease]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="rounded-xl bg-slate-800/80 px-4 py-2 text-sm font-bold text-slate-200">Soal {state.currentQuestionIndex + 1} / {state.totalQuestions} <span className="text-slate-400 font-normal">· {(qType||"").replace(/_/g," ")}</span></span>
              <div className="flex items-center gap-3 min-w-[180px]"><div className={`relative h-12 w-12 rounded-full grid place-items-center font-black ${timerDanger ? "text-red-300" : "text-amber-300"}`}><svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90"><path d="M18 2a16 16 0 1 1 0 32a16 16 0 1 1 0-32" fill="none" stroke="#334155" strokeWidth="4" /><path d="M18 2a16 16 0 1 1 0 32a16 16 0 1 1 0-32" fill="none" stroke={timerDanger ? "#ef4444" : "#f59e0b"} strokeWidth="4" strokeDasharray={`${timerPct}, 100`} /></svg><span className="text-sm">{remainingTime}s</span></div><div className="rounded-xl bg-slate-800/80 px-4 py-2 text-sm font-bold text-slate-200">Jawab: <span className="text-emerald-400">{answeredCount}</span>/{totalPlayers}</div></div>
            </div>
            <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-6 sm:p-8 text-center shadow-2xl">
              {q.mediaUrl && (mediaLoadFailed ? <p role="status" className="mx-auto mb-4 text-sm text-amber-300">Gambar soal tidak dapat dimuat.</p> : <img src={q.mediaUrl} alt="Gambar soal" onError={() => setMediaLoadFailed(true)} className="mx-auto mb-4 max-h-52 object-contain rounded-xl border border-slate-700"/>)}
              {q.context && <div className="mb-4 rounded-xl bg-slate-800/80 p-4 text-slate-300 text-sm italic max-w-3xl mx-auto border border-slate-700">"{q.context}"</div>}
              <h2 className="text-2xl sm:text-4xl font-extrabold text-white leading-snug">{q.question || q.prompt}</h2>
              {q.sentence && <p className="mt-3 text-lg text-emerald-300 font-semibold">{q.sentence}</p>}
              {q.hint && <p className="mt-2 text-sm text-slate-400">Petunjuk: {q.hint}</p>}
            </div>
            {isChoiceHost ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{opts.slice(0,4).map((opt:string, idx:number)=>{ const shape=SHAPES[idx]; return (<div key={idx} className={`flex items-center gap-4 rounded-2xl p-5 ${shape.color} text-white shadow-lg`}><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-black/25 text-2xl font-black">{shape.symbol}</div><span className="text-lg sm:text-xl font-bold leading-tight">{opt || `Opsi ${idx+1}`}</span></div>); })}</div>
            ) : (
              <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-6 text-center text-slate-300">
                {qType === "pasangkan_kata" && <div className="text-sm"><p className="font-bold text-white mb-2">Peserta memasangkan item:</p><div className="flex flex-wrap justify-center gap-2">{(q.pairs||[]).map((p:any,i:number)=>(<span key={i} className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs border border-slate-700">{p.left} ? ?</span>))}</div></div>}
                {qType === "susun_kalimat" && <div className="text-sm"><p className="font-bold text-white mb-2">Kata untuk disusun:</p><div className="flex flex-wrap justify-center gap-2">{(q.words||[]).map((w:string,i:number)=>(<span key={i} className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs border border-slate-700">{w}</span>))}</div></div>}
                {(qType === "tebak_kata" || qType === "duel_kata_cepat" || qType === "kata_hilang" || qType === "tebak_gambar") && <p className="text-sm font-semibold text-white">Peserta mengetik/menjawab pada perangkat masing-masing.</p>}
              </div>
            )}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <div className="flex items-center justify-between mb-2"><h3 className="text-sm font-bold text-slate-200">Skor Live Peserta</h3><span className="text-xs text-slate-400">urut tertinggi</span></div>
              <div className="max-h-52 overflow-auto divide-y divide-slate-800 pr-1">{state.playersList.map((p:any,i:number)=>(<div key={p.id} className="flex items-center justify-between py-2 text-sm"><div className="flex items-center gap-2 min-w-0"><span className="w-6 text-slate-500 font-mono">#{i+1}</span><span className="truncate font-semibold">{p.name}</span>{p.hasAnswered && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-900/50 text-emerald-300">sudah jawab</span>}</div><span className="font-mono font-bold text-amber-300 tabular-nums">{p.score}</span></div>))}{state.playersList.length===0 && <p className="text-xs text-slate-500 py-3">Belum ada peserta.</p>}</div>
            </div>
            <div className="flex justify-end pt-1"><button onClick={() => sendAction("reveal")} disabled={actionLoading} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3.5 text-base font-bold text-gray-950 hover:bg-amber-400 transition shadow-lg"><span>Buka Jawaban & Pembahasan</span><ArrowRight className="h-5 w-5" /></button></div>
          </div>
        )}

        {state.status === "reveal" && q && (
          <div className="space-y-5 animate-[fadeIn_.3s_ease]">
            <div className="flex items-center justify-between"><span className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-slate-300">Pembahasan Soal {state.currentQuestionIndex + 1}</span><span className="text-xs font-semibold text-emerald-300 bg-emerald-950/60 border border-emerald-800 px-3 py-1 rounded-full">Jawaban Benar Ditampilkan</span></div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center">{q.mediaUrl && (mediaLoadFailed ? <p role="status" className="mx-auto mb-4 text-sm text-amber-300">Gambar soal tidak dapat dimuat.</p> : <img src={q.mediaUrl} alt="Gambar soal" onError={() => setMediaLoadFailed(true)} className="mx-auto mb-4 max-h-48 object-contain rounded-xl"/>)}<h2 className="text-xl sm:text-3xl font-extrabold text-white">{q.question || q.prompt}</h2>{q.sentence && <p className="mt-2 text-emerald-300">{q.sentence}</p>}</div>
            {isChoiceHost ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{opts.slice(0,4).map((opt:string, idx:number)=>{ const isCorrect = Array.isArray(q.correctIndexes)? q.correctIndexes.includes(idx) : idx===q.correctIndex; const shape=SHAPES[idx]; const count=distribution[idx]||0; const pct=Math.round((count/distMax)*100); return (<div key={idx} className={`relative overflow-hidden rounded-2xl p-5 border-2 transition ${isCorrect?"bg-emerald-700/90 border-emerald-300 text-white shadow-xl":"bg-slate-900/70 border-slate-700 text-slate-200"}`}><div className="absolute inset-y-0 left-0 bg-white/10" style={{width:`${pct}%`}}/><div className="relative flex items-center justify-between gap-3"><div className="flex items-center gap-3 min-w-0"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black/20 text-xl font-black">{shape.symbol}</div><span className="text-base sm:text-lg font-bold truncate">{opt || `Opsi ${idx+1}`}</span></div><div className="flex items-center gap-2 shrink-0"><span className="text-xs font-bold bg-black/20 rounded-full px-2.5 py-1">{count} orang</span>{isCorrect && <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-xs font-black uppercase"><Check className="h-3.5 w-3.5"/>Benar</span>}</div></div></div>); })}</div>
            ) : (
              <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/40 p-5 text-emerald-100"><p className="text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">Jawaban Benar</p><p className="text-base sm:text-lg font-extrabold">{correctText || "-"}</p></div>
            )}
            {q.explanation && <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/50 p-5 text-emerald-100"><p className="text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">Penjelasan</p><p className="text-sm sm:text-base leading-relaxed">{q.explanation}</p></div>}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <h3 className="text-sm font-bold text-slate-200 mb-2">Jawaban & Skor per Peserta (soal ini)</h3>
              <div className="max-h-64 overflow-auto"><table className="w-full text-left text-sm"><thead className="text-xs text-slate-400 border-b border-slate-800"><tr><th className="py-2 pr-2">Peserta</th><th className="py-2 pr-2">Jawaban</th><th className="py-2 pr-2">Hasil</th><th className="py-2 text-right">Skor</th></tr></thead><tbody className="divide-y divide-slate-800">{(state.answersDetail||[]).map((a:any)=>{ const ansLabel = a.textAnswer ? a.textAnswer : (a.optionIndex==null?"-":`${SHAPES[a.optionIndex]?.label||a.optionIndex+1}`); return (<tr key={a.id}><td className="py-2 pr-2 font-semibold text-white">{a.name}</td><td className="py-2 pr-2 text-slate-300 truncate max-w-[180px]" title={ansLabel}>{ansLabel}</td><td className="py-2 pr-2">{a.isCorrect==null?<span className="text-slate-500">Tidak jawab</span>:a.isCorrect?<span className="text-emerald-400 font-bold">Benar (+{a.pointsEarned})</span>:<span className="text-red-400 font-bold">Salah</span>}</td><td className="py-2 text-right font-mono font-bold text-amber-300">{a.score}</td></tr>); })}{(state.answersDetail||[]).length===0 && <tr><td colSpan={4} className="py-3 text-slate-500 text-xs">Belum ada peserta.</td></tr>}</tbody></table></div>
            </div>
            <div className="flex items-center justify-between pt-1 gap-3 flex-wrap"><div className="text-sm text-slate-400">Top 3: <span className="font-bold text-white">{state.playersList.slice(0,3).map((p:any)=>`${p.name} (${p.score})`).join(" · ") || "Belum ada peserta"}</span></div><button onClick={() => sendAction("next")} disabled={actionLoading} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-8 py-3.5 text-base font-bold text-white hover:bg-emerald-500 transition shadow-lg"><span>{state.currentQuestionIndex + 1 >= state.totalQuestions ? "Lihat Pemenang & Podium" : "Soal Berikutnya"}</span><ArrowRight className="h-5 w-5" /></button></div>
          </div>
        )}

        {state.status === "podium" && (
          <div className="space-y-8 text-center py-4 animate-[fadeIn_.4s_ease]">
              <div className="space-y-2"><div className="inline-flex items-center gap-2 rounded-full bg-amber-500/20 border border-amber-500/40 px-4 py-1 text-xs font-bold text-amber-300 uppercase tracking-widest"><Sparkles className="h-4 w-4" /> Hasil Akhir</div><h2 className="text-3xl sm:text-5xl font-black text-white">Selamat Kepada Para Pemenang!</h2><p className="text-slate-400 text-sm">{state.templateTitle} selesai</p></div>
            <div className="grid grid-cols-3 gap-3 sm:gap-6 max-w-3xl mx-auto items-end pt-6">
              <div className="flex flex-col items-center animate-[rise_.6s_ease_.1s_both]"><div className="text-xs sm:text-sm font-bold text-slate-200 mb-1 truncate max-w-[120px]">{state.playersList[1]?.name || "—"}</div><div className="text-xs text-amber-300 font-mono mb-2">{state.playersList[1] ? `${state.playersList[1].score} pt` : ""}</div><div className="w-full rounded-t-2xl bg-slate-600 h-28 sm:h-36 flex flex-col items-center justify-center text-white"><Award className="h-7 w-7 mb-1" /><span className="text-2xl font-black">2</span></div></div>
              <div className="flex flex-col items-center animate-[rise_.7s_ease_both]"><Crown className="h-9 w-9 text-amber-300 animate-bounce mb-1 drop-shadow" /><div className="text-sm sm:text-base font-extrabold text-amber-300 mb-1 truncate max-w-[150px]">{state.playersList[0]?.name || "—"}</div><div className="text-xs sm:text-sm text-amber-200 font-mono font-bold mb-2">{state.playersList[0] ? `${state.playersList[0].score} pt` : ""}</div><div className="w-full rounded-t-2xl bg-gradient-to-t from-amber-600 to-amber-500 h-40 sm:h-52 flex flex-col items-center justify-center text-white shadow-2xl"><Trophy className="h-10 w-10 text-amber-100 mb-1" /><span className="text-4xl font-black">1</span></div></div>
              <div className="flex flex-col items-center animate-[rise_.6s_ease_.2s_both]"><div className="text-xs sm:text-sm font-bold text-slate-200 mb-1 truncate max-w-[120px]">{state.playersList[2]?.name || "—"}</div><div className="text-xs text-amber-300 font-mono mb-2">{state.playersList[2] ? `${state.playersList[2].score} pt` : ""}</div><div className="w-full rounded-t-2xl bg-amber-900 h-20 sm:h-28 flex flex-col items-center justify-center text-amber-100"><Award className="h-6 w-6 mb-1" /><span className="text-xl font-black">3</span></div></div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 max-w-2xl mx-auto text-left"><h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-3">Peringkat Seluruh Peserta</h3><div className="divide-y divide-slate-800 max-h-64 overflow-y-auto pr-1">{state.playersList.map((p:any, idx:number)=>(<div key={p.id} className="flex items-center justify-between py-2.5 text-sm"><div className="flex items-center gap-3 min-w-0"><span className="font-mono font-bold text-slate-500 w-7">#{idx+1}</span><span className="font-semibold text-white truncate">{p.name}</span></div><span className="font-mono font-bold text-emerald-400">{p.score} poin</span></div>))}</div></div>
            <div className="flex justify-center gap-3 sm:gap-4 pt-2 flex-wrap"><Link href="/admin?tab=games" className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white hover:bg-emerald-500 transition">Buka Sesi Baru</Link><Link href="/admin?tab=game-builder" className="rounded-xl bg-slate-800 border border-slate-700 px-6 py-3 text-sm font-bold text-slate-200 hover:bg-slate-700 transition">Kembali ke Kelola Game</Link></div>
          </div>
        )}

        {state.status === "closed" && (<div className="text-center py-20 space-y-4"><h2 className="text-2xl font-bold text-white">Sesi Kuis Telah Ditutup</h2><p className="text-sm text-slate-400">Terima kasih.</p><Link href="/admin?tab=game-builder" className="inline-block rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white hover:bg-emerald-500">Kembali ke Kelola Game</Link></div>)}
      </main>
      <style jsx global>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes slideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}@keyframes pop{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}@keyframes rise{from{opacity:0;transform:translateY(24px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}`}</style>
    </div>
  );
}
