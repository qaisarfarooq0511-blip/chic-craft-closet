import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { CartLine } from "./types";
import { getCart, saveCart, getProducts } from "./storage";
import { supabase } from "./supabase";

const DEFAULT_MAX_QTY_PER_ITEM = 10;

interface CartContextValue {
  lines: CartLine[];
  count: number;
  add: (productId: number, qty?: number) => void;
  update: (productId: number, qty: number) => void;
  remove: (productId: number) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const maxQtyRef = useRef(DEFAULT_MAX_QTY_PER_ITEM);

  useEffect(() => {
    setLines(getCart());
  }, []);

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("value")
      .eq("key", "max_qty_per_item")
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || typeof data?.value !== "number") return;
        maxQtyRef.current = data.value;
      });
  }, []);

  useEffect(() => {
    saveCart(lines);
  }, [lines]);

  const add = useCallback((productId: number, qty = 1) => {
    const max = maxQtyRef.current;
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === productId);
      if (existing)
        return prev.map((l) =>
          l.productId === productId ? { ...l, qty: Math.min(max, l.qty + qty) } : l,
        );
      return [...prev, { productId, qty: Math.min(max, qty) }];
    });
  }, []);

  const update = useCallback((productId: number, qty: number) => {
    const max = maxQtyRef.current;
    setLines((prev) =>
      prev
        .map((l) =>
          l.productId === productId ? { ...l, qty: Math.min(max, Math.max(1, qty)) } : l,
        )
        .filter((l) => l.qty > 0),
    );
  }, []);

  const remove = useCallback((productId: number) => {
    setLines((prev) => prev.filter((l) => l.productId !== productId));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const count = lines.reduce((s, l) => s + l.qty, 0);

  return (
    <CartContext.Provider value={{ lines, count, add, update, remove, clear }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart outside CartProvider");
  return ctx;
}

export function cartSubtotal(lines: CartLine[]) {
  const products = getProducts();
  return lines.reduce((s, l) => {
    const p = products.find((x) => x.id === l.productId);
    return p ? s + p.price * l.qty : s;
  }, 0);
}
