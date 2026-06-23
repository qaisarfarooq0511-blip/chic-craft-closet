import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { ADMIN_EMAIL, ADMIN_PASSWORD, getAuth, setAuth } from "./storage";

interface AuthCtx {
  email: string | null;
  signIn: (email: string, password: string) => { ok: boolean; error?: string };
  signOut: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    const a = getAuth();
    setEmail(a?.email ?? null);
  }, []);

  const signIn = useCallback((e: string, p: string) => {
    if (e.trim().toLowerCase() !== ADMIN_EMAIL.toLowerCase() || p !== ADMIN_PASSWORD) {
      return { ok: false, error: "Invalid email or password" };
    }
    setAuth({ email: e });
    setEmail(e);
    return { ok: true };
  }, []);

  const signOut = useCallback(() => {
    setAuth(null);
    setEmail(null);
  }, []);

  return <Ctx.Provider value={{ email, signIn, signOut }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth outside AuthProvider");
  return ctx;
}
