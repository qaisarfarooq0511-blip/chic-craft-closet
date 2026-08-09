import { createFileRoute } from "@tanstack/react-router";
import { fetchCategories } from "@/hooks/useCategories";
import { fetchProducts, productsQueryKey } from "@/hooks/useProducts";
import { breadcrumbLd, abs } from "@/lib/jsonld";
import { PLP } from "./shop.index";

export const Route = createFileRoute("/shop/$category")({
  loader: async ({ params, context: { queryClient } }) => {
    const categories = await queryClient.ensureQueryData({
      queryKey: ["categories"],
      queryFn: fetchCategories,
    });
    const category = categories.find((c) => c.slug === params.category) ?? null;
    await queryClient.ensureQueryData({
      queryKey: productsQueryKey({ categoryId: category?.id }),
      queryFn: () => fetchProducts({ categoryId: category?.id }),
    });
    return { category };
  },
  head: ({ params, loaderData }) => {
    const name = loaderData?.category?.name ?? params.category;
    const description = loaderData?.category?.description || `Shop ${name} at Yaawun`;
    const title = `${name} — Yaawun`;
    const url = abs(`/shop/${params.category}`);
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
      // Breadcrumb JSON-LD rendered directly in CategoryPage() below — see
      // __root.tsx's RootComponent comment for why head().scripts isn't used.
    };
  },
  component: CategoryPage,
});

function CategoryPage() {
  const { category } = Route.useParams();
  const { category: resolvedCategory } = Route.useLoaderData();
  const name = resolvedCategory?.name ?? category;
  return (
    <>
      <script
        id="jsonld-breadcrumb-category"
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbLd([
              { name: "Home", url: "/" },
              { name, url: `/shop/${category}` },
            ]),
          ),
        }}
      />
      <PLP categorySlug={category} />
    </>
  );
}
