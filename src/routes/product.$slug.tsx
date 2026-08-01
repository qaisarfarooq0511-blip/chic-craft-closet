import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  IconScissors,
  IconTruck,
  IconRefresh,
  IconShieldCheck,
  IconAlertCircle,
  IconCircleCheck,
} from "@tabler/icons-react";
import { useProduct } from "@/hooks/useProduct";
import { useCart } from "@/hooks/useCart";
import { useToast } from "@/lib/toast";
import { Stars } from "@/components/storefront/ProductCard";
import { formatPrice, discountPercent } from "@/types/database";
import { productImageUrl } from "@/lib/cloudinary";

const MAX_QTY_PER_ITEM = 10;

export const Route = createFileRoute("/product/$slug")({
  head: () => ({
    meta: [
      { title: "Product — Yaawun" },
      { name: "description", content: "Yaawun product detail." },
    ],
  }),
  component: PDP,
});

function PDP() {
  const { slug } = Route.useParams();
  const { data: p, isLoading } = useProduct(slug);
  const [qty, setQty] = useState(1);
  const [thumb, setThumb] = useState(0);
  const { add } = useCart();
  const toast = useToast();

  if (isLoading) {
    return (
      <div style={{ padding: "4rem 2rem", textAlign: "center" }}>
        <h1 className="serif" style={{ fontSize: 28 }}>
          Loading…
        </h1>
      </div>
    );
  }

  if (!p) {
    return (
      <div style={{ padding: "4rem 2rem", textAlign: "center" }}>
        <h1 className="serif" style={{ fontSize: 28, color: "var(--ink)" }}>
          Product not found
        </h1>
        <Link to="/shop" className="btn-ink" style={{ marginTop: 20, display: "inline-block" }}>
          Browse all
        </Link>
      </div>
    );
  }

  const off = p.compare_price ? discountPercent(p.price, p.compare_price) : null;
  const gallery = p.images;
  const distrib = [0, 0, 0, 0, 0];
  p.reviews.forEach((r) => {
    distrib[r.rating - 1]++;
  });

  const maxQty = Math.min(MAX_QTY_PER_ITEM, p.stock_count || Number.MAX_SAFE_INTEGER);
  const addAndToast = () => {
    add(p.id, qty);
    toast(`${p.name} added to bag`);
    setQty(1);
  };

  return (
    <>
      <div className="plp-breadcrumb">
        <Link to="/">Home</Link> &nbsp;›&nbsp;
        {p.category && (
          <>
            <Link to="/shop/$category" params={{ category: p.category.slug }}>
              {p.category.name}
            </Link>{" "}
            &nbsp;›&nbsp;
          </>
        )}
        <span style={{ color: "var(--ink)" }}>{p.name}</span>
      </div>
      <div className="pdp-wrap">
        <div className="pdp-body">
          <div className="pdp-gallery">
            <div
              className="pdp-img-main"
              style={{ background: "var(--cream2)", position: "relative" }}
            >
              {gallery[thumb] ? (
                <img src={productImageUrl(gallery[thumb]) ?? undefined} alt={p.name} />
              ) : (
                <span className="ph">{p.name}</span>
              )}
            </div>
            <div className="pdp-thumbs">
              {gallery.slice(0, 4).map((g, i) => (
                <button
                  key={g.id}
                  type="button"
                  className={`pdp-thumb${thumb === i ? " sel" : ""}`}
                  onClick={() => setThumb(i)}
                  aria-label={`View image ${i + 1}`}
                >
                  <img src={productImageUrl(g) ?? undefined} alt="" />
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="pdp-eyebrow eyebrow">{p.category?.name}</div>
            <h1 className="pdp-name">
              {p.name}
              {p.subtitle && (
                <>
                  <br />
                  <em>{p.subtitle}</em>
                </>
              )}
            </h1>
            <div className="pdp-rating-row">
              <Stars rating={p.rating_avg} size={14} />
              <span className="pdp-rating-score">{p.rating_avg.toFixed(1)}</span>
              <span className="pdp-rating-count">{p.rating_count} reviews</span>
            </div>
            <div className="pdp-price-row">
              <span className="pdp-price">{formatPrice(p.price)}</span>
              {p.compare_price && (
                <>
                  <span className="pdp-was-price">{formatPrice(p.compare_price)}</span>
                  <span className="pdp-off-badge">{off}% off</span>
                </>
              )}
            </div>
            <p className="pdp-desc">{p.description}</p>
            {p.stock_count <= 5 && p.stock_count > 0 && (
              <div className="pdp-stock">
                <IconAlertCircle />
                Only {p.stock_count} left in stock
              </div>
            )}
            {p.stock_count === 0 && (
              <div className="pdp-stock">
                <IconAlertCircle />
                Currently out of stock
              </div>
            )}

            {p.is_unstitched && (
              <div className="callout-strip">
                <IconScissors />
                <span>
                  This is an unstitched set. Dimensions below show fabric cut lengths — take these
                  to your tailor for stitching.
                </span>
              </div>
            )}

            {(p.pieces.length > 0 || p.fabric || p.embroidery || p.care) && (
              <div className="spec-block">
                <div className="spec-block-hd">
                  <span className="spec-block-title">Product details &amp; dimensions</span>
                  {p.pieces.length > 0 && (
                    <span className="spec-block-tag">
                      {p.pieces.length}-piece{p.pieces.length > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                <div className="fabric-row">
                  <div className="fabric-cell">
                    <div className="fc-label">Fabric</div>
                    <div className="fc-val">{p.fabric || "—"}</div>
                  </div>
                  <div className="fabric-cell">
                    <div className="fc-label">Embroidery</div>
                    <div className="fc-val">{p.embroidery || "—"}</div>
                  </div>
                  <div className="fabric-cell">
                    <div className="fc-label">Care</div>
                    <div className="fc-val">{p.care || "—"}</div>
                  </div>
                </div>
                {p.pieces.map((it, i) => (
                  <div key={it.id} className="item-block">
                    <div className="item-hd">
                      <div className="item-num">{i + 1}</div>
                      <div className="item-name">{it.piece_name}</div>
                    </div>
                    <div className="item-dims">
                      <div className="dim-cell">
                        <div className="dim-label">Length</div>
                        <div className="dim-val">{it.length || "—"}</div>
                      </div>
                      <div className="dim-cell">
                        <div className="dim-label">Width</div>
                        <div className="dim-val">{it.width || "—"}</div>
                      </div>
                      <div className="dim-cell">
                        <div className="dim-label">Weight</div>
                        <div className="dim-val">{it.weight || "—"}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {p.includes.length > 0 && (
              <div className="incl-block">
                <div className="incl-title">What's in the package</div>
                {p.includes.map((inc) => (
                  <div key={inc.id} className="incl-item">
                    <span className="incl-dot" />
                    {inc.description}
                  </div>
                ))}
              </div>
            )}

            <div className="qty-row">
              <span className="qty-label">Qty</span>
              <button
                type="button"
                className="qty-btn"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                aria-label="Decrease"
              >
                −
              </button>
              <span className="qty-val">{qty}</span>
              <button
                type="button"
                className="qty-btn"
                onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                aria-label="Increase"
                disabled={qty >= maxQty}
              >
                +
              </button>
              {qty >= maxQty && (
                <span style={{ fontSize: 11, color: "var(--ink3)", marginLeft: 8 }}>
                  Max {maxQty} per order
                </span>
              )}
            </div>
            <button className="cta-primary" onClick={addAndToast} disabled={p.stock_count === 0}>
              Add to bag
            </button>
            <Link
              to="/cart"
              className="cta-gold-full"
              onClick={addAndToast}
              style={{ display: "inline-block", textAlign: "center" }}
            >
              Buy now
            </Link>
            <div className="pdp-trust">
              <span className="pdp-trust-item">
                <IconTruck />
                Free delivery
              </span>
              <span className="pdp-trust-item">
                <IconRefresh />
                7-day returns
              </span>
              <span className="pdp-trust-item">
                <IconShieldCheck />
                Secure checkout
              </span>
            </div>
          </div>
        </div>

        <div className="pdp-reviews">
          <div className="pdp-rev-head">
            <h2 className="pdp-rev-title">Customer reviews</h2>
          </div>
          <div className="rev-summary">
            <div className="rev-big">
              <div className="rev-big-score">{p.rating_avg.toFixed(1)}</div>
              <div style={{ margin: "4px 0" }}>
                <Stars rating={p.rating_avg} size={16} />
              </div>
              <div className="rev-big-count">{p.rating_count} reviews</div>
            </div>
            <div>
              {[5, 4, 3, 2, 1].map((n) => {
                const cnt = distrib[n - 1];
                const pct = p.reviews.length ? Math.round((cnt / p.reviews.length) * 100) : 0;
                return (
                  <div key={n} className="bar-row">
                    <span className="bar-lbl">{n}★</span>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="bar-cnt">{cnt}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="rev-cards-grid">
            {p.reviews.slice(0, 6).map((r) => (
              <div key={r.id} className="rev-c">
                <div className="rev-c-top">
                  <span className="rev-c-name">{r.customer?.full_name || "Verified customer"}</span>
                  <span className="rev-c-date">
                    {new Date(r.created_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <Stars rating={r.rating} />
                {r.title && (
                  <p style={{ fontWeight: 500, color: "var(--ink)", fontSize: 13, marginTop: 4 }}>
                    {r.title}
                  </p>
                )}
                <p className="rev-c-text">{r.body}</p>
                {r.is_verified && (
                  <div className="rev-verified">
                    <IconCircleCheck />
                    Verified purchase
                  </div>
                )}
              </div>
            ))}
            {p.reviews.length === 0 && (
              <p style={{ color: "var(--ink3)", fontSize: 13 }}>
                No reviews yet. Be the first to write one.
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
