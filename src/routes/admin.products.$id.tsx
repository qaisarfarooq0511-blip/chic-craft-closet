import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { ProductForm } from "@/components/admin/ProductForm";
import { getProduct, upsertProduct } from "@/lib/storage";
import { useToast } from "@/lib/toast";

export const Route = createFileRoute("/admin/products/$id")({
  loader: ({ params }) => {
    if (typeof window === "undefined") return { id: Number(params.id) };
    const p = getProduct(Number(params.id));
    if (!p) throw notFound();
    return { id: p.id };
  },
  component: EditProduct,
  notFoundComponent: () => (
    <div>
      <h1 className="admin-h1">Product not found</h1>
      <Link to="/admin/products" className="btn-ink" style={{ marginTop: 12, display: "inline-block" }}>Back to products</Link>
    </div>
  ),
});

function EditProduct() {
  const { id } = Route.useLoaderData();
  const navigate = useNavigate();
  const toast = useToast();
  const p = getProduct(id);
  if (!p) return null;
  return (
    <>
      <h1 className="admin-h1">Edit product</h1>
      <p className="admin-sub">{p.name}</p>
      <ProductForm
        initial={p}
        submitLabel="Save changes"
        onSave={(next) => {
          upsertProduct(next);
          toast("Changes saved");
          navigate({ to: "/admin/products" });
        }}
      />
    </>
  );
}
