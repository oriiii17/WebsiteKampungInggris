"use client";

import { useEffect, useRef, useState } from "react";
import { Download, ZoomIn, ZoomOut } from "lucide-react";

export default function MaterialImageViewer({ src, downloadUrl, fileName }: { src: string; downloadUrl: string; fileName: string }) {
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [displayWidth, setDisplayWidth] = useState(0);
  useEffect(() => {
    const updateWidth = () => {
      const image = imageRef.current;
      const container = containerRef.current;
      if (image?.naturalWidth && container) setDisplayWidth(Math.min(image.naturalWidth, Math.max(1, container.clientWidth - 32)));
    };
    updateWidth();
    const observer = typeof ResizeObserver !== "undefined" && containerRef.current ? new ResizeObserver(updateWidth) : null;
    if (containerRef.current && observer) observer.observe(containerRef.current);
    window.addEventListener("resize", updateWidth);
    return () => { observer?.disconnect(); window.removeEventListener("resize", updateWidth); };
  }, [src]);
  return <section className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white text-[#1A2E1A]">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5E7EB] bg-[#FDFBF7] px-3 py-2.5 sm:px-4">
      <p className="min-w-0 flex-1 truncate text-sm font-bold" title={fileName}>{fileName}</p>
      <div className="flex items-center gap-1.5">
        <button type="button" aria-label="Perkecil gambar" title="Perkecil gambar" onClick={() => setZoom((value) => Math.max(0.5, +(value - 0.25).toFixed(2)))} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-[#E5E7EB] bg-white"><ZoomOut className="h-4 w-4" /></button>
        <span className="min-w-12 text-center text-xs font-bold tabular-nums">{Math.round(zoom * 100)}%</span>
        <button type="button" aria-label="Perbesar gambar" title="Perbesar gambar" onClick={() => setZoom((value) => Math.min(3, +(value + 0.25).toFixed(2)))} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-[#E5E7EB] bg-white"><ZoomIn className="h-4 w-4" /></button>
        <a href={downloadUrl} className="inline-flex min-h-11 items-center gap-1.5 rounded-md bg-[#14532D] px-3 text-xs font-bold text-white"><Download className="h-4 w-4" /><span className="hidden sm:inline">Unduh</span></a>
      </div>
    </div>
    <div ref={containerRef} className="max-h-[80vh] overflow-auto p-3 text-center sm:p-5">
      <img ref={imageRef} src={src} alt={fileName} onLoad={() => { const image = imageRef.current; const container = containerRef.current; if (image?.naturalWidth && container) setDisplayWidth(Math.min(image.naturalWidth, Math.max(1, container.clientWidth - 32))); }} className="mx-auto h-auto border border-[#E5E7EB] bg-white" style={displayWidth ? { width: `${displayWidth * zoom}px`, maxWidth: "none" } : { maxWidth: "100%" }} />
    </div>
  </section>;
}
