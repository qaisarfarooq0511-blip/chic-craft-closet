import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface StaticPageContent {
  slug: string;
  title: string;
  content: string;
  meta_title: string | null;
  meta_description: string | null;
}

/** Exported so route loaders can ensureQueryData() with the exact same queryFn as useStaticPage(). */
export async function fetchStaticPage(slug: string): Promise<StaticPageContent | null> {
  const { data, error } = await supabase
    .from("static_pages")
    .select("slug, title, content, meta_title, meta_description")
    .eq("slug", slug)
    .eq("is_published", true) // belt and suspenders -- RLS (static_pages_select_public) enforces this too
    .maybeSingle();
  if (error) throw error;
  return data as StaticPageContent | null;
}

/** Single published static page by slug. Returns null if not found or unpublished. */
export function useStaticPage(slug: string | undefined) {
  return useQuery({
    queryKey: ["static-page", slug],
    queryFn: () => fetchStaticPage(slug as string),
    enabled: !!slug,
    staleTime: 60 * 1000,
  });
}
