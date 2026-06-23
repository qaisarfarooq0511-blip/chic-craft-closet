import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useSyncExternalStore } from "react";
import { IconTruck, IconShieldCheck, IconRefresh, IconBrandWhatsapp } from "@tabler/icons-react";
import { ProductCard } from "@/components/storefront/ProductCard";
import { CATEGORIES, categorySlug } from "@/lib/types";
import { getProducts } from "@/lib/storage";
import { STORE } from "@/lib/jsonld";

function subscribeStorage(cb: () => void) {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
}
function useProducts() {
  return useSyncExternalStore(
    subscribeStorage,
    () => JSON.stringify(getProducts()),
    () => "[]",
  );
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${STORE.name} — Crafted with care · Kashmiri shawls, dress material, kidswear & accessories` },
      { name: "description", content: STORE.description },
      { property: "og:title", content: `${STORE.name} — Crafted with care` },
      { property: "og:description", content: STORE.description },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Home,
});

const eyebrows: Record<string, string> = {
  "Kashmiri Shawls": "New in",
  "Dress Material": "Trending",
  Kidswear: "Popular",
  Accessories: "Handpicked",
};

function Home() {
  useProducts(); // subscribe to localStorage changes
  const products = useMemo(() => getProducts().filter((p) => p.listed), []);
  const featured = useMemo(() => products.slice(0, 6), [products]);
  const counts = useMemo(
    () =>
      Object.fromEntries(CATEGORIES.map((c) => [c, products.filter((p) => p.category === c).length])) as Record<string, number>,
    [products],
  );

  return (
    <>
      <section className="hero">
        <div className="hero-left">
          <div className="eyebrow-light hero-eyebrow">New collection · Summer 2025</div>
          <h1 className="hero-h1">Where every<br />thread carries<br />a story</h1>
          <p className="hero-sub">
            Unstitched dress materials, Kashmiri shawls, kidswear &amp; handpicked accessories — curated with care for the modern Indian woman.
          </p>
          <div className="hero-ctas">
            <Link to="/shop" className="btn-gold">Shop now</Link>
            <Link to="/shop/$category" params={{ category: categorySlug("Kashmiri Shawls") }} className="btn-ghost">
              Explore shawls
            </Link>
          </div>
        </div>
        <div className="hero-right">
          <div className="hero-img-main"><span className="ph">Your hero product photo</span></div>
          <div className="hero-img-row">
            <div className="hero-img-sm"><span className="ph">Shawl</span></div>
            <div className="hero-img-sm"><span className="ph">Fabric</span></div>
          </div>
        </div>
      </section>

      <div className="cat-strip">
        {CATEGORIES.map((c) => (
          <Link key={c} to="/shop/$category" params={{ category: categorySlug(c) }} className="cat-tile">
            <div className="cat-tile-eye eyebrow">{eyebrows[c]}</div>
            <div className="cat-tile-name">{c}</div>
            <div className="cat-tile-count">{counts[c] ?? 0} pieces</div>
          </Link>
        ))}
      </div>

      <section className="section">
        <div className="section-head">
          <h2 className="section-title">Featured pieces</h2>
          <Link to="/shop" className="section-link">View all →</Link>
        </div>
        <div className="prod-grid">
          {featured.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      </section>

      <div className="trust-bar">
        <div className="trust-item"><IconTruck /><div className="trust-title">Free delivery</div><div className="trust-sub">Orders above ₹999</div></div>
        <div className="trust-item"><IconShieldCheck /><div className="trust-title">Secure payments</div><div className="trust-sub">UPI · COD · Cards</div></div>
        <div className="trust-item"><IconRefresh /><div className="trust-title">Easy returns</div><div className="trust-sub">7-day return policy</div></div>
        <div className="trust-item"><IconBrandWhatsapp /><div className="trust-title">WhatsApp support</div><div className="trust-sub">9 AM – 8 PM daily</div></div>
      </div>

      <section className="reviews-dark">
        <div className="eyebrow-light">What our customers say</div>
        <div className="section-title" style={{ color: "#FAF7F2", marginTop: 6 }}>Loved by women across India</div>
        <div className="rev-grid">
          {[
            { stars: 5, text: "The pashmina shawl exceeded all expectations. Packaging was gorgeous — felt like a luxury brand purchase.", name: "Aisha Khan", loc: "Delhi", prod: "Pashmina Weave Shawl — Ivory & Gold" },
            { stars: 5, text: "Ordered the Chikankari suit for my daughter's graduation. The fabric quality is exceptional. Yaawun is now my go-to store.", name: "Fatima Siddiqui", loc: "Lucknow", prod: "Chikankari Unstitched Suit" },
            { stars: 4, text: "Beautiful earrings, fast delivery and the little gift box made it feel so special. Will be gifting these to my friends too.", name: "Noor Hussain", loc: "Ghaziabad", prod: "Kundan Drop Earrings — Antique" },
          ].map((r, i) => (
            <div key={i} className="rev-card">
              <div className="rev-card-stars">
                {[1,2,3,4,5].map((s) => (
                  <span key={s} className="star" style={{ color: s > r.stars ? "rgba(250,247,242,.2)" : undefined }}>★</span>
                ))}
              </div>
              <p className="rev-text">{r.text}</p>
              <div className="rev-name">{r.name}</div>
              <div className="rev-loc">{r.loc}</div>
              <div className="rev-prod">{r.prod}</div>
            </div>
          ))}
        </div>
        <div className="rev-overall"><span>★★★★★</span>4.7 average across 340+ verified reviews</div>
      </section>
    </>
  );
}
