import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { OrderStatus } from "@/types/database";

export interface DashboardStats {
  liveProducts: number;
  outOfStock: number;
  lowStock: number; // stock_count < 5 (includes out-of-stock)
  totalOrders: number;
  pendingOrders: number;
  revenueToday: number; // paise
  revenueWeek: number; // paise
  revenueMonth: number; // paise
  ordersByStatus: Record<OrderStatus, number>;
  topProducts: { productId: string; productName: string; quantity: number }[];
}

const EXCLUDED_REVENUE_STATUSES = "(cancelled,refunded)";
const ALL_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "dispatched",
  "delivered",
  "cancelled",
  "refunded",
];

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfWeek(d: Date): Date {
  const x = startOfDay(d);
  const day = x.getDay(); // 0 = Sunday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diffToMonday);
  return x;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

async function sumRevenueSince(since: Date): Promise<number> {
  const { data, error } = await supabase
    .from("orders")
    .select("total")
    .is("deleted_at", null)
    .not("status", "in", EXCLUDED_REVENUE_STATUSES)
    .gte("created_at", since.toISOString());
  if (error) throw error;
  return (data ?? []).reduce((sum, row) => sum + row.total, 0);
}

async function fetchDashboardStats(): Promise<DashboardStats> {
  const now = new Date();
  const monthStart = startOfMonth(now);

  const [
    liveProductsRes,
    outOfStockRes,
    lowStockRes,
    totalOrdersRes,
    pendingOrdersRes,
    revenueToday,
    revenueWeek,
    revenueMonth,
    statusRows,
    topProductsRows,
  ] = await Promise.all([
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .is("deleted_at", null),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .eq("stock_count", 0)
      .is("deleted_at", null),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .lt("stock_count", 5)
      .is("deleted_at", null),
    supabase.from("orders").select("id", { count: "exact", head: true }).is("deleted_at", null),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .is("deleted_at", null),
    sumRevenueSince(startOfDay(now)),
    sumRevenueSince(startOfWeek(now)),
    sumRevenueSince(monthStart),
    supabase.from("orders").select("status").is("deleted_at", null),
    supabase
      .from("order_items")
      .select("product_id, product_name, quantity, orders!inner(created_at, status)")
      .gte("orders.created_at", monthStart.toISOString())
      .not("orders.status", "in", EXCLUDED_REVENUE_STATUSES),
  ]);

  const ordersByStatus = ALL_STATUSES.reduce(
    (acc, s) => ({ ...acc, [s]: 0 }),
    {} as Record<OrderStatus, number>,
  );
  for (const row of statusRows.data ?? []) {
    ordersByStatus[row.status as OrderStatus] =
      (ordersByStatus[row.status as OrderStatus] ?? 0) + 1;
  }

  const productVolume = new Map<string, { productName: string; quantity: number }>();
  for (const row of topProductsRows.data ?? []) {
    const existing = productVolume.get(row.product_id);
    if (existing) {
      existing.quantity += row.quantity;
    } else {
      productVolume.set(row.product_id, { productName: row.product_name, quantity: row.quantity });
    }
  }
  const topProducts = Array.from(productVolume.entries())
    .map(([productId, v]) => ({ productId, productName: v.productName, quantity: v.quantity }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  return {
    liveProducts: liveProductsRes.count ?? 0,
    outOfStock: outOfStockRes.count ?? 0,
    lowStock: lowStockRes.count ?? 0,
    totalOrders: totalOrdersRes.count ?? 0,
    pendingOrders: pendingOrdersRes.count ?? 0,
    revenueToday,
    revenueWeek,
    revenueMonth,
    ordersByStatus,
    topProducts,
  };
}

/**
 * Dashboard aggregates computed client-side against live tables — no migration,
 * no materialized view. Fine at current order volume; revisit with a view/RPC
 * once volume justifies it (CLAUDE.md's own bar for that tradeoff).
 */
export function useAdminDashboard() {
  return useQuery({ queryKey: ["admin-dashboard-stats"], queryFn: fetchDashboardStats });
}
