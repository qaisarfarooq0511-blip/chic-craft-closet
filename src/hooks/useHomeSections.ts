import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { fetchProducts, type ProductWithRelations } from "@/hooks/useProducts";
import { fetchCategories } from "@/hooks/useCategories";
import type { Section } from "@/types/database";

export interface HomeSection {
  section: Section;
  products: ProductWithRelations[];
}

type EditorialReviewRow = { rating: number; is_approved: boolean; deleted_at: string | null };

/** Mirrors fetchProducts()'s rating-fallback logic — duplicated here since it's small and
 *  useProducts.ts doesn't export it standalone. */
function withEffectiveRating(row: unknown): ProductWithRelations {
  const { editorial_reviews, ...rest } = row as ProductWithRelations & {
    editorial_reviews: EditorialReviewRow[];
  };
  const approvedEditorial = (editorial_reviews ?? []).filter((e) => e.is_approved && !e.deleted_at);
  const effectiveRatingAvg =
    rest.rating_count > 0
      ? rest.rating_avg
      : approvedEditorial.length > 0
        ? approvedEditorial.reduce((sum, e) => sum + e.rating, 0) / approvedEditorial.length
        : 0;
  const effectiveRatingCount = rest.rating_count > 0 ? rest.rating_count : approvedEditorial.length;
  return { ...rest, effectiveRatingAvg, effectiveRatingCount };
}

const PRODUCT_SELECT =
  "*, category:categories(*), images:product_images(*), editorial_reviews:editorial_reviews(rating, is_approved, deleted_at)";

async function fetchActiveSections(): Promise<Section[]> {
  const { data, error } = await supabase
    .from("sections")
    .select("*")
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

async function fetchProductsByBadge(badge: string, limit: number): Promise<ProductWithRelations[]> {
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("status", "active")
    .is("deleted_at", null)
    .eq("badge", badge)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(withEffectiveRating);
}

async function fetchManualSectionProducts(
  sectionId: string,
  limit: number,
): Promise<ProductWithRelations[]> {
  const { data: links, error: linksError } = await supabase
    .from("section_products")
    .select("product_id, sort_order")
    .eq("section_id", sectionId)
    .order("sort_order", { ascending: true })
    .limit(limit);
  if (linksError) throw linksError;
  const productIds = (links ?? []).map((l) => l.product_id as string);
  if (productIds.length === 0) return [];

  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .in("id", productIds)
    .eq("status", "active")
    .is("deleted_at", null);
  if (error) throw error;

  const byId = new Map((data ?? []).map((p) => [(p as { id: string }).id, p]));
  return productIds
    .map((id) => byId.get(id))
    .filter((p): p is NonNullable<typeof p> => !!p)
    .map(withEffectiveRating);
}

/** Exported so the homepage loader can ensureQueryData() with the exact same queryFn. */
export async function fetchHomeSections(): Promise<HomeSection[]> {
  const sections = await fetchActiveSections();
  if (sections.length === 0) return [];

  const needsCategories = sections.some((s) => s.mode === "category");
  const categories = needsCategories ? await fetchCategories() : [];

  const resolved = await Promise.all(
    sections.map(async (section): Promise<HomeSection> => {
      if (section.mode === "badge" && section.rule_value) {
        return {
          section,
          products: await fetchProductsByBadge(section.rule_value, section.max_products),
        };
      }
      if (section.mode === "category" && section.rule_value) {
        const category = categories.find((c) => c.slug === section.rule_value);
        const products = category
          ? (await fetchProducts({ categoryId: category.id })).slice(0, section.max_products)
          : [];
        return { section, products };
      }
      if (section.mode === "manual") {
        return {
          section,
          products: await fetchManualSectionProducts(section.id, section.max_products),
        };
      }
      return { section, products: [] };
    }),
  );

  return resolved.filter((s) => s.products.length > 0);
}

/** Active homepage sections with their resolved products, ordered by sort_order. Empty
 *  sections (no matching/available products) are dropped — see index.tsx for the
 *  no-active-sections-at-all fallback. */
export function useHomeSections() {
  return useQuery({
    queryKey: ["home-sections"],
    queryFn: fetchHomeSections,
    staleTime: 60 * 1000,
  });
}
