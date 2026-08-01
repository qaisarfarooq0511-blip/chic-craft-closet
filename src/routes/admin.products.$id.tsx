import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ProductForm } from "@/components/admin/ProductForm";
import { useAdminProduct } from "@/hooks/useAdminProduct";

export const Route = createFileRoute("/admin/products/$id")({
  component: EditProduct,
});

function EditProduct() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: product, isLoading } = useAdminProduct(id);

  if (isLoading) return <p style={{ color: "var(--ink3)" }}>Loading…</p>;
  if (!product) return <h1 className="admin-h1">Product not found</h1>;

  return (
    <>
      <h1 className="admin-h1">Edit product</h1>
      <p className="admin-sub">{product.name}</p>
      <ProductForm
        productId={id}
        submitLabel="Save changes"
        onSaved={() => navigate({ to: "/admin/products" })}
      />
    </>
  );
}
