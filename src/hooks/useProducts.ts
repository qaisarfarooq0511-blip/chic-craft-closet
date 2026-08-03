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
}

/** Exported so route loaders can ensureQueryData() with the exact same queryFn as useProducts(). */
export async function fetchProducts({
  categoryId,
}: UseProductsOptions): Promise<ProductWithRelations[]> {
  let query = supabase
    .from("products")
    .select(
      "*, category:categories(*), images:product_images(*), editorial_reviews:editorial_reviews(rating, is_approved, deleted_at)",
    )
    .eq("status", "active")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (categoryId) query = query.eq("category_id", categoryId);

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((row) => {
    const { editorial_reviews, ...rest } = row as unknown as ProductWithRelations & {
      editorial_reviews: { rating: number; is_approved: boolean; deleted_at: string | null }[];
    };
    const approvedEditorial = (editorial_reviews ?? []).filter(
      (e) => e.is_approved && !e.deleted_at,
    );
    const effectiveRatingAvg =
      rest.rating_count > 0
        ? rest.rating_avg
        : approvedEditorial.length > 0
          ? approvedEditorial.reduce((sum, e) => sum + e.rating, 0) / approvedEditorial.length
          : 0;
    const effectiveRatingCount =
      rest.rating_count > 0 ? rest.rating_count : approvedEditorial.length;
    return { ...rest, effectiveRatingAvg, effectiveRatingCount };
  });
}

/** Active, non-deleted products for the storefront — optionally scoped to a category. RLS mirrors this filter for anon. */
export function useProducts(options: UseProductsOptions = {}) {
  return useQuery({
    queryKey: ["products", options.categoryId ?? null],
    queryFn: () => fetchProducts(options),
    staleTime: 60 * 1000,
  });
}
