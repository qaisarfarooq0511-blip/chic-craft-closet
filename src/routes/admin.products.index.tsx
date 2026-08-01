import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useCategories } from "@/hooks/useCategories";
import { useAdminProducts, ADMIN_PAGE_SIZE } from "@/hooks/useAdminProducts";
import { useToast } from "@/lib/toast";
import { formatPrice } from "@/types/database";
import { productImageUrl } from "@/lib/product-images";

export const Route = createFileRoute("/admin/products/")({
  component: ProductsList,
});

function ProductsList() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data: categories = [] } = useCategories();
  const [page, setPage] = useState(0);
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState<"all" | "draft" | "active" | "archived">("all");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useAdminProducts({
    page,
    categoryId: categoryId || undefined,
    status,
    search,
  });
  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-products"] });

  const toggleStatus = async (id: string, current: string) => {
    const next = current === "active" ? "draft" : "active";
    const { error } = await supabase.from("products").update({ status: next }).eq("id", id);
    if (error) {
      toast(error.message);
      return;
    }
    invalidate();
    toast(next === "active" ? "Product is now live" : "Product unlisted");
  };

  const remove = async (id: string) => {
    if (
      !confirm(
        "Delete this product? It will be removed from the storefront (soft delete — recoverable in the database).",
      )
    )
      return;
    const { error } = await supabase
      .from("products")
      .update({ deleted_at: new Date().toISOString(), status: "archived" })
      .eq("id", id);
    if (error) {
      toast(error.message);
      return;
    }
    invalidate();
    toast("Product deleted");
  };

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 4,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <h1 className="admin-h1">Products</h1>
        <Link to="/admin/products/new" className="btn-ink">
          + New product
        </Link>
      </div>
      <p className="admin-sub">
        {total} product{total === 1 ? "" : "s"}
      </p>

      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <input
          className="form-input"
          style={{ maxWidth: 240 }}
          placeholder="Search by name…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
        />
        <select
          className="form-input"
          style={{ maxWidth: 200 }}
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value);
            setPage(0);
          }}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          className="form-input"
          style={{ maxWidth: 160 }}
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as typeof status);
            setPage(0);
          }}
        >
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
      </div>

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
            {isLoading && (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: 40, color: "var(--ink3)" }}>
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading &&
              rows.map((p) => {
                const img = productImageUrl(p.images.find((i) => i.is_primary) ?? p.images[0]);
                return (
                  <tr key={p.id}>
                    <td>
                      <div className="admin-thumb" style={{ background: "var(--cream2)" }}>
                        {img ? (
                          <img src={img} alt={p.name} />
                        ) : (
                          <span style={{ fontSize: 9, color: "var(--ink3)" }}>No img</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, color: "var(--ink)" }}>{p.name}</div>
                      <div style={{ fontSize: 10, color: "var(--ink3)", marginTop: 2 }}>
                        {p.subtitle ?? ""}
                      </div>
                    </td>
                    <td>{p.category?.name}</td>
                    <td>{formatPrice(p.price)}</td>
                    <td style={{ color: p.stock_count <= 5 ? "var(--rust)" : undefined }}>
                      {p.stock_count}
                    </td>
                    <td>
                      <span
                        className={`pill ${p.status === "active" ? "pill-live" : p.status === "draft" ? "pill-off" : "pill-rejected"}`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <Link
                        to="/admin/products/$id"
                        params={{ id: p.id }}
                        className="btn-text-ink"
                        style={{ marginRight: 14 }}
                      >
                        Edit
                      </Link>
                      {p.status !== "archived" && (
                        <button
                          className="btn-text-ink"
                          onClick={() => toggleStatus(p.id, p.status)}
                          style={{ marginRight: 14 }}
                        >
                          {p.status === "active" ? "Unlist" : "List"}
                        </button>
                      )}
                      <button className="btn-text-rust" onClick={() => remove(p.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: 40, color: "var(--ink3)" }}>
                  No products match.{" "}
                  <Link to="/admin/products/new" style={{ color: "var(--gold)" }}>
                    Add one
                  </Link>
                  .
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 10,
            marginTop: 16,
            alignItems: "center",
          }}
        >
          <button
            className="btn-outline"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Previous
          </button>
          <span style={{ fontSize: 12, color: "var(--ink3)" }}>
            Page {page + 1} of {totalPages}
          </span>
          <button
            className="btn-outline"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          >
            Next
          </button>
        </div>
      )}
    </>
  );
}
