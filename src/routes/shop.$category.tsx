import { createFileRoute } from "@tanstack/react-router";
import { PLP } from "./shop.index";

export const Route = createFileRoute("/shop/$category")({
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
