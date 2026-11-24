"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { showAppToast } from "@/components/ui/AppToast";
import { cartStorageOwner, clearClassCart, getCartIdentity, readClassCart, writeClassCart, type CartIdentity } from "@/lib/class-cart-client";
import { CLASS_CART_SNAPSHOT_COOKIE, parseCartSnapshot, type CartSnapshot } from "@/lib/class-cart-snapshot";

interface CartContextValue {
  ids: string[];
  identity: CartIdentity;
  pendingIds: string[];
  add: (id: string) => boolean;
  remove: (id: string) => void;
  removeMany: (ids: string[]) => void;
  clear: () => void;
  isPending: (id: string) => boolean;
}
const CartContext = createContext<CartContextValue | null>(null);

function getCookie(name: string) {
  const entry = document.cookie.split("; ").find((value) => value.startsWith(`${name}=`));
  return entry?.slice(name.length + 1) || "";
}

function updateSnapshotCookie(identity: CartIdentity, ids: string[]) {
  const snapshot: CartSnapshot = parseCartSnapshot(getCookie(CLASS_CART_SNAPSHOT_COOKIE));
  const entry = { ids: [...new Set(ids)], expiresAt: Date.now() + 24 * 60 * 60 * 1000 };
  if (identity.kind === "guest") snapshot.guest = entry;
  else {
    snapshot.accounts ||= {};
    snapshot.accounts[identity.email.trim().toLowerCase()] = entry;
  }
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  const maxAge = identity.kind === "guest" ? "" : "; Max-Age=31536000";
  document.cookie = `${CLASS_CART_SNAPSHOT_COOKIE}=${encodeURIComponent(JSON.stringify(snapshot))}; Path=/; SameSite=Lax${maxAge}${secure}`;
}

function clearSnapshotIdentity(identity: CartIdentity) {
  const snapshot = parseCartSnapshot(getCookie(CLASS_CART_SNAPSHOT_COOKIE));
  if (identity.kind === "guest") delete snapshot.guest;
  else if (snapshot.accounts) delete snapshot.accounts[identity.email.trim().toLowerCase()];
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CLASS_CART_SNAPSHOT_COOKIE}=${encodeURIComponent(JSON.stringify(snapshot))}; Path=/; SameSite=Lax; Max-Age=31536000${secure}`;
}

export function ClassCartProvider({ children, initialIdentity, initialIds }: {
  children: React.ReactNode; initialIdentity: CartIdentity; initialIds: string[];
}) {
  const [identity, setIdentity] = useState(initialIdentity);
  const [ids, setIds] = useState<string[]>([...new Set(initialIds)]);
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const identityRef = useRef(identity);
  const idsRef = useRef(ids);
  const pendingRef = useRef(new Set<string>());
  const channelRef = useRef<BroadcastChannel | null>(null);
  identityRef.current = identity;
  idsRef.current = ids;

  const applyRemote = useCallback((owner: string, nextIds: string[]) => {
    if (owner !== cartStorageOwner(identityRef.current)) return;
    const cleanIds = [...new Set(nextIds.filter((id) => typeof id === "string"))];
    idsRef.current = cleanIds;
    setIds(cleanIds);
    writeClassCart(identityRef.current, cleanIds);
    updateSnapshotCookie(identityRef.current, cleanIds);
  }, []);

  const publish = useCallback((owner: string, nextIds: string[]) => {
    const message = { owner, ids: nextIds, at: Date.now() };
    try { localStorage.setItem("sapen:cart-sync", JSON.stringify(message)); } catch { /* BroadcastChannel remains available. */ }
    channelRef.current?.postMessage(message);
  }, []);

  const replace = useCallback((nextIds: string[], targetIdentity = identityRef.current) => {
    const cleanIds = [...new Set(nextIds)];
    if (!writeClassCart(targetIdentity, cleanIds)) return false;
    updateSnapshotCookie(targetIdentity, cleanIds);
    if (cartStorageOwner(targetIdentity) === cartStorageOwner(identityRef.current)) {
      idsRef.current = cleanIds;
      setIds(cleanIds);
    }
    publish(cartStorageOwner(targetIdentity), cleanIds);
    return true;
  }, [publish]);

  useEffect(() => {
    if (typeof BroadcastChannel !== "undefined") {
      channelRef.current = new BroadcastChannel("sapen-class-cart");
      channelRef.current.onmessage = (event: MessageEvent<{ owner?: string; ids?: string[] }>) => {
        if (event.data?.owner && Array.isArray(event.data.ids)) applyRemote(event.data.owner, event.data.ids);
      };
    }
    const onStorage = (event: StorageEvent) => {
      if (event.key !== "sapen:cart-sync" || !event.newValue) return;
      try { const message = JSON.parse(event.newValue) as { owner?: string; ids?: string[] }; if (message.owner && Array.isArray(message.ids)) applyRemote(message.owner, message.ids); } catch { /* Ignore malformed cross-tab messages. */ }
    };
    const onSessionChanged = async () => {
      const nextIdentity = await getCartIdentity();
      if (cartStorageOwner(nextIdentity) === cartStorageOwner(identityRef.current)) return;
      clearSnapshotIdentity(identityRef.current);
      identityRef.current = nextIdentity;
      setIdentity(nextIdentity);
      const nextIds = readClassCart(nextIdentity);
      idsRef.current = nextIds;
      setIds(nextIds);
      updateSnapshotCookie(nextIdentity, nextIds);
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("sapen:session-changed", onSessionChanged);
    return () => { channelRef.current?.close(); channelRef.current = null; window.removeEventListener("storage", onStorage); window.removeEventListener("sapen:session-changed", onSessionChanged); };
  }, [applyRemote]);

  const add = useCallback((id: string) => {
    if (!id || idsRef.current.includes(id) || pendingRef.current.has(id)) return false;
    const previous = [...idsRef.current];
    const ownerIdentity = identityRef.current;
    const next = [...previous, id];
    if (!replace(next, ownerIdentity)) { showAppToast("Gagal menambah ke keranjang, coba lagi"); return false; }
    pendingRef.current.add(id);
    setPendingIds([...pendingRef.current]);
    void fetch("/api/cart/classes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ classId: id }) })
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || "Cart validation failed");
      })
      .catch(() => {
        if (cartStorageOwner(identityRef.current) === cartStorageOwner(ownerIdentity)) replace(idsRef.current.filter((value) => value !== id), ownerIdentity);
        showAppToast("Gagal menambah ke keranjang, coba lagi");
        window.dispatchEvent(new CustomEvent("sapen:cart-failed", { detail: { classId: id } }));
      })
      .finally(() => { pendingRef.current.delete(id); setPendingIds([...pendingRef.current]); });
    return true;
  }, [replace]);

  const remove = useCallback((id: string) => { replace(idsRef.current.filter((value) => value !== id)); }, [replace]);
  const removeMany = useCallback((removeIds: string[]) => { const removed = new Set(removeIds); replace(idsRef.current.filter((id) => !removed.has(id))); }, [replace]);
  const clear = useCallback(() => {
    const current = identityRef.current;
    clearClassCart(current);
    idsRef.current = [];
    setIds([]);
    updateSnapshotCookie(current, []);
    publish(cartStorageOwner(current), []);
  }, [publish]);
  const value = useMemo<CartContextValue>(() => ({ ids, identity, pendingIds, add, remove, removeMany, clear, isPending: (id) => pendingIds.includes(id) }), [ids, identity, pendingIds, add, remove, removeMany, clear]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useClassCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useClassCart must be used inside ClassCartProvider");
  return value;
}
