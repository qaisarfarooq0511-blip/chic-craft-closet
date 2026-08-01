/**
 * Local-only cart for unauthenticated visitors, keyed by real product UUID.
 * Merged into the server-side `cart_items` table on login (see auth-store.ts).
 */
const KEY = "yaawun:guest-cart:v1";

export interface GuestCartLine {
  productId: string;
  quantity: number;
}

const isBrowser = () => typeof window !== "undefined";

function read(): GuestCartLine[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as GuestCartLine[]) : [];
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
  add(productId: string, qty = 1) {
    const existing = lines.find((l) => l.productId === productId);
    lines = existing
      ? lines.map((l) => (l.productId === productId ? { ...l, quantity: l.quantity + qty } : l))
      : [...lines, { productId, quantity: qty }];
    persist();
  },
  setQty(productId: string, qty: number) {
    lines =
      qty <= 0
        ? lines.filter((l) => l.productId !== productId)
        : lines.map((l) => (l.productId === productId ? { ...l, quantity: qty } : l));
    persist();
  },
  remove(productId: string) {
    lines = lines.filter((l) => l.productId !== productId);
    persist();
  },
  clear() {
    lines = [];
    persist();
  },
};
