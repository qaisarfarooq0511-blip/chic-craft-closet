import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Category } from "@/types/database";

async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data as Category[];
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    staleTime: 5 * 60 * 1000,
  });
}
