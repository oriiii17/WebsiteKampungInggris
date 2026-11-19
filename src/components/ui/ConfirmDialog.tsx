"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LoaderCircle, TriangleAlert } from "lucide-react";

type ConfirmOptions = {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  secondaryAction?: { label: string; href: string };
  variant?: "default" | "danger";
  returnFocusTarget?: HTMLElement | null;
  onConfirm?: () => void | Promise<void>;
};

type ConfirmRequest = ConfirmOptions & {
  resolve: (confirmed: boolean) => void;
  returnFocus: HTMLElement | null;
};

const ConfirmContext = createContext<((options: ConfirmOptions) => Promise<boolean>) | null>(null);

export function useConfirm() {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error("useConfirm must be used within ConfirmDialogProvider");
  return confirm;
}

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState<ConfirmRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const queue = useRef<ConfirmRequest[]>([]);
  const panelRef = useRef<HTMLElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback((options: ConfirmOptions) => new Promise<boolean>((resolve) => {
    const request: ConfirmRequest = {
      ...options,
      resolve,
      returnFocus: options.returnFocusTarget ?? (typeof document !== "undefined" && document.activeElement instanceof HTMLElement ? document.activeElement : null),
    };
    if (active) queue.current.push(request);
    else {
      setError("");
      setActive(request);
    }
  }), [active]);

  const finish = useCallback((confirmed: boolean) => {
    if (!active || loading) return;
    active.resolve(confirmed);
    active.returnFocus?.focus();
    setError("");
    const next = queue.current.shift() || null;
    setActive(next);
  }, [active, loading]);

  useEffect(() => {
    if (active) cancelRef.current?.focus();
  }, [active]);

  const handleConfirm = async () => {
    if (!active || loading) return;
    setError("");
    if (!active.onConfirm) {
      active.resolve(true);
      active.returnFocus?.focus();
      setActive(queue.current.shift() || null);
      return;
    }
    setLoading(true);
    try {
      await active.onConfirm();
      active.resolve(true);
      active.returnFocus?.focus();
      setActive(queue.current.shift() || null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Tindakan belum berhasil. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      finish(false);
      return;
    }
    if (event.key !== "Tab" || !panelRef.current) return;
    const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'));
    if (!focusable.length) {
      event.preventDefault();
      panelRef.current.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return <ConfirmContext.Provider value={confirm}>
    {children}
    {active && typeof document !== "undefined" && createPortal(
      <div
        className="fixed inset-0 z-[120] grid place-items-center bg-[#20251f]/55 p-4 sm:p-6"
        onMouseDown={(event) => { if (event.target === event.currentTarget) finish(false); }}
      >
        <section
          ref={panelRef}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          aria-describedby="confirm-dialog-description"
          aria-busy={loading}
          tabIndex={-1}
          onKeyDown={handleKeyDown}
          className="w-full max-w-md rounded-2xl border border-[#d2c5ad] bg-[#fdf9f0] p-5 text-[#20251f] shadow-[0_18px_48px_rgba(32,37,31,.24)] sm:p-6"
        >
          <div className="flex items-start gap-3">
            <span className={`mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full ${active.variant === "danger" ? "bg-[#ba472f]/10 text-[#943520]" : "bg-[#e6eadf] text-[#244b3a]"}`}>
              <TriangleAlert aria-hidden="true" className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 id="confirm-dialog-title" className="font-display text-xl font-bold leading-tight text-[#183b2d]">{active.title}</h2>
              <p id="confirm-dialog-description" className="mt-2 break-words text-sm leading-6 text-[#3d4038]">{active.description}</p>
            </div>
          </div>
          {error && <p role="alert" className="mt-4 rounded-lg border border-[#943520]/25 bg-[#ba472f]/5 px-3 py-2 text-sm text-[#943520]">{error}</p>}
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button ref={cancelRef} type="button" disabled={loading} onClick={() => finish(false)} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#b8aa8e] bg-white px-4 text-sm font-bold text-[#244b3a] hover:bg-[#f3e9d5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ba472f] disabled:opacity-55">
              {active.cancelLabel || "Batal"}
            </button>
            <button type="button" disabled={loading} onClick={() => void handleConfirm()} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ba472f] disabled:cursor-wait disabled:opacity-65 ${active.variant === "danger" ? "bg-[#ba472f] hover:bg-[#943520]" : "bg-[#244b3a] hover:bg-[#183b2d]"}`}>
              {loading && <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />}
              {loading ? "Memproses…" : active.confirmLabel || "Lanjutkan"}
            </button>
            {active.secondaryAction && <a href={active.secondaryAction.href} download className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#b8aa8e] bg-white px-4 text-sm font-bold text-[#244b3a] hover:bg-[#f3e9d5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ba472f]">
              {active.secondaryAction.label}
            </a>}
          </div>
        </section>
      </div>,
      document.body,
    )}
  </ConfirmContext.Provider>;
}
