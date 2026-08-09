import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Category, Product, ProductImage } from "@/types/database";

export type ProductWithRelations = Product & {
  category: Category | null;
  images: ProductImage[];
  /** Real rating always takes precedence; editorial only fills in when rating_count is 0. */
  effectiveRatingAvg: number;
  effectiveRatingCount: number;
};

interface UseProductsOptions {
  categoryId?: string | null;
  badge?: string | null;
  limit?: number;
}

/** Single source of truth for the ["products", ...] query key — every SSR loader that
 *  ensureQueryData()s a products list must build its key with this, not by hand, or a
 *  route loader's prefetch silently misses useProducts()'s cache lookup after hydration. */
export const productsQueryKey = (options: UseProductsOptions = {}) => [
  "products",
  options.categoryId ?? null,
  options.badge ?? null,
  options.limit ?? null,
];

/** The exact `select()` shape every product-list query needs to feed `mapProductRow`. */
export const PRODUCT_WITH_RELATIONS_SELECT =
  "*, category:categories(*), images:product_images(*), editorial_reviews:editorial_reviews(rating, is_approved, deleted_at)";

/**
 * Real rating always takes precedence; editorial only fills in when rating_count is 0.
 * Shared by every query that feeds a `ProductWithRelations` grid (product list, PDP,
 * wishlist) so the fallback logic can't drift between them.
 */
export function mapProductRow(
  row: ProductWithRelations & {
    editorial_reviews: { rating: number; is_approved: boolean; deleted_at: string | null }[];
  },
): ProductWithRelations {
  const { editorial_reviews, ...rest } = row;
  const approvedEditorial = (editorial_reviews ?? []).filter((e) => e.is_approved && !e.deleted_at);
  const effectiveRatingAvg =
    rest.rating_count > 0
      ? rest.rating_avg
      : approvedEditorial.length > 0
        ? approvedEditorial.reduce((sum, e) => sum + e.rating, 0) / approvedEditorial.length
        : 0;
  const effectiveRatingCount = rest.rating_count > 0 ? rest.rating_count : approvedEditorial.length;
  return { ...rest, effectiveRatingAvg, effectiveRatingCount };
}

/** Exported so route loaders can ensureQueryData() with the exact same queryFn as useProducts(). */
export async function fetchProducts({
  categoryId,
  badge,
  limit,
}: UseProductsOptions): Promise<ProductWithRelations[]> {
  let query = supabase
    .from("products")
    .select(PRODUCT_WITH_RELATIONS_SELECT)
    .eq("status", "active")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (categoryId) query = query.eq("category_id", categoryId);
  if (badge) query = query.eq("badge", badge);
  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((row) =>
    mapProductRow(row as unknown as Parameters<typeof mapProductRow>[0]),
  );
}

/** Active, non-deleted products for the storefront — optionally scoped to a category or badge. RLS mirrors this filter for anon. */
export function useProducts(options: UseProductsOptions = {}) {
  return useQuery({
    queryKey: productsQueryKey(options),
    queryFn: () => fetchProducts(options),
    staleTime: 60 * 1000,
  });
}
