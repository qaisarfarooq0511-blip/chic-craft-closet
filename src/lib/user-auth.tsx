import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type AppUser = {
  id: string;
  mobile: string; // E.164-ish, e.g. +919876543210
  name: string;
  email?: string;
  createdAt: number;
};

const USERS_KEY = "yaawun:users:v1";
const SESSION_KEY = "yaawun:user-session:v1";

const isBrowser = () => typeof window !== "undefined";

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

export function normalizeMobile(input: string): string {
  const digits = input.replace(/[^\d]/g, "");
  // If user typed leading 0 or just 10 digits, assume India (+91).
  if (digits.length === 10) return "+91" + digits;
  if (digits.length === 11 && digits.startsWith("0")) return "+91" + digits.slice(1);
  if (digits.length === 12 && digits.startsWith("91")) return "+" + digits;
  if (input.trim().startsWith("+")) return "+" + digits;
  return "+" + digits;
}

export function findUserByMobile(mobile: string): AppUser | undefined {
  const norm = normalizeMobile(mobile);
  return readUsers().find((u) => u.mobile === norm);
}

export function createUser(mobile: string, name: string): AppUser {
  const users = readUsers();
  const u: AppUser = {
    id: (typeof crypto !== "undefined" && "randomUUID" in crypto) ? crypto.randomUUID() : String(Date.now()),
    mobile: normalizeMobile(mobile),
    name: name.trim(),
    createdAt: Date.now(),
  };
  users.push(u);
  writeUsers(users);
  return u;
}

export function updateUserRecord(id: string, patch: Partial<Pick<AppUser, "name" | "email">>): AppUser | null {
  const users = readUsers();
  const idx = users.findIndex((u) => u.id === id);
  if (idx < 0) return null;
  const updated: AppUser = {
    ...users[idx],
    ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
    ...(patch.email !== undefined ? { email: patch.email.trim() || undefined } : {}),
  };
  users[idx] = updated;
  writeUsers(users);
  const session = readSession();
  if (session && session.id === id) writeSession(updated);
  return updated;
}

type Ctx = {
  user: AppUser | null;
  signIn: (u: AppUser) => void;
  signOut: () => void;
  updateUser: (patch: Partial<Pick<AppUser, "name" | "email">>) => void;
};

const UserAuthContext = createContext<Ctx | null>(null);

export function UserAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);

  useEffect(() => {
    setUser(readSession());
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
    <UserAuthContext.Provider value={{ user, signIn, signOut, updateUser }}>
      {children}
    </UserAuthContext.Provider>
  );
}

export function useUserAuth() {
  const ctx = useContext(UserAuthContext);
  if (!ctx) throw new Error("useUserAuth must be used inside <UserAuthProvider>");
  return ctx;
}
