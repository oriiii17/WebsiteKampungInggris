import Link from "next/link";

export default async function VerifikasiEmailPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const params = await searchParams;
  const success = params.status === "success";
  return <main className="workbook-auth min-h-dvh px-4 py-10"><section className="workbook-auth-card w-full max-w-lg text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#e6eadf] text-[#244b3a]" aria-hidden="true">{success ? "✓" : "!"}</div><h1 className="mt-4 font-display text-2xl font-bold text-forest-deep">{success ? "Email berhasil diverifikasi" : "Tautan verifikasi tidak valid"}</h1><p className="mt-3 text-sm leading-6 text-body">{success ? "Akun Anda sudah aktif. Silakan masuk untuk melanjutkan belajar." : "Tautan tidak valid atau sudah kedaluwarsa. Masuk kembali atau minta tautan verifikasi baru."}</p><Link href="/masuk" className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-earth px-4 font-bold text-white hover:bg-earth-dark">Ke halaman Masuk</Link></section></main>;
}
