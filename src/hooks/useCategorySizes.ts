import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { SizeOption } from "@/types/database";

/** Sizes assigned to a category via category_sizes, ordered by size_options.sort_order. */
export async function fetchCategorySizes(categoryId: string | null): Promise<SizeOption[]> {
  if (!categoryId) return [];
  const { data, error } = await supabase
    .from("category_sizes")
    .select("size_option:size_options(*)")
    .eq("category_id", categoryId);
  if (error) throw error;
  return (data ?? [])
    .map((row) => row.size_option as unknown as SizeOption)
    .filter((so): so is SizeOption => !!so && !so.deleted_at)
    .sort((a, b) => a.sort_order - b.sort_order);
}

export function useCategorySizes(categoryId: string | null) {
  return useQuery({
    queryKey: ["category-sizes", categoryId],
    queryFn: () => fetchCategorySizes(categoryId),
    enabled: !!categoryId,
    staleTime: 5 * 60 * 1000,
  });
}
