import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { CareOption } from "@/types/database";

async function fetchCareOptions(): Promise<CareOption[]> {
  const { data, error } = await supabase
    .from("care_options")
    .select("*")
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data as CareOption[];
}

export function useCareOptions() {
  return useQuery({
    queryKey: ["care-options"],
    queryFn: fetchCareOptions,
    staleTime: 5 * 60 * 1000,
  });
}
