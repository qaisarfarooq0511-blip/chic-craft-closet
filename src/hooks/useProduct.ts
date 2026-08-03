import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type {
  Category,
  ColourOption,
  Product,
  ProductImage,
  ProductInclude,
  ProductPiece,
  ProductVariant,
  Review,
  SizeOption,
} from "@/types/database";

/** No auth dependency, no uniqueness constraint -- curated showcase content, not a real customer submission record. */
export interface EditorialReview {
  id: string;
  product_id: string;
  reviewer_name: string;
  reviewer_location: string | null;
  rating: number;
  body: string;
  is_approved: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/** Unified shape so real and editorial reviews render identically on the PDP. */
export interface DisplayReview {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  reviewerName: string;
  isVerified: boolean;
  createdAt: string;
}

export type ProductDetail = Product & {
  category: Category | null;
  images: ProductImage[];
  pieces: ProductPiece[];
  includes: ProductInclude[];
  reviews: (Review & { customer: { full_name: string | null } | null })[];
  editorialReviews: EditorialReview[];
  variants: (ProductVariant & { colour: ColourOption | null; size: SizeOption | null })[];
  /** Real reviews first, editorial reviews after -- no visual distinction between them. */
  displayReviews: DisplayReview[];
  /** Real rating always takes precedence; editorial only fills in when rating_count is 0. */
  effectiveRatingAvg: number;
  effectiveRatingCount: number;
};

/** Exported so route loaders can ensureQueryData() with the exact same queryFn as useProduct(). */
export async function fetchProduct(slug: string): Promise<ProductDetail | null> {
  const { data, error } = await supabase
    .from("products")
    .select(
      "*, category:categories(*), images:product_images(*), pieces:product_pieces(*), includes:product_includes(*), reviews:reviews(*, customer:profiles(full_name)), editorial_reviews:editorial_reviews(*), variants:product_variants(*, colour:colour_options(*), size:size_options(*))",
    )
    .eq("slug", slug)
    .eq("status", "active")
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const raw = data as unknown as Product & {
    category: Category | null;
    images: ProductImage[];
    pieces: ProductPiece[];
    includes: ProductInclude[];
    reviews: (Review & { customer: { full_name: string | null } | null })[];
    editorial_reviews: EditorialReview[];
    variants: (ProductVariant & { colour: ColourOption | null; size: SizeOption | null })[];
  };

  // reviews/editorial_reviews embeds include every row the caller's RLS allows
  // through; for an anon/customer session that's approved+non-deleted only,
  // but filter/sort defensively here too.
  const reviews = (raw.reviews ?? [])
    .filter((r) => r.is_approved && !r.deleted_at)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const editorialReviews = (raw.editorial_reviews ?? [])
    .filter((e) => e.is_approved && !e.deleted_at)
    .sort((a, b) => a.sort_order - b.sort_order);

  const displayReviews: DisplayReview[] = [
    ...reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      body: r.body,
      reviewerName: r.customer?.full_name || "Verified customer",
      isVerified: r.is_verified,
      createdAt: r.created_at,
    })),
    ...editorialReviews.map((e) => ({
      id: e.id,
      rating: e.rating,
      title: null,
      body: e.body,
      reviewerName: e.reviewer_name,
      isVerified: false,
      createdAt: e.created_at,
    })),
  ];

  const effectiveRatingAvg =
    raw.rating_count > 0
      ? raw.rating_avg
      : editorialReviews.length > 0
        ? editorialReviews.reduce((sum, e) => sum + e.rating, 0) / editorialReviews.length
        : 0;
  const effectiveRatingCount = raw.rating_count > 0 ? raw.rating_count : editorialReviews.length;

  const detail: ProductDetail = {
    ...raw,
    reviews,
    editorialReviews,
    displayReviews,
    effectiveRatingAvg,
    effectiveRatingCount,
    images: (raw.images ?? [])
      .filter((i) => !i.deleted_at)
      .sort((a, b) => a.sort_order - b.sort_order),
    pieces: (raw.pieces ?? [])
      .filter((p) => !p.deleted_at)
      .sort((a, b) => a.piece_order - b.piece_order),
    includes: (raw.includes ?? [])
      .filter((i) => !i.deleted_at)
      .sort((a, b) => a.sort_order - b.sort_order),
    // RLS's product_variants_select_public policy already restricts this to
    // is_active + non-deleted rows of an active/non-deleted product.
    variants: (raw.variants ?? []).sort((a, b) => a.sort_order - b.sort_order),
  };

  return detail;
}

/** Single active product by slug, with category/images/pieces/includes/reviews/variants joined. */
export function useProduct(slug: string | undefined) {
  return useQuery({
    queryKey: ["product", slug],
    queryFn: () => fetchProduct(slug as string),
    enabled: !!slug,
    staleTime: 60 * 1000,
  });
}
