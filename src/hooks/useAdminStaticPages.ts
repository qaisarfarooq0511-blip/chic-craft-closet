import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface StaticPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  meta_title: string | null;
  meta_description: string | null;
  is_published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/** All 5 pages, admin view — no deleted_at filter (admin sees every non-deleted row, including unpublished). */
export async function listStaticPages(): Promise<StaticPage[]> {
  const { data, error } = await supabase
    .from("static_pages")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as StaticPage[];
}

export function useAdminStaticPages() {
  return useQuery({
    queryKey: ["admin-static-pages"],
    queryFn: listStaticPages,
  });
}

export async function getStaticPage(slug: string): Promise<StaticPage | null> {
  const { data, error } = await supabase
    .from("static_pages")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data as StaticPage | null;
}

export function useAdminStaticPage(slug: string) {
  return useQuery({
    queryKey: ["admin-static-page", slug],
    queryFn: () => getStaticPage(slug),
    enabled: !!slug,
  });
}

export interface StaticPageUpdate {
  title: string;
  content: string;
  meta_title: string | null;
  meta_description: string | null;
  is_published: boolean;
}

/** Partial so the list page's publish-toggle and the edit page's full save can both use this. */
export async function updateStaticPage(
  slug: string,
  data: Partial<StaticPageUpdate>,
): Promise<void> {
  const { error } = await supabase.from("static_pages").update(data).eq("slug", slug);
  if (error) throw error;
}
