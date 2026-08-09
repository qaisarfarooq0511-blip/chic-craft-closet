const isBrowser = () => typeof window !== "undefined";

/** Storage keys used by user-auth.tsx. */
export const K = {
  session: "yaawun:user-session:v1",
  users: "yaawun:users:v1",
  addresses: "yaawun:addresses:v1",
  wishlist: "yaawun:wishlist:v1",
} as const;

const cache = new Map<string, unknown>();

export function readLocal<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  if (cache.has(key)) return cache.get(key) as T;
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    const parsed = JSON.parse(raw) as T;
    cache.set(key, parsed);
    return parsed;
  } catch {
    return fallback;
  }
}

export function writeLocal<T>(key: string, value: T) {
  if (!isBrowser()) return;
  cache.set(key, value);
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn("local cache write failed", key, e);
  }
  window.dispatchEvent(new StorageEvent("storage", { key }));
}

export function removeLocal(key: string) {
  if (!isBrowser()) return;
  cache.delete(key);
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new StorageEvent("storage", { key }));
}
