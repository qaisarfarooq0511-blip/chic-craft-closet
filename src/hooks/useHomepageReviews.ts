import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

const HOMEPAGE_REVIEWS_LIMIT = 6;

export interface HomepageReview {
  id: string;
  rating: number;
  body: string;
  reviewer_name: string;
  reviewer_location: string | null;
  product: { name: string; slug: string } | null;
}

/** Exported so the homepage loader can ensureQueryData() with the exact same queryFn. */
export async function fetchHomepageReviews(): Promise<HomepageReview[]> {
  const { data, error } = await supabase
    .from("editorial_reviews")
    .select("id, rating, body, reviewer_name, reviewer_location, product:products(name, slug)")
    .eq("is_approved", true)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(HOMEPAGE_REVIEWS_LIMIT);
  if (error) throw error;
  return (data ?? []) as unknown as HomepageReview[];
}

/** Curated showcase reviews for the homepage's dark reviews section. Empty when
 *  no editorial review is approved yet — index.tsx hides the whole section then. */
export function useHomepageReviews() {
  return useQuery({
    queryKey: ["homepage-reviews"],
    queryFn: fetchHomepageReviews,
    staleTime: 60 * 1000,
  });
}
