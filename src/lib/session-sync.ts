"use client";

const sessionChangeKey = "sapen:session-changed";
const sessionChannelName = "sapen-session-sync";

export function publishSessionChanged(userId?: string | null) {
  const marker = String(Date.now());
  const payload = JSON.stringify({ marker, userId: userId || null });
  try { localStorage.setItem(sessionChangeKey, payload); } catch { /* BroadcastChannel remains available. */ }
  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel(sessionChannelName);
    channel.postMessage({ type: "session-changed", marker, userId: userId || null });
    channel.close();
  }
}

export function subscribeToSessionChanges(onChange: (userId: string | null) => void) {
  const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(sessionChannelName) : null;
  if (channel) channel.onmessage = (event) => { if (event.data?.type === "session-changed") onChange(typeof event.data.userId === "string" ? event.data.userId : null); };
  const onStorage = (event: StorageEvent) => {
    if (event.key !== sessionChangeKey || !event.newValue) return;
    try {
      const payload = JSON.parse(event.newValue) as { userId?: unknown };
      onChange(typeof payload.userId === "string" ? payload.userId : null);
    } catch { onChange(null); }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    channel?.close();
    window.removeEventListener("storage", onStorage);
  };
}
