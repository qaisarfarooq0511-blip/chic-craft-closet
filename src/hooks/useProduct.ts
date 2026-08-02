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

export type ProductDetail = Product & {
  category: Category | null;
  images: ProductImage[];
  pieces: ProductPiece[];
  includes: ProductInclude[];
  reviews: (Review & { customer: { full_name: string | null } | null })[];
  variants: (ProductVariant & { colour: ColourOption | null; size: SizeOption | null })[];
};

/** Exported so route loaders can ensureQueryData() with the exact same queryFn as useProduct(). */
export async function fetchProduct(slug: string): Promise<ProductDetail | null> {
  const { data, error } = await supabase
    .from("products")
    .select(
      "*, category:categories(*), images:product_images(*), pieces:product_pieces(*), includes:product_includes(*), reviews:reviews(*, customer:profiles(full_name)), variants:product_variants(*, colour:colour_options(*), size:size_options(*))",
    )
    .eq("slug", slug)
    .eq("status", "active")
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const detail = data as unknown as ProductDetail;
  // reviews embed includes every review row the caller's RLS allows through;
  // for an anon/customer session that's approved+non-deleted only, but sort/limit here.
  detail.reviews = (detail.reviews ?? [])
    .filter((r) => r.is_approved && !r.deleted_at)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  detail.images = (detail.images ?? [])
    .filter((i) => !i.deleted_at)
    .sort((a, b) => a.sort_order - b.sort_order);
  detail.pieces = (detail.pieces ?? [])
    .filter((p) => !p.deleted_at)
    .sort((a, b) => a.piece_order - b.piece_order);
  detail.includes = (detail.includes ?? [])
    .filter((i) => !i.deleted_at)
    .sort((a, b) => a.sort_order - b.sort_order);
  // RLS's product_variants_select_public policy already restricts this to
  // is_active + non-deleted rows of an active/non-deleted product.
  detail.variants = (detail.variants ?? []).sort((a, b) => a.sort_order - b.sort_order);

  return detail;
}

/** Single active product by slug, with category/images/pieces/includes/approved-reviews joined. */
export function useProduct(slug: string | undefined) {
  return useQuery({
    queryKey: ["product", slug],
    queryFn: () => fetchProduct(slug as string),
    enabled: !!slug,
    staleTime: 60 * 1000,
  });
}
