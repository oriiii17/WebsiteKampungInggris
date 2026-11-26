"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Download,
  Maximize2,
  Minimize2,
  X,
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
  const stageRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);
  const loadingTaskRef = useRef<{ destroy: () => Promise<void> } | null>(null);
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
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });

  const isPdfMode = Boolean(pdfUrl);
  const effectiveTotal = isPdfMode ? numPages : initialPages.length;

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setStageSize((current) => current.width === width && current.height === height ? current : { width, height });
    });
    observer.observe(stage);
    return () => observer.disconnect();
  }, [isFullscreen]);

  useEffect(() => {
    if (!isFullscreen) return;
    const viewport = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
    if (!viewport) return;
    const original = viewport.content;
    viewport.content = original.replace(/,\s*maximum-scale=[^,]+/i, "").replace(/,\s*user-scalable=no/i, "");
    return () => { viewport.content = original; };
  }, [isFullscreen]);

  // Load PDF document quickly and render first page ASAP
  useEffect(() => {
    if (!isPdfMode || !pdfUrl) { setIsLoading(false); return; }
    let cancelled = false;
    setIsLoading(true); setError(null); setDocReady(false); setNumPages(0); setPage(1); setZoom(1);
    pdfDocRef.current = null;
    loadingTaskRef.current = null;

    (async () => {
      try {
        const pdfjs: any = await import("pdfjs-dist");
        if (cancelled) return;
        try {
          (pdfjs as any).GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
        } catch {}
        const loadingTask = pdfjs.getDocument({ url: pdfUrl, disableAutoFetch: false, disableStream: false });
        loadingTaskRef.current = loadingTask;
        const doc = await loadingTask.promise;
        if (cancelled) { await doc.destroy(); return; }
        pdfDocRef.current = doc;
        loadingTaskRef.current = null;
        setNumPages(doc.numPages || 0);
        setDocReady(true);
        setIsLoading(false); // allow canvas/preview area to show immediately; page render follows
      } catch {
        if (cancelled) return;
        setError("Gagal memuat PDF. Periksa koneksi atau unggah kembali file materi.");
        setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      try { renderTaskRef.current?.cancel(); } catch {}
      try { void loadingTaskRef.current?.destroy(); } catch {}
      try { pdfDocRef.current?.destroy?.(); } catch {}
      loadingTaskRef.current = null;
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
        const dpr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1;
        const baseViewport = pdfPage.getViewport({ scale: 1 });
        const availableWidth = Math.max(240, (stageSize.width || stageRef.current?.clientWidth || containerRef.current?.clientWidth || 960) - 32);
        const availableHeight = Math.max(240, (stageSize.height || stageRef.current?.clientHeight || 700) - (watermarkText ? 36 : 16));
        const fitScale = Math.min(availableWidth / baseViewport.width, availableHeight / baseViewport.height);
        const renderScale = fitScale * dpr * zoom;
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
  }, [isPdfMode, docReady, page, zoom, effectiveTotal, stageSize.width, stageSize.height, watermarkText]);

  async function toggleFullscreen() {
    if (!containerRef.current) return;
    if (isFullscreen || document.fullscreenElement) {
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    } else {
      try {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } catch {
        setIsFullscreen(false);
      }
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
    <div ref={containerRef} className={`flex w-full flex-col overflow-hidden border border-[#E5E7EB] bg-white text-[#1A2E1A] ${isFullscreen ? "fixed inset-0 z-[100] h-[100dvh] max-h-[100dvh] rounded-none" : "rounded-xl"}`}>
      <header className="flex h-[52px] shrink-0 items-center justify-between gap-2 border-b border-[#E5E7EB] bg-[#FDFBF7] px-2 md:h-16 md:px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#14532D] text-white md:flex"><BookOpen className="h-4 w-4" /></div>
          <div className="min-w-0 flex-1">
            <p className="truncate whitespace-nowrap text-[15px] font-extrabold leading-5 text-[#1A2E1A] md:text-sm">{moduleTitle}</p>
            <p className="hidden text-[10px] font-bold text-[#14532D] md:block">Flipbook Materi • Muat per halaman</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1 md:gap-1.5">
          <div className="hidden items-center gap-1 md:flex">
            <button type="button" onClick={() => setZoom((z) => Math.max(0.75, +(z - 0.25).toFixed(2)))} className="inline-flex min-h-11 items-center gap-1 rounded-md border border-[#E5E7EB] bg-white px-2.5 text-xs font-bold hover:bg-[#FDFBF7]" title="Perkecil"><ZoomOut className="h-4 w-4" />-</button>
            <span className="min-w-11 px-1 text-center text-xs font-bold text-[#1A2E1A]/70">{Math.round(zoom * 100)}%</span>
            <button type="button" onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))} className="inline-flex min-h-11 items-center gap-1 rounded-md border border-[#E5E7EB] bg-white px-2.5 text-xs font-bold hover:bg-[#FDFBF7]" title="Perbesar"><ZoomIn className="h-4 w-4" />+</button>
          </div>
          {downloadUrl && <a href={downloadUrl} download aria-label={downloadLabel} title={downloadLabel} className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-[#14532D] bg-[#14532D] text-white hover:bg-[#0F3F22] md:w-auto md:gap-1.5 md:px-3 md:text-xs md:font-bold"><Download className="h-5 w-5 md:h-4 md:w-4" /><span className="hidden md:inline">{downloadLabel}</span></a>}
          <button type="button" onClick={toggleFullscreen} aria-label={isFullscreen ? "Tutup layar penuh" : "Buka layar penuh"} title={isFullscreen ? "Tutup" : "Layar penuh"} className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-[#E5E7EB] bg-white text-[#14532D] hover:bg-[#FDFBF7] md:w-auto md:gap-1.5 md:px-3 md:text-xs md:font-bold">
            {isFullscreen ? <X className="h-5 w-5 md:hidden" /> : <Maximize2 className="h-5 w-5 md:h-4 md:w-4" />}{isFullscreen && <Minimize2 className="hidden h-4 w-4 md:block" />}<span className="hidden md:inline">{isFullscreen ? "Keluar" : "Layar penuh"}</span>
          </button>
        </div>
      </header>

      <div ref={stageRef} className="relative min-h-0 flex-1 overflow-auto bg-[#FDFBF7] px-2 py-2 [touch-action:pan-x_pan-y_pinch-zoom] md:p-4 md:[touch-action:auto]">
        {error && (
          <div className="mx-auto flex min-h-full max-w-lg flex-col items-center justify-center rounded-xl border border-[#E5E7EB] bg-white p-5 text-center">
            <p className="text-sm font-bold text-[#1A2E1A]">{error}</p>
            {downloadUrl && <a href={downloadUrl} className="mt-3 inline-flex min-h-[44px] items-center gap-2 rounded-md border border-[#14532D] bg-[#14532D] px-4 py-2 text-xs font-bold text-white">Download File Asli</a>}
          </div>
        )}

        {!error && isPdfMode && (
          <div className="mx-auto flex min-h-full w-full items-center justify-center">
            {/* Page 1 / preview area shown immediately (no black screen). Canvas renders as soon as ready. */}
            {isLoading && !docReady && (
              <div className="flex min-h-28 w-full items-center justify-center gap-3 rounded-lg border border-[#E5E7EB] bg-white p-5">
                <div className="h-10 w-10 rounded-full border-2 border-[#14532D]/20 border-t-[#14532D] animate-spin" />
                <p className="text-sm font-bold text-[#14532D]">Menyiapkan halaman pertama…</p>
              </div>
            )}
            {(docReady || !isLoading) && (
              <div className="flex min-h-full w-full items-center justify-center">
                <canvas ref={canvasRef} className={`block border border-[#E5E7EB] bg-white rounded-sm object-contain ${zoom <= 1 ? "max-h-full max-w-full" : "max-h-none max-w-none"}`} />
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
          <div className="mx-auto flex min-h-full w-full max-w-full items-center justify-center">
            {legacySrc ? (
              <img src={legacySrc} alt={`Halaman ${page}`} className="mx-auto block max-h-full max-w-full border border-[#E5E7EB] bg-white object-contain" style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }} />
            ) : (
              <div className="w-[min(92vw,720px)] aspect-[3/4] rounded-lg border border-[#E5E7EB] bg-white flex items-center justify-center text-sm font-bold text-[#1A2E1A]/60">Preview materi belum tersedia</div>
            )}
          </div>
        )}
      </div>

      <nav aria-label="Navigasi halaman materi" className="flex min-h-[56px] shrink-0 items-center justify-center gap-3 border-t border-[#E5E7EB] bg-white px-3 pt-1 pb-[env(safe-area-inset-bottom)] md:gap-5 md:px-5 md:py-2">
        <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={!canPrev} aria-label="Halaman sebelumnya" className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-[#E5E7EB] bg-white text-[#1A2E1A] hover:bg-[#FDFBF7] disabled:opacity-40 md:h-11 md:w-auto md:gap-1.5 md:px-4">
          <ChevronLeft className="h-5 w-5" /><span className="hidden md:inline">Sebelumnya</span>
        </button>
        <span className="flex min-w-0 items-center gap-2 whitespace-nowrap text-sm font-extrabold text-[#14532D]">
          <RefreshCw className={`hidden h-3 w-3 md:block ${isRendering ? "animate-spin" : ""}`} />
          <span className="md:hidden">{Math.min(page, Math.max(1, effectiveTotal || 1))} / {Math.max(1, effectiveTotal || 1)}</span>
          <span className="hidden md:inline">Halaman {Math.min(page, Math.max(1, effectiveTotal || 1))} dari {Math.max(1, effectiveTotal || 1)}</span>
        </span>
        <button type="button" onClick={() => setPage((p) => Math.min(Math.max(1, effectiveTotal || 1), p + 1))} disabled={!canNext} aria-label="Halaman berikutnya" className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-[#14532D] bg-[#14532D] text-white hover:bg-[#0F3F22] disabled:opacity-40 md:h-11 md:w-auto md:gap-1.5 md:px-4">
          <span className="hidden md:inline">Berikutnya</span><ChevronRight className="h-5 w-5" />
        </button>
      </nav>
    </div>
  );
}
