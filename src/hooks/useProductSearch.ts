import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Category, Product, ProductImage } from "@/types/database";

export type ProductSearchResult = Product & {
  category: Category | null;
  images: ProductImage[];
};

export const SEARCH_MIN_LENGTH = 2;
const DEBOUNCE_MS = 300;
const DROPDOWN_LIMIT = 8;

// .ilike() with a leading wildcard still uses idx_products_name_trgm (GIN trigram
// index) rather than a sequential scan -- no RPC/migration needed.
async function searchProducts(term: string, limit: number): Promise<ProductSearchResult[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*, category:categories(*), images:product_images(*)")
    .eq("status", "active")
    .is("deleted_at", null)
    .ilike("name", `%${term}%`)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as unknown as ProductSearchResult[];
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
