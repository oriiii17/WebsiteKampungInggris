"use client";

const sessionChangeKey = "sapen:session-changed";
const sessionChannelName = "sapen-session-sync";
const tabIdKey = "sapen:session-tab-id";

function getTabId() {
  try {
    let id = sessionStorage.getItem(tabIdKey);
    if (!id) {
      id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now()) + "-" + Math.random().toString(36).slice(2);
      sessionStorage.setItem(tabIdKey, id);
    }
    return id;
  } catch { return String(Date.now()) + "-" + Math.random().toString(36).slice(2); }
}

export function getStoredSupabaseAccessToken() {
  if (typeof window === "undefined") return "";
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) || "";
      if (!/^sb-.*-auth-token$/i.test(key)) continue;
      const raw = localStorage.getItem(key) || "";
      const candidates = [raw];
      if (raw.startsWith("base64-")) {
        try { candidates.push(decodeURIComponent(escape(atob(raw.slice(7))))); } catch { /* Try the plain JSON representation. */ }
      }
      for (const candidate of candidates) {
        try {
          const parsed = JSON.parse(candidate) as { access_token?: unknown };
          if (typeof parsed.access_token === "string" && parsed.access_token.split(".").length === 3) return parsed.access_token;
        } catch { /* Continue through matching Supabase storage entries. */ }
      }
    }
  } catch { /* Browser storage can be disabled. */ }
  return "";
}

export function publishSessionChanged(userId?: string | null) {
  const marker = String(Date.now());
  const originTabId = getTabId();
  const payload = JSON.stringify({ marker, userId: userId || null, originTabId });
  try { localStorage.setItem(sessionChangeKey, payload); } catch { /* BroadcastChannel remains available. */ }
  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel(sessionChannelName);
    channel.postMessage({ type: "session-changed", marker, userId: userId || null, originTabId });
    channel.close();
  }
}

export function subscribeToSessionChanges(onChange: (userId: string | null) => void) {
  const currentTabId = getTabId();
  const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(sessionChannelName) : null;
  if (channel) channel.onmessage = (event) => {
    if (event.data?.type === "session-changed" && event.data.originTabId !== currentTabId) onChange(typeof event.data.userId === "string" ? event.data.userId : null);
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key !== sessionChangeKey || !event.newValue) return;
    try {
      const payload = JSON.parse(event.newValue) as { userId?: unknown; originTabId?: unknown };
      if (payload.originTabId === currentTabId) return;
      onChange(typeof payload.userId === "string" ? payload.userId : null);
    } catch { onChange(null); }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    channel?.close();
    window.removeEventListener("storage", onStorage);
  };
}

export function clearAuthBrowserStorage() {
  if (typeof window === "undefined") return;
  const clear = (storage: Storage) => {
    for (let i = storage.length - 1; i >= 0; i--) {
      const key = storage.key(i);
      if (key && (/^sb-.*-auth-token/i.test(key) || key === "supabase.auth.token" || key === "supabase-auth-token" || key === "sapen_class_cart" || key.startsWith("sapen_class_cart:") || key === "sapen_class_cart_owner" || key === "sapen_last_quiz_name")) storage.removeItem(key);
    }
  };
  try { clear(localStorage); } catch { /* Storage can be unavailable in private browsing. */ }
  try { clear(sessionStorage); } catch { /* Storage can be unavailable in private browsing. */ }
}
