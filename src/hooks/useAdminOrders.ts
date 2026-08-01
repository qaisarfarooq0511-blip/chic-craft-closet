import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Address, Order, OrderItem, Profile } from "@/types/database";

export const ADMIN_ORDERS_PAGE_SIZE = 50;

export type AdminOrderRow = Order & {
  customer: Pick<Profile, "full_name"> | null;
  shipping_address: Address | null;
  items: OrderItem[];
};

export interface UseAdminOrdersOptions {
  page: number; // 0-based
  status?: Order["status"] | "all";
}

async function fetchAdminOrders(
  opts: UseAdminOrdersOptions,
): Promise<{ rows: AdminOrderRow[]; total: number }> {
  const from = opts.page * ADMIN_ORDERS_PAGE_SIZE;
  const to = from + ADMIN_ORDERS_PAGE_SIZE - 1;

  let query = supabase
    .from("orders")
    .select(
      "*, customer:profiles(full_name), shipping_address:addresses(*), items:order_items(*)",
      { count: "exact" },
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (opts.status && opts.status !== "all") query = query.eq("status", opts.status);

  const { data, error, count } = await query;
  if (error) throw error;
  return { rows: (data ?? []) as unknown as AdminOrderRow[], total: count ?? 0 };
}

export function useAdminOrders(opts: UseAdminOrdersOptions) {
  return useQuery({
    queryKey: ["admin-orders", opts],
    queryFn: () => fetchAdminOrders(opts),
  });
}
