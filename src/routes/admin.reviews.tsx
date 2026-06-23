import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { getReviews, getProducts, updateReview, deleteReview } from "@/lib/storage";
import { Stars } from "@/components/storefront/ProductCard";
import { useToast } from "@/lib/toast";

export const Route = createFileRoute("/admin/reviews")({
  component: ReviewsAdmin;
});

function ReviewsAdmin() {
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [, force] = useState(0);
  const toast = useToast();
  const reviews = typeof window !== "undefined" ? getReviews() : [];
  const products = typeof window !== "undefined" ? getProducts() : [];

  const list = filter === "all" ? reviews : reviews.filter((r) => r.status === filter);

  const setStatus = (id: string, status: "pending" | "approved" | "rejected") => {
    const r = reviews.find((x) => x.id === id);
    if (!r) return;
    updateReview({ ...r, status });
    force((n) => n + 1);
    toast(`Review ${status}`);
  };

  const remove = (id: string) => {
    if (!confirm("Delete this review?")) return;
    deleteReview(id);
    force((n) => n + 1);
    toast("Review deleted");
  };

  return (
    <>
      <h1 className="admin-h1">Reviews</h1>
      <p className="admin-sub">Approve, reject or delete reviews submitted by customers.</p>

      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {(["all", "pending", "approved", "rejected"] as const).map((f) => (
          <button
            key={f}
            className={filter === f ? "btn-ink" : "btn-outline"}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)} {f !== "all" && `(${reviews.filter((r) => r.status === f).length})`}
          </button>
        ))}
      </div>

      <div className="admin-card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="admin-table">
          <thead>
            <tr><th>Reviewer</th><th>Product</th><th>Rating</th><th>Review</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {list.map((r) => {
              const p = products.find((x) => x.id === r.productId);
              return (
                <tr key={r.id}>
                  <td>
                    <div style={{ fontWeight: 500, color: "var(--ink)" }}>{r.name}</div>
                    <div style={{ fontSize: 10, color: "var(--ink3)" }}>{r.location ?? "—"} · {r.date}</div>
                  </td>
                  <td>{p?.name ?? `#${r.productId}`}</td>
                  <td><Stars rating={r.rating} /></td>
                  <td style={{ maxWidth: 380 }}>{r.text}</td>
                  <td>
                    <span className={`pill pill-${r.status}`}>{r.status}</span>
                  </td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    {r.status !== "approved" && <button className="btn-text-ink" onClick={() => setStatus(r.id, "approved")} style={{ marginRight: 12 }}>Approve</button>}
                    {r.status !== "rejected" && <button className="btn-text-ink" onClick={() => setStatus(r.id, "rejected")} style={{ marginRight: 12 }}>Reject</button>}
                    <button className="btn-text-rust" onClick={() => remove(r.id)}>Delete</button>
                  </td>
                </tr>
              );
            })}
            {list.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: 40, color: "var(--ink3)" }}>No reviews in this view.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
