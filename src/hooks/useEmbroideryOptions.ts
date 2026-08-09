import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { EmbroideryOption } from "@/types/database";

async function fetchEmbroideryOptions(): Promise<EmbroideryOption[]> {
  const { data, error } = await supabase
    .from("embroidery_options")
    .select("*")
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data as EmbroideryOption[];
}

export function useEmbroideryOptions() {
  return useQuery({
    queryKey: ["embroidery-options"],
    queryFn: fetchEmbroideryOptions,
    staleTime: 5 * 60 * 1000,
  });
}
