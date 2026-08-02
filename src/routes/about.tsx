import { createFileRoute } from "@tanstack/react-router";
import { fetchStaticPage, useStaticPage } from "@/hooks/useStaticPage";
import { STORE, breadcrumbLd, abs } from "@/lib/jsonld";

const STORE_ADDRESS = "Sopore, Baramulla, Jammu & Kashmir";

export const Route = createFileRoute("/about")({
  loader: async ({ context: { queryClient } }) => {
    await queryClient.ensureQueryData({
      queryKey: ["static-page", "about"],
      queryFn: () => fetchStaticPage("about"),
    });
  },
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
  const { data: page } = useStaticPage("about");

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
      {page ? (
        <>
          <div className="eyebrow" style={{ marginBottom: 8 }}>
            Our story
          </div>
          <h1 className="cart-title">{page.title}</h1>
          <div
            className="static-page-body"
            style={{ maxWidth: 640 }}
            dangerouslySetInnerHTML={{ __html: page.content }}
          />
        </>
      ) : (
        // Never a blank page -- covers both "not found" and "unpublished".
        <>
          <div className="eyebrow" style={{ marginBottom: 8 }}>
            Our story
          </div>
          <h1 className="cart-title">About Yaawun</h1>
          <p style={{ fontSize: 13, color: "var(--ink2)", lineHeight: 1.9, marginTop: 6 }}>
            {STORE_ADDRESS}
          </p>
        </>
      )}
    </div>
  );
}
