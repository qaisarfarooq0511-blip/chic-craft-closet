import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getPage } from "@/lib/storage";
import type { StaticPage } from "@/lib/types";
import { STORE } from "@/lib/jsonld";

export const Route = createFileRoute("/page/$slug")({
  head: ({ params }) => {
    const slug = params.slug;
    const pretty = slug.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
    return {
      meta: [
        { title: `${pretty} — ${STORE.name}` },
        { name: "description", content: `${pretty} — ${STORE.name}` },
        { property: "og:title", content: `${pretty} — ${STORE.name}` },
        { property: "og:url", content: `/page/${slug}` },
      ],
      links: [{ rel: "canonical", href: `/page/${slug}` }],
    };
  },
  component: StaticPageView,
  notFoundComponent: () => (
    <div className="cart-wrap-page">
      <h1 className="cart-title">Page not found</h1>
      <p style={{ color: "var(--ink2)" }}>
        The page you’re looking for doesn’t exist. <Link to="/">Go home</Link>.
      </p>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="cart-wrap-page">
      <h1 className="cart-title">Something went wrong</h1>
      <p style={{ color: "var(--ink2)" }}>{String(error)}</p>
    </div>
  ),
});

function StaticPageView() {
  const { slug } = Route.useParams();
  const [page, setPage] = useState<StaticPage | null | undefined>(undefined);

  useEffect(() => {
    setPage(getPage(slug) ?? null);
    const refresh = () => setPage(getPage(slug) ?? null);
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, [slug]);

  if (page === undefined) return <div className="cart-wrap-page">Loading…</div>;
  if (page === null) throw notFound();

  return (
    <div className="cart-wrap-page">
      <div className="eyebrow" style={{ marginBottom: 8 }}>{STORE.name}</div>
      <h1 className="cart-title">{page.title}</h1>
      <div className="static-page-body" dangerouslySetInnerHTML={{ __html: page.body }} />
    </div>
  );
}
