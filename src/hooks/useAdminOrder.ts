import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Address, Order, OrderItem, Profile } from "@/types/database";

export type AdminOrderDetail = Order & {
  customer: Pick<Profile, "full_name" | "phone"> | null;
  shipping_address: Address | null;
  items: OrderItem[];
};

async function fetchAdminOrder(id: string): Promise<AdminOrderDetail | null> {
  const { data, error } = await supabase
    .from("orders")
    .select(
      "*, customer:profiles(full_name, phone), shipping_address:addresses(*), items:order_items(*)",
    )
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as AdminOrderDetail | null;
}

export function useAdminOrder(id: string) {
  return useQuery({
    queryKey: ["admin-order", id],
    queryFn: () => fetchAdminOrder(id),
  });
}
