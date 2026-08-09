import { createFileRoute, Link } from "@tanstack/react-router";
import { IconFilter } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import { ProductCard } from "@/components/storefront/ProductCard";
import { useCategories, fetchCategories } from "@/hooks/useCategories";
import { useProducts, fetchProducts, productsQueryKey } from "@/hooks/useProducts";
import { breadcrumbLd, abs } from "@/lib/jsonld";

type PriceFilter = "all" | "under1000" | "1000-2500" | "2500-5000" | "above5000";
type RatingFilter = "any" | "4plus" | "3plus";
type Sort = "featured" | "price-asc" | "price-desc" | "rating";

export function PLP({
  categorySlug,
  query,
  badge,
}: {
  categorySlug: string | null;
  query?: string;
  badge?: string;
}) {
  const [price, setPrice] = useState<PriceFilter>("all");
  const [rating, setRating] = useState<RatingFilter>("any");
  const [sort, setSort] = useState<Sort>("featured");
  const [fabrics, setFabrics] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);

  const { data: categories = [], isLoading: categoriesLoading } = useCategories();
  const activeCategory = categorySlug
    ? (categories.find((c) => c.slug === categorySlug) ?? null)
    : null;
  const categoryNotFound = !categoriesLoading && !!categorySlug && !activeCategory;
  const { data: products = [], isLoading: productsLoading } = useProducts({
    categoryId: activeCategory?.id,
    badge,
  });
  const isLoading = categoriesLoading || productsLoading;

  // Reset fabric selection when switching category
  useEffect(() => {
    setFabrics([]);
  }, [categorySlug]);

  const fabricOptions = useMemo(() => {
    const set = new Map<string, number>();
    products.forEach((p) => {
      const f = (p.fabric || "").trim();
      if (!f) return;
      set.set(f, (set.get(f) ?? 0) + 1);
    });
    return Array.from(set.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [products]);

  const toggleFabric = (f: string) =>
    setFabrics((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));

  const filtered = useMemo(() => {
    let list = [...products];
    // badge takes precedence over a search term — badge links (from homepage
    // sections) never carry a query, but if both were ever present, the
    // query text-filter is skipped rather than narrowing an already
    // badge-scoped list in a confusing way.
    const q = badge ? "" : (query ?? "").trim().toLowerCase();
    if (q) {
      list = list.filter((p) => {
        const hay = `${p.name} ${p.subtitle ?? ""} ${p.description ?? ""}`.toLowerCase();
        return hay.includes(q);
      });
    }
    // price thresholds in paise (₹1000 = 100000 paise)
    if (price === "under1000") list = list.filter((p) => p.price < 100000);
    else if (price === "1000-2500")
      list = list.filter((p) => p.price >= 100000 && p.price <= 250000);
    else if (price === "2500-5000")
      list = list.filter((p) => p.price > 250000 && p.price <= 500000);
    else if (price === "above5000") list = list.filter((p) => p.price > 500000);
    if (rating === "4plus") list = list.filter((p) => p.rating_avg >= 4);
    else if (rating === "3plus") list = list.filter((p) => p.rating_avg >= 3);
    if (fabrics.length) list = list.filter((p) => fabrics.includes((p.fabric || "").trim()));
    if (sort === "price-asc") list = [...list].sort((a, b) => a.price - b.price);
    else if (sort === "price-desc") list = [...list].sort((a, b) => b.price - a.price);
    else if (sort === "rating") list = [...list].sort((a, b) => b.rating_avg - a.rating_avg);
    return list;
  }, [products, price, rating, sort, query, badge, fabrics]);

  const title = badge
    ? badge
    : query
      ? `Results for "${query}"`
      : (activeCategory?.name ?? "All products");

  if (categoryNotFound) {
    return (
      <div style={{ padding: "4rem 2rem", textAlign: "center" }}>
        <h1 className="serif" style={{ fontSize: 28, color: "var(--ink)" }}>
          Category not found
        </h1>
        <Link to="/shop" className="btn-ink" style={{ marginTop: 20, display: "inline-block" }}>
          Browse all
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="announce">
        {activeCategory?.slug === "kashmiri-shawls"
          ? "✦  New Kashmiri shawls just arrived  ✦"
          : "✦  Free delivery on orders above ₹999  ✦"}
      </div>
      <div className="plp-breadcrumb">
        <Link to="/">Home</Link> &nbsp;›&nbsp; <span style={{ color: "var(--ink)" }}>{title}</span>
      </div>
      <div className="plp-header">
        <div>
          <div className="plp-count">
            {filtered.length} piece{filtered.length === 1 ? "" : "s"}
          </div>
          <h1 className="plp-title">{title}</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            className="filter-toggle"
            onClick={() => setFilterOpen((v) => !v)}
            aria-expanded={filterOpen}
            aria-controls="filter-panel"
          >
            <IconFilter size={14} />
            Filters
          </button>
          <select
            className="plp-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            aria-label="Sort products"
          >
            <option value="featured">Sort: Featured</option>
            <option value="price-asc">Price: Low to high</option>
            <option value="price-desc">Price: High to low</option>
            <option value="rating">Top rated</option>
          </select>
        </div>
      </div>
      {badge && (
        <div className="plp-chips">
          <Link to="/shop" className="plp-chip">
            Badge: {badge} <span aria-hidden="true">×</span>
            <span className="sr-only">Clear badge filter</span>
          </Link>
        </div>
      )}
      <div className="plp-body">
        <aside id="filter-panel" className={`filter-col${filterOpen ? " show" : ""}`}>
          <div className="filter-sec">
            <div className="filter-title">Category</div>
            <Link to="/shop" className={`filter-opt${!activeCategory ? " sel" : ""}`}>
              <span className="filter-check">
                <span className="filter-check-tick">✓</span>
              </span>
              All categories
            </Link>
            {categories.map((c) => (
              <Link
                key={c.id}
                to="/shop/$category"
                params={{ category: c.slug }}
                className={`filter-opt${activeCategory?.id === c.id ? " sel" : ""}`}
              >
                <span className="filter-check">
                  <span className="filter-check-tick">✓</span>
                </span>
                {c.name}
              </Link>
            ))}
          </div>
          <div className="filter-sec">
            <div className="filter-title">Price</div>
            {(
              [
                ["all", "All prices"],
                ["under1000", "Under ₹1,000"],
                ["1000-2500", "₹1,000 – ₹2,500"],
                ["2500-5000", "₹2,500 – ₹5,000"],
                ["above5000", "Above ₹5,000"],
              ] as const
            ).map(([v, l]) => (
              <button
                key={v}
                type="button"
                className={`filter-opt${price === v ? " sel" : ""}`}
                onClick={() => setPrice(v)}
              >
                <span className="filter-check">
                  <span className="filter-check-tick">✓</span>
                </span>
                {l}
              </button>
            ))}
          </div>
          <div className="filter-sec">
            <div className="filter-title">Rating</div>
            {(
              [
                ["any", "Any rating"],
                ["4plus", "4★ & above"],
                ["3plus", "3★ & above"],
              ] as const
            ).map(([v, l]) => (
              <button
                key={v}
                type="button"
                className={`filter-opt${rating === v ? " sel" : ""}`}
                onClick={() => setRating(v)}
              >
                <span className="filter-check">
                  <span className="filter-check-tick">✓</span>
                </span>
                {l}
              </button>
            ))}
          </div>
          {fabricOptions.length > 0 && (
            <div className="filter-sec">
              <div
                className="filter-title"
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
              >
                <span>Fabric</span>
                {fabrics.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setFabrics([])}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "var(--ink3)",
                      fontSize: 11,
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    Clear
                  </button>
                )}
              </div>
              {fabricOptions.map(([f, n]) => {
                const sel = fabrics.includes(f);
                return (
                  <button
                    key={f}
                    type="button"
                    className={`filter-opt${sel ? " sel" : ""}`}
                    onClick={() => toggleFabric(f)}
                  >
                    <span className="filter-check">
                      <span className="filter-check-tick">✓</span>
                    </span>
                    {f} <span style={{ color: "var(--ink3)", marginLeft: 4 }}>({n})</span>
                  </button>
                );
              })}
            </div>
          )}
        </aside>
        <div className="plp-grid-wrap">
          {isLoading ? (
            <p style={{ textAlign: "center", color: "var(--ink3)", padding: "3rem", fontSize: 14 }}>
              Loading…
            </p>
          ) : filtered.length ? (
            <div className="prod-grid">
              {filtered.map((p) => (
                <ProductCard key={p.id} p={p} />
              ))}
            </div>
          ) : (
            <p style={{ textAlign: "center", color: "var(--ink3)", padding: "3rem", fontSize: 14 }}>
              No products match your filters.
            </p>
          )}
        </div>
      </div>
    </>
  );
}

export const Route = createFileRoute("/shop/")({
  validateSearch: (search: Record<string, unknown>): { q?: string; badge?: string } => ({
    q: typeof search.q === "string" ? search.q : undefined,
    badge: typeof search.badge === "string" ? search.badge : undefined,
  }),
  loaderDeps: ({ search }) => ({ badge: search.badge }),
  loader: async ({ deps: { badge }, context: { queryClient } }) => {
    await Promise.all([
      queryClient.ensureQueryData({ queryKey: ["categories"], queryFn: fetchCategories }),
      queryClient.ensureQueryData({
        queryKey: productsQueryKey({ badge }),
        queryFn: () => fetchProducts({ badge }),
      }),
    ]);
  },
  head: () => {
    const title = "Shop all — Yaawun";
    const description =
      "Shop the full Yaawun collection — Kashmiri shawls, unstitched dress material, kidswear and accessories.";
    const url = abs("/shop");
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:image", content: abs("/icon-512.png") },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
      // Breadcrumb JSON-LD rendered directly in ShopAllRoute() below — see
      // __root.tsx's RootComponent comment for why head().scripts isn't used.
    };
  },
  component: ShopAllRoute,
});

function ShopAllRoute() {
  const { q, badge } = Route.useSearch();
  return (
    <>
      <script
        id="jsonld-breadcrumb-shop"
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbLd([
              { name: "Home", url: "/" },
              { name: "Shop", url: "/shop" },
            ]),
          ),
        }}
      />
      <PLP categorySlug={null} query={q} badge={badge} />
    </>
  );
}
