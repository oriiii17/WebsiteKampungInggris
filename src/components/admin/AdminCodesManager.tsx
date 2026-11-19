"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppDialog } from "@/components/AppDialogProvider";
import { RefreshCw, Search, UserCheck, Users } from "lucide-react";

type Participant = {
  key: string;
  type: "warga" | "umum";
  name: string;
  email: string;
  rw?: string;
  blocked?: boolean;
};

type GuestParticipant = {
  id: string;
  name: string;
  whatsapp: string;
  status: "pending" | "approved" | "rejected" | string;
  registeredAt: string;
  sessionTitle: string;
  sessionCode: string;
  classTitle: string;
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
  const [activeList, setActiveList] = useState<"users" | "guests">("users");
  const [guestRows, setGuestRows] = useState<GuestParticipant[]>([]);
  const [guestQuery, setGuestQuery] = useState("");
  const [guestLoading, setGuestLoading] = useState(false);
  const [guestError, setGuestError] = useState("");

  const loadGuestParticipants = useCallback(async () => {
    setGuestLoading(true);
    setGuestError("");
    try {
      const response = await fetch("/api/admin/session-guests", { cache: "no-store" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Daftar Guest belum dapat dimuat.");
      setGuestRows(Array.isArray(result.guests) ? result.guests : []);
    } catch (error) {
      setGuestError(error instanceof Error ? error.message : "Daftar Guest belum dapat dimuat.");
    } finally {
      setGuestLoading(false);
    }
  }, []);

  useEffect(() => { void loadGuestParticipants(); }, [loadGuestParticipants]);

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
  const filteredGuests = guestRows.filter((guest) => {
    const q = guestQuery.trim().toLocaleLowerCase();
    return !q || [guest.name, guest.whatsapp, guest.sessionTitle, guest.sessionCode, guest.classTitle].some((value) => value.toLocaleLowerCase().includes(q));
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
      <section className="rounded-xl border border-[#d8d0c2] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-extrabold text-[#183b2d]"><UserCheck className="h-5 w-5 text-[#244b3a]" /> Peserta &amp; Akses Kelas</h2>
            <p className="mt-1 text-sm leading-5 text-[#625f54]">Kelola user reguler dan lihat peserta yang bergabung lewat sesi tatap muka secara terpisah.</p>
          </div>
          <button type="button" onClick={() => { onRefresh(); if (activeList === "guests") void loadGuestParticipants(); }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#c9bda7] px-3 py-2 text-sm font-bold text-[#244b3a] transition hover:bg-[#f8f3e9]"><RefreshCw className="h-4 w-4" />Segarkan</button>
        </div>

        <div role="group" aria-label="Jenis peserta" className="mt-5 flex gap-2 overflow-x-auto border-b border-[#e5dfd3] pb-px">
          <button type="button" aria-pressed={activeList === "users"} onClick={() => setActiveList("users")} className={`inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-bold transition ${activeList === "users" ? "border-[#244b3a] text-[#183b2d]" : "border-transparent text-[#625f54] hover:text-[#183b2d]"}`}><UserCheck className="h-4 w-4" />User reguler</button>
          <button type="button" aria-pressed={activeList === "guests"} onClick={() => setActiveList("guests")} className={`inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-bold transition ${activeList === "guests" ? "border-[#244b3a] text-[#183b2d]" : "border-transparent text-[#625f54] hover:text-[#183b2d]"}`}><Users className="h-4 w-4" />Peserta Guest<span className="rounded-full bg-[#e8eee5] px-2 py-0.5 text-xs text-[#244b3a]">{guestRows.length}</span></button>
        </div>

        {activeList === "users" && <div id="admin-participants-panel-users">
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
        </div>}

        {activeList === "guests" && <div id="admin-participants-panel-guests" className="mt-4 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div><h3 className="flex items-center gap-2 font-bold text-[#183b2d]"><Users className="h-4 w-4" />Peserta sesi tatap muka</h3><p className="mt-1 text-sm text-[#625f54]">Nama, kontak, dan sesi yang mereka ikuti.</p></div>
            <label className="relative block w-full sm:max-w-xs"><span className="sr-only">Cari peserta Guest</span><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#625f54]" /><input value={guestQuery} onChange={(event) => setGuestQuery(event.target.value)} placeholder="Cari nama, nomor, atau sesi" className="min-h-11 w-full rounded-lg border border-[#c9bda7] bg-[#fdf9f0] py-2.5 pl-9 pr-3 text-sm text-[#20251f] placeholder:text-[#625f54] focus:border-[#244b3a] focus:outline-none focus:ring-2 focus:ring-[#244b3a]/20" /></label>
          </div>
          {guestError && <p role="alert" className="rounded-lg border border-[#943520]/30 bg-[#fff5f0] p-3 text-sm text-[#7c2d1c]">{guestError}</p>}
          <div className="overflow-x-auto rounded-xl border border-[#e5dfd3]">
            <table className="w-full min-w-[700px] text-left text-sm text-[#34362f]">
              <thead className="border-b border-[#e5dfd3] bg-[#f8f3e9] text-xs font-bold uppercase tracking-wide text-[#514b3e]"><tr><th scope="col" className="px-4 py-3">Nama lengkap</th><th scope="col" className="px-4 py-3">WhatsApp / telepon</th><th scope="col" className="px-4 py-3">Sesi dan kelas</th><th scope="col" className="px-4 py-3">Status</th><th scope="col" className="px-4 py-3">Terdaftar</th></tr></thead>
              <tbody className="divide-y divide-[#eee8dc] bg-white">
                {guestLoading ? <tr><td colSpan={5} className="px-4 py-8 text-center text-[#625f54]">Memuat peserta Guest…</td></tr> : filteredGuests.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-[#625f54]">{guestRows.length ? "Tidak ada peserta Guest yang cocok dengan pencarian." : "Belum ada peserta Guest yang mendaftar melalui sesi."}</td></tr> : filteredGuests.map((guest) => {
                  const status = guest.status === "approved" ? { label: "Disetujui", tone: "bg-emerald-50 text-emerald-800" } : guest.status === "rejected" ? { label: "Ditolak", tone: "bg-rose-50 text-rose-800" } : { label: "Menunggu", tone: "bg-amber-50 text-amber-900" };
                  const phone = String(guest.whatsapp || "");
                  return <tr key={guest.id} className="align-top hover:bg-[#fbf8f1]"><td className="px-4 py-3 font-bold text-[#20251f]">{guest.name || "(tanpa nama)"}</td><td className="px-4 py-3"><a href={`tel:${phone.replace(/[^+\d]/g, "")}`} className="font-semibold text-[#244b3a] underline decoration-[#c9bda7] underline-offset-2">{phone || "—"}</a></td><td className="px-4 py-3"><p className="font-semibold text-[#20251f]">{guest.sessionTitle} <span className="font-normal text-[#625f54]">· {guest.sessionCode}</span></p><p className="mt-1 text-xs text-[#625f54]">{guest.classTitle}</p></td><td className="px-4 py-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${status.tone}`}>{status.label}</span></td><td className="whitespace-nowrap px-4 py-3 text-xs text-[#625f54]">{new Date(guest.registeredAt).toLocaleString("id-ID")}</td></tr>;
                })}
              </tbody>
            </table>
          </div>
        </div>}
      </section>

    </div>
  );
}
