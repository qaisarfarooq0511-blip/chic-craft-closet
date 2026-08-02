import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Category } from "@/types/database";

export type AdminCategoryRow = Category & {
  /** Non-deleted products in this category — from products(count), not a separate fetch. */
  product_count: number;
};

async function fetchAdminCategories(): Promise<AdminCategoryRow[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*, products(count)")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => {
    const { products, ...category } = row as Category & { products: { count: number }[] };
    return { ...category, product_count: products?.[0]?.count ?? 0 };
  });
}

/**
 * All categories including soft-deleted ones (admin list shows deleted rows
 * greyed out with a restore option) — unlike useCategories this has no
 * staleTime so admin edits reflect immediately.
 */
export function useAdminCategories() {
  return useQuery({
    queryKey: ["admin-categories"],
    queryFn: fetchAdminCategories,
  });
}
