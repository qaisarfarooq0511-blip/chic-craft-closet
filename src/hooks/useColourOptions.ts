import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { ColourOption } from "@/types/database";

async function fetchColourOptions(): Promise<ColourOption[]> {
  const { data, error } = await supabase
    .from("colour_options")
    .select("*")
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data as ColourOption[];
}

export function useColourOptions() {
  return useQuery({
    queryKey: ["colour-options"],
    queryFn: fetchColourOptions,
    staleTime: 5 * 60 * 1000,
  });
}
