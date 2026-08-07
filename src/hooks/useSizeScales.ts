import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface SizeScale {
  id: string;
  name: string;
}

async function fetchSizeScales(): Promise<SizeScale[]> {
  const { data, error } = await supabase
    .from("size_scales")
    .select("id, name")
    .is("deleted_at", null)
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export function useSizeScales() {
  return useQuery({ queryKey: ["size-scales"], queryFn: fetchSizeScales });
}
