"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Download,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RefreshCw,
} from "lucide-react";

interface SignedPage {
  pageNumber: number;
  imageUrl: string;
}

interface FlipbookViewerProps {
  slug?: string;
  moduleTitle: string;
  initialPages?: SignedPage[];
  watermarkText?: string;
  pdfUrl?: string;
  downloadUrl?: string;
  downloadLabel?: string;
}

type RenderTask = { cancel: () => void; promise: Promise<unknown> };

export default function FlipbookViewer({
  slug,
  moduleTitle,
  initialPages = [],
  watermarkText,
  pdfUrl,
  downloadUrl,
  downloadLabel = "Download File Asli",
}: FlipbookViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfDocRef = useRef<any>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRendering, setIsRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(initialPages.length || 0);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [docReady, setDocReady] = useState(false);

  const isPdfMode = Boolean(pdfUrl);
  const effectiveTotal = isPdfMode ? numPages : initialPages.length;

  // Load PDF document quickly and render first page ASAP
  useEffect(() => {
    if (!isPdfMode || !pdfUrl) { setIsLoading(false); return; }
    let cancelled = false;
    setIsLoading(true); setError(null); setDocReady(false); setNumPages(0); setPage(1);
    pdfDocRef.current = null;

    (async () => {
      try {
        const pdfjs: any = await import("pdfjs-dist");
        try {
          (pdfjs as any).GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
        } catch {}
        const loadingTask = pdfjs.getDocument({ url: pdfUrl, disableAutoFetch: false, disableStream: false });
        const doc = await loadingTask.promise;
        if (cancelled) return;
        pdfDocRef.current = doc;
        setNumPages(doc.numPages || 0);
        setDocReady(true);
        setIsLoading(false); // allow canvas/preview area to show immediately; page render follows
      } catch {
        if (cancelled) return;
        setError("Gagal memuat flipbook. Pastikan file PDF tersedia.");
        setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      try { renderTaskRef.current?.cancel(); } catch {}
      try { pdfDocRef.current?.destroy?.(); } catch {}
      pdfDocRef.current = null;
    };
  }, [isPdfMode, pdfUrl]);

  // Render current page (load per page). Moderate scale for speed; higher on zoom.
  useEffect(() => {
    if (!isPdfMode || !docReady) return;
    const doc = pdfDocRef.current;
    const canvas = canvasRef.current;
    if (!doc || !canvas || effectiveTotal === 0) return;

    let cancelled = false;
    setIsRendering(true);
    (async () => {
      try {
        try { renderTaskRef.current?.cancel(); } catch {}
        const pdfPage = await doc.getPage(page);
        if (cancelled) return;
        const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
        // fast default: 1.5*dpr, scale up with zoom for clarity when needed
        const renderScale = Math.max(1.25, dpr * 1.5) * zoom;
        const viewport = pdfPage.getViewport({ scale: renderScale });
        const ctx = canvas.getContext("2d", { alpha: false });
        if (!ctx) return;
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${Math.floor(viewport.width / (dpr * 1.0))}px`;
        canvas.style.height = `${Math.floor(viewport.height / (dpr * 1.0))}px`;
        const task = pdfPage.render({ canvasContext: ctx, viewport });
        renderTaskRef.current = task;
        await task.promise;
      } catch (e: any) {
        if (e?.name === "RenderingCancelledException") return;
        if (!cancelled) setError("Gagal merender halaman.");
      } finally {
        if (!cancelled) setIsRendering(false);
      }
    })();

    // prefetch neighbor pages lightly (warm cache) without rendering to canvas
    (async () => {
      try { if (page + 1 <= effectiveTotal) await doc.getPage(page + 1); } catch {}
    })();

    return () => { cancelled = true; };
  }, [isPdfMode, docReady, page, zoom, effectiveTotal]);

  async function toggleFullscreen() {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }

  useEffect(() => {
    function onFs() { setIsFullscreen(Boolean(document.fullscreenElement)); }
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") setPage((p) => Math.min(effectiveTotal || 1, p + 1));
      if (e.key === "ArrowLeft") setPage((p) => Math.max(1, p - 1));
    }
    document.addEventListener("fullscreenchange", onFs);
    window.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("fullscreenchange", onFs); window.removeEventListener("keydown", onKey); };
  }, [effectiveTotal]);

  const canPrev = page > 1;
  const canNext = page < (effectiveTotal || 1);
  const legacySrc = useMemo(() => {
    if (isPdfMode) return null;
    const p = initialPages.find((x) => x.pageNumber === page) || initialPages[page - 1];
    return p?.imageUrl || null;
  }, [initialPages, isPdfMode, page]);

  return (
    <div ref={containerRef} className={`flex flex-col border border-[#E5E7EB] bg-white text-[#1A2E1A] ${isFullscreen ? "h-screen w-screen" : "min-h-[60vh] rounded-xl"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5E7EB] bg-[#FDFBF7] px-4 py-2.5 sm:px-5">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#14532D] text-white"><BookOpen className="h-4 w-4" /></div>
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold text-[#1A2E1A]">{moduleTitle}</p>
            <p className="text-[10px] font-bold text-[#14532D]">Flipbook Materi • Muat per halaman</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" onClick={() => setZoom((z) => Math.max(0.75, +(z - 0.25).toFixed(2)))} className="inline-flex min-h-[40px] items-center gap-1 rounded-md border border-[#E5E7EB] bg-white px-2.5 text-xs font-bold hover:bg-[#FDFBF7]" title="Zoom Out"><ZoomOut className="h-4 w-4" />-</button>
          <span className="px-1 text-xs font-bold text-[#1A2E1A]/70 min-w-[44px] text-center">{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))} className="inline-flex min-h-[40px] items-center gap-1 rounded-md border border-[#E5E7EB] bg-white px-2.5 text-xs font-bold hover:bg-[#FDFBF7]" title="Zoom In"><ZoomIn className="h-4 w-4" />+</button>
          {downloadUrl && (
            <a href={downloadUrl} download className="inline-flex min-h-[40px] items-center gap-1.5 rounded-md border border-[#14532D] bg-[#14532D] px-3 text-xs font-bold text-white hover:bg-[#0F3F22]">
              <Download className="h-4 w-4" /> <span className="hidden sm:inline">{downloadLabel}</span>
            </a>
          )}
          <button type="button" onClick={toggleFullscreen} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-md border border-[#E5E7EB] bg-white px-3 text-xs font-bold hover:bg-[#FDFBF7]">
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />} <span className="hidden sm:inline">{isFullscreen ? "Keluar" : "Fullscreen"}</span>
          </button>
        </div>
      </div>

      <div className="relative flex-1 overflow-auto bg-[#FDFBF7] p-3 sm:p-6">
        {error && (
          <div className="mx-auto max-w-lg rounded-xl border border-[#E5E7EB] bg-white p-5 text-center">
            <p className="text-sm font-bold text-[#1A2E1A]">{error}</p>
            {downloadUrl && <a href={downloadUrl} className="mt-3 inline-flex min-h-[44px] items-center gap-2 rounded-md border border-[#14532D] bg-[#14532D] px-4 py-2 text-xs font-bold text-white">Download File Asli</a>}
          </div>
        )}

        {!error && isPdfMode && (
          <div className="mx-auto w-fit max-w-full min-h-[360px] sm:min-h-[460px]">
            {/* Page 1 / preview area shown immediately (no black screen). Canvas renders as soon as ready. */}
            {isLoading && !docReady && (
              <div className="w-[min(92vw,720px)] aspect-[3/4] max-h-[70vh] rounded-lg border border-[#E5E7EB] bg-white shadow-sm flex flex-col items-center justify-center gap-3">
                <div className="h-10 w-10 rounded-full border-2 border-[#14532D]/20 border-t-[#14532D] animate-spin" />
                <p className="text-xs font-bold text-[#14532D]">Menyiapkan halaman pertama…</p>
                <div className="w-2/3 space-y-2 mt-2 px-6"><div className="h-2 rounded bg-[#E5E7EB] animate-pulse" /><div className="h-2 rounded bg-[#E5E7EB] animate-pulse w-5/6" /><div className="h-2 rounded bg-[#E5E7EB] animate-pulse w-4/6" /></div>
              </div>
            )}
            {(docReady || !isLoading) && (
              <div className="relative">
                <canvas ref={canvasRef} className="mx-auto block border border-[#E5E7EB] bg-white shadow-sm rounded-sm" />
                {isRendering && docReady && (
                  <div className="pointer-events-none absolute inset-x-0 top-2 flex justify-center">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 border border-[#E5E7EB] px-3 py-1 text-[11px] font-bold text-[#14532D]"><span className="h-3 w-3 rounded-full border-2 border-[#14532D]/30 border-t-[#14532D] animate-spin" />Memuat halaman…</span>
                  </div>
                )}
              </div>
            )}
            {watermarkText && <p className="mt-2 text-center text-[10px] font-bold text-[#1A2E1A]/30">{watermarkText}</p>}
          </div>
        )}

        {!error && !isPdfMode && (
          <div className="mx-auto w-fit max-w-full min-h-[320px] flex items-center justify-center">
            {legacySrc ? (
              <img src={legacySrc} alt={`Halaman ${page}`} className="mx-auto block max-w-full border border-[#E5E7EB] bg-white" style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }} />
            ) : (
              <div className="w-[min(92vw,720px)] aspect-[3/4] rounded-lg border border-[#E5E7EB] bg-white flex items-center justify-center text-sm font-bold text-[#1A2E1A]/60">Preview materi belum tersedia</div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E5E7EB] bg-white px-4 py-3 sm:px-5">
        <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={!canPrev} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-md border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-bold text-[#1A2E1A] hover:bg-[#FDFBF7] disabled:opacity-40">
          <ChevronLeft className="h-4 w-4" /> Sebelumnya
        </button>
        <span className="flex items-center gap-2 rounded-md border border-[#E5E7EB] bg-[#FDFBF7] px-4 py-2 text-xs font-extrabold text-[#14532D]">
          <RefreshCw className={`h-3 w-3 ${isRendering ? "animate-spin" : ""}`} /> Halaman {Math.min(page, Math.max(1, effectiveTotal || 1))} dari {Math.max(1, effectiveTotal || 1)}
        </span>
        <button type="button" onClick={() => setPage((p) => Math.min(Math.max(1, effectiveTotal || 1), p + 1))} disabled={!canNext} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-md border border-[#14532D] bg-[#14532D] px-4 py-2 text-sm font-extrabold text-white hover:bg-[#0F3F22] disabled:opacity-40">
          Berikutnya <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
