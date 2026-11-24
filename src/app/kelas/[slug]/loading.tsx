export default function ClassDetailLoading() {
  return <main aria-busy="true" aria-label="Memuat detail kelas" className="workbook-page min-h-dvh px-4 pb-32 pt-8 sm:px-6 sm:pt-12 md:pb-20">
    <div className="mx-auto max-w-6xl animate-pulse space-y-6">
      <div className="h-10 w-36 rounded-full bg-[#e7e1d4]" />
      <section className="grid gap-6 rounded-2xl border border-[#d8d0bf] bg-white p-5 sm:p-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div><div className="h-4 w-32 rounded bg-[#e7e1d4]" /><div className="mt-5 h-12 max-w-xl rounded bg-[#e7e1d4]" /><div className="mt-4 h-4 max-w-2xl rounded bg-[#e7e1d4]" /><div className="mt-2 h-4 max-w-xl rounded bg-[#e7e1d4]" /></div>
        <div className="min-h-24 rounded-xl bg-[#f1eee6]" />
      </section>
      <section className="space-y-3"><div className="h-8 w-48 rounded bg-[#e7e1d4]" />{[0, 1, 2].map((item) => <div key={item} className="h-20 rounded-xl bg-white" />)}</section>
    </div>
  </main>;
}
