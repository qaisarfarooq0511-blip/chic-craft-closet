import { useSyncExternalStore } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { guestCartStore } from "@/lib/guest-cart-store";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import type { ProductWithRelations } from "@/hooks/useProducts";

export interface CartLineWithProduct {
  productId: string;
  quantity: number;
  /** null when the product was removed/archived after being added to the cart. */
  product: ProductWithRelations | null;
}

async function fetchServerCart(customerId: string): Promise<CartLineWithProduct[]> {
  const { data, error } = await supabase
    .from("cart_items")
    .select(
      "product_id, quantity, product:products(*, category:categories(*), images:product_images(*))",
    )
    .eq("customer_id", customerId);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    productId: row.product_id as string,
    quantity: row.quantity as number,
    product: (row.product as unknown as ProductWithRelations) ?? null,
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

async function upsertServerCartLine(customerId: string, productId: string, quantity: number) {
  if (quantity <= 0) {
    const { error } = await supabase
      .from("cart_items")
      .delete()
      .eq("customer_id", customerId)
      .eq("product_id", productId);
    if (error) throw error;
    return;
  }
  const { error } = await supabase
    .from("cart_items")
    .upsert(
      { customer_id: customerId, product_id: productId, quantity },
      { onConflict: "customer_id,product_id" },
    );
  if (error) throw error;
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

  const lines: CartLineWithProduct[] = isAuthenticated
    ? (serverCartQuery.data ?? [])
    : guestLines.map((l) => ({
        productId: l.productId,
        quantity: l.quantity,
        product: guestProductsQuery.data?.find((p) => p.id === l.productId) ?? null,
      }));

  const count = lines.reduce((s, l) => s + l.quantity, 0);
  const subtotal = lines.reduce((s, l) => s + (l.product?.price ?? 0) * l.quantity, 0);
  const isLoading = isAuthenticated ? serverCartQuery.isLoading : guestProductsQuery.isLoading;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["cart", user?.id] });

  const add = async (productId: string, qty = 1) => {
    if (isAuthenticated && user) {
      const existing = lines.find((l) => l.productId === productId);
      await upsertServerCartLine(user.id, productId, (existing?.quantity ?? 0) + qty);
      invalidate();
    } else {
      guestCartStore.add(productId, qty);
    }
  };

  const updateQty = async (productId: string, qty: number) => {
    if (isAuthenticated && user) {
      await upsertServerCartLine(user.id, productId, qty);
      invalidate();
    } else {
      guestCartStore.setQty(productId, qty);
    }
  };

  const remove = async (productId: string) => {
    if (isAuthenticated && user) {
      await upsertServerCartLine(user.id, productId, 0);
      invalidate();
    } else {
      guestCartStore.remove(productId);
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
