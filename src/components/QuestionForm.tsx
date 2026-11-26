"use client";

import { useState, type FormEvent } from "react";
import { Send } from "lucide-react";

type QuestionFormProps = { source?: "home" | "faq" };

export default function QuestionForm({ source = "home" }: QuestionFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [question, setQuestion] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "loading") return;
    setStatus("loading");
    setError("");
    try {
      const response = await fetch("/api/pertanyaan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, question, website, source }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Pertanyaan gagal dikirim. Coba lagi.");
      setName(""); setEmail(""); setQuestion(""); setWebsite("");
      setStatus("success");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Pertanyaan gagal dikirim. Coba lagi.");
      setStatus("error");
    }
  }

  const fieldClass = "mt-1.5 min-h-12 w-full rounded-lg border border-rule-strong bg-white px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:border-leaf focus:outline-none focus:ring-2 focus:ring-leaf/20";

  return <section aria-labelledby={`question-form-title-${source}`} className="rounded-xl border border-rule bg-white p-5 sm:p-7">
    <div className="mx-auto max-w-2xl">
      <h2 id={`question-form-title-${source}`} className="font-display text-2xl font-bold text-leaf">Ada pertanyaan?</h2>
      <p className="mt-2 text-sm leading-6 text-body">Kirim pertanyaan Anda. Kami akan membalas lewat email.</p>
      {status === "success" ? <div role="status" className="mt-5 rounded-lg border border-[#d3e0d3] bg-[#eef3ee] p-4 text-sm font-semibold text-leaf">Pertanyaan terkirim. Kami akan membalas lewat email.</div> : <form onSubmit={submit} className="mt-5 space-y-4">
        <label className="block text-sm font-bold text-ink">Nama<input required minLength={2} maxLength={120} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} className={fieldClass} /></label>
        <label className="block text-sm font-bold text-ink">Email (untuk balasan)<input required type="email" maxLength={254} autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className={fieldClass} /></label>
        <label className="block text-sm font-bold text-ink">Pertanyaan<textarea required minLength={5} maxLength={1000} rows={5} value={question} onChange={(event) => setQuestion(event.target.value)} className={`${fieldClass} min-h-32 resize-y`} /><span className="mt-1 block text-right text-xs font-normal text-muted">{question.length}/1000</span></label>
        <div aria-hidden="true" className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden"><label>Website<input tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} /></label></div>
        {status === "error" && <p role="alert" className="rounded-lg border border-[#c62828]/25 bg-[#fff2ec] p-3 text-sm font-semibold text-[#8c241d]">{error}</p>}
        <button type="submit" disabled={status === "loading"} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-earth px-5 text-sm font-extrabold text-white transition-colors hover:bg-[#9f3825] disabled:cursor-wait disabled:opacity-65">
          <Send aria-hidden="true" className="h-4 w-4" />{status === "loading" ? "Mengirim…" : status === "error" ? "Coba lagi" : "Kirim pertanyaan"}
        </button>
      </form>}
    </div>
  </section>;
}
