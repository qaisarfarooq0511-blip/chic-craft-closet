import { createFileRoute } from "@tanstack/react-router";
import { fetchCategories } from "@/hooks/useCategories";
import { fetchProducts } from "@/hooks/useProducts";
import { PLP } from "./shop.index";

export const Route = createFileRoute("/shop/$category")({
  loader: async ({ params, context: { queryClient } }) => {
    const categories = await queryClient.ensureQueryData({
      queryKey: ["categories"],
      queryFn: fetchCategories,
    });
    const category = categories.find((c) => c.slug === params.category);
    await queryClient.ensureQueryData({
      queryKey: ["products", category?.id ?? null],
      queryFn: () => fetchProducts({ categoryId: category?.id }),
    });
  },
  head: ({ params }) => ({
    meta: [
      { title: `${params.category} — Yaawun` },
      {
        name: "description",
        content: `Browse this collection at Yaawun. Curated pieces, crafted with care.`,
      },
    ],
  }),
  component: CategoryPage,
});

function CategoryPage() {
  const { category } = Route.useParams();
  return <PLP categorySlug={category} />;
}
