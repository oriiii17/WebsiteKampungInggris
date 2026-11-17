"use client";

import React, { useMemo, useState } from "react";
import { useAppDialog } from "@/components/AppDialogProvider";
import { RefreshCw, Search, UserCheck } from "lucide-react";

type Participant = {
  key: string;
  type: "warga" | "umum";
  name: string;
  email: string;
  rw?: string;
  blocked?: boolean;
};

interface Props {
  data: any;
  onRefresh: () => void;
  notify: (msg: string) => void;
}

export default function AdminCodesManager(props: Props) {
  const { data, onRefresh, notify } = props;
  const dialog = useAppDialog();
  const [query, setQuery] = useState("");
  const [grantClassId, setGrantClassId] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const classes = (data.classes || []) as any[];
  const enrollments = (data.enrollments || []) as any[];
  const subscriptions = (data.subscriptions || []) as any[];

  const participants: Participant[] = useMemo(() => {
    const list: Participant[] = [];
    for (const w of (data.warga || [])) {
      list.push({ key: `w:${w.id}`, type: "warga", name: w.namaPanggilan || "", email: "", rw: w.rw, blocked: w.isBlocked });
    }
    for (const u of (data.externalUsers || [])) {
      if (!u?.email) continue;
      list.push({ key: `u:${u.id}`, type: "umum", name: u.name || u.email, email: (u.email || "").toLowerCase() });
    }
    // include any subscriber emails not yet in externalUsers
    for (const s of subscriptions) {
      const email = (s.userEmail || "").toLowerCase();
      if (!email) continue;
      if (!list.some(p => p.email === email)) list.push({ key: `s:${email}`, type: "umum", name: s.userName || email, email });
    }
    // include any enrollment emails
    for (const e of enrollments) {
      const email = (e.userEmail || "").toLowerCase();
      if (!email) continue;
      if (!list.some(p => p.email === email)) list.push({ key: `e:${email}`, type: "umum", name: e.userName || email, email });
    }
    return list.sort((a,b)=>a.name.localeCompare(b.name));
  }, [data.warga, data.externalUsers, subscriptions, enrollments]);

  const filtered = participants.filter(p => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q) || (p.rw||"").toLowerCase().includes(q);
  });

  function statusFor(p: Participant) {
    if (p.type === "warga") {
      if (p.blocked) return { label: "Diblokir", tone: "bg-red-100 text-red-800" };
      return { label: "Warga (kode RW aktif)", tone: "bg-emerald-100 text-emerald-800" };
    }
    const now = Date.now();
    const subs = subscriptions.filter((s:any)=> (s.userEmail||"").toLowerCase()===p.email && s.status==="active" && (!s.expiresAt || new Date(s.expiresAt).getTime()>now));
    const enrs = enrollments.filter((e:any)=> (e.userEmail||"").toLowerCase()===p.email && e.status==="active" && (!e.expiresAt || new Date(e.expiresAt).getTime()>now));
    if (subs.length || enrs.length) return { label: `Aktif (${enrs.length} kelas)`, tone: "bg-emerald-100 text-emerald-800" };
    return { label: "Belum ada akses aktif", tone: "bg-amber-100 text-amber-800" };
  }

  async function grantClass(p: Participant) {
    if (p.type !== "umum" || !p.email) { notify("Ubah akses kelas hanya untuk peserta umum (ber-email). Warga dikelola via kode RW."); return; }
    if (!grantClassId) { notify("Pilih kelas terlebih dahulu."); return; }
    setBusy(p.key);
    try {
      const res = await fetch("/api/admin/enrollments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: p.email, name: p.name, classId: grantClassId }) });
      const json = await res.json().catch(()=>({}));
      if (!res.ok || !json.ok) throw new Error(json.error || `Gagal (HTTP ${res.status})`);
      notify(`Akses kelas diberikan ke ${p.email} & tersimpan di database.`);
      onRefresh();
    } catch (e:any) { await dialog.alert(`Gagal ubah akses:\n${e?.message || e}`); }
    finally { setBusy(null); }
  }

  async function revokeEnrollment(id: string) {
    if (!(await dialog.confirm("Cabut akses kelas ini?", "Cabut akses?"))) return;
    try {
      const res = await fetch(`/api/admin/enrollments?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const json = await res.json().catch(()=>({}));
      if (!res.ok || !json.ok) throw new Error(json.error || `Gagal (HTTP ${res.status})`);
      notify("Akses kelas dicabut.");
      onRefresh();
    } catch (e:any) { notify(`Gagal cabut akses: ${e?.message || e}`); }
  }

  return (
    <div className="mt-6 space-y-8">
      <section className="rounded-xl border border-[#E5E7EB] bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2"><UserCheck className="h-5 w-5 text-[#14532D]" /> Kelola Akses Peserta</h2>
            <p className="text-xs text-slate-500 mt-0.5">Cari peserta, lihat status akses kelas, ubah pendaftaran kelas, serta buat & bagikan kode.</p>
          </div>
          <button type="button" onClick={onRefresh} className="inline-flex items-center gap-2 rounded-lg border border-[#E5E7EB] px-3 py-2 text-xs font-bold hover:bg-[#FDFBF7]"><RefreshCw className="h-4 w-4" />Segarkan</button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-12">
          <div className="relative sm:col-span-5"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Cari peserta by nama/email/RW..." className="w-full rounded-lg border border-[#E5E7EB] py-2.5 pl-9 pr-3 text-sm focus:border-[#14532D] focus:outline-none" /></div>
          <div className="sm:col-span-4"><select value={grantClassId} onChange={(e)=>setGrantClassId(e.target.value)} className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2.5 text-sm"><option value="">Pilih kelas untuk beri/ubah akses…</option>{classes.map((c:any)=> <option key={c.id} value={c.id}>{c.title}</option>)}</select></div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-lg border border-[#E5E7EB]">
          <table className="w-full text-left text-xs text-gray-700">
            <thead className="border-b border-[#E5E7EB] bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-500"><tr><th className="px-4 py-3">Peserta</th><th className="px-4 py-3">Tipe</th><th className="px-4 py-3">Status Akses</th><th className="px-4 py-3">Akses Kelas Aktif</th><th className="px-4 py-3 text-right">Aksi</th></tr></thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {filtered.length === 0 ? (<tr><td colSpan={5} className="py-8 text-center text-xs text-gray-400">Tidak ada peserta yang cocok.</td></tr>) : filtered.map((p)=>{
                const st = statusFor(p);
                const myEnr = p.email ? enrollments.filter((e:any)=> (e.userEmail||"").toLowerCase()===p.email) : [];
                return (
                  <tr key={p.key} className="hover:bg-gray-50/70">
                    <td className="px-4 py-3"><p className="font-extrabold text-gray-900">{p.name || "(tanpa nama)"}</p><p className="text-[11px] text-gray-500">{p.email || p.rw || "-"}</p></td>
                    <td className="px-4 py-3"><span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700">{p.type === "warga" ? `Warga ${p.rw||""}` : "Peserta Umum"}</span></td>
                    <td className="px-4 py-3"><span className={`rounded px-2 py-0.5 text-[11px] font-bold ${st.tone}`}>{st.label}</span></td>
                    <td className="px-4 py-3">
                      {p.type !== "umum" ? <span className="text-[11px] text-gray-400">Akses via kode RW</span> : (
                        <div className="flex flex-wrap gap-1.5">
                          {myEnr.length === 0 ? <span className="text-[11px] text-gray-400">-</span> : myEnr.map((e:any)=>{
                            const cls = classes.find((c:any)=>c.id===e.classId);
                            const active = e.status==="active" && (!e.expiresAt || new Date(e.expiresAt).getTime()>Date.now());
                            return <span key={e.id} className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-bold ${active?"bg-emerald-50 text-emerald-800 border border-emerald-200":"bg-gray-100 text-gray-600"}`}>{cls?.title || e.classId}{active && <button type="button" onClick={()=>revokeEnrollment(e.id)} className="ml-1 text-red-600 hover:underline">cabut</button>}</span>;
                          })}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {p.type === "umum" ? (
                        <button type="button" title={!grantClassId ? "Pilih kelas dulu" : undefined} disabled={!grantClassId || busy===p.key} onClick={()=>grantClass(p)} className="rounded-lg bg-[#14532D] px-3 py-2 text-[11px] font-bold text-white disabled:opacity-40">{busy===p.key?"Menyimpan...":"Beri/Ubah Akses Kelas"}</button>
                      ) : <span className="text-[11px] text-gray-400">Kelola via RW</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
}
