"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Gamepad2, CheckCircle2, XCircle, Clock, Trophy, Loader2, ArrowRight, Send, Volume2, Crown, Medal } from "lucide-react";
import confetti from "canvas-confetti";
import { markGuestGameCompleted } from "@/lib/guest-game-progress";

type Q = any;
interface PlayerInfo { id: string; name: string; score: number; }
interface SessionState { pin: string; gameId?: string; templateTitle: string; status: "lobby" | "question" | "reveal" | "podium" | "closed"; currentQuestionIndex: number; totalQuestions: number; questionStartedAt: number; timeLimitSec: number; currentQuestion: Q | null; playersList: PlayerInfo[]; }

const SHAPES = [
  { symbol: "○", bg: "bg-red-500 hover:bg-red-600" },
  { symbol: "△", bg: "bg-blue-500 hover:bg-blue-600" },
  { symbol: "□", bg: "bg-amber-500 hover:bg-amber-600" },
  { symbol: "◇", bg: "bg-emerald-600 hover:bg-emerald-700" },
];

function shuffle<T>(arr: T[]): T[] { const a = [...arr]; for (let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }

export default function PlayerLiveGameClient({ pin, guestMode: initialGuestMode = false, guestParticipantId, saveHistory = false }: { pin: string; guestMode?: boolean; sessionMode?: boolean; guestParticipantId?: string; saveHistory?: boolean }) {
  const router = useRouter();
  const [playerId, setPlayerId] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [guestMode, setGuestMode] = useState(initialGuestMode);
  const [scanEntry, setScanEntry] = useState(false);
  const [closeFallback, setCloseFallback] = useState(false);
  const [scoreHistoryStatus, setScoreHistoryStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [scoreHistoryAttempt, setScoreHistoryAttempt] = useState(0);
  const [state, setState] = useState<SessionState | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [lastPoints, setLastPoints] = useState<number | null>(null);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [flash, setFlash] = useState<"correct" | "wrong" | null>(null);
  // answer states
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);
  const [textAnswer, setTextAnswer] = useState("");
  const [pairSel, setPairSel] = useState<Record<string,string>>({});
  const [wordOrder, setWordOrder] = useState<string[]>([]);
  const [wordPool, setWordPool] = useState<string[]>([]);
  const questionStartTimeRef = useRef(Date.now());
  const currentQIndexRef = useRef(-1);
  const revealedForRef = useRef<number>(-1);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const savedLiveScoreRef = useRef<string | null>(null);


  function playTone(ok: boolean) {
    try {
      const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
      if (!Ctx) return;
      if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
      const ctx = audioCtxRef.current;
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = ok ? "triangle" : "sawtooth"; o.frequency.value = ok ? 880 : 220;
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + (ok ? 0.25 : 0.35));
      o.start(); o.stop(ctx.currentTime + (ok ? 0.26 : 0.36));
    } catch {}
  }

  useEffect(() => {
    const raw = sessionStorage.getItem(`sapen_game_${pin}`);
    if (!raw) { router.push(`/game/join?pin=${pin}`); return; }
    try { const p = JSON.parse(raw); setPlayerId(p.playerId); setPlayerName(p.playerName); setGuestMode(initialGuestMode || p.guestMode === true); setScanEntry(p.entry === "scan"); } catch { router.push(`/game/join?pin=${pin}`); }
  }, [initialGuestMode, pin, router]);

  useEffect(() => {
    const evtSource = new EventSource(`/api/game/live/${pin}/stream`);
    evtSource.onmessage = (event) => {
      try {
        const data: SessionState = JSON.parse(event.data);
        setState(data);
        if (data.status === "question" && data.currentQuestionIndex !== currentQIndexRef.current) {
          currentQIndexRef.current = data.currentQuestionIndex;
          setHasSubmitted(false); setLastPoints(null); setLastCorrect(null); setFlash(null);
          setSelectedOption(null); setSelectedOptions([]); setTextAnswer(""); setPairSel({});
          const q = data.currentQuestion;
          const words = (q?.words || (q?.sentence ? String(q.sentence).split(/\s+/) : [])).filter(Boolean);
          setWordPool(shuffle(words)); setWordOrder([]);
          questionStartTimeRef.current = Date.now();
        }
      } catch {}
    };
    return () => evtSource.close();
  }, [pin]);

  useEffect(() => {
    if (!state || state.status !== "reveal" || !state.currentQuestion) return;
    if (revealedForRef.current === state.currentQuestionIndex) return;
    revealedForRef.current = state.currentQuestionIndex;
    if (lastCorrect == null) return;
    setFlash(lastCorrect ? "correct" : "wrong");
    playTone(lastCorrect);
    if (lastCorrect) confetti({ particleCount: 80, spread: 70, origin: { y: 0.7 }, colors: ["#22c55e", "#14532D", "#F59E0B", "#ffffff"] });
    const t = setTimeout(() => setFlash(null), 900);
    return () => clearTimeout(t);
  }, [state?.status, state?.currentQuestionIndex, state?.currentQuestion, lastCorrect]);

  useEffect(() => {
    if (state?.status === "podium") {
      if (guestMode && guestParticipantId && state.gameId) markGuestGameCompleted(guestParticipantId, state.gameId);
      const ownScore = state.playersList.find((player) => player.id === playerId);
      const scoreKey = `${pin}:${playerId}:${state.gameId || ""}:${scoreHistoryAttempt}`;
      if (saveHistory && ownScore && state.gameId && savedLiveScoreRef.current !== scoreKey) {
        savedLiveScoreRef.current = scoreKey;
        setScoreHistoryStatus("saving");
        void fetch("/api/game/score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gameId: state.gameId, gameTitle: state.templateTitle || "Kuis sesi", score: ownScore.score }),
        }).then(async (response) => {
          const result = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(result.error || "Skor belum tersimpan.");
          setScoreHistoryStatus("saved");
        }).catch(() => setScoreHistoryStatus("error"));
      }
      confetti({ particleCount: 140, spread: 100, origin: { y: 0.6 }, colors: ["#F59E0B", "#14532D", "#ffffff"] });
      setTimeout(() => confetti({ particleCount: 80, spread: 120, origin: { y: 0.5 } }), 400);
    }
  }, [guestMode, guestParticipantId, playerId, pin, saveHistory, scoreHistoryAttempt, state?.gameId, state?.playersList, state?.status, state?.templateTitle]);

  async function submit(payload: any) {
    if (hasSubmitted || !state || state.status !== "question") return;
    setHasSubmitted(true);
    const timeTakenMs = Date.now() - questionStartTimeRef.current;
    try {
      const res = await fetch(`/api/game/live/${pin}/answer`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ playerId, questionIndex: state.currentQuestionIndex, timeTakenMs, ...payload }) });
      const data = await res.json();
      if (res.ok && data.ok) { if (typeof data.points === "number") setLastPoints(data.points); setLastCorrect(Boolean(data.isCorrect)); }
      else { setLastCorrect(false); }
    } catch { setLastCorrect(false); }
  }

  const q = state?.currentQuestion;
  const qType = q?.type || "kuis_live";
  const myPlayerInfo = state?.playersList.find((p) => p.id === playerId);
  const rankedPlayers = useMemo(() => [...(state?.playersList || [])].sort((a, b) => b.score - a.score), [state?.playersList]);
  const myRank = rankedPlayers.findIndex((p) => p.id === playerId) + 1;

  const returnFromGame = () => {
    if (!scanEntry) { router.push("/"); return; }
    window.close();
    window.setTimeout(() => { if (!window.closed) setCloseFallback(true); }, 250);
  };

  const revealCorrectText = useMemo(() => {
    if (!q) return "";
    if (q.correctAnswer) return String(q.correctAnswer);
    if (Array.isArray(q.correctIndexes) && q.correctIndexes.length && Array.isArray(q.options)) return q.correctIndexes.map((i:number)=>q.options[i]).filter(Boolean).join(", ");
    if (q.correctIndex != null && Array.isArray(q.options)) return q.options[q.correctIndex] || "";
    if (q.correctPairs) return (q.correctPairs||[]).map((p:any)=>`${p.left}?${p.right}`).join(", ");
    if (q.correctWords) return (q.correctWords||[]).join(" ");
    return "";
  }, [q]);

  if (!state || !playerId) return (<div className="workbook-page flex min-h-screen items-center justify-center p-6 text-center"><div><Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-leaf" /><p className="text-sm font-semibold text-body">Menghubungkan ke ruang kelas #{pin}...</p></div></div>);

  const isChoice = qType === "kuis_live" || (qType === "tebak_gambar" && Array.isArray(q?.options) && q.options.filter(Boolean).length > 0);
  const isMulti = isChoice && q?.choiceMode === "multiple";
  const lefts = (q?.pairs||[]).map((p:any)=>p.left);
  const rights = Array.from(new Set((q?.pairs||[]).map((p:any)=>p.right)));

  return (
    <div className={`workbook-live flex min-h-screen w-full max-w-[1200px] select-none flex-col bg-paper transition-all ${flash === "correct" ? "bg-emerald-900/40 ring-4 ring-emerald-400/60" : ""} ${flash === "wrong" ? "animate-[shake_.35s_ease]" : ""}`}>
      <header className="bg-slate-950/80 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white"><Gamepad2 className="h-4 w-4" /></div>
          <div>
            <p className="text-xs font-bold text-white leading-tight truncate max-w-[180px]">{playerName}</p>
            <p className="text-[10px] text-slate-400">PIN: {state.pin}</p>
          </div>
        </div>
        {myPlayerInfo && (<div className="flex items-center gap-2"><span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs font-mono font-bold text-amber-400 border border-slate-700">{myPlayerInfo.score} pt</span>{myRank > 0 && <span className="rounded-full bg-slate-800 px-2 py-1 text-[11px] font-bold text-slate-300">#{myRank}</span>}</div>)}
      </header>

      <main className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8">
        {state.status === "lobby" && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-5 animate-[fadeIn_.4s_ease] min-h-[60vh]">
            <div className="h-24 w-24 rounded-3xl bg-emerald-600/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-300 animate-pulse shadow-[0_0_40px_rgba(16,185,129,.25)]"><Gamepad2 className="h-12 w-12" /></div>
            <div><h1 className="text-3xl font-black text-white">Kamu Sudah Masuk!</h1><p className="text-sm text-slate-300 mt-2 leading-relaxed">Tunggu sebentar ya, <strong className="text-white">{playerName}</strong>. Host akan segera memulai.</p></div>
            <div className="w-full max-w-xl rounded-xl border border-slate-700 bg-slate-900/70 p-4 text-xs text-slate-300">Kuis: <span className="font-bold text-emerald-400">{state.templateTitle}</span><br/>Peserta: <span className="font-bold text-white">{state.playersList.length} orang</span></div>
          </div>
        )}

        {state.status === "question" && q && (
          <div className="flex-1 flex flex-col py-2 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-300 px-1"><span>Soal {state.currentQuestionIndex + 1} / {state.totalQuestions}</span><span className="font-semibold text-emerald-400">{Math.max(1, state.timeLimitSec || 20)}s</span></div>
            <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-3 text-sm text-white font-semibold leading-relaxed">{q.imageUrl && <img src={String(q.imageUrl)} alt="Gambar soal" className="mb-3 max-h-[42vh] w-full rounded-lg object-contain" />}<div className="flex items-start justify-between gap-3"><span>{q.question || q.prompt}</span>{q.audioText && <button type="button" aria-label="Putar audio soal" onClick={() => { if ("speechSynthesis" in window) { window.speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(String(q.audioText)); utterance.lang = "en-US"; window.speechSynthesis.speak(utterance); } }} className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg border border-emerald-400/40 px-3 text-xs font-bold text-emerald-300 hover:bg-emerald-400/10"><Volume2 className="h-4 w-4" />Dengarkan</button>}</div>{q.sentence ? <div className="mt-2 text-emerald-300">{q.sentence}</div> : null}{q.hint ? <div className="mt-1 text-xs text-slate-400">Petunjuk: {q.hint}</div> : null}</div>

            {!hasSubmitted ? (
              <div className="flex-1 flex flex-col gap-2">
                {isChoice && (
                  <div className="grid grid-cols-2 gap-3 flex-1 min-h-[260px]">
                    {(q.options||[]).slice(0,4).map((opt:string, idx:number) => {
                      if (opt == null) return null;
                      const btn = SHAPES[idx];
                      const active = isMulti ? selectedOptions.includes(idx) : selectedOption===idx;
                      return (
                        <button key={idx} type="button" onClick={() => { if(isMulti){ setSelectedOptions(s=> s.includes(idx)? s.filter(x=>x!==idx): [...s,idx]); } else { setSelectedOption(idx); } }} className={`${btn.bg} ${active?"ring-4 ring-white/70":""} flex min-h-[120px] flex-col items-center justify-center rounded-2xl p-2 text-white shadow-lg transition`}>
                          <span className="text-4xl font-black mb-1 drop-shadow-md">{btn.symbol}</span>
                          <span className="text-[11px] font-bold text-center leading-snug line-clamp-3">{opt || `Opsi ${idx+1}`}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
                {(qType === "tebak_kata" || qType === "duel_kata_cepat" || qType === "kata_hilang" || (qType === "tebak_gambar" && !isChoice)) && (
                  <div className="space-y-2">
                    <input value={textAnswer} onChange={e=>setTextAnswer(e.target.value)} placeholder="Ketik jawabanmu..." className="w-full rounded-xl border border-slate-600 bg-slate-900 px-4 py-3 text-white focus:outline-none focus:border-emerald-400"/>
                  </div>
                )}
                {qType === "pasangkan_kata" && (
                  <div className="space-y-2">
                    {lefts.map((l:string)=> (
                      <div key={l} className="flex items-center gap-2">
                        <div className="flex-1 rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-white border border-slate-700">{l}</div>
                        <select value={pairSel[l]||""} onChange={e=>setPairSel(s=>({...s,[l]:e.target.value}))} className="flex-1 rounded-lg border border-slate-600 bg-slate-900 px-2 py-2 text-xs text-white">
                          <option value="">Pilih pasangan</option>
                          {rights.map((r:any)=> <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                )}
                {qType === "susun_kalimat" && (
                  <div className="space-y-2">
                    <div className="min-h-[56px] rounded-xl border border-emerald-500/40 bg-slate-900 p-2 flex flex-wrap gap-2">
                      {wordOrder.length===0 && <span className="text-xs text-slate-500">Ketuk kata di bawah untuk menyusun...</span>}
                      {wordOrder.map((w,i)=> (<button key={`${w}-${i}`} type="button" onClick={()=>{ setWordOrder(o=>o.filter((_,idx)=>idx!==i)); setWordPool(p=>[...p,w]); }} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white">{w}</button>))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {wordPool.map((w,i)=> (<button key={`${w}-${i}`} type="button" onClick={()=>{ setWordPool(p=>p.filter((_,idx)=>idx!==i)); setWordOrder(o=>[...o,w]); }} className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-bold text-white">{w}</button>))}
                    </div>
                  </div>
                )}
                <button type="button" disabled={isChoice ? (isMulti? selectedOptions.length===0 : selectedOption==null) : (qType==="pasangkan_kata"? lefts.some((l:string)=>!pairSel[l]) : (qType==="susun_kalimat"? wordOrder.length===0 : textAnswer.trim().length===0))} onClick={()=>{
                  if (isChoice) { if(isMulti) submit({ optionIndexes: selectedOptions }); else submit({ optionIndex: selectedOption }); }
                  else if (qType === "pasangkan_kata") submit({ pairs: lefts.map((l:string)=>({left:l,right:pairSel[l]||""})) });
                  else if (qType === "susun_kalimat") submit({ words: wordOrder, textAnswer: wordOrder.join(" ") });
                  else submit({ textAnswer });
                }} className="mt-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#14532D] px-4 py-3 text-sm font-extrabold text-white disabled:opacity-40 min-h-[48px]"><Send className="h-4 w-4"/>Kirim Jawaban</button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-4 rounded-2xl bg-slate-900/80 border border-slate-700">
                <div className="h-16 w-16 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400"><CheckCircle2 className="h-8 w-8" /></div>
                <div><h3 className="text-xl font-bold text-white">Jawaban Terkirim!</h3><p className="text-xs text-slate-400 mt-1">Menunggu host membuka jawaban...</p></div>
              </div>
            )}
          </div>
        )}

        {state.status === "reveal" && q && (
          <div className="flex-1 flex flex-col justify-center text-center p-4 space-y-5 animate-[fadeIn_.3s_ease]">
            {lastCorrect == null ? (
              <div className="rounded-3xl bg-slate-900 border border-slate-700 p-8 space-y-3"><Clock className="h-12 w-12 text-slate-400 mx-auto" /><h3 className="text-xl font-bold text-white">Waktu Habis</h3><p className="text-xs text-slate-400">Kamu tidak sempat menjawab.</p></div>
            ) : lastCorrect ? (
              <div className="rounded-3xl bg-emerald-950/70 border-2 border-emerald-400 p-8 space-y-4 shadow-[0_0_40px_rgba(34,197,94,.25)]"><div className="h-20 w-20 rounded-full bg-emerald-500 flex items-center justify-center text-white mx-auto shadow-lg"><CheckCircle2 className="h-12 w-12" /></div><h2 className="text-3xl font-black text-white">BENAR!</h2>{lastPoints != null && <div className="inline-block rounded-2xl bg-emerald-600 px-6 py-2.5 text-lg font-black text-white animate-[floatUp_.6s_ease]">+{lastPoints} Poin</div>}</div>
            ) : (
              <div className="rounded-3xl bg-red-950/70 border-2 border-red-400 p-8 space-y-4 animate-[shake_.35s_ease]"><div className="h-20 w-20 rounded-full bg-red-500 flex items-center justify-center text-white mx-auto shadow-lg"><XCircle className="h-12 w-12" /></div><h2 className="text-3xl font-black text-white">BELUM TEPAT</h2><p className="text-xs text-red-200">Tetap semangat!</p></div>
            )}
            {revealCorrectText && <div className="rounded-xl border border-emerald-600/40 bg-emerald-950/40 p-4 text-left text-xs text-emerald-100"><p className="font-bold text-emerald-300 mb-1">Jawaban benar:</p><p className="leading-relaxed font-semibold">{revealCorrectText}</p></div>}
            {q.explanation && <div className="rounded-xl border border-slate-700 bg-slate-900/90 p-4 text-left text-xs text-slate-200"><p className="font-bold text-amber-300 mb-1">Penjelasan:</p><p className="leading-relaxed">{q.explanation}</p></div>}
            <p className="text-xs text-slate-400 animate-pulse">Menunggu host melanjutkan...</p>
          </div>
        )}

        {state.status === "podium" && (
          <div className="relative isolate flex-1 overflow-hidden rounded-3xl bg-[radial-gradient(ellipse_at_top,#28523d_0%,#173627_42%,#10251c_100%)] px-4 py-8 text-center text-white sm:px-8 sm:py-10 animate-[fadeIn_.4s_ease]">
            <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full border border-amber-200/10" />
            <div className="relative mx-auto max-w-3xl space-y-6">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-amber-200/30 bg-amber-300/15 text-amber-200 shadow-lg sm:h-20 sm:w-20"><Trophy className="h-9 w-9 sm:h-11 sm:w-11" /></div>
              <div><p className="text-xs font-bold uppercase tracking-[.18em] text-amber-200">Kuis selesai</p><h2 className="mt-2 font-display text-3xl font-bold sm:text-4xl">Kerja bagus, {playerName}!</h2><p className="mt-2 text-sm text-white/75">Inilah peringkat akhir untuk {state.templateTitle}.</p></div>
              <div className="grid gap-3 text-left sm:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)]">
                <section className="rounded-2xl border border-white/10 bg-white/[.07] p-5 sm:p-6"><div className="flex items-center gap-2 text-sm font-bold text-amber-100"><Crown className="h-4 w-4" />Pencapaianmu</div><p className="mt-4 font-display text-4xl font-bold text-amber-200">#{myRank || "—"}</p><p className="mt-1 text-sm text-white/75">{myPlayerInfo?.score || 0} poin</p><div className="mt-4 h-px bg-white/10" /><p className="mt-3 text-xs leading-5 text-white/70">Skor dihitung dari ketepatan dan kecepatan jawaban.</p></section>
                <section aria-label="Leaderboard akhir" className="rounded-2xl border border-white/10 bg-[#0d1d17]/55 p-4 sm:p-5"><h3 className="flex items-center gap-2 text-sm font-bold text-white"><Medal className="h-4 w-4 text-amber-200" />Peringkat peserta</h3>{rankedPlayers.length ? <ol className="mt-3 space-y-2">{rankedPlayers.slice(0, 5).map((player, index) => <li key={player.id} className={`flex min-h-12 items-center gap-3 rounded-xl px-3 py-2 ${player.id === playerId ? "bg-amber-200/15 ring-1 ring-amber-200/35" : "bg-white/[.05]"}`}><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-black ${index === 0 ? "bg-amber-300 text-[#38260a]" : index === 1 ? "bg-slate-200 text-slate-800" : index === 2 ? "bg-orange-300 text-orange-950" : "bg-white/10 text-white/75"}`}>{index + 1}</span><span className="min-w-0 flex-1 truncate text-sm font-semibold">{player.name}{player.id === playerId && <span className="ml-1 text-xs text-amber-200">(kamu)</span>}</span><span className="shrink-0 text-sm font-bold tabular-nums text-amber-100">{player.score} pt</span></li>)}</ol> : <p className="mt-3 text-sm text-white/70">Belum ada skor peserta.</p>}</section>
              </div>
              {saveHistory && scoreHistoryStatus !== "idle" && <div><p role="status" className={`text-sm font-semibold ${scoreHistoryStatus === "error" ? "text-amber-100" : "text-emerald-100"}`}>{scoreHistoryStatus === "saving" ? "Menyimpan skor ke Riwayat Kuis…" : scoreHistoryStatus === "saved" ? "Skor tersimpan di Riwayat Kuis akun Anda." : "Skor belum tersimpan. Periksa koneksi lalu coba lagi."}</p>{scoreHistoryStatus === "error" && <button type="button" onClick={() => { savedLiveScoreRef.current = null; setScoreHistoryAttempt((attempt) => attempt + 1); }} className="mt-3 inline-flex min-h-11 items-center rounded-lg border border-white/40 px-4 text-sm font-bold text-white hover:bg-white/10">Coba simpan lagi</button>}</div>}
              {closeFallback && <p role="status" className="rounded-xl border border-amber-200/25 bg-amber-100/10 px-4 py-3 text-sm text-amber-50">Browser tidak mengizinkan halaman ini menutup tab. Silakan tutup tab secara manual.</p>}
              <button type="button" onClick={returnFromGame} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#c24a31] px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-[#a83d2a]  focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-100">{scanEntry ? "Selesai · tutup halaman" : "Kembali ke beranda"}{!scanEntry && <ArrowRight className="h-4 w-4" />}</button>
            </div>
          </div>
        )}

        {state.status === "closed" && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-4"><h2 className="text-xl font-bold text-white">Sesi Kuis Ditutup</h2><p className="text-sm text-slate-300">Pengajar telah menutup sesi ini.</p>{closeFallback && <p role="status" className="text-sm text-amber-100">Browser tidak mengizinkan halaman ini menutup tab. Silakan tutup tab secara manual.</p>}<button type="button" onClick={returnFromGame} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white hover:bg-emerald-500">{scanEntry ? "Tutup halaman" : "Kembali ke beranda"}{!scanEntry && <ArrowRight className="h-4 w-4" />}</button></div>
        )}
      </main>

      <style jsx global>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes pop { from { opacity: 0; transform: scale(.96) } to { opacity: 1; transform: scale(1) } }
        @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 40%{transform:translateX(6px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }
        @keyframes floatUp { from { opacity:0; transform: translateY(10px) scale(.98) } to { opacity:1; transform: translateY(0) scale(1) } }
        @keyframes trophy { from { transform: rotate(-4deg) scale(1) } to { transform: rotate(4deg) scale(1.05) } }
      `}</style>
    </div>
  );
}
