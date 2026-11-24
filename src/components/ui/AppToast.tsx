"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";

type ToastDetail = { message: string; tone?: "success" | "error" };

export function showAppToast(message: string, tone: "success" | "error" = "success") {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent<ToastDetail>("sapen:toast", { detail: { message, tone } }));
  }
}

export default function AppToastHost() {
  const [toast, setToast] = useState<ToastDetail | null>(null);

  useEffect(() => {
    let timer = 0;
    const show = (event: Event) => {
      const detail = (event as CustomEvent<ToastDetail>).detail;
      if (!detail?.message) return;
      setToast(detail);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setToast(null), 3600);
    };
    window.addEventListener("sapen:toast", show);
    return () => {
      window.removeEventListener("sapen:toast", show);
      window.clearTimeout(timer);
    };
  }, []);

  if (!toast) return null;
  const isError = toast.tone === "error";
  return <div className={`app-toast-root ${isError ? "app-toast-error" : "app-toast-success"}`} role="status" aria-live="polite" aria-atomic="true">
    {isError ? <AlertCircle aria-hidden="true" className="h-5 w-5 shrink-0" /> : <CheckCircle2 aria-hidden="true" className="h-5 w-5 shrink-0" />}
    <p className="min-w-0 flex-1">{toast.message}</p>
    <button type="button" aria-label="Tutup pemberitahuan" title="Tutup pemberitahuan" onClick={() => setToast(null)} className="app-toast-close"><X aria-hidden="true" className="h-4 w-4" /></button>
  </div>;
}
