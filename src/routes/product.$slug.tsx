import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { IconScissors, IconTruck, IconRefresh, IconShieldCheck, IconAlertCircle, IconCircleCheck } from "@tabler/icons-react";
import { getProductBySlug, getReviewsFor, getConfig } from "@/lib/storage";
import { useCart } from "@/lib/cart-context";
import { useToast } from "@/lib/toast";
import { Stars, fmt, WishlistButton } from "@/components/storefront/ProductCard";
import { breadcrumbLd, productLd, abs } from "@/lib/jsonld";
import { categorySlug } from "@/lib/types";

export const Route = createFileRoute("/product/$slug")({
  loader: ({ params }) => {
    if (typeof window === "undefined") return { slug: params.slug };
    const p = getProductBySlug(params.slug);
    if (!p) throw notFound();
    return { slug: params.slug };
  },
  head: ({ params }) => {
    const p = typeof window !== "undefined" ? getProductBySlug(params.slug) : null;
    const title = p ? `${p.name} — Yaawun` : "Product — Yaawun";
    const desc = p ? p.desc.slice(0, 158) : "Yaawun product detail.";
    const reviews = p ? getReviewsFor(p.id) : [];
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "product" },
        { property: "og:url", content: abs(`/product/${params.slug}`) },
        ...(p?.images[0] ? [{ property: "og:image", content: abs(p.images[0]) }] : []),
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
        ...(p?.images[0] ? [{ name: "twitter:image", content: abs(p.images[0]) }] : []),
      ],
      links: [{ rel: "canonical", href: abs(`/product/${params.slug}`) }],
      scripts: p
        ? [
            { type: "application/ld+json", children: JSON.stringify(productLd(p, reviews)) },
            {
              type: "application/ld+json",
              children: JSON.stringify(breadcrumbLd([
                { name: "Home", url: "/" },
                { name: p.category, url: `/shop/${categorySlug(p.category)}` },
                { name: p.name, url: `/product/${p.slug}` },
              ])),
            },
          ]
        : [],
    };
  },
  component: PDP,
  notFoundComponent: () => (
    <div style={{ padding: "4rem 2rem", textAlign: "center" }}>
      <h1 className="serif" style={{ fontSize: 28, color: "var(--ink)" }}>Product not found</h1>
      <Link to="/shop" className="btn-ink" style={{ marginTop: 20, display: "inline-block" }}>Browse all</Link>
    </div>
  ),
  errorComponent: () => <div style={{ padding: 40 }}>Something went wrong loading this product.</div>,
});

function PDP() {
  const { slug } = Route.useLoaderData();
  const p = useMemo(() => getProductBySlug(slug), [slug]);
  const reviews = useMemo(() => (p ? getReviewsFor(p.id) : []), [p]);
  const [qty, setQty] = useState(1);
  const [thumb, setThumb] = useState(0);
  const [size, setSize] = useState<string | null>(null);
  const { add } = useCart();
  const toast = useToast();

  if (!p) {
    return (
      <div style={{ padding: "4rem 2rem", textAlign: "center" }}>
        <h1 className="serif" style={{ fontSize: 28 }}>Loading…</h1>
      </div>
    );
  }

  const off = p.was ? Math.round((1 - p.price / p.was) * 100) : null;
  const gallery = p.images.length ? p.images : [];
  const distrib = [0, 0, 0, 0, 0];
  reviews.forEach((r) => { distrib[r.rating - 1]++; });

  const hasSizes = (p.sizes?.length ?? 0) > 0;
  const maxQty = Math.min(getConfig().maxQtyPerItem, p.stock || Number.MAX_SAFE_INTEGER);
  const addAndToast = () => {
    if (hasSizes && !size) { toast("Please select a size"); return; }
    add(p.id, qty);
    toast(`${p.name}${size ? ` (${size})` : ""} added to bag`);
    setQty(1);
  };

  return (
    <>
      <div className="plp-breadcrumb">
        <Link to="/">Home</Link> &nbsp;›&nbsp;
        <Link to="/shop/$category" params={{ category: categorySlug(p.category) }}>{p.category}</Link> &nbsp;›&nbsp;
        <span style={{ color: "var(--ink)" }}>{p.name}</span>
      </div>
      <div className="pdp-wrap">
        <div className="pdp-body">
          <div className="pdp-gallery">
            <div className="pdp-img-main" style={{ background: p.bg, position: "relative" }}>
              {gallery[thumb] ? (
                <img src={gallery[thumb]} alt={p.name} />
              ) : (
                <span className="ph">{p.name}</span>
              )}
              <WishlistButton productId={p.id} productName={p.name} className="pc-wishlist pdp-wishlist" />
            </div>
            <div className="pdp-thumbs">
              {(gallery.length ? gallery : [p.bg, "#E8DFD0", "#F2EDE4"]).slice(0, 4).map((g, i) => (
                <button
                  key={i}
                  type="button"
                  className={`pdp-thumb${thumb === i ? " sel" : ""}`}
                  style={typeof g === "string" && g.startsWith("#") ? { background: g } : undefined}
                  onClick={() => setThumb(i)}
                  aria-label={`View image ${i + 1}`}
                >
                  {typeof g === "string" && g.startsWith("data:") ? (
                    <img src={g} alt="" />
                  ) : (
                    <span style={{ fontSize: 9, color: "rgba(28,20,16,.3)" }}>
                      {["Front", "Detail", "Texture", "Closeup"][i]}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="pdp-eyebrow eyebrow">{p.category} · {p.type}</div>
            <h1 className="pdp-name">{p.name}{p.subtitle && <><br /><em>{p.subtitle}</em></>}</h1>
            <div className="pdp-rating-row">
              <Stars rating={p.rating} size={14} />
              <span className="pdp-rating-score">{p.rating.toFixed(1)}</span>
              <span className="pdp-rating-count">{p.reviewsCount} reviews</span>
            </div>
            <div className="pdp-price-row">
              <span className="pdp-price">{fmt(p.price)}</span>
              {p.was && (<><span className="pdp-was-price">{fmt(p.was)}</span><span className="pdp-off-badge">{off}% off</span></>)}
            </div>
            <p className="pdp-desc">{p.desc}</p>
            {p.stock <= 5 && p.stock > 0 && (
              <div className="pdp-stock"><IconAlertCircle />Only {p.stock} left in stock</div>
            )}
            {p.stock === 0 && <div className="pdp-stock"><IconAlertCircle />Currently out of stock</div>}

            {(p.note || p.isUnstitched) && (
              <div className="callout-strip">
                <IconScissors />
                <span>{p.note || "This is an unstitched set. Dimensions below show fabric cut lengths — take these to your tailor for stitching."}</span>
              </div>
            )}

            <div className="spec-block">
              <div className="spec-block-hd">
                <span className="spec-block-title">Product details &amp; dimensions</span>
                <span className="spec-block-tag">{p.pieces}-piece{p.pieces > 1 ? "s" : ""}</span>
              </div>
              <div className="fabric-row">
                <div className="fabric-cell"><div className="fc-label">Fabric</div><div className="fc-val">{p.fabric}</div></div>
                <div className="fabric-cell"><div className="fc-label">Embroidery</div><div className="fc-val">{p.embroidery}</div></div>
                <div className="fabric-cell"><div className="fc-label">Care</div><div className="fc-val">{p.care}</div></div>
              </div>
              {p.items.map((it, i) => (
                <div key={i} className="item-block">
                  <div className="item-hd"><div className="item-num">{i + 1}</div><div className="item-name">{it.name}</div></div>
                  <div className="item-dims">
                    <div className="dim-cell"><div className="dim-label">Length</div><div className="dim-val">{it.length}</div></div>
                    <div className="dim-cell"><div className="dim-label">Width</div><div className="dim-val">{it.width}</div></div>
                    <div className="dim-cell"><div className="dim-label">Weight</div><div className="dim-val">{it.weight}</div></div>
                  </div>
                </div>
              ))}
            </div>

            <div className="incl-block">
              <div className="incl-title">What's in the package</div>
              {p.includes.map((inc, i) => (
                <div key={i} className="incl-item"><span className="incl-dot" />{inc}</div>
              ))}
            </div>

            {hasSizes && (
              <div className="size-row">
                <div className="size-row-hd">
                  <span className="size-label">Size</span>
                  {size && <span className="size-selected">Selected: <strong>{size}</strong></span>}
                </div>
                <div className="size-options">
                  {p.sizes!.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSize(s)}
                      className={`size-chip${size === s ? " sel" : ""}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="qty-row">
              <span className="qty-label">Qty</span>
              <button type="button" className="qty-btn" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease">−</button>
              <span className="qty-val">{qty}</span>
              <button type="button" className="qty-btn" onClick={() => setQty((q) => Math.min(maxQty, q + 1))} aria-label="Increase" disabled={qty >= maxQty}>+</button>
              {qty >= maxQty && <span style={{ fontSize: 11, color: "var(--ink3)", marginLeft: 8 }}>Max {maxQty} per order</span>}
            </div>
            <button className="cta-primary" onClick={addAndToast} disabled={p.stock === 0}>Add to bag</button>
            <Link to="/cart" className="cta-gold-full" onClick={addAndToast} style={{ display: "inline-block", textAlign: "center" }}>Buy now</Link>
            <div className="pdp-trust">
              <span className="pdp-trust-item"><IconTruck />Free delivery</span>
              <span className="pdp-trust-item"><IconRefresh />7-day returns</span>
              <span className="pdp-trust-item"><IconShieldCheck />Secure checkout</span>
            </div>
          </div>
        </div>

        <div className="pdp-reviews">
          <div className="pdp-rev-head">
            <h2 className="pdp-rev-title">Customer reviews</h2>
            <button className="write-rev-btn" onClick={() => toast("Reviews opening soon")}>Write a review</button>
          </div>
          <div className="rev-summary">
            <div className="rev-big">
              <div className="rev-big-score">{p.rating.toFixed(1)}</div>
              <div style={{ margin: "4px 0" }}><Stars rating={p.rating} size={16} /></div>
              <div className="rev-big-count">{p.reviewsCount} reviews</div>
            </div>
            <div>
              {[5, 4, 3, 2, 1].map((n) => {
                const cnt = distrib[n - 1];
                const pct = reviews.length ? Math.round((cnt / reviews.length) * 100) : 0;
                return (
                  <div key={n} className="bar-row">
                    <span className="bar-lbl">{n}★</span>
                    <div className="bar-track"><div className="bar-fill" style={{ width: `${pct}%` }} /></div>
                    <span className="bar-cnt">{cnt}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="rev-cards-grid">
            {reviews.slice(0, 6).map((r) => (
              <div key={r.id} className="rev-c">
                <div className="rev-c-top"><span className="rev-c-name">{r.name}</span><span className="rev-c-date">{r.date}</span></div>
                <Stars rating={r.rating} />
                <p className="rev-c-text">{r.text}</p>
                <div className="rev-verified"><IconCircleCheck />Verified purchase</div>
              </div>
            ))}
            {reviews.length === 0 && (
              <p style={{ color: "var(--ink3)", fontSize: 13 }}>No reviews yet. Be the first to write one.</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
