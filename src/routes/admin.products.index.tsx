import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useSyncExternalStore } from "react";
import { getProducts, upsertProduct, deleteProduct } from "@/lib/storage";
import { fmt } from "@/components/storefront/ProductCard";
import { useToast } from "@/lib/toast";

export const Route = createFileRoute("/admin/products/")({
  component: ProductsList,
});

function useProductsTick() {
  return useSyncExternalStore(
    (cb) => { window.addEventListener("storage", cb); return () => window.removeEventListener("storage", cb); },
    () => String(getProducts().length) + ":" + Date.now(),
    () => "0",
  );
}

function ProductsList() {
  useProductsTick();
  const [, force] = useState(0);
  const toast = useToast();
  const products = typeof window !== "undefined" ? getProducts() : [];

  const toggleListed = (id: number) => {
    const p = products.find((x) => x.id === id);
    if (!p) return;
    upsertProduct({ ...p, listed: !p.listed });
    force((n) => n + 1);
    toast(p.listed ? "Product unlisted" : "Product is now live");
  };

  const remove = (id: number) => {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    deleteProduct(id);
    force((n) => n + 1);
    toast("Product deleted");
  };

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4, gap: 12, flexWrap: "wrap" }}>
        <h1 className="admin-h1">Products</h1>
        <Link to="/admin/products/new" className="btn-ink">+ New product</Link>
      </div>
      <p className="admin-sub">{products.length} products · {products.filter((p) => p.listed).length} live</p>

      <div className="admin-card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th></th>
              <th>Product</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>
                  <div className="admin-thumb" style={{ background: p.bg }}>
                    {p.images[0] ? <img src={p.images[0]} alt={p.name} /> : <span style={{ fontSize: 9, color: "var(--ink3)" }}>No img</span>}
                  </div>
                </td>
                <td>
                  <div style={{ fontWeight: 500, color: "var(--ink)" }}>{p.name}</div>
                  <div style={{ fontSize: 10, color: "var(--ink3)", marginTop: 2 }}>{p.subtitle ?? p.type}</div>
                </td>
                <td>{p.category}</td>
                <td>{fmt(p.price)}</td>
                <td style={{ color: p.stock <= 5 ? "var(--rust)" : undefined }}>{p.stock}</td>
                <td>
                  <span className={`pill ${p.listed ? "pill-live" : "pill-off"}`}>{p.listed ? "Live" : "Unlisted"}</span>
                </td>
                <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  <Link to="/admin/products/$id" params={{ id: String(p.id) }} className="btn-text-ink" style={{ marginRight: 14 }}>Edit</Link>
                  <button className="btn-text-ink" onClick={() => toggleListed(p.id)} style={{ marginRight: 14 }}>
                    {p.listed ? "Unlist" : "List"}
                  </button>
                  <button className="btn-text-rust" onClick={() => remove(p.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: "center", padding: 40, color: "var(--ink3)" }}>No products yet. <Link to="/admin/products/new" style={{ color: "var(--gold)" }}>Add the first one</Link>.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
