import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useWishlist } from "@/hooks/useWishlist";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { ProductCard } from "@/components/storefront/ProductCard";

export const Route = createFileRoute("/account/wishlist")({
  head: () => ({
    meta: [{ title: "Wishlist — Yaawun" }],
  }),
  component: WishlistPage,
});

function WishlistPage() {
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useSupabaseAuth();
  const { items, isLoading } = useWishlist();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate({ to: "/login", search: { redirect: "/account/wishlist" }, replace: true });
    }
  }, [loading, isAuthenticated, navigate]);

  return (
    <div>
      <h2 className="serif" style={{ fontSize: 22, fontWeight: 400, marginBottom: 16 }}>
        Wishlist
      </h2>

      {isLoading && <div style={{ color: "var(--ink3)", fontSize: 13 }}>Loading…</div>}

      {!isLoading && items.length === 0 && (
        <div
          style={{
            background: "#fff",
            border: "1px dashed var(--line)",
            borderRadius: 12,
            padding: "48px 24px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 16, color: "var(--ink)", marginBottom: 6 }}>
            Your wishlist is empty. Browse products and tap the heart to save your favourites.
          </div>
          <Link
            to="/shop"
            className="btn-ink"
            style={{ display: "inline-block", padding: "10px 18px", fontSize: 13, marginTop: 10 }}
          >
            Start shopping
          </Link>
        </div>
      )}

      {!isLoading && items.length > 0 && (
        <div className="prod-grid">
          {items.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}
