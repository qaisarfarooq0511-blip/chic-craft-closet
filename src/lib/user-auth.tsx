import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type AppUser = {
  id: string;
  mobile: string; // E.164-ish, e.g. +919876543210
  name: string;
  email?: string;
  createdAt: number;
};

export type Address = {
  id: string;
  userId: string;
  label?: string;          // "Home", "Office"
  name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  pincode: string;
  isDefault?: boolean;
  createdAt: number;
};

const USERS_KEY = "yaawun:users:v1";
const SESSION_KEY = "yaawun:user-session:v1";
const ADDRESSES_KEY = "yaawun:addresses:v1";
const WISHLIST_KEY = "yaawun:wishlist:v1";

const isBrowser = () => typeof window !== "undefined";

// ---------------- validation helpers ----------------

/** Allowed: letters, spaces, hyphens, apostrophes, periods. No digits, no other special chars. */
export const NAME_REGEX = /^[A-Za-z][A-Za-z\s.'-]*$/;

export function validateName(input: string): { ok: true; value: string } | { ok: false; error: string } {
  const trimmed = input.trim().replace(/\s+/g, " ");
  if (trimmed.length < 2) return { ok: false, error: "Please enter your full name." };
  if (trimmed.length > 60) return { ok: false, error: "Name is too long." };
  if (!NAME_REGEX.test(trimmed)) return { ok: false, error: "Name can only contain letters, spaces, hyphens and apostrophes." };
  return { ok: true, value: capitalizeName(trimmed) };
}

/** Capitalize first letter of every word (handles hyphenated and apostrophe names: o'brien → O'Brien). */
export function capitalizeName(input: string): string {
  return input
    .toLowerCase()
    .split(" ")
    .map((word) =>
      word
        .split("-")
        .map((seg) =>
          seg
            .split("'")
            .map((s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s))
            .join("'")
        )
        .join("-")
    )
    .join(" ");
}

export function validateMobile(input: string): { ok: true; value: string } | { ok: false; error: string } {
  const digits = input.replace(/[^\d]/g, "");
  // Accept 10-digit, 11-digit (0-prefixed), 12-digit (91-prefixed)
  if (digits.length === 10 && /^[6-9]/.test(digits)) return { ok: true, value: "+91" + digits };
  if (digits.length === 11 && digits.startsWith("0") && /^[6-9]/.test(digits.slice(1))) return { ok: true, value: "+91" + digits.slice(1) };
  if (digits.length === 12 && digits.startsWith("91") && /^[6-9]/.test(digits.slice(2))) return { ok: true, value: "+" + digits };
  return { ok: false, error: "Enter a valid 10-digit Indian mobile number." };
}

export function normalizeMobile(input: string): string {
  const v = validateMobile(input);
  if (v.ok) return v.value;
  // fall back: best-effort normalisation
  const digits = input.replace(/[^\d]/g, "");
  if (digits.length === 10) return "+91" + digits;
  if (digits.length === 11 && digits.startsWith("0")) return "+91" + digits.slice(1);
  if (digits.length === 12 && digits.startsWith("91")) return "+" + digits;
  if (input.trim().startsWith("+")) return "+" + digits;
  return "+" + digits;
}

// ---------------- users ----------------

function readUsers(): AppUser[] {
  if (!isBrowser()) return [];
  try { return JSON.parse(localStorage.getItem(USERS_KEY) || "[]"); } catch { return []; }
}
function writeUsers(users: AppUser[]) {
  if (!isBrowser()) return;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  window.dispatchEvent(new StorageEvent("storage", { key: USERS_KEY }));
}
function readSession(): AppUser | null {
  if (!isBrowser()) return null;
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch { return null; }
}
function writeSession(u: AppUser | null) {
  if (!isBrowser()) return;
  if (u) localStorage.setItem(SESSION_KEY, JSON.stringify(u));
  else localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new StorageEvent("storage", { key: SESSION_KEY }));
}

export function findUserByMobile(mobile: string): AppUser | undefined {
  const norm = normalizeMobile(mobile);
  return readUsers().find((u) => u.mobile === norm);
}

export function createUser(mobile: string, name: string, email?: string): AppUser {
  const users = readUsers();
  const u: AppUser = {
    id: (typeof crypto !== "undefined" && "randomUUID" in crypto) ? crypto.randomUUID() : String(Date.now()),
    mobile: normalizeMobile(mobile),
    name: capitalizeName(name.trim()),
    email: email?.trim() || undefined,
    createdAt: Date.now(),
  };
  users.push(u);
  writeUsers(users);
  return u;
}

/** Used by checkout to silently create or fetch an account. */
export function findOrCreateUserByMobile(mobile: string, name: string): AppUser {
  const existing = findUserByMobile(mobile);
  if (existing) return existing;
  return createUser(mobile, name);
}

export function updateUserRecord(id: string, patch: Partial<Pick<AppUser, "name" | "email">>): AppUser | null {
  const users = readUsers();
  const idx = users.findIndex((u) => u.id === id);
  if (idx < 0) return null;
  const updated: AppUser = {
    ...users[idx],
    ...(patch.name !== undefined ? { name: capitalizeName(patch.name.trim()) } : {}),
    ...(patch.email !== undefined ? { email: patch.email.trim() || undefined } : {}),
  };
  users[idx] = updated;
  writeUsers(users);
  const session = readSession();
  if (session && session.id === id) writeSession(updated);
  return updated;
}

// ---------------- addresses ----------------

function readAllAddresses(): Address[] {
  if (!isBrowser()) return [];
  try { return JSON.parse(localStorage.getItem(ADDRESSES_KEY) || "[]"); } catch { return []; }
}
function writeAllAddresses(list: Address[]) {
  if (!isBrowser()) return;
  localStorage.setItem(ADDRESSES_KEY, JSON.stringify(list));
  window.dispatchEvent(new StorageEvent("storage", { key: ADDRESSES_KEY }));
}
export function getAddresses(userId: string): Address[] {
  return readAllAddresses().filter((a) => a.userId === userId);
}
export function upsertAddress(addr: Address) {
  const all = readAllAddresses();
  let next = all.filter((a) => a.id !== addr.id);
  // If marked default, clear default on others for the same user.
  if (addr.isDefault) {
    next = next.map((a) => (a.userId === addr.userId ? { ...a, isDefault: false } : a));
  }
  next.push(addr);
  writeAllAddresses(next);
}
export function deleteAddress(id: string) {
  writeAllAddresses(readAllAddresses().filter((a) => a.id !== id));
}
export function setDefaultAddress(userId: string, id: string) {
  const all = readAllAddresses().map((a) =>
    a.userId === userId ? { ...a, isDefault: a.id === id } : a
  );
  writeAllAddresses(all);
}

// ---------------- wishlist ----------------

type WishlistMap = Record<string, number[]>; // userId -> productIds

function readWishlistMap(): WishlistMap {
  if (!isBrowser()) return {};
  try { return JSON.parse(localStorage.getItem(WISHLIST_KEY) || "{}"); } catch { return {}; }
}
function writeWishlistMap(m: WishlistMap) {
  if (!isBrowser()) return;
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(m));
  window.dispatchEvent(new StorageEvent("storage", { key: WISHLIST_KEY }));
}
export function getWishlist(userId: string): number[] {
  return readWishlistMap()[userId] ?? [];
}
export function toggleWishlist(userId: string, productId: number): number[] {
  const m = readWishlistMap();
  const list = m[userId] ?? [];
  const next = list.includes(productId) ? list.filter((id) => id !== productId) : [...list, productId];
  m[userId] = next;
  writeWishlistMap(m);
  return next;
}

// ---------------- context ----------------

type Ctx = {
  user: AppUser | null;
  hydrated: boolean;
  signIn: (u: AppUser) => void;
  signOut: () => void;
  updateUser: (patch: Partial<Pick<AppUser, "name" | "email">>) => void;
};

const UserAuthContext = createContext<Ctx | null>(null);


export function UserAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setUser(readSession());
    setHydrated(true);
    const refresh = (e: StorageEvent) => {
      if (!e.key || e.key === SESSION_KEY) setUser(readSession());
    };
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, []);

  const signIn = (u: AppUser) => { writeSession(u); setUser(u); };
  const signOut = () => { writeSession(null); setUser(null); };
  const updateUser = (patch: Partial<Pick<AppUser, "name" | "email">>) => {
    if (!user) return;
    const next = updateUserRecord(user.id, patch);
    if (next) setUser(next);
  };

  return (
    <UserAuthContext.Provider value={{ user, hydrated, signIn, signOut, updateUser }}>
      {children}
    </UserAuthContext.Provider>
  );
}


export function useUserAuth() {
  const ctx = useContext(UserAuthContext);
  if (!ctx) throw new Error("useUserAuth must be used inside <UserAuthProvider>");
  return ctx;
}
