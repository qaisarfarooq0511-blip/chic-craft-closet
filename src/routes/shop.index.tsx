import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ProductCard } from "@/components/storefront/ProductCard";
import { getProducts, getCategoriesStore } from "@/lib/storage";
import { seedCategories } from "@/lib/seed";
import { breadcrumbLd, collectionPageLd, abs } from "@/lib/jsonld";
import type { Category } from "@/lib/types";

type PriceFilter = "all" | "under1000" | "1000-2500" | "2500-5000" | "above5000";
type RatingFilter = "any" | "4plus" | "3plus";
type Sort = "featured" | "price-asc" | "price-desc" | "rating";

export function PLP({ category, query }: { category: Category | null; query?: string }) {
  const [price, setPrice] = useState<PriceFilter>("all");
  const [rating, setRating] = useState<RatingFilter>("any");
  const [sort, setSort] = useState<Sort>("featured");
  const [fabrics, setFabrics] = useState<string[]>([]);
  const [cats, setCats] = useState(seedCategories);
  useEffect(() => {
    setCats(getCategoriesStore());
    const refresh = () => setCats(getCategoriesStore());
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, []);

  // Reset fabric selection when switching category
  useEffect(() => { setFabrics([]); }, [category]);

  const fabricOptions = useMemo(() => {
    const base = getProducts().filter((p) => p.listed && (!category || p.category === category));
    const set = new Map<string, number>();
    base.forEach((p) => {
      const f = (p.fabric || "").trim();
      if (!f) return;
      set.set(f, (set.get(f) ?? 0) + 1);
    });
    return Array.from(set.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [category]);

  const toggleFabric = (f: string) =>
    setFabrics((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));


  const products = useMemo(() => {
    let list = getProducts().filter((p) => p.listed);
    if (category) list = list.filter((p) => p.category === category);
    const q = (query ?? "").trim().toLowerCase();
    if (q) {
      list = list.filter((p) => {
        const hay = `${p.name} ${p.subtitle ?? ""} ${p.desc ?? ""}`.toLowerCase();
        return hay.includes(q);
      });
    }
    if (price === "under1000") list = list.filter((p) => p.price < 1000);
    else if (price === "1000-2500") list = list.filter((p) => p.price >= 1000 && p.price <= 2500);
    else if (price === "2500-5000") list = list.filter((p) => p.price > 2500 && p.price <= 5000);
    else if (price === "above5000") list = list.filter((p) => p.price > 5000);
    if (rating === "4plus") list = list.filter((p) => p.rating >= 4);
    else if (rating === "3plus") list = list.filter((p) => p.rating >= 3);
    if (fabrics.length) list = list.filter((p) => fabrics.includes((p.fabric || "").trim()));
    if (sort === "price-asc") list = [...list].sort((a, b) => a.price - b.price);
    else if (sort === "price-desc") list = [...list].sort((a, b) => b.price - a.price);
    else if (sort === "rating") list = [...list].sort((a, b) => b.rating - a.rating);
    return list;
  }, [category, price, rating, sort, query, fabrics]);


  const title = query ? `Results for "${query}"` : (category ?? "All products");


  return (
    <>
      <div className="announce">
        {category === "Kashmiri Shawls"
          ? "✦  New Kashmiri shawls just arrived  ✦"
          : "✦  Free delivery on orders above ₹999  ✦"}
      </div>
      <div className="plp-breadcrumb">
        <Link to="/">Home</Link> &nbsp;›&nbsp; <span style={{ color: "var(--ink)" }}>{title}</span>
      </div>
      <div className="plp-header">
        <div>
          <div className="plp-count">{products.length} piece{products.length === 1 ? "" : "s"}</div>
          <h1 className="plp-title">{title}</h1>
        </div>
        <select className="plp-sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort products">
          <option value="featured">Sort: Featured</option>
          <option value="price-asc">Price: Low to high</option>
          <option value="price-desc">Price: High to low</option>
          <option value="rating">Top rated</option>
        </select>
      </div>
      <div className="plp-body">
        <aside className="filter-col">
          <div className="filter-sec">
            <div className="filter-title">Category</div>
            <Link to="/shop" className={`filter-opt${!category ? " sel" : ""}`}>
              <span className="filter-check"><span className="filter-check-tick">✓</span></span>All categories
            </Link>
            {cats.map((c) => (
              <Link key={c.id} to="/shop/$category" params={{ category: c.slug }} className={`filter-opt${category === c.name ? " sel" : ""}`}>
                <span className="filter-check"><span className="filter-check-tick">✓</span></span>{c.name}
              </Link>
            ))}
          </div>
          <div className="filter-sec">
            <div className="filter-title">Price</div>
            {([
              ["all", "All prices"],
              ["under1000", "Under ₹1,000"],
              ["1000-2500", "₹1,000 – ₹2,500"],
              ["2500-5000", "₹2,500 – ₹5,000"],
              ["above5000", "Above ₹5,000"],
            ] as const).map(([v, l]) => (
              <button key={v} type="button" className={`filter-opt${price === v ? " sel" : ""}`} onClick={() => setPrice(v)}>
                <span className="filter-check"><span className="filter-check-tick">✓</span></span>{l}
              </button>
            ))}
          </div>
          <div className="filter-sec">
            <div className="filter-title">Rating</div>
            {([["any", "Any rating"], ["4plus", "4★ & above"], ["3plus", "3★ & above"]] as const).map(([v, l]) => (
              <button key={v} type="button" className={`filter-opt${rating === v ? " sel" : ""}`} onClick={() => setRating(v)}>
                <span className="filter-check"><span className="filter-check-tick">✓</span></span>{l}
              </button>
            ))}
          </div>
          {fabricOptions.length > 0 && (
            <div className="filter-sec">
              <div className="filter-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Fabric</span>
                {fabrics.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setFabrics([])}
                    style={{ background: "transparent", border: "none", color: "var(--ink3)", fontSize: 11, cursor: "pointer", padding: 0 }}
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
                    <span className="filter-check"><span className="filter-check-tick">✓</span></span>
                    {f} <span style={{ color: "var(--ink3)", marginLeft: 4 }}>({n})</span>
                  </button>
                );
              })}
            </div>
          )}

        </aside>
        <div className="plp-grid-wrap">
          {products.length ? (
            <div className="prod-grid">
              {products.map((p) => <ProductCard key={p.id} p={p} />)}
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
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === "string" ? search.q : undefined,
  }),
  head: () => {
    const desc = "Shop the full Yaawun collection — Kashmiri shawls, unstitched dress material, kidswear and accessories.";
    const products = typeof window !== "undefined" ? getProducts().filter((p) => p.listed) : [];
    return {
      meta: [
        { title: "Shop all — Yaawun" },
        { name: "description", content: desc },
        { property: "og:title", content: "Shop all — Yaawun" },
        { property: "og:description", content: desc },
        { property: "og:url", content: abs("/shop") },
      ],
      links: [{ rel: "canonical", href: abs("/shop") }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(breadcrumbLd([
            { name: "Home", url: "/" },
            { name: "Shop", url: "/shop" },
          ])),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify(collectionPageLd({
            name: "Shop all — Yaawun",
            description: desc,
            url: "/shop",
            products,
          })),
        },
      ],
    };
  },
  component: ShopAllRoute,
});

function ShopAllRoute() {
  const { q } = Route.useSearch();
  return <PLP category={null} query={q} />;
}

