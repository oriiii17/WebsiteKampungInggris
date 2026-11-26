"use client";

import { useEffect, useState } from "react";
import { Download, ExternalLink, Loader2 } from "lucide-react";

export default function OfficeDocumentPreview({
  signedUrlEndpoint,
  downloadUrl,
  fileName,
}: {
  signedUrlEndpoint: string;
  downloadUrl: string;
  fileName: string;
}) {
  const [officeUrl, setOfficeUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [frameLoaded, setFrameLoaded] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12_000);
    fetch(signedUrlEndpoint, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.signedUrl) throw new Error(result.error || "Tautan pratinjau belum tersedia.");
        setOfficeUrl(`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(result.signedUrl)}`);
      })
      .catch(() => setError("Preview untuk file PPTX belum tersedia. Unduh file atau gunakan versi PDF."))
      .finally(() => { window.clearTimeout(timeout); setLoading(false); });
    return () => { window.clearTimeout(timeout); controller.abort(); };
  }, [signedUrlEndpoint]);

  useEffect(() => {
    if (!officeUrl || frameLoaded) return;
    const timeout = window.setTimeout(() => setError("Preview untuk file PPTX belum tersedia. Unduh file atau gunakan versi PDF."), 20_000);
    return () => window.clearTimeout(timeout);
  }, [officeUrl, frameLoaded]);

  return <section className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white text-[#1A2E1A]">
    {officeUrl && <div className="border-b border-[#E5E7EB] bg-[#FDFBF7] p-2 sm:p-3">
      <p className="mb-2 flex items-center gap-2 px-1 text-xs font-bold text-[#14532D]"><ExternalLink className="h-4 w-4" />Pratinjau Office Online · {fileName}</p>
      <iframe title={`Pratinjau ${fileName}`} src={officeUrl} onLoad={() => setFrameLoaded(true)} onError={() => setError("Preview untuk file PPTX belum tersedia. Unduh file atau gunakan versi PDF.")} className="h-[min(72vh,760px)] w-full rounded-lg border border-[#E5E7EB] bg-white" allowFullScreen />
    </div>}
    {(loading || error || !officeUrl) && <div role={error ? "alert" : undefined} className="p-5 text-center sm:p-7">
      {loading ? <><Loader2 className="mx-auto h-6 w-6 animate-spin text-[#14532D]" /><p className="mt-2 text-sm font-semibold text-[#1A2E1A]">Mencoba pratinjau Office Online…</p></> : <>
        <p className="text-sm font-bold text-[#1A2E1A]">{error || "Preview untuk file PPTX belum tersedia. Unduh file atau gunakan versi PDF."}</p>
        <a href={downloadUrl} className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#14532D] px-4 text-sm font-bold text-white"><Download className="h-4 w-4" />Unduh file</a>
      </>}
    </div>}
    {officeUrl && <p className="px-4 pb-3 text-center text-xs text-[#625f54]">Jika pratinjau tidak tampil, <a href={downloadUrl} className="font-bold text-[#14532D] underline">unduh file</a> atau gunakan versi PDF.</p>}
  </section>;
}
