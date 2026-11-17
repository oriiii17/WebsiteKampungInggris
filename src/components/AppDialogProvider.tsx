"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, HelpCircle } from "lucide-react";

type Request = { kind: "confirm" | "alert" | "prompt"; title: string; message: string; initial?: string; resolve: (value: boolean | string | null) => void };
type DialogApi = { confirm: (message: string, title?: string) => Promise<boolean>; alert: (message: string, title?: string) => Promise<void>; prompt: (message: string, initial?: string, title?: string) => Promise<string | null> };
const DialogContext = createContext<DialogApi | null>(null);

export function useAppDialog() {
  const value = useContext(DialogContext);
  if (!value) throw new Error("useAppDialog must be used within AppDialogProvider");
  return value;
}

export default function AppDialogProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState<Request | null>(null);
  const queue = useRef<Request[]>([]);
  const showNext = useCallback(() => setActive(queue.current.shift() || null), []);
  const request = useCallback((kind: Request["kind"], message: string, title: string, initial?: string) => new Promise<boolean | string | null>((resolve) => {
    const item: Request = { kind, message, title, initial, resolve };
    if (active) queue.current.push(item); else setActive(item);
  }), [active]);
  const api: DialogApi = {
    confirm: async (message, title = "Konfirmasi") => (await request("confirm", message, title)) === true,
    alert: async (message, title = "Informasi") => { await request("alert", message, title); },
    prompt: async (message, initial = "", title = "Ubah nama") => { const result = await request("prompt", message, title, initial); return typeof result === "string" ? result : null; },
  };
  function finish(value: boolean | string | null) { active?.resolve(value); showNext(); }

  return <DialogContext.Provider value={api}>
    {children}
    {active && typeof document !== "undefined" && createPortal(
      <div className="app-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && active.kind !== "alert") finish(null); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="app-dialog-title" className="app-dialog-panel">
          <div className="app-dialog-icon">{active.kind === "confirm" ? <HelpCircle aria-hidden="true"/> : <AlertCircle aria-hidden="true"/>}</div>
          <h2 id="app-dialog-title" className="app-dialog-title">{active.title}</h2>
          <p className="app-dialog-message">{active.message}</p>
          {active.kind === "prompt" && <input autoFocus className="app-dialog-input" defaultValue={active.initial} onKeyDown={(event) => { if (event.key === "Enter") finish(event.currentTarget.value); }} />}
          <div className="app-dialog-actions">
            {active.kind !== "alert" && <button type="button" className="app-dialog-cancel" onClick={() => finish(null)}>Batal</button>}
            <button type="button" autoFocus={active.kind !== "prompt"} className="app-dialog-confirm" onClick={(event) => finish(active.kind === "prompt" ? (event.currentTarget.closest(".app-dialog-panel")?.querySelector("input") as HTMLInputElement)?.value ?? "" : true)}>{active.kind === "confirm" ? "Ya" : active.kind === "prompt" ? "Simpan" : "Oke"}</button>
          </div>
        </section>
      </div>, document.body,
    )}
  </DialogContext.Provider>;
}
