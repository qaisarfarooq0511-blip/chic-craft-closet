import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

const ToastCtx = createContext<((msg: string) => void) | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState("");
  const [show, setShow] = useState(false);
  const t = useRef<number | null>(null);

  const push = useCallback((m: string) => {
    setMsg(m);
    setShow(true);
    if (t.current) window.clearTimeout(t.current);
    t.current = window.setTimeout(() => setShow(false), 2400);
  }, []);

  useEffect(() => () => { if (t.current) window.clearTimeout(t.current); }, []);

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className={`toast${show ? " show" : ""}`} role="status" aria-live="polite">{msg}</div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast outside ToastProvider");
  return ctx;
}
