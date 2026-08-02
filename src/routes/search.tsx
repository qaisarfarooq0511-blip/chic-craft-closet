import { createFileRoute, Link } from "@tanstack/react-router";
import { IconLoader2 } from "@tabler/icons-react";
import { ProductCard } from "@/components/storefront/ProductCard";
import { useProductSearchResults, SEARCH_MIN_LENGTH } from "@/hooks/useProductSearch";

const RESULTS_LIMIT = 48;

export const Route = createFileRoute("/search")({
  validateSearch: (search: Record<string, unknown>): { q?: string } =>
    typeof search.q === "string" ? { q: search.q } : {},
  head: ({ match }) => {
    const q = match.search.q ?? "";
    return {
      meta: [
        { title: q ? `Search: ${q} — Yaawun` : "Search — Yaawun" },
        { name: "robots", content: "noindex" },
      ],
    };
  },
  component: SearchPage,
});

function SearchPage() {
  const { q = "" } = Route.useSearch();
  const term = q.trim();
  const { results, isLoading } = useProductSearchResults(term, RESULTS_LIMIT);

  if (term.length < SEARCH_MIN_LENGTH) {
    return (
      <div style={{ padding: "4rem 2rem", textAlign: "center" }}>
        <p style={{ color: "var(--ink3)", fontSize: 14 }}>Enter a search term to find products</p>
      </div>
    );
  }

  return (
    <>
      <div className="plp-breadcrumb">
        <Link to="/">Home</Link> &nbsp;›&nbsp;
        <span style={{ color: "var(--ink)" }}>Search</span>
      </div>
      <div className="plp-header">
        <div>
          <div className="plp-count">
            {isLoading
              ? "Searching…"
              : `${results.length} result${results.length === 1 ? "" : "s"} for "${term}"`}
          </div>
          <h1 className="plp-title">Search</h1>
        </div>
      </div>
      <div className="plp-grid-wrap">
        {isLoading ? (
          <p
            style={{
              textAlign: "center",
              color: "var(--ink3)",
              padding: "3rem",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <IconLoader2 className="spin" size={22} />
          </p>
        ) : results.length > 0 ? (
          <div className="prod-grid">
            {results.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "3rem" }}>
            <p style={{ color: "var(--ink3)", fontSize: 14, marginBottom: 16 }}>
              No results for "{term}"
            </p>
            <Link to="/shop" className="btn-ink" style={{ display: "inline-block" }}>
              Browse all products
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
