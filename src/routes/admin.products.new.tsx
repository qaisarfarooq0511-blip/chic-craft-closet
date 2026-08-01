import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ProductForm } from "@/components/admin/ProductForm";

export const Route = createFileRoute("/admin/products/new")({
  component: NewProduct,
});

function NewProduct() {
  const navigate = useNavigate();
  return (
    <>
      <h1 className="admin-h1">New product</h1>
      <p className="admin-sub">
        Add a piece to the catalog. Save as draft, or set it live immediately.
      </p>
      <ProductForm
        submitLabel="Create product"
        onSaved={() => navigate({ to: "/admin/products" })}
      />
    </>
  );
}
