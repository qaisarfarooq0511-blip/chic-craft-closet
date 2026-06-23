import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { PLP } from "./shop.index";
import { categoryFromSlug } from "@/lib/types";
import { breadcrumbLd, itemListLd } from "@/lib/jsonld";
import { getProducts } from "@/lib/storage";

export const Route = createFileRoute("/shop/$category")({
  loader: ({ params }) => {
    const cat = categoryFromSlug(params.category);
    if (!cat) throw notFound();
    return { category: cat };
  },
  head: ({ params }) => {
    const cat = categoryFromSlug(params.category) ?? "Shop";
    return {
      meta: [
        { title: `${cat} — Yaawun` },
        { name: "description", content: `Browse ${cat.toLowerCase()} at Yaawun. Curated pieces, crafted with care.` },
        { property: "og:title", content: `${cat} — Yaawun` },
        { property: "og:url", content: `/shop/${params.category}` },
      ],
      links: [{ rel: "canonical", href: `/shop/${params.category}` }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(breadcrumbLd([
            { name: "Home", url: "/" },
            { name: "Shop", url: "/shop" },
            { name: cat, url: `/shop/${params.category}` },
          ])),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify(itemListLd(
            (typeof window !== "undefined" ? getProducts() : []).filter((p) => p.category === cat && p.listed),
          )),
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
