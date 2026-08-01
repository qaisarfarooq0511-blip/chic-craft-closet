import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { FabricOption } from "@/types/database";

async function fetchFabricOptions(): Promise<FabricOption[]> {
  const { data, error } = await supabase
    .from("fabric_options")
    .select("*")
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data as FabricOption[];
}

export function useFabricOptions() {
  return useQuery({
    queryKey: ["fabric-options"],
    queryFn: fetchFabricOptions,
    staleTime: 5 * 60 * 1000,
  });
}
