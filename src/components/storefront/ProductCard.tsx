import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { IconHeart, IconHeartFilled } from "@tabler/icons-react";
import type { Product } from "@/lib/types";
import { useCart } from "@/lib/cart-context";
import { useToast } from "@/lib/toast";
import { getWishlist, toggleWishlist, useUserAuth } from "@/lib/user-auth";

export function WishlistButton({ productId, productName, className = "pc-wishlist" }: { productId: number; productName?: string; className?: string }) {
  const { user } = useUserAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) { setSaved(false); return; }
    const refresh = () => setSaved(getWishlist(user.id).includes(productId));
    refresh();
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, [user, productId]);

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast("Please sign in to save to wishlist");
      navigate({ to: "/auth" });
      return;
    }
    const next = toggleWishlist(user.id, productId);
    const isSaved = next.includes(productId);
    setSaved(isSaved);
    toast(isSaved ? `${productName ?? "Item"} added to wishlist` : `${productName ?? "Item"} removed from wishlist`);
  };

  return (
    <button
      type="button"
      className={`${className}${saved ? " is-saved" : ""}`}
      aria-label={saved ? "Remove from wishlist" : "Add to wishlist"}
      aria-pressed={saved}
      onClick={onClick}
    >
      {saved ? <IconHeartFilled style={{ color: "#c0392b" }} /> : <IconHeart />}
    </button>
  );
}

export function Stars({ rating, size = 12 }: { rating: number; size?: number }) {
  const rounded = Math.round(rating);
  return (
    <span style={{ display: "inline-flex", gap: 3 }} aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`star${i > rounded ? " dim" : ""}`} style={{ fontSize: size }}>★</span>
      ))}
    </span>
  );
}

export function fmt(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}

export function ProductCard({ p }: { p: Product }) {
  const { add } = useCart();
  const toast = useToast();
  return (
    <Link to="/product/$slug" params={{ slug: p.slug }} className="pc">
      <div className="pc-img" style={{ background: p.bg }}>
        {p.images[0] ? (
          <img src={p.images[0]} alt={p.name} loading="lazy" />
        ) : (
          <span className="pc-img-placeholder">{p.name}</span>
        )}
        {p.badge && (
          <span className={`pc-badge${p.badge === "Sale" || p.badge === "Limited" ? " rust" : ""}`}>{p.badge}</span>
        )}
        <WishlistButton productId={p.id} productName={p.name} />

      </div>
      <div className="pc-info">
        <div className="pc-cat">{p.category}</div>
        <div className="pc-name">{p.name}{p.subtitle ? ` — ${p.subtitle}` : ""}</div>
        <div className="pc-stars">
          <Stars rating={p.rating} />
          <span className="pc-rc">{p.rating.toFixed(1)} ({p.reviewsCount})</span>
        </div>
        <div className="pc-foot">
          <div>
            <span className="pc-price">{fmt(p.price)}</span>
            {p.was && <span className="pc-was">{fmt(p.was)}</span>}
          </div>
          <button
            className="pc-atb"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); add(p.id, 1); toast(`${p.name} added to bag`); }}
          >
            Add to bag
          </button>
        </div>
      </div>
    </Link>
  );
}
