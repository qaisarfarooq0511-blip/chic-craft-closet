import { createFileRoute } from "@tanstack/react-router";
import { STORE } from "@/lib/jsonld";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: `About — ${STORE.name}` },
      { name: "description", content: `${STORE.name} is your neighbourhood store, online. Curated fashion crafted with care.` },
      { property: "og:title", content: `About — ${STORE.name}` },
      { property: "og:url", content: "/about" },
    ],
    links: [{ rel: "canonical", href: "/about" }],
  }),
  component: About,
});

function About() {
  return (
    <div className="cart-wrap-page">
      <div className="eyebrow" style={{ marginBottom: 8 }}>Our story</div>
      <h1 className="cart-title">A neighbourhood store, now online</h1>
      <p style={{ fontSize: 14, color: "var(--ink2)", lineHeight: 1.9, maxWidth: 640 }}>
        {STORE.name} began as a small physical store curating fabrics, shawls and accessories for the women of our
        neighbourhood. Every piece is chosen by hand, photographed by hand, and packed by hand. We launched online so
        the same care could reach women across India.
      </p>
      <h2 className="serif" style={{ fontSize: 24, fontWeight: 300, marginTop: 36, color: "var(--ink)" }}>What we sell</h2>
      <ul style={{ marginTop: 12, color: "var(--ink2)", fontSize: 13, lineHeight: 2, listStyle: "none" }}>
        <li>· Unstitched dress material — chikankari, banarasi silk, cotton</li>
        <li>· Kashmiri shawls — pashmina, sozni, wool blends</li>
        <li>· Kidswear — frocks, sets, festive pieces</li>
        <li>· Accessories — bangles, earrings, hairpins and more</li>
      </ul>
      <h2 className="serif" style={{ fontSize: 24, fontWeight: 300, marginTop: 36, color: "var(--ink)" }}>Visit us</h2>
      <p style={{ fontSize: 13, color: "var(--ink2)", lineHeight: 1.9, marginTop: 6 }}>
        {STORE.address.street}, {STORE.address.locality}, {STORE.address.region} {STORE.address.postalCode}<br />
        Open daily · {STORE.hours}
      </p>
    </div>
  );
}
