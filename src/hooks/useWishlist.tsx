import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useToast } from "@/lib/toast";
import {
  PRODUCT_WITH_RELATIONS_SELECT,
  mapProductRow,
  type ProductWithRelations,
} from "@/hooks/useProducts";

async function fetchWishlistProductIds(customerId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("wishlist_items")
    .select("product_id")
    .eq("customer_id", customerId);
  if (error) throw error;
  return (data ?? []).map((row) => row.product_id as string);
}

async function fetchWishlistProducts(productIds: string[]): Promise<ProductWithRelations[]> {
  if (!productIds.length) return [];
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_WITH_RELATIONS_SELECT)
    .in("id", productIds);
  if (error) throw error;
  return (data ?? []).map((row) =>
    mapProductRow(row as unknown as Parameters<typeof mapProductRow>[0]),
  );
}

/**
 * Wishlist requires a real signed-in account — no guest/localStorage fallback
 * (unlike useCart). Gates on useSupabaseAuth() specifically, not the legacy
 * mock session, so a leftover mock-only session can't silently read as an
 * empty wishlist instead of prompting sign-in.
 */
export function useWishlist() {
  const { isAuthenticated, user } = useSupabaseAuth();
  const queryClient = useQueryClient();
  const toast = useToast();

  const idsKey = useMemo(() => ["wishlist-ids", user?.id], [user?.id]);
  const idsQuery = useQuery({
    queryKey: idsKey,
    queryFn: () => fetchWishlistProductIds(user!.id),
    enabled: isAuthenticated && !!user,
  });
  const ids = useMemo(() => idsQuery.data ?? [], [idsQuery.data]);

  const productsQuery = useQuery({
    queryKey: ["wishlist-products", ids.slice().sort().join(",")],
    queryFn: () => fetchWishlistProducts(ids),
    enabled: ids.length > 0,
  });
  const items = ids.length > 0 ? (productsQuery.data ?? []) : [];

  const isWishlisted = useCallback((productId: string) => ids.includes(productId), [ids]);

  const promptSignIn = useCallback(() => {
    toast(
      <span>
        Sign in to save items to your wishlist.{" "}
        <Link to="/login" style={{ textDecoration: "underline" }}>
          Sign in
        </Link>
      </span>,
    );
  }, [toast]);

  const toggle = useCallback(
    async (productId: string) => {
      if (!isAuthenticated || !user) {
        promptSignIn();
        return;
      }
      const wasWishlisted = ids.includes(productId);
      queryClient.setQueryData<string[]>(idsKey, (prev) =>
        wasWishlisted
          ? (prev ?? []).filter((id) => id !== productId)
          : [...(prev ?? []), productId],
      );
      try {
        if (wasWishlisted) {
          const { error } = await supabase
            .from("wishlist_items")
            .delete()
            .eq("customer_id", user.id)
            .eq("product_id", productId);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("wishlist_items")
            .insert({ customer_id: user.id, product_id: productId });
          if (error) throw error;
        }
      } catch (e) {
        // Roll back the optimistic update.
        queryClient.setQueryData<string[]>(idsKey, (prev) =>
          wasWishlisted
            ? [...(prev ?? []), productId]
            : (prev ?? []).filter((id) => id !== productId),
        );
        toast(e instanceof Error ? e.message : "Could not update wishlist");
      }
    },
    [isAuthenticated, user, ids, queryClient, toast, promptSignIn, idsKey],
  );

  const isLoading =
    isAuthenticated && (idsQuery.isLoading || (ids.length > 0 && productsQuery.isLoading));

  return { items, isWishlisted, toggle, isLoading };
}
