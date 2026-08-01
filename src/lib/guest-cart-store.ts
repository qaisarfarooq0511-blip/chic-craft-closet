/**
 * Local-only cart for unauthenticated visitors, keyed by real product UUID.
 * Merged into the server-side `cart_items` table on login (see auth-store.ts).
 */
const KEY = "yaawun:guest-cart:v1";

export interface GuestCartLine {
  productId: string;
  variantId: string | null;
  quantity: number;
}

const isBrowser = () => typeof window !== "undefined";

const sameLine = (l: GuestCartLine, productId: string, variantId: string | null) =>
  l.productId === productId && l.variantId === variantId;

function read(): GuestCartLine[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    // Normalize lines persisted before variantId existed (undefined -> null).
    return (JSON.parse(raw) as GuestCartLine[]).map((l) => ({
      ...l,
      variantId: l.variantId ?? null,
    }));
  } catch {
    return [];
  }
}

let lines: GuestCartLine[] = read();
const listeners = new Set<() => void>();

function persist() {
  if (isBrowser()) localStorage.setItem(KEY, JSON.stringify(lines));
  listeners.forEach((l) => l());
}

export const guestCartStore = {
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot: (): GuestCartLine[] => lines,
  add(productId: string, variantId: string | null, qty = 1) {
    const existing = lines.find((l) => sameLine(l, productId, variantId));
    lines = existing
      ? lines.map((l) =>
          sameLine(l, productId, variantId) ? { ...l, quantity: l.quantity + qty } : l,
        )
      : [...lines, { productId, variantId, quantity: qty }];
    persist();
  },
  setQty(productId: string, variantId: string | null, qty: number) {
    lines =
      qty <= 0
        ? lines.filter((l) => !sameLine(l, productId, variantId))
        : lines.map((l) => (sameLine(l, productId, variantId) ? { ...l, quantity: qty } : l));
    persist();
  },
  remove(productId: string, variantId: string | null) {
    lines = lines.filter((l) => !sameLine(l, productId, variantId));
    persist();
  },
  clear() {
    lines = [];
    persist();
  },
};
