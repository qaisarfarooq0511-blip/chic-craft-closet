import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getProducts } from "@/lib/storage";
import { getWishlist, useUserAuth } from "@/lib/user-auth";
import { fmt } from "@/components/storefront/ProductCard";

export const Route = createFileRoute("/account/wishlist")({
  component: WishlistPage,
});

function WishlistPage() {
  const { user } = useUserAuth();
  const [ids, setIds] = useState<number[]>([]);

  useEffect(() => {
    if (!user) return;
    const refresh = () => setIds(getWishlist(user.id));
    refresh();
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, [user]);

  const products = getProducts().filter((p) => ids.includes(p.id));

  return (
    <div>
      <h2 className="serif" style={{ fontSize: 22, fontWeight: 400, marginBottom: 16 }}>Wishlist</h2>

      {products.length === 0 ? (
        <div style={{
          background: "#fff", border: "1px dashed var(--line)", borderRadius: 12,
          padding: "48px 24px", textAlign: "center",
        }}>
          <div style={{ fontSize: 16, color: "var(--ink)", marginBottom: 6 }}>Your wishlist is empty</div>
          <div style={{ fontSize: 13, color: "var(--ink3)", marginBottom: 16 }}>
            Save your favourites here so they're easy to find later.
          </div>
          <Link to="/shop" className="btn-ink" style={{ display: "inline-block", padding: "10px 18px", fontSize: 13 }}>
            Browse products
          </Link>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 }}>
          {products.map((p) => (
            <Link key={p.id} to="/product/$slug" params={{ slug: p.slug }} style={{
              background: "#fff", border: "1px solid var(--line)", borderRadius: 12,
              padding: 12, textDecoration: "none", color: "var(--ink)",
            }}>
              <div style={{ aspectRatio: "1 / 1", background: "var(--cream)", borderRadius: 8, marginBottom: 10, overflow: "hidden" }}>
                {p.images[0] && <img src={p.images[0]} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
              </div>
              <div style={{ fontSize: 13, marginBottom: 4 }}>{p.name}</div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{fmt(p.price)}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
