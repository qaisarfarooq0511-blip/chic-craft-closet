import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Category, Product, ProductImage } from "@/types/database";

export type ProductWithRelations = Product & {
  category: Category | null;
  images: ProductImage[];
};

interface UseProductsOptions {
  categoryId?: string | null;
}

async function fetchProducts({ categoryId }: UseProductsOptions): Promise<ProductWithRelations[]> {
  let query = supabase
    .from("products")
    .select("*, category:categories(*), images:product_images(*)")
    .eq("status", "active")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (categoryId) query = query.eq("category_id", categoryId);

  const { data, error } = await query;
  if (error) throw error;
  return data as unknown as ProductWithRelations[];
}

/** Active, non-deleted products for the storefront — optionally scoped to a category. RLS mirrors this filter for anon. */
export function useProducts(options: UseProductsOptions = {}) {
  return useQuery({
    queryKey: ["products", options.categoryId ?? null],
    queryFn: () => fetchProducts(options),
    staleTime: 60 * 1000,
  });
}
