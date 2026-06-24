import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ProductForm } from "@/components/admin/ProductForm";
import { nextProductId, upsertProduct } from "@/lib/storage";
import { useToast } from "@/lib/toast";
import type { Product } from "@/lib/types";

export const Route = createFileRoute("/admin/products/new")({
  component: NewProduct,
});

function NewProduct() {
  const navigate = useNavigate();
  const toast = useToast();
  const id = typeof window !== "undefined" ? nextProductId() : 1;
  const initial: Product = {
    id,
    slug: `new-product-${id}`,
    name: "",
    subtitle: "",
    category: "Dress Material",
    type: "",
    price: 0,
    was: null,
    stock: 10,
    listed: true,
    badge: null,
    rating: 0,
    reviewsCount: 0,
    bg: "#E8DFD0",
    desc: "",
    isUnstitched: false,
    pieces: 1,
    fabric: "",
    embroidery: "",
    care: "",
    items: [{ name: "", length: "", width: "", weight: "" }],
    includes: [],
    images: [],
    hsnCode: null,
    createdAt: Date.now(),
  };

  return (
    <>
      <h1 className="admin-h1">New product</h1>
      <p className="admin-sub">Add a piece to the catalog. Upload photos and we'll enhance them automatically.</p>
      <ProductForm
        initial={initial}
        submitLabel="Create product"
        onSave={(p) => {
          upsertProduct(p);
          toast("Product created");
          navigate({ to: "/admin/products" });
        }}
      />
    </>
  );
}
