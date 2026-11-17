"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Gamepad2, CheckCircle2, XCircle, Clock, Trophy, Loader2, ArrowRight, Send, Leaf, Sun, BookOpen, Sparkles } from "lucide-react";
import confetti from "canvas-confetti";

type Q = any;
interface PlayerInfo { id: string; name: string; score: number; avatarId?: string; team?: string; }
interface SessionState { pin: string; templateTitle: string; status: "lobby" | "question" | "reveal" | "podium" | "closed"; currentQuestionIndex: number; totalQuestions: number; questionStartedAt: number; timeLimitSec: number; currentQuestion: Q | null; playersList: PlayerInfo[]; teamScores?: { team: string; score: number; players: number }[]; }

const SHAPES = [
  { symbol: "○", bg: "bg-red-500 hover:bg-red-600" },
  { symbol: "△", bg: "bg-blue-500 hover:bg-blue-600" },
  { symbol: "□", bg: "bg-amber-500 hover:bg-amber-600" },
  { symbol: "◇", bg: "bg-emerald-600 hover:bg-emerald-700" },
];

function shuffle<T>(arr: T[]): T[] { const a = [...arr]; for (let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }

export default function PlayerLiveGameClient({ pin }: { pin: string }) {
  const router = useRouter();
  const [playerId, setPlayerId] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [playerAvatarId, setPlayerAvatarId] = useState("leaf");
  const [playerTeam, setPlayerTeam] = useState("forest");
  const [state, setState] = useState<SessionState | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [lastPoints, setLastPoints] = useState<number | null>(null);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [flash, setFlash] = useState<"correct" | "wrong" | null>(null);
  const [mediaLoadFailed, setMediaLoadFailed] = useState(false);
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

  useEffect(() => setMediaLoadFailed(false), [state?.currentQuestionIndex, state?.status]);

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
    try { const p = JSON.parse(raw); setPlayerId(p.playerId); setPlayerName(p.playerName); setPlayerAvatarId(p.avatarId || "leaf"); setPlayerTeam(p.team || "forest"); } catch { router.push(`/game/join?pin=${pin}`); }
  }, [pin, router]);

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
      confetti({ particleCount: 140, spread: 100, origin: { y: 0.6 }, colors: ["#F59E0B", "#14532D", "#ffffff"] });
      setTimeout(() => confetti({ particleCount: 80, spread: 120, origin: { y: 0.5 } }), 400);
    }
  }, [state?.status]);

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
  const myRank = state ? state.playersList.findIndex((p) => p.id === playerId) + 1 : 0;

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
          <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${playerTeam === "forest" ? "bg-emerald-600 text-white" : "bg-amber-400 text-amber-950"}`}>{playerAvatarId === "sun" ? <Sun className="h-4 w-4" /> : playerAvatarId === "bird" ? <Sparkles className="h-4 w-4" /> : playerAvatarId === "book" ? <BookOpen className="h-4 w-4" /> : <Leaf className="h-4 w-4" />}</div>
          <div>
            <p className="text-xs font-bold text-white leading-tight truncate max-w-[180px]">{playerName}</p>
            <p className="text-[10px] text-slate-400">PIN: {state.pin}</p>
            <p className="text-[10px] font-bold text-emerald-300">Tim {playerTeam === "forest" ? "Daun" : "Mentari"}</p>
          </div>
        </div>
        {myPlayerInfo && (<div className="flex items-center gap-2"><span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs font-mono font-bold text-amber-400 border border-slate-700">{myPlayerInfo.score} pt</span>{myRank > 0 && <span className="rounded-full bg-slate-800 px-2 py-1 text-[11px] font-bold text-slate-300">#{myRank}</span>}</div>)}
      </header>

      <main className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8">
        {state.status === "lobby" && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-5 animate-[fadeIn_.4s_ease] min-h-[60vh]">
            <div className="h-24 w-24 rounded-3xl bg-emerald-600/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-300 animate-pulse shadow-[0_0_40px_rgba(16,185,129,.25)]"><Gamepad2 className="h-12 w-12" /></div>
            <div><h1 className="text-3xl font-black text-white">Kamu Sudah Masuk!</h1><p className="text-sm text-slate-300 mt-2 leading-relaxed">Tunggu sebentar ya, <strong className="text-white">{playerName}</strong>. Host akan segera memulai.</p></div>
            <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 w-full max-w-xl text-xs text-slate-300">Game: <span className="font-bold text-emerald-400">{state.templateTitle}</span><br/>Peserta: <span className="font-bold text-white">{state.playersList.length} orang</span><br/>Tim kamu: <span className="font-bold text-white">{playerTeam === "forest" ? "Daun" : "Mentari"}</span></div>
          </div>
        )}

        {state.status === "question" && q && (
          <div className="flex-1 flex flex-col py-2 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-300 px-1"><span>Soal {state.currentQuestionIndex + 1} / {state.totalQuestions}</span><span className="font-semibold text-emerald-400">{Math.max(1, state.timeLimitSec || 20)}s</span></div>
            {q.mediaUrl && (mediaLoadFailed ? <p role="status" className="text-sm text-amber-300">Gambar soal tidak dapat dimuat.</p> : <img src={q.mediaUrl} alt="Gambar soal" onError={() => setMediaLoadFailed(true)} className="w-full max-h-40 object-contain rounded-xl border border-slate-700 bg-slate-900"/>)}
            <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-3 text-sm text-white font-semibold leading-relaxed">{q.question || q.prompt}{q.sentence ? <div className="mt-2 text-emerald-300">{q.sentence}</div> : null}{q.hint ? <div className="mt-1 text-xs text-slate-400">Petunjuk: {q.hint}</div> : null}</div>

            {!hasSubmitted ? (
              <div className="flex-1 flex flex-col gap-2">
                {isChoice && (
                  <div className="grid grid-cols-2 gap-3 flex-1 min-h-[260px]">
                    {(q.options||[]).slice(0,4).map((opt:string, idx:number) => {
                      if (opt == null) return null;
                      const btn = SHAPES[idx];
                      const active = isMulti ? selectedOptions.includes(idx) : selectedOption===idx;
                      return (
                        <button key={idx} type="button" onClick={() => { if(isMulti){ setSelectedOptions(s=> s.includes(idx)? s.filter(x=>x!==idx): [...s,idx]); } else { setSelectedOption(idx); } }} className={`${btn.bg} ${active?"ring-4 ring-white/70":""} flex min-h-[120px] flex-col items-center justify-center rounded-2xl p-2 text-white shadow-lg transition active:scale-95`}>
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
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-6 animate-[fadeIn_.4s_ease]">
            <div className="h-24 w-24 rounded-full bg-amber-500/20 border-2 border-amber-300 flex items-center justify-center text-amber-300 shadow-xl animate-[trophy_.9s_ease_infinite_alternate]"><Trophy className="h-12 w-12" /></div>
            <div className="space-y-2"><h2 className="text-3xl font-black text-white">Kuis Selesai!</h2><p className="text-sm text-slate-300">Terima kasih sudah bermain.</p></div>
            <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-6 w-full space-y-3 shadow-lg"><div className="text-xs text-slate-400 uppercase tracking-wider font-bold">Pencapaian Akhirmu</div><div className="text-4xl font-black text-amber-300">Peringkat #{myRank || "-"}</div><div className="text-sm font-bold text-slate-200">Total Skor: <span className="text-emerald-400">{myPlayerInfo?.score || 0}</span> Poin</div></div>
            <Link href="/game" className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white hover:bg-emerald-500 transition shadow min-h-[44px]"><span>Kembali ke Menu Game</span><ArrowRight className="h-4 w-4" /></Link>
          </div>
        )}

        {state.status === "closed" && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-4"><h2 className="text-xl font-bold text-white">Sesi Kuis Ditutup</h2><p className="text-xs text-slate-400">Pengajar telah menutup sesi ini.</p><Link href="/game" className="rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white">Kembali ke Menu Game</Link></div>
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
