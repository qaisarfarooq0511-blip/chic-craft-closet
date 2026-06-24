import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { IconTruck, IconShieldCheck, IconRefresh, IconBrandWhatsapp } from "@tabler/icons-react";
import { ProductCard } from "@/components/storefront/ProductCard";
// (legacy categorySlug helper no longer needed here — categories come from the live store)
import { getProducts, getHero, getCategoriesStore, getSections, resolveSectionProducts } from "@/lib/storage";
import { seedHero, seedCategories, seedSections } from "@/lib/seed";
import { STORE, itemListLd, breadcrumbLd, abs } from "@/lib/jsonld";

let tick = 0;
const listeners = new Set<() => void>();
function bump() { tick++; listeners.forEach((l) => l()); }
if (typeof window !== "undefined") {
  window.addEventListener("storage", bump);
}
function subscribeStorage(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}
function useStoreTick() {
  return useSyncExternalStore(subscribeStorage, () => tick, () => 0);
}

export const Route = createFileRoute("/")({
  head: () => {
    const featured = typeof window !== "undefined"
      ? getProducts().filter((p) => p.listed).slice(0, 12)
      : [];
    return {
      meta: [
        { title: `${STORE.name} — Crafted with care · Kashmiri shawls, dress material, kidswear & accessories` },
        { name: "description", content: STORE.description },
        { property: "og:title", content: `${STORE.name} — Crafted with care` },
        { property: "og:description", content: STORE.description },
        { property: "og:url", content: abs("/") },
      ],
      links: [{ rel: "canonical", href: abs("/") }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(breadcrumbLd([{ name: "Home", url: "/" }])),
        },
        ...(featured.length
          ? [{ type: "application/ld+json", children: JSON.stringify(itemListLd(featured)) }]
          : []),
      ],
    };
  },
  component: Home,
});

function Home() {
  useStoreTick();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Use seeded defaults during SSR / first paint so hydration matches.
  const products = useMemo(() => (mounted ? getProducts() : []), [mounted]);
  const hero = mounted ? getHero() : seedHero;
  const cats = mounted ? getCategoriesStore() : seedCategories;
  const sections = mounted ? getSections() : seedSections;

  const counts = useMemo(
    () => Object.fromEntries(cats.map((c) => [c.name, products.filter((p) => p.category === c.name && p.listed).length])) as Record<string, number>,
    [cats, products],
  );

  const headlineLines = hero.headline.split("\n");

  return (
    <>
      <section className="hero">
        <div className="hero-left">
          <div className="eyebrow-light hero-eyebrow">{hero.eyebrow}</div>
          <h1 className="hero-h1">
            {headlineLines.map((line, i) => (
              <span key={i}>{line}{i < headlineLines.length - 1 && <br />}</span>
            ))}
          </h1>
          <p className="hero-sub">{hero.sub}</p>
          <div className="hero-ctas">
            <a href={hero.ctaPrimary.href} className="btn-gold">{hero.ctaPrimary.label}</a>
            <a href={hero.ctaSecondary.href} className="btn-ghost">{hero.ctaSecondary.label}</a>
          </div>
        </div>
        <div className="hero-right">
          {hero.images.main && (
            <div className="hero-img-main">
              <img src={hero.images.main} alt="Featured" loading="eager" />
            </div>
          )}
          <div className="hero-img-row">
            {hero.images.smallLeft && (
              <div className="hero-img-sm"><img src={hero.images.smallLeft} alt="" loading="lazy" /></div>
            )}
            {hero.images.smallRight && (
              <div className="hero-img-sm"><img src={hero.images.smallRight} alt="" loading="lazy" /></div>
            )}
          </div>
        </div>
      </section>

      <div className="cat-strip">
        {cats.map((c) => (
          <Link key={c.id} to="/shop/$category" params={{ category: c.slug }} className="cat-tile">
            {c.label && <div className="cat-tile-eye eyebrow">{c.label}</div>}
            <div className="cat-tile-name">{c.name}</div>
            <div className="cat-tile-count">{counts[c.name] ?? 0} pieces</div>
          </Link>
        ))}
      </div>

      {sections.filter((s) => s.visible).map((s) => {
        const items = resolveSectionProducts(s, products);
        if (!items.length && mounted) return null;
        return (
          <section key={s.id} className="section">
            <div className="section-head">
              <div>
                <h2 className="section-title">{s.title}</h2>
                {s.subtitle && <p style={{ fontSize: 13, color: "var(--ink2)", marginTop: 4 }}>{s.subtitle}</p>}
              </div>
              <Link to="/shop" className="section-link">View all →</Link>
            </div>
            <div className="prod-grid">
              {items.map((p) => <ProductCard key={p.id} p={p} />)}
            </div>
          </section>
        );
      })}

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


