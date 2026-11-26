"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppDialog } from "@/components/AppDialogProvider";
import { Download, RefreshCw, Search, Trash2, UserCheck, Users } from "lucide-react";
import ReportDownloadDialog from "@/components/admin/ReportDownloadDialog";
import ResponsiveTable from "@/components/admin/ResponsiveTable";
import { AdminToolbar } from "@/components/admin/AdminSectionHeader";
import AdminClassAccessActions from "@/components/admin/AdminClassAccessActions";

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
  whatsapp: string | null;
  status: "pending" | "approved" | "rejected" | string;
  registeredAt: string;
  sessionDate: string;
  sessionTitle: string;
  sessionCode: string;
  classTitle: string;
  canDelete: boolean;
  deleteBlockedReason?: string;
};

const guestCountries = [
  { name: "Indonesia", dial: "62" }, { name: "Malaysia", dial: "60" }, { name: "Singapura", dial: "65" },
  { name: "Brunei", dial: "673" }, { name: "Thailand", dial: "66" }, { name: "Filipina", dial: "63" },
  { name: "Vietnam", dial: "84" }, { name: "Timor-Leste", dial: "670" }, { name: "Australia", dial: "61" },
  { name: "Selandia Baru", dial: "64" }, { name: "Jepang", dial: "81" }, { name: "Korea Selatan", dial: "82" },
  { name: "Tiongkok", dial: "86" }, { name: "India", dial: "91" }, { name: "Arab Saudi", dial: "966" },
  { name: "Uni Emirat Arab", dial: "971" }, { name: "Britania Raya", dial: "44" }, { name: "Jerman", dial: "49" },
  { name: "Prancis", dial: "33" }, { name: "Belanda", dial: "31" }, { name: "Amerika Serikat/Kanada", dial: "1" },
];

function phoneCountryPrefix(phone: string | null | undefined) {
  let digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = `62${digits.slice(1)}`;
  return [...guestCountries].sort((a, b) => b.dial.length - a.dial.length).find((country) => digits.startsWith(country.dial))?.dial || "other";
}

const guestSelectClass = "min-h-11 w-full rounded-lg border border-[#c9bda7] bg-[#fffdf8] px-3 text-sm text-[#20251f] focus:border-[#244b3a] focus:outline-none focus:ring-2 focus:ring-[#244b3a]/20";

interface Props {
  data: any;
  onRefresh: () => void;
  notify: (msg: string) => void;
}

export default function AdminCodesManager(props: Props) {
  const { data, onRefresh, notify } = props;
  const dialog = useAppDialog();
  const [query, setQuery] = useState("");
  const [activeList, setActiveList] = useState<"users" | "guests">("users");
  const [guestRows, setGuestRows] = useState<GuestParticipant[]>([]);
  const [guestQuery, setGuestQuery] = useState("");
  const [guestCountry, setGuestCountry] = useState("all");
  const [guestSession, setGuestSession] = useState("all");
  const [guestDay, setGuestDay] = useState("all");
  const [guestMonth, setGuestMonth] = useState("all");
  const [guestYear, setGuestYear] = useState("all");
  const [guestLoading, setGuestLoading] = useState(false);
  const [guestError, setGuestError] = useState("");
  const [selectedGuests, setSelectedGuests] = useState<Set<string>>(new Set());
  const [deletingGuests, setDeletingGuests] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const loadGuestParticipants = useCallback(async () => {
    setGuestLoading(true);
    setGuestError("");
    try {
      const response = await fetch("/api/admin/session-guests", { cache: "no-store" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Daftar peserta sesi belum dapat dimuat.");
      setGuestRows(Array.isArray(result.guests) ? result.guests : []);
      setSelectedGuests(new Set());
    } catch (error) {
      setGuestError(error instanceof Error ? error.message : "Daftar peserta sesi belum dapat dimuat.");
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
    for (const u of (data.externalUsers || [])) {
      if (!u?.email) continue;
      list.push({ key: `u:${u.id}`, type: "umum", name: u.name || u.email, email: (u.email || "").toLowerCase() });
    }
    for (const warga of (data.warga || [])) {
      const email = String(warga?.email || "").trim().toLowerCase();
      if (!email) continue;
      const existing = list.find((participant) => participant.email === email);
      if (existing) {
        existing.type = "warga";
        existing.rw = warga.rw;
        existing.name = warga.nama || existing.name;
      } else {
        list.push({ key: `w:${warga.id || email}`, type: "warga", name: warga.nama || email, email, rw: warga.rw });
      }
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
  }, [data.externalUsers, data.warga, subscriptions, enrollments]);

  const filtered = participants.filter(p => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q);
  });
  const guestSessionOptions = [...new Set(guestRows.map((guest) => guest.sessionTitle).filter(Boolean))].sort((a, b) => a.localeCompare(b, "id"));
  const guestYears = [...new Set(guestRows.map((guest) => guest.sessionDate ? new Date(guest.sessionDate).getFullYear() : NaN).filter(Number.isFinite))].sort((a, b) => b - a);
  const filteredGuests = guestRows.filter((guest) => {
    const q = guestQuery.trim().toLocaleLowerCase();
    const sessionDate = guest.sessionDate ? new Date(guest.sessionDate) : null;
    return (!q || [guest.name, guest.whatsapp || "", guest.sessionTitle, guest.sessionCode, guest.classTitle].some((value) => value.toLocaleLowerCase().includes(q)))
      && (guestCountry === "all" || (guestCountry === "other" ? phoneCountryPrefix(guest.whatsapp) === "other" : phoneCountryPrefix(guest.whatsapp) === guestCountry))
      && (guestSession === "all" || guest.sessionTitle === guestSession)
      && (guestDay === "all" || sessionDate?.getDate() === Number(guestDay))
      && (guestMonth === "all" || sessionDate && sessionDate.getMonth() + 1 === Number(guestMonth))
      && (guestYear === "all" || sessionDate?.getFullYear() === Number(guestYear));
  });

  const toggleGuestSelection = (guest: GuestParticipant, checked: boolean) => {
    setSelectedGuests((current) => {
      const next = new Set(current);
      checked ? next.add(guest.id) : next.delete(guest.id);
      return next;
    });
  };
  const selectVisibleGuests = (checked: boolean) => {
    setSelectedGuests(checked ? new Set(filteredGuests.filter((guest) => guest.canDelete).map((guest) => guest.id)) : new Set());
  };

  async function deleteSelectedGuests() {
    const deletable = guestRows.filter((guest) => selectedGuests.has(guest.id) && guest.canDelete);
    if (!deletable.length) { notify("Pilih peserta yang sudah memenuhi syarat penghapusan."); return; }
    if (!(await dialog.confirm(`Hapus ${deletable.length} peserta sesi?`, "Penghapusan hanya tersedia setelah sesi ditutup dan peserta tidak aktif selama 3 jam."))) return;
    setDeletingGuests(true);
    try {
      const response = await fetch("/api/admin/session-guests", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: deletable.map((guest) => guest.id) }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Peserta belum dapat dihapus.");
      notify(`${deletable.length} peserta sesi dihapus.`);
      await loadGuestParticipants();
    } catch (cause) { notify(cause instanceof Error ? cause.message : "Peserta belum dapat dihapus."); }
    finally { setDeletingGuests(false); }
  }

  return (
    <div className="mt-6 space-y-8">
      <section className="rounded-xl border border-[#d8d0c2] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex justify-end"><AdminToolbar className="w-full sm:w-auto"><button type="button" onClick={() => setShowReport(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#c9bda7] px-3 py-2 text-sm font-bold text-[#244b3a] transition hover:bg-[#f8f3e9]"><Download className="h-4 w-4" />Download</button><button type="button" onClick={() => { onRefresh(); if (activeList === "guests") void loadGuestParticipants(); }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#c9bda7] px-3 py-2 text-sm font-bold text-[#244b3a] transition hover:bg-[#f8f3e9]"><RefreshCw className="h-4 w-4" />Segarkan</button></AdminToolbar></div>

        <div role="group" aria-label="Jenis peserta" className="mt-5 flex gap-2 overflow-x-auto overscroll-x-contain border-b border-[#e5dfd3] pb-px">
          <button type="button" aria-pressed={activeList === "users"} onClick={() => setActiveList("users")} className={`inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 text-sm font-bold transition ${activeList === "users" ? "border-[#244b3a] text-[#183b2d]" : "border-transparent text-[#625f54] hover:text-[#183b2d]"}`}><UserCheck className="h-4 w-4 shrink-0" />User reguler</button>
          <button type="button" aria-pressed={activeList === "guests"} onClick={() => setActiveList("guests")} className={`inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 text-sm font-bold transition ${activeList === "guests" ? "border-[#244b3a] text-[#183b2d]" : "border-transparent text-[#625f54] hover:text-[#183b2d]"}`}><Users className="h-4 w-4 shrink-0" />Peserta sesi<span className="shrink-0 whitespace-nowrap rounded-full bg-[#e8eee5] px-2 py-0.5 text-xs text-[#244b3a]">{guestRows.length}</span></button>
        </div>

        {activeList === "users" && <div id="admin-participants-panel-users">
        <div className="mt-4 grid gap-3 sm:grid-cols-12">
          <div className="relative sm:col-span-5"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Cari nama atau email peserta" className="w-full rounded-lg border border-[#E5E7EB] py-2.5 pl-9 pr-3 text-sm focus:border-[#14532D] focus:outline-none" /></div>
          <p className="self-center text-sm text-[#625f54] sm:col-span-4">Daftar user reguler dan akses kelas (hanya baca).</p>
        </div>

        <div className="mt-4">
          <ResponsiveTable
            rows={filtered}
            getRowKey={(participant) => participant.key}
            ariaLabel="Daftar user reguler dan akses kelas"
            emptyMessage="Tidak ada peserta yang cocok."
            tableMinWidthClassName="min-w-[700px]"
            columns={[
              { id: "name", label: "Nama lengkap", render: (participant) => <><p className="font-bold text-[#20251f]">{participant.name || "(tanpa nama)"}</p><p className="mt-1 text-xs text-[#625f54]">{participant.type === "warga" ? `Warga ${participant.rw || ""}` : "User reguler"}</p></> },
              { id: "email", label: "Username / Email", cellClassName: "break-words", render: (participant) => participant.email || <span className="text-[#625f54]">—</span> },
              { id: "classes", label: "Akses kelas", render: (participant) => {
                const myEnr = participant.email ? enrollments.filter((enrollment: any) => (enrollment.userEmail || "").toLowerCase() === participant.email) : [];
                if (!participant.email) return <span className="text-sm text-[#625f54]">Akses program melalui Kode Akses</span>;
                return <AdminClassAccessActions email={participant.email} name={participant.name} classes={classes} enrollments={myEnr} notify={notify} onRefresh={onRefresh} />;
              } },
            ]}
          />
        </div>
        </div>}

        {activeList === "guests" && <div id="admin-participants-panel-guests" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-end gap-2 border-b border-[#e5dfd3] pb-4">
            <div><h3 className="flex items-center gap-2 font-bold text-[#183b2d]"><Users className="h-4 w-4" />Peserta sesi · {filteredGuests.length} orang</h3><p className="mt-1 text-sm text-[#625f54]">Daftar ini hanya berisi peserta sesi; user reguler ada di tab terpisah.</p></div>
            <div className="flex w-full flex-wrap gap-2 sm:ml-auto sm:w-auto"><button type="button" onClick={() => void deleteSelectedGuests()} disabled={deletingGuests || !guestRows.some((guest) => selectedGuests.has(guest.id) && guest.canDelete)} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-[#a23b27] px-3 text-sm font-bold text-white hover:bg-[#842f20] disabled:cursor-not-allowed disabled:bg-[#e5e7eb] disabled:text-[#6b7280]"> <Trash2 className="h-4 w-4" />{deletingGuests ? "Menghapus…" : (() => { const count = Array.from(selectedGuests).filter((id) => filteredGuests.some((guest) => guest.id === id && guest.canDelete)).length; return count ? `Hapus ${count} peserta` : "Hapus peserta"; })()}</button><label className="relative block min-w-[220px] flex-1 sm:max-w-xs"><span className="sr-only">Cari peserta sesi</span><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#625f54]" /><input value={guestQuery} onChange={(event) => setGuestQuery(event.target.value)} placeholder="Cari nama, nomor, atau sesi" className="min-h-11 w-full rounded-lg border border-[#c9bda7] bg-[#fffdf8] py-2.5 pl-10 pr-3 text-sm text-[#20251f] placeholder:text-[#625f54] focus:border-[#244b3a] focus:outline-none focus:ring-2 focus:ring-[#244b3a]/20" /></label></div>
          </div>
          <details className="rounded-xl border border-[#e5dfd3] bg-[#faf7ef]"><summary className="min-h-11 cursor-pointer px-3 py-2.5 font-bold text-[#244b3a]">Filter peserta</summary><div className="grid grid-cols-2 gap-3 px-3 pb-3 pt-1 xl:px-4 xl:pb-4">
            <label className="space-y-1 text-xs font-bold text-[#514b3e]"><span>Negara</span><select value={guestCountry} onChange={(event) => setGuestCountry(event.target.value)} className={guestSelectClass}><option value="all">Semua negara</option>{guestCountries.map((country) => <option key={country.dial} value={country.dial}>{country.name} (+{country.dial})</option>)}<option value="other">Prefiks lainnya</option></select></label>
            <label className="space-y-1 text-xs font-bold text-[#514b3e]"><span>Nama sesi</span><select value={guestSession} onChange={(event) => setGuestSession(event.target.value)} className={guestSelectClass}><option value="all">Semua sesi</option>{guestSessionOptions.map((title) => <option key={title} value={title}>{title}</option>)}</select></label>
            <label className="space-y-1 text-xs font-bold text-[#514b3e]"><span>Hari sesi</span><select value={guestDay} onChange={(event) => setGuestDay(event.target.value)} className={guestSelectClass}><option value="all">Semua hari</option>{Array.from({ length: 31 }, (_, index) => index + 1).map((day) => <option key={day} value={day}>{day}</option>)}</select></label>
            <label className="space-y-1 text-xs font-bold text-[#514b3e]"><span>Bulan sesi</span><select value={guestMonth} onChange={(event) => setGuestMonth(event.target.value)} className={guestSelectClass}><option value="all">Semua bulan</option>{Array.from({ length: 12 }, (_, index) => index + 1).map((month) => <option key={month} value={month}>{new Date(2000, month - 1, 1).toLocaleString("id-ID", { month: "long" })}</option>)}</select></label>
            <label className="space-y-1 text-xs font-bold text-[#514b3e]"><span>Tahun sesi</span><select value={guestYear} onChange={(event) => setGuestYear(event.target.value)} className={guestSelectClass}><option value="all">Semua tahun</option>{guestYears.map((year) => <option key={year} value={year}>{year}</option>)}</select></label>
            {(guestCountry !== "all" || guestSession !== "all" || guestDay !== "all" || guestMonth !== "all" || guestYear !== "all" || guestQuery) && <button type="button" onClick={() => { setGuestQuery(""); setGuestCountry("all"); setGuestSession("all"); setGuestDay("all"); setGuestMonth("all"); setGuestYear("all"); }} className="min-h-11 justify-self-start rounded-lg px-3 text-sm font-bold text-[#244b3a] underline decoration-[#b8aa8e] underline-offset-4 hover:bg-[#e8eee5] sm:col-span-2 xl:col-span-5">Hapus semua filter</button>}
          </div></details>
          {guestError && <p role="alert" className="rounded-lg border border-[#943520]/30 bg-[#fff5f0] p-3 text-sm text-[#7c2d1c]">{guestError}</p>}
          <ResponsiveTable
            rows={guestLoading ? [] : filteredGuests}
            getRowKey={(guest) => guest.id}
            ariaLabel="Daftar peserta sesi"
            emptyMessage={guestLoading ? "Memuat peserta sesi…" : guestRows.length ? "Tidak ada peserta sesi yang cocok dengan filter." : "Belum ada peserta sesi yang mendaftar melalui sesi."}
            tableMinWidthClassName="min-w-[900px]"
            mobileHeader={<label className="flex min-h-11 items-center gap-2 rounded-lg border border-[#e5dfd3] bg-white px-3 text-sm font-semibold text-[#514b3e]"><input type="checkbox" aria-label="Pilih semua peserta sesi yang bisa dihapus" checked={filteredGuests.some((guest) => guest.canDelete) && filteredGuests.filter((guest) => guest.canDelete).every((guest) => selectedGuests.has(guest.id))} onChange={(event) => selectVisibleGuests(event.target.checked)} />Pilih semua yang bisa dihapus</label>}
            columns={[
              { id: "select", label: "Pilih", header: <input type="checkbox" aria-label="Pilih semua peserta sesi yang bisa dihapus" checked={filteredGuests.some((guest) => guest.canDelete) && filteredGuests.filter((guest) => guest.canDelete).every((guest) => selectedGuests.has(guest.id))} onChange={(event) => selectVisibleGuests(event.target.checked)} />, render: (guest) => <input type="checkbox" aria-label={`Pilih ${guest.name}`} disabled={!guest.canDelete} checked={selectedGuests.has(guest.id)} title={guest.deleteBlockedReason || "Peserta siap dihapus"} onChange={(event) => toggleGuestSelection(guest, event.target.checked)} /> },
              { id: "name", label: "Nama lengkap", render: (guest) => <><p className="font-bold text-[#20251f]">{guest.name || "(tanpa nama)"}</p><p className="mt-1 text-xs text-[#625f54]">Peserta sesi</p></> },
              { id: "phone", label: "WhatsApp / telepon", render: (guest) => {
                const phone = String(guest.whatsapp || "");
                const prefix = phone ? phoneCountryPrefix(phone) : "";
                const country = guestCountries.find((item) => item.dial === prefix);
                return phone ? <><a href={`tel:${phone.replace(/[^+\d]/g, "")}`} className="font-semibold text-[#244b3a] underline decoration-[#c9bda7] underline-offset-2">{phone}</a><p className="mt-1 text-xs text-[#625f54]">{country ? `${country.name} · +${country.dial}` : prefix === "other" ? "Prefiks negara lainnya" : "Indonesia · +62"}</p></> : <span className="text-[#625f54]">Tidak dicantumkan</span>;
              } },
              { id: "session", label: "Sesi dan kelas", render: (guest) => <><p className="font-semibold text-[#20251f]">{guest.sessionTitle} <span className="font-normal text-[#625f54]">· {guest.sessionCode}</span></p><p className="mt-1 text-xs text-[#625f54]">{guest.classTitle}</p></> },
              { id: "date", label: "Tanggal sesi", render: (guest) => { const date = guest.sessionDate ? new Date(guest.sessionDate) : null; return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "Jadwal belum ditentukan"; } },
              { id: "status", label: "Status", render: (guest) => { const status = guest.status === "approved" ? { label: "Disetujui", tone: "bg-emerald-50 text-emerald-800" } : guest.status === "rejected" ? { label: "Ditolak", tone: "bg-rose-50 text-rose-800" } : { label: "Menunggu", tone: "bg-amber-50 text-amber-900" }; return <><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${status.tone}`}>{status.label}</span>{guest.deleteBlockedReason && <p className="mt-1 max-w-48 text-xs text-[#625f54]">{guest.deleteBlockedReason}</p>}</>; } },
              { id: "registered", label: "Terdaftar", render: (guest) => new Date(guest.registeredAt).toLocaleString("id-ID") },
            ]}
          />
        </div>}
      </section>

      {showReport && <ReportDownloadDialog type="participants" onClose={() => setShowReport(false)} />}
    </div>
  );
}
