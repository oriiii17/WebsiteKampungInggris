"use client";

const sessionChangeKey = "sapen:session-changed";
const sessionChannelName = "sapen-session-sync";

export function publishSessionChanged() {
  const marker = String(Date.now());
  try { localStorage.setItem(sessionChangeKey, marker); } catch { /* BroadcastChannel remains available. */ }
  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel(sessionChannelName);
    channel.postMessage({ type: "session-changed", marker });
    channel.close();
  }
}

export function subscribeToSessionChanges(onChange: () => void) {
  const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(sessionChannelName) : null;
  if (channel) channel.onmessage = (event) => { if (event.data?.type === "session-changed") onChange(); };
  const onStorage = (event: StorageEvent) => { if (event.key === sessionChangeKey && event.newValue) onChange(); };
  window.addEventListener("storage", onStorage);
  return () => {
    channel?.close();
    window.removeEventListener("storage", onStorage);
  };
}
