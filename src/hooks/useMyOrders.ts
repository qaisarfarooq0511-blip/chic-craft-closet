import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import type { Address, Order, OrderItem } from "@/types/database";

export type MyOrderListRow = Order & { item_count: number };

async function fetchMyOrders(): Promise<MyOrderListRow[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("*, items:order_items(count)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => {
    const { items, ...rest } = row as unknown as Order & { items: { count: number }[] };
    return { ...rest, item_count: items?.[0]?.count ?? 0 };
  });
}

/** Customer's own order history — RLS (orders_select_own) scopes this with no extra filtering. */
export function useMyOrders() {
  const { isAuthenticated } = useSupabaseAuth();
  return useQuery({
    queryKey: ["my-orders"],
    queryFn: fetchMyOrders,
    enabled: isAuthenticated,
  });
}

export type MyOrderDetail = Order & {
  shipping_address: Address | null;
  items: OrderItem[];
};

async function fetchMyOrder(orderNumber: string): Promise<MyOrderDetail | null> {
  const { data, error } = await supabase
    .from("orders")
    .select("*, shipping_address:addresses(*), items:order_items(*)")
    .eq("order_number", orderNumber)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as MyOrderDetail | null;
}

/** Single order by order_number, scoped to the caller via the same RLS policy. */
export function useMyOrder(orderNumber: string) {
  const { isAuthenticated } = useSupabaseAuth();
  return useQuery({
    queryKey: ["my-order", orderNumber],
    queryFn: () => fetchMyOrder(orderNumber),
    enabled: isAuthenticated && !!orderNumber,
  });
}
