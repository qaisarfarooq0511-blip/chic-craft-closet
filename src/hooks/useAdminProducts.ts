import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Category, Product, ProductImage } from "@/types/database";

export const ADMIN_PAGE_SIZE = 50;

export type AdminProductRow = Product & {
  category: Category | null;
  images: ProductImage[];
  variant_count: number;
};

export interface UseAdminProductsOptions {
  page: number; // 0-based
  categoryId?: string;
  status?: "draft" | "active" | "archived" | "all";
  search?: string;
}

async function fetchAdminProducts(
  opts: UseAdminProductsOptions,
): Promise<{ rows: AdminProductRow[]; total: number }> {
  const from = opts.page * ADMIN_PAGE_SIZE;
  const to = from + ADMIN_PAGE_SIZE - 1;

  let query = supabase
    .from("products")
    .select(
      "*, category:categories(*), images:product_images(*), variants:product_variants(count)",
      { count: "exact" },
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (opts.categoryId) query = query.eq("category_id", opts.categoryId);
  if (opts.status && opts.status !== "all") query = query.eq("status", opts.status);
  if (opts.search?.trim()) query = query.ilike("name", `%${opts.search.trim()}%`);

  const { data, error, count } = await query;
  if (error) throw error;
  const rows = (data ?? []).map((row) => {
    const { variants, ...rest } = row as unknown as AdminProductRow & {
      variants: { count: number }[];
    };
    return { ...rest, variant_count: variants?.[0]?.count ?? 0 };
  });
  return { rows, total: count ?? 0 };
}

/** Admin products table — paginated (50/page), filterable by category/status, searchable by name. */
export function useAdminProducts(opts: UseAdminProductsOptions) {
  return useQuery({
    queryKey: ["admin-products", opts],
    queryFn: () => fetchAdminProducts(opts),
  });
}
