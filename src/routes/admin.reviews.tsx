import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Stars } from "@/components/storefront/ProductCard";
import { useToast } from "@/lib/toast";
import type { Review } from "@/types/database";

export const Route = createFileRoute("/admin/reviews")({
  component: ReviewsAdmin,
});

type AdminReviewRow = Review & {
  product: { name: string } | null;
  customer: { full_name: string | null } | null;
};

async function fetchAllReviews(): Promise<AdminReviewRow[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select("*, product:products(name), customer:profiles(full_name)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as unknown as AdminReviewRow[];
}

type Filter = "all" | "pending" | "approved" | "rejected";

function statusOf(r: Review): "pending" | "approved" | "rejected" {
  if (r.deleted_at) return "rejected";
  return r.is_approved ? "approved" : "pending";
}

function ReviewsAdmin() {
  const [filter, setFilter] = useState<Filter>("all");
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: fetchAllReviews,
  });

  const list = filter === "all" ? reviews : reviews.filter((r) => statusOf(r) === filter);
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });

  const approve = async (id: string) => {
    const { error } = await supabase
      .from("reviews")
      .update({ is_approved: true, deleted_at: null })
      .eq("id", id);
    if (error) {
      toast(error.message);
      return;
    }
    invalidate();
    toast("Review approved");
  };

  const reject = async (id: string) => {
    const { error } = await supabase
      .from("reviews")
      .update({ is_approved: false, deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast(error.message);
      return;
    }
    invalidate();
    toast("Review rejected");
  };

  return (
    <>
      <h1 className="admin-h1">Reviews</h1>
      <p className="admin-sub">Approve or reject reviews submitted by customers.</p>

      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {(["all", "pending", "approved", "rejected"] as const).map((f) => (
          <button
            key={f}
            className={filter === f ? "btn-ink" : "btn-outline"}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}{" "}
            {f !== "all" && `(${reviews.filter((r) => statusOf(r) === f).length})`}
          </button>
        ))}
      </div>

      <div className="admin-card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Reviewer</th>
              <th>Product</th>
              <th>Rating</th>
              <th>Review</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: 40, color: "var(--ink3)" }}>
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading &&
              list.map((r) => {
                const status = statusOf(r);
                return (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: 500, color: "var(--ink)" }}>
                        {r.customer?.full_name || "Verified customer"}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--ink3)" }}>
                        {new Date(r.created_at).toLocaleDateString("en-IN")}
                      </div>
                    </td>
                    <td>{r.product?.name ?? "—"}</td>
                    <td>
                      <Stars rating={r.rating} />
                    </td>
                    <td style={{ maxWidth: 380 }}>
                      {r.title && <strong style={{ display: "block" }}>{r.title}</strong>}
                      {r.body}
                    </td>
                    <td>
                      <span className={`pill pill-${status}`}>{status}</span>
                    </td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      {status !== "approved" && (
                        <button
                          className="btn-text-ink"
                          onClick={() => approve(r.id)}
                          style={{ marginRight: 12 }}
                        >
                          Approve
                        </button>
                      )}
                      {status !== "rejected" && (
                        <button className="btn-text-rust" onClick={() => reject(r.id)}>
                          Reject
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            {!isLoading && list.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: 40, color: "var(--ink3)" }}>
                  No reviews in this view.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
