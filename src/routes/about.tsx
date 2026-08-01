import { createFileRoute } from "@tanstack/react-router";
import { STORE, breadcrumbLd, abs } from "@/lib/jsonld";

const STORE_ADDRESS = "Sopore, Baramulla, Jammu & Kashmir";

export const Route = createFileRoute("/about")({
  head: () => {
    const desc = `${STORE.name} is your neighbourhood store, online. Curated unstitched dress material, Kashmiri shawls, kidswear and accessories — crafted with care.`;
    return {
      meta: [
        { title: `About — ${STORE.name}` },
        { name: "description", content: desc },
        { property: "og:title", content: `About — ${STORE.name}` },
        { property: "og:description", content: desc },
        { property: "og:url", content: abs("/about") },
      ],
      links: [{ rel: "canonical", href: abs("/about") }],
      // Breadcrumb JSON-LD rendered directly in About() below — see
      // __root.tsx's RootComponent comment for why head().scripts isn't used.
    };
  },
  component: About,
});

function About() {
  return (
    <div className="cart-wrap-page">
      <script
        id="jsonld-breadcrumb-about"
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbLd([
              { name: "Home", url: "/" },
              { name: "About", url: "/about" },
            ]),
          ),
        }}
      />
      <div className="eyebrow" style={{ marginBottom: 8 }}>
        Our story
      </div>
      <h1 className="cart-title">A neighbourhood store, now online</h1>
      <p style={{ fontSize: 14, color: "var(--ink2)", lineHeight: 1.9, maxWidth: 640 }}>
        {STORE.name} began as a small physical store curating fabrics, shawls and accessories for
        the women of our neighbourhood. Every piece is chosen by hand, photographed by hand, and
        packed by hand. We launched online so the same care could reach women across India.
      </p>
      <h2
        className="serif"
        style={{ fontSize: 24, fontWeight: 300, marginTop: 36, color: "var(--ink)" }}
      >
        What we sell
      </h2>
      <ul
        style={{
          marginTop: 12,
          color: "var(--ink2)",
          fontSize: 13,
          lineHeight: 2,
          listStyle: "none",
        }}
      >
        <li>· Unstitched dress material — chikankari, banarasi silk, cotton</li>
        <li>· Kashmiri shawls — pashmina, sozni, wool blends</li>
        <li>· Kidswear — frocks, sets, festive pieces</li>
        <li>· Accessories — bangles, earrings, hairpins and more</li>
      </ul>
      <h2
        className="serif"
        style={{ fontSize: 24, fontWeight: 300, marginTop: 36, color: "var(--ink)" }}
      >
        Visit us
      </h2>
      <p style={{ fontSize: 13, color: "var(--ink2)", lineHeight: 1.9, marginTop: 6 }}>
        {STORE_ADDRESS}
      </p>
    </div>
  );
}
