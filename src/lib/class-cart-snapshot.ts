export const CLASS_CART_SNAPSHOT_COOKIE = "sapen_cart_snapshot";

export type CartIdentity = { kind: "guest" } | { kind: "account"; email: string };
export type CartSnapshot = {
  guest?: { ids: string[]; expiresAt: number };
  accounts?: Record<string, { ids: string[]; expiresAt: number }>;
};

export function cartOwnerKey(identity: CartIdentity) {
  return identity.kind === "guest" ? "guest" : `account:${identity.email.trim().toLowerCase()}`;
}

export function parseCartSnapshot(raw?: string | null): CartSnapshot {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as CartSnapshot;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch { return {}; }
}

export function getSnapshotCart(snapshot: CartSnapshot, identity: CartIdentity, now = Date.now()) {
  const entry = identity.kind === "guest" ? snapshot.guest : snapshot.accounts?.[identity.email.trim().toLowerCase()];
  if (!entry || !Array.isArray(entry.ids) || entry.expiresAt <= now) return [];
  return [...new Set(entry.ids.filter((id): id is string => typeof id === "string"))];
}
