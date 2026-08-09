import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { BadgeOption } from "@/types/database";

async function fetchBadgeOptions(): Promise<BadgeOption[]> {
  const { data, error } = await supabase
    .from("badge_options")
    .select("*")
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data as BadgeOption[];
}

export function useBadgeOptions() {
  return useQuery({
    queryKey: ["badge-options"],
    queryFn: fetchBadgeOptions,
    staleTime: 5 * 60 * 1000,
  });
}
