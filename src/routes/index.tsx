import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { IconTruck, IconShieldCheck, IconRefresh, IconBrandWhatsapp } from "@tabler/icons-react";
import { ProductCard } from "@/components/storefront/ProductCard";
import { useProducts, fetchProducts } from "@/hooks/useProducts";
import { useCategories, fetchCategories } from "@/hooks/useCategories";
import { useHeroSettings, fetchHeroSettings } from "@/hooks/useHeroSettings";
import { STORE, breadcrumbLd, abs } from "@/lib/jsonld";
import heroMain from "@/assets/hero-main.jpg";
import imgSozni from "@/assets/products/sozni-burgundy.jpg";
import imgBanarasi from "@/assets/products/banarasi-maroon.jpg";

export const Route = createFileRoute("/")({
  loader: async ({ context: { queryClient } }) => {
    await Promise.all([
      queryClient.ensureQueryData({ queryKey: ["hero-settings"], queryFn: fetchHeroSettings }),
      queryClient.ensureQueryData({ queryKey: ["categories"], queryFn: fetchCategories }),
      queryClient.ensureQueryData({
        queryKey: ["products", null],
        queryFn: () => fetchProducts({}),
      }),
    ]);
  },
  head: () => ({
    meta: [
      { title: "Yaawun — Kashmiri Shawls, Dress Material & Women's Fashion" },
      { name: "description", content: STORE.description },
      {
        property: "og:title",
        content: "Yaawun — Kashmiri Shawls, Dress Material & Women's Fashion",
      },
      { property: "og:description", content: STORE.description },
      { property: "og:image", content: abs("/icon-512.png") },
      { property: "og:url", content: abs("/") },
    ],
    links: [{ rel: "canonical", href: abs("/") }],
    // Breadcrumb JSON-LD rendered directly in Home() below, not here — see
    // __root.tsx's RootComponent comment for why head().scripts isn't used.
  }),
  component: Home,
});

// Hero images are locked design-system assets (SETUP.md), not admin-editable —
// bundled directly rather than round-tripped through site_settings.
const HERO_IMAGES = { main: heroMain, smallLeft: imgSozni, smallRight: imgBanarasi };

function Home() {
  const { data: hero } = useHeroSettings();
  const { data: cats = [] } = useCategories();
  const { data: products = [] } = useProducts({});

  const counts = useMemo(
    () =>
      Object.fromEntries(
        cats.map((c) => [c.name, products.filter((p) => p.category?.slug === c.slug).length]),
      ) as Record<string, number>,
    [cats, products],
  );

  if (!hero) return null;
  const headlineLines = hero.headline.split("\n");

  return (
    <>
      <script
        id="jsonld-breadcrumb-home"
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbLd([{ name: "Home", url: "/" }])),
        }}
      />
      <section className="hero">
        <div className="hero-left">
          <div className="eyebrow-light hero-eyebrow">{hero.eyebrow}</div>
          <h1 className="hero-h1">
            {headlineLines.map((line, i) => (
              <span key={i}>
                {line}
                {i < headlineLines.length - 1 && <br />}
              </span>
            ))}
          </h1>
          <p className="hero-sub">{hero.sub}</p>
          <div className="hero-ctas">
            <a href={hero.ctaPrimary.href} className="btn-gold">
              {hero.ctaPrimary.label}
            </a>
            <a href={hero.ctaSecondary.href} className="btn-ghost">
              {hero.ctaSecondary.label}
            </a>
          </div>
        </div>
        <div className="hero-right">
          <div className="hero-img-main">
            <img src={HERO_IMAGES.main} alt="Featured" loading="eager" />
          </div>
          <div className="hero-img-row">
            <div className="hero-img-sm">
              <img src={HERO_IMAGES.smallLeft} alt="" loading="lazy" />
            </div>
            <div className="hero-img-sm">
              <img src={HERO_IMAGES.smallRight} alt="" loading="lazy" />
            </div>
          </div>
        </div>
      </section>

      <div className="cat-strip">
        {cats.map((c) => (
          <Link key={c.id} to="/shop/$category" params={{ category: c.slug }} className="cat-tile">
            {c.badge_label && <div className="cat-tile-eye eyebrow">{c.badge_label}</div>}
            <div className="cat-tile-name">{c.name}</div>
            <div className="cat-tile-count">{counts[c.name] ?? 0} pieces</div>
          </Link>
        ))}
      </div>

      {products.length > 0 && (
        <section className="section">
          <div className="section-head">
            <div>
              <h2 className="section-title">Featured pieces</h2>
            </div>
            <Link to="/shop" className="section-link">
              View all →
            </Link>
          </div>
          <div className="prod-grid">
            {products.slice(0, 8).map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        </section>
      )}

      <div className="trust-bar">
        <div className="trust-item">
          <IconTruck />
          <div className="trust-title">Free delivery</div>
          <div className="trust-sub">Orders above ₹999</div>
        </div>
        <div className="trust-item">
          <IconShieldCheck />
          <div className="trust-title">Secure payments</div>
          <div className="trust-sub">UPI · COD · Cards</div>
        </div>
        <div className="trust-item">
          <IconRefresh />
          <div className="trust-title">Easy returns</div>
          <div className="trust-sub">7-day return policy</div>
        </div>
        <div className="trust-item">
          <IconBrandWhatsapp />
          <div className="trust-title">WhatsApp support</div>
          <div className="trust-sub">9 AM – 8 PM daily</div>
        </div>
      </div>

      <section className="reviews-dark">
        <div className="eyebrow-light">What our customers say</div>
        <div className="section-title" style={{ color: "#FAF7F2", marginTop: 6 }}>
          Loved by women across India
        </div>
        <div className="rev-grid">
          {[
            {
              stars: 5,
              text: "The pashmina shawl exceeded all expectations. Packaging was gorgeous — felt like a luxury brand purchase.",
              name: "Aisha Khan",
              loc: "Delhi",
              prod: "Pashmina Weave Shawl — Ivory & Gold",
            },
            {
              stars: 5,
              text: "Ordered the Chikankari suit for my daughter's graduation. The fabric quality is exceptional. Yaawun is now my go-to store.",
              name: "Fatima Siddiqui",
              loc: "Lucknow",
              prod: "Chikankari Unstitched Suit",
            },
            {
              stars: 4,
              text: "Beautiful earrings, fast delivery and the little gift box made it feel so special. Will be gifting these to my friends too.",
              name: "Noor Hussain",
              loc: "Ghaziabad",
              prod: "Kundan Drop Earrings — Antique",
            },
          ].map((r, i) => (
            <div key={i} className="rev-card">
              <div className="rev-card-stars">
                {[1, 2, 3, 4, 5].map((s) => (
                  <span
                    key={s}
                    className="star"
                    style={{ color: s > r.stars ? "rgba(250,247,242,.2)" : undefined }}
                  >
                    ★
                  </span>
                ))}
              </div>
              <p className="rev-text">{r.text}</p>
              <div className="rev-name">{r.name}</div>
              <div className="rev-loc">{r.loc}</div>
              <div className="rev-prod">{r.prod}</div>
            </div>
          ))}
        </div>
        <div className="rev-overall">
          <span>★★★★★</span>4.7 average across 340+ verified reviews
        </div>
      </section>
    </>
  );
}
