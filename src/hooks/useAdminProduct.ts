import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type {
  Product,
  ProductImage,
  ProductInclude,
  ProductPiece,
  ProductVariant,
} from "@/types/database";

export type AdminProductDetail = Product & {
  images: ProductImage[];
  pieces: ProductPiece[];
  includes: ProductInclude[];
  variants: ProductVariant[];
};

async function fetchAdminProduct(id: string): Promise<AdminProductDetail | null> {
  const { data, error } = await supabase
    .from("products")
    .select(
      "*, images:product_images(*), pieces:product_pieces(*), includes:product_includes(*), variants:product_variants(*)",
    )
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const detail = data as unknown as AdminProductDetail;
  detail.images = (detail.images ?? [])
    .filter((i) => !i.deleted_at)
    .sort((a, b) => a.sort_order - b.sort_order);
  detail.pieces = (detail.pieces ?? [])
    .filter((p) => !p.deleted_at)
    .sort((a, b) => a.piece_order - b.piece_order);
  detail.includes = (detail.includes ?? [])
    .filter((i) => !i.deleted_at)
    .sort((a, b) => a.sort_order - b.sort_order);
  detail.variants = (detail.variants ?? [])
    .filter((v) => !v.deleted_at)
    .sort((a, b) => a.sort_order - b.sort_order);
  return detail;
}

/** Admin-only product fetch — no status filter (drafts included), gated by RLS's products_select_admin policy. */
export function useAdminProduct(id: string | undefined) {
  return useQuery({
    queryKey: ["admin-product", id],
    queryFn: () => fetchAdminProduct(id as string),
    enabled: !!id,
  });
}
