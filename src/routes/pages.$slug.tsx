import { createFileRoute, Link } from "@tanstack/react-router";
import { fetchStaticPage, useStaticPage } from "@/hooks/useStaticPage";
import { STORE, breadcrumbLd, abs } from "@/lib/jsonld";

function stripHtml(html: string, maxLen: number): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
}

export const Route = createFileRoute("/pages/$slug")({
  loader: async ({ params, context: { queryClient } }) => {
    const page = await queryClient.ensureQueryData({
      queryKey: ["static-page", params.slug],
      queryFn: () => fetchStaticPage(params.slug),
    });
    return { page };
  },
  head: ({ params, loaderData }) => {
    const page = loaderData?.page;
    const url = abs(`/pages/${params.slug}`);

    if (!page) {
      return {
        meta: [{ title: `Page not found — ${STORE.name}` }, { name: "robots", content: "noindex" }],
      };
    }

    const title = `${page.title} — ${STORE.name}`;
    const description = page.meta_description?.trim() || stripHtml(page.content, 160);

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
      // Breadcrumb JSON-LD rendered directly in PageRoute() below — see
      // __root.tsx's RootComponent comment for why head().scripts isn't used.
    };
  },
  component: PageRoute,
});

function PageRoute() {
  const { slug } = Route.useParams();
  const { data: page } = useStaticPage(slug);

  if (!page) {
    return (
      <div className="cart-wrap-page">
        <h1 className="cart-title">Page not found</h1>
        <p style={{ color: "var(--ink2)" }}>
          The page you're looking for doesn't exist. <Link to="/">Go home</Link>.
        </p>
      </div>
    );
  }

  return (
    <div className="cart-wrap-page">
      <script
        id={`jsonld-breadcrumb-${slug}`}
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbLd([
              { name: "Home", url: "/" },
              { name: page.title, url: `/pages/${slug}` },
            ]),
          ),
        }}
      />
      <div className="eyebrow" style={{ marginBottom: 8 }}>
        {STORE.name}
      </div>
      <h1 className="cart-title">{page.title}</h1>
      <div className="static-page-body" dangerouslySetInnerHTML={{ __html: page.content }} />
    </div>
  );
}
