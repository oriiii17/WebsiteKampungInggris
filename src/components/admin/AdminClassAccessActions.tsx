"use client";

import { useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useAppDialog } from "@/components/AppDialogProvider";

type ManagedClass = { id: string; title: string; isPublished?: boolean };
type Enrollment = { id: string; classId: string; userEmail: string; status: string; expiresAt?: string; paidAmountIdr?: number; source?: string };

export default function AdminClassAccessActions({
  email, name, classes, enrollments, notify, onRefresh,
}: {
  email: string;
  name: string;
  classes: ManagedClass[];
  enrollments: Enrollment[];
  notify: (message: string) => void;
  onRefresh: () => void;
}) {
  const dialog = useAppDialog();
  const [classId, setClassId] = useState("");
  const [busy, setBusy] = useState(false);
  const available = classes.filter((item) => item.isPublished && !enrollments.some((entry) => entry.classId === item.id && entry.status === "active" && (!entry.expiresAt || Date.parse(entry.expiresAt) > Date.now())));

  async function grant() {
    if (!classId || busy) return;
    setBusy(true);
    try {
      const response = await fetch("/api/admin/enrollments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ classId, email, name }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Akses kelas belum dapat diberikan.");
      notify(result.alreadyOwned ? "Peserta sudah memiliki akses kelas ini." : "Akses kelas berhasil diberikan.");
      setClassId("");
      onRefresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Akses kelas belum dapat diberikan.");
    } finally { setBusy(false); }
  }

  async function revoke(enrollment: Enrollment) {
    const title = classes.find((item) => item.id === enrollment.classId)?.title || "kelas ini";
    if (busy || !(await dialog.confirm(`Cabut akses “${title}” dari ${name}? Peserta tidak dapat membuka materi kelas ini setelah akses dicabut.`, "Cabut akses kelas?"))) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/enrollments?id=${encodeURIComponent(enrollment.id)}`, { method: "DELETE" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Akses kelas belum dapat dicabut.");
      notify("Akses kelas berhasil dicabut.");
      onRefresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Akses kelas belum dapat dicabut.");
    } finally { setBusy(false); }
  }

  const active = enrollments.filter((entry) => entry.status === "active" && (!entry.expiresAt || Date.parse(entry.expiresAt) > Date.now()));
  return <div className="grid min-w-0 gap-3">
    <div className="flex min-w-0 flex-wrap gap-1.5">{active.length ? active.map((entry) => <span key={entry.id} className="inline-flex max-w-full items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 py-1 pl-2.5 pr-1 text-xs font-semibold text-emerald-900"><span className="min-w-0 break-words">{classes.find((item) => item.id === entry.classId)?.title || entry.classId} · {entry.source === "admin" ? "Admin" : entry.source === "beli" || Number(entry.paidAmountIdr || 0) > 0 ? "Beli" : "Gratis"}</span><button type="button" aria-label={`Cabut akses ${classes.find((item) => item.id === entry.classId)?.title || "kelas"}`} title="Cabut akses kelas" disabled={busy} onClick={() => void revoke(entry)} className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-[#943520] hover:bg-[#f6e5df] disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" /></button></span>) : <span className="text-sm text-[#625f54]">Belum ada kelas</span>}</div>
    {available.length > 0 && <div className="flex min-w-0 flex-col gap-2 sm:flex-row"><select aria-label={`Pilih kelas untuk ${name}`} value={classId} onChange={(event) => setClassId(event.target.value)} className="min-h-11 min-w-0 flex-1 rounded-lg border border-[#c9bda7] bg-[#fffdf8] px-3 text-sm text-[#20251f]"><option value="">Pilih kelas untuk diberikan</option>{available.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select><button type="button" disabled={!classId || busy} onClick={() => void grant()} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#244b3a] px-3 text-sm font-bold text-white transition hover:bg-[#183b2d] disabled:cursor-not-allowed disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Beri akses</button></div>}
  </div>;
}
