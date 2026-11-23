"use client";

const GUEST_KEY = "sapen_class_cart";
const OWNER_KEY = "sapen_class_cart_owner";
const DAY = 24 * 60 * 60 * 1000;

export type CartIdentity = { kind: "guest" } | { kind: "account"; email: string };

function storageKey(identity: CartIdentity) {
  return identity.kind === "guest" ? GUEST_KEY : `${GUEST_KEY}:${identity.email}`;
}

function cleanPreviousOwner(identity: CartIdentity) {
  try {
    const nextOwner = identity.kind === "guest" ? "guest" : `account:${identity.email}`;
    const previousOwner = localStorage.getItem(OWNER_KEY);
    if (previousOwner && previousOwner !== nextOwner) {
      if (previousOwner === "guest") sessionStorage.removeItem(GUEST_KEY);
      else localStorage.removeItem(`${GUEST_KEY}:${previousOwner.slice("account:".length)}`);
    }
    localStorage.setItem(OWNER_KEY, nextOwner);
  } catch { /* Storage may be disabled; the page can still use an empty cart. */ }
}

export async function getCartIdentity(): Promise<CartIdentity> {
  try {
    const response = await fetch("/api/auth/session", { cache: "no-store" });
    const data = await response.json();
    const email = typeof data.session?.email === "string" ? data.session.email.trim().toLowerCase() : "";
    const identity: CartIdentity = email ? { kind: "account", email } : { kind: "guest" };
    cleanPreviousOwner(identity);
    return identity;
  } catch {
    try {
      const owner = localStorage.getItem(OWNER_KEY) || "";
      if (owner.startsWith("account:")) return { kind: "account", email: owner.slice("account:".length) };
    } catch { /* Fall back to the temporary guest cart when storage is unavailable. */ }
    return { kind: "guest" };
  }
}

export function readClassCart(identity: CartIdentity): string[] {
  try {
    const storage = identity.kind === "guest" ? sessionStorage : localStorage;
    const raw = storage.getItem(storageKey(identity));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) return [...new Set(parsed.filter((id): id is string => typeof id === "string"))];
    if (!parsed || typeof parsed !== "object") return [];
    const value = parsed as { ids?: unknown; expiresAt?: unknown };
    if (identity.kind === "guest" && (typeof value.expiresAt !== "number" || value.expiresAt <= Date.now())) {
      storage.removeItem(storageKey(identity));
      return [];
    }
    return Array.isArray(value.ids) ? [...new Set(value.ids.filter((id): id is string => typeof id === "string"))] : [];
  } catch { return []; }
}

export function writeClassCart(identity: CartIdentity, ids: string[]) {
  try {
    const storage = identity.kind === "guest" ? sessionStorage : localStorage;
    storage.setItem(storageKey(identity), JSON.stringify({ ids: [...new Set(ids)], expiresAt: Date.now() + DAY }));
    window.dispatchEvent(new Event("sapen:cart-updated"));
  } catch { /* Leave the action safely unavailable if browser storage is blocked. */ }
}

export function clearClassCart() {
  try {
    const owner = localStorage.getItem(OWNER_KEY);
    if (owner === "guest") sessionStorage.removeItem(GUEST_KEY);
    else if (owner?.startsWith("account:")) localStorage.removeItem(`${GUEST_KEY}:${owner.slice("account:".length)}`);
    localStorage.removeItem(OWNER_KEY);
    window.dispatchEvent(new Event("sapen:cart-updated"));
  } catch { /* Ignore unavailable storage during logout. */ }
}
