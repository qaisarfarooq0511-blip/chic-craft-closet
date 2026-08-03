import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Category, Product, ProductImage } from "@/types/database";

export type ProductSearchResult = Product & {
  category: Category | null;
  images: ProductImage[];
  /** Real rating always takes precedence; editorial only fills in when rating_count is 0. */
  effectiveRatingAvg: number;
  effectiveRatingCount: number;
};

export const SEARCH_MIN_LENGTH = 2;
const DEBOUNCE_MS = 300;
const DROPDOWN_LIMIT = 8;

// .ilike() with a leading wildcard still uses idx_products_name_trgm (GIN trigram
// index) rather than a sequential scan -- no RPC/migration needed.
async function searchProducts(term: string, limit: number): Promise<ProductSearchResult[]> {
  const { data, error } = await supabase
    .from("products")
    .select(
      "*, category:categories(*), images:product_images(*), editorial_reviews:editorial_reviews(rating, is_approved, deleted_at)",
    )
    .eq("status", "active")
    .is("deleted_at", null)
    .ilike("name", `%${term}%`)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;

  return (data ?? []).map((row) => {
    const { editorial_reviews, ...rest } = row as unknown as ProductSearchResult & {
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

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

/** Navbar dropdown search — debounced 300ms, fires only at 2+ chars, capped at 8. */
export function useProductSearch(term: string) {
  const debounced = useDebouncedValue(term.trim(), DEBOUNCE_MS);
  const enabled = debounced.length >= SEARCH_MIN_LENGTH;
  const query = useQuery({
    queryKey: ["product-search", debounced],
    queryFn: () => searchProducts(debounced, DROPDOWN_LIMIT),
    enabled,
  });
  return {
    results: enabled ? (query.data ?? []) : [],
    isLoading: enabled && query.isLoading,
  };
}

/** /search results page — term comes straight from the URL, no debounce needed. */
export function useProductSearchResults(term: string, limit = 48) {
  const trimmed = term.trim();
  const enabled = trimmed.length >= SEARCH_MIN_LENGTH;
  const query = useQuery({
    queryKey: ["product-search-results", trimmed, limit],
    queryFn: () => searchProducts(trimmed, limit),
    enabled,
  });
  return {
    results: enabled ? (query.data ?? []) : [],
    isLoading: enabled && query.isLoading,
  };
}
