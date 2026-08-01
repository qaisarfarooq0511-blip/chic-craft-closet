import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Category } from "@/types/database";

async function fetchAdminCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data as Category[];
}

/** All (non-deleted) categories, sorted by sort_order — admin view, unlike useCategories this has no staleTime so admin edits reflect immediately. */
export function useAdminCategories() {
  return useQuery({
    queryKey: ["admin-categories"],
    queryFn: fetchAdminCategories,
  });
}
