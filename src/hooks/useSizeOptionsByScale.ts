import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { SizeOption } from "@/types/database";

async function fetchSizeOptions(scaleId: string): Promise<SizeOption[]> {
  const { data, error } = await supabase
    .from("size_options")
    .select("*")
    .eq("scale_id", scaleId)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data as SizeOption[];
}

/** Size options for a category's default_size_scale_id. Empty list (e.g. dress_material) means no size dimension. */
export function useSizeOptionsByScale(scaleId: string | null | undefined) {
  return useQuery({
    queryKey: ["size-options", scaleId],
    queryFn: () => fetchSizeOptions(scaleId as string),
    enabled: !!scaleId,
    staleTime: 5 * 60 * 1000,
  });
}
