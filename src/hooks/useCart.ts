import { useSyncExternalStore } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { guestCartStore } from "@/lib/guest-cart-store";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import type { ProductWithRelations } from "@/hooks/useProducts";
import type { ColourOption, ProductVariant, SizeOption } from "@/types/database";

export type CartLineVariant = ProductVariant & {
  colour: ColourOption | null;
  size: SizeOption | null;
};

export interface CartLineWithProduct {
  productId: string;
  variantId: string | null;
  quantity: number;
  /** null when the product was removed/archived after being added to the cart. */
  product: ProductWithRelations | null;
  /** null for a no-variant line, or if the variant itself was later deleted. */
  variant: CartLineVariant | null;
}

/** Effective unit price for a cart line — a variant's price_override, if set, else the base product price. */
export const cartLinePrice = (line: Pick<CartLineWithProduct, "product" | "variant">): number =>
  line.variant?.price_override ?? line.product?.price ?? 0;

async function fetchVariantsByIds(ids: string[]): Promise<Record<string, CartLineVariant>> {
  if (!ids.length) return {};
  const { data, error } = await supabase
    .from("product_variants")
    .select("*, colour:colour_options(*), size:size_options(*)")
    .in("id", ids);
  if (error) throw error;
  const map: Record<string, CartLineVariant> = {};
  for (const v of (data ?? []) as unknown as CartLineVariant[]) map[v.id] = v;
  return map;
}

async function fetchServerCart(customerId: string): Promise<CartLineWithProduct[]> {
  const { data, error } = await supabase
    .from("cart_items")
    .select(
      "product_id, variant_id, quantity, product:products(*, category:categories(*), images:product_images(*))",
    )
    .eq("customer_id", customerId);
  if (error) throw error;
  // variant is attached afterwards in useCart() — this raw fetch doesn't join it.
  return (data ?? []).map((row) => ({
    productId: row.product_id as string,
    variantId: (row.variant_id as string | null) ?? null,
    quantity: row.quantity as number,
    product: (row.product as unknown as ProductWithRelations) ?? null,
    variant: null,
  }));
}

async function fetchProductsByIds(ids: string[]): Promise<ProductWithRelations[]> {
  if (!ids.length) return [];
  const { data, error } = await supabase
    .from("products")
    .select("*, category:categories(*), images:product_images(*)")
    .in("id", ids)
    .eq("status", "active")
    .is("deleted_at", null);
  if (error) throw error;
  return data as unknown as ProductWithRelations[];
}

/**
 * Finds the existing cart_items row for (customerId, productId, variantId) and
 * either updates its quantity or inserts a new one. Deliberately not a `.upsert()`
 * with `onConflict` — the uniqueness guarantee on this table is a COALESCE-expression
 * partial unique index (variant_id is nullable), and Postgres's ON CONFLICT clause
 * can only target an expression index by repeating its exact expression, not a plain
 * column list — `onConflict: "customer_id,product_id"` (the old two-column key, now
 * dropped) silently has no matching constraint to conflict against.
 */
async function upsertServerCartLine(
  customerId: string,
  productId: string,
  variantId: string | null,
  quantity: number,
) {
  let query = supabase
    .from("cart_items")
    .select("id")
    .eq("customer_id", customerId)
    .eq("product_id", productId);
  query = variantId ? query.eq("variant_id", variantId) : query.is("variant_id", null);
  const { data: existingRow, error: findError } = await query.maybeSingle();
  if (findError) throw findError;

  if (quantity <= 0) {
    if (!existingRow) return;
    const { error } = await supabase.from("cart_items").delete().eq("id", existingRow.id);
    if (error) throw error;
    return;
  }

  if (existingRow) {
    const { error } = await supabase
      .from("cart_items")
      .update({ quantity })
      .eq("id", existingRow.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("cart_items")
      .insert({ customer_id: customerId, product_id: productId, variant_id: variantId, quantity });
    if (error) throw error;
  }
}

export function useCart() {
  const { isAuthenticated, user } = useSupabaseAuth();
  const queryClient = useQueryClient();
  const guestLines = useSyncExternalStore(
    guestCartStore.subscribe,
    guestCartStore.getSnapshot,
    guestCartStore.getSnapshot,
  );

  const serverCartQuery = useQuery({
    queryKey: ["cart", user?.id],
    queryFn: () => fetchServerCart(user!.id),
    enabled: isAuthenticated && !!user,
  });

  const guestProductIds = guestLines.map((l) => l.productId).sort();
  const guestProductsQuery = useQuery({
    queryKey: ["cart-guest-products", guestProductIds.join(",")],
    queryFn: () => fetchProductsByIds(guestProductIds),
    enabled: !isAuthenticated && guestProductIds.length > 0,
  });

  const rawLines: CartLineWithProduct[] = isAuthenticated
    ? (serverCartQuery.data ?? [])
    : guestLines.map((l) => ({
        productId: l.productId,
        variantId: l.variantId,
        quantity: l.quantity,
        product: guestProductsQuery.data?.find((p) => p.id === l.productId) ?? null,
        variant: null,
      }));

  const variantIds = Array.from(
    new Set(rawLines.map((l) => l.variantId).filter((id): id is string => !!id)),
  ).sort();
  const variantsQuery = useQuery({
    queryKey: ["cart-line-variants", variantIds.join(",")],
    queryFn: () => fetchVariantsByIds(variantIds),
    enabled: variantIds.length > 0,
  });

  const lines: CartLineWithProduct[] = rawLines.map((l) => ({
    ...l,
    variant: l.variantId ? (variantsQuery.data?.[l.variantId] ?? null) : null,
  }));

  const count = lines.reduce((s, l) => s + l.quantity, 0);
  const subtotal = lines.reduce((s, l) => s + cartLinePrice(l) * l.quantity, 0);
  const isLoading =
    (isAuthenticated ? serverCartQuery.isLoading : guestProductsQuery.isLoading) ||
    (variantIds.length > 0 && variantsQuery.isLoading);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["cart", user?.id] });

  const add = async (productId: string, qty = 1, variantId: string | null = null) => {
    if (isAuthenticated && user) {
      const existing = lines.find((l) => l.productId === productId && l.variantId === variantId);
      await upsertServerCartLine(user.id, productId, variantId, (existing?.quantity ?? 0) + qty);
      invalidate();
    } else {
      guestCartStore.add(productId, variantId, qty);
    }
  };

  const updateQty = async (productId: string, qty: number, variantId: string | null = null) => {
    if (isAuthenticated && user) {
      await upsertServerCartLine(user.id, productId, variantId, qty);
      invalidate();
    } else {
      guestCartStore.setQty(productId, variantId, qty);
    }
  };

  const remove = async (productId: string, variantId: string | null = null) => {
    if (isAuthenticated && user) {
      await upsertServerCartLine(user.id, productId, variantId, 0);
      invalidate();
    } else {
      guestCartStore.remove(productId, variantId);
    }
  };

  const clear = async () => {
    if (isAuthenticated && user) {
      await supabase.from("cart_items").delete().eq("customer_id", user.id);
      invalidate();
    } else {
      guestCartStore.clear();
    }
  };

  return { lines, count, subtotal, isLoading, add, updateQty, remove, clear };
}
