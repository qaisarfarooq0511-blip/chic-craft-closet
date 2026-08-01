import { Link } from "@tanstack/react-router";
import { useCart } from "@/hooks/useCart";
import { useToast } from "@/lib/toast";
import { formatPrice } from "@/types/database";
import { productImageUrl } from "@/lib/cloudinary";
import type { ProductWithRelations } from "@/hooks/useProducts";

export function Stars({ rating, size = 12 }: { rating: number; size?: number }) {
  const rounded = Math.round(rating);
  return (
    <span style={{ display: "inline-flex", gap: 3 }} aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`star${i > rounded ? " dim" : ""}`} style={{ fontSize: size }}>
          ★
        </span>
      ))}
    </span>
  );
}

/** Legacy rupee formatter — kept for pages still reading the old localStorage-backed mock data (out of Sprint 1 scope). */
export function fmt(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}

export function ProductCard({ p }: { p: ProductWithRelations }) {
  const { add } = useCart();
  const toast = useToast();
  const primaryImage = p.images.find((i) => i.is_primary) ?? p.images[0] ?? null;
  const imageUrl = productImageUrl(primaryImage);

  return (
    <Link to="/product/$slug" params={{ slug: p.slug }} className="pc">
      <div className="pc-img" style={{ background: "var(--cream2)" }}>
        {imageUrl ? (
          <img src={imageUrl} alt={p.name} loading="lazy" />
        ) : (
          <span className="pc-img-placeholder">{p.name}</span>
        )}
        {p.badge && (
          <span className={`pc-badge${p.badge === "Sale" || p.badge === "Limited" ? " rust" : ""}`}>
            {p.badge}
          </span>
        )}
      </div>
      <div className="pc-info">
        <div className="pc-cat">{p.category?.name}</div>
        <div className="pc-name">
          {p.name}
          {p.subtitle ? ` — ${p.subtitle}` : ""}
        </div>
        <div className="pc-stars">
          <Stars rating={p.rating_avg} />
          <span className="pc-rc">
            {p.rating_avg.toFixed(1)} ({p.rating_count})
          </span>
        </div>
        <div className="pc-foot">
          <div>
            <span className="pc-price">{formatPrice(p.price)}</span>
            {p.compare_price && <span className="pc-was">{formatPrice(p.compare_price)}</span>}
          </div>
          <button
            className="pc-atb"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              add(p.id, 1);
              toast(`${p.name} added to bag`);
            }}
            disabled={p.stock_count === 0}
          >
            {p.stock_count === 0 ? "Out of stock" : "Add to bag"}
          </button>
        </div>
      </div>
    </Link>
  );
}
