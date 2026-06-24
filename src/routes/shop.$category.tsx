import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { PLP } from "./shop.index";
import { categoryFromSlug } from "@/lib/types";
import { breadcrumbLd, collectionPageLd, abs } from "@/lib/jsonld";
import { getProducts } from "@/lib/storage";

export const Route = createFileRoute("/shop/$category")({
  loader: ({ params }) => {
    const cat = categoryFromSlug(params.category);
    if (!cat) throw notFound();
    return { category: cat };
  },
  head: ({ params }) => {
    const cat = categoryFromSlug(params.category) ?? "Shop";
    const url = `/shop/${params.category}`;
    const desc = `Browse ${cat.toLowerCase()} at Yaawun. Curated pieces, crafted with care.`;
    const products = (typeof window !== "undefined" ? getProducts() : []).filter(
      (p) => p.category === cat && p.listed,
    );
    return {
      meta: [
        { title: `${cat} — Yaawun` },
        { name: "description", content: desc },
        { property: "og:title", content: `${cat} — Yaawun` },
        { property: "og:description", content: desc },
        { property: "og:url", content: abs(url) },
      ],
      links: [{ rel: "canonical", href: abs(url) }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(breadcrumbLd([
            { name: "Home", url: "/" },
            { name: "Shop", url: "/shop" },
            { name: cat, url },
          ])),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify(collectionPageLd({
            name: `${cat} — Yaawun`,
            description: desc,
            url,
            products,
          })),
        },
      ],
    };
  },
  component: CategoryPage,
  notFoundComponent: () => (
    <div style={{ padding: "4rem 2rem", textAlign: "center" }}>
      <h1 className="serif" style={{ fontSize: 28, color: "var(--ink)" }}>Category not found</h1>
      <Link to="/shop" className="btn-ink" style={{ marginTop: 20, display: "inline-block" }}>Browse all</Link>
    </div>
  ),
  errorComponent: () => <div style={{ padding: 40 }}>Something went wrong loading this category.</div>,
});

function CategoryPage() {
  const { category } = Route.useLoaderData();
  return <PLP category={category} />;
}
