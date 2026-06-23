import { Link } from "@tanstack/react-router";
import { IconHeart } from "@tabler/icons-react";
import type { Product } from "@/lib/types";
import { useCart } from "@/lib/cart-context";
import { useToast } from "@/lib/toast";

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
        <button
          className="pc-wishlist"
          aria-label="Add to wishlist"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); toast("Saved for later"); }}
        >
          <IconHeart />
        </button>
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
