import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { IconPlus, IconTrash } from "@tabler/icons-react";
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
    if (!confirm("Reject this review? It will be hidden from customers.")) return;
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

      <EditorialReviewsSection />
    </>
  );
}

// ── Editorial reviews — curated showcase content, no auth dependency ──────

interface EditorialReviewRow {
  id: string;
  product_id: string;
  product_name: string;
  reviewer_name: string;
  reviewer_location: string | null;
  rating: number;
  body: string;
  is_approved: boolean;
  sort_order: number;
}

interface ProductOption {
  id: string;
  name: string;
}

async function fetchEditorialReviews(): Promise<EditorialReviewRow[]> {
  const { data, error } = await supabase
    .from("editorial_reviews")
    .select("*, product:products(name)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => {
    const r = row as unknown as EditorialReviewRow & { product: { name: string } | null };
    return { ...r, product_name: r.product?.name ?? "—" };
  });
}

async function fetchProductOptions(): Promise<ProductOption[]> {
  const { data, error } = await supabase
    .from("products")
    .select("id, name")
    .is("deleted_at", null)
    .order("name", { ascending: true });
  if (error) throw error;
  return data as ProductOption[];
}

interface EditorialFormState {
  id: string | null;
  productId: string;
  reviewerName: string;
  reviewerLocation: string;
  rating: string;
  body: string;
  sortOrder: string;
}

const EMPTY_EDITORIAL_FORM: EditorialFormState = {
  id: null,
  productId: "",
  reviewerName: "",
  reviewerLocation: "",
  rating: "5",
  body: "",
  sortOrder: "0",
};

function EditorialReviewsSection() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data: editorialReviews = [], isLoading } = useQuery({
    queryKey: ["admin-editorial-reviews"],
    queryFn: fetchEditorialReviews,
  });
  const { data: products = [] } = useQuery({
    queryKey: ["admin-product-options"],
    queryFn: fetchProductOptions,
  });

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<EditorialFormState>(EMPTY_EDITORIAL_FORM);
  const [saving, setSaving] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-editorial-reviews"] });
  const set = <K extends keyof EditorialFormState>(key: K, value: EditorialFormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const startAdd = () => {
    setForm(EMPTY_EDITORIAL_FORM);
    setFormOpen(true);
  };

  const startEdit = (r: EditorialReviewRow) => {
    setForm({
      id: r.id,
      productId: r.product_id,
      reviewerName: r.reviewer_name,
      reviewerLocation: r.reviewer_location ?? "",
      rating: String(r.rating),
      body: r.body,
      sortOrder: String(r.sort_order),
    });
    setFormOpen(true);
  };

  const cancel = () => {
    setForm(EMPTY_EDITORIAL_FORM);
    setFormOpen(false);
  };

  const save = async () => {
    if (!form.productId) {
      toast("Select a product");
      return;
    }
    if (!form.reviewerName.trim()) {
      toast("Reviewer name is required");
      return;
    }
    if (!form.body.trim()) {
      toast("Review text is required");
      return;
    }
    setSaving(true);
    const row = {
      product_id: form.productId,
      reviewer_name: form.reviewerName.trim(),
      reviewer_location: form.reviewerLocation.trim() || null,
      rating: Number(form.rating),
      body: form.body.trim(),
      sort_order: parseInt(form.sortOrder, 10) || 0,
    };
    const { error } = form.id
      ? await supabase.from("editorial_reviews").update(row).eq("id", form.id)
      : await supabase.from("editorial_reviews").insert({ ...row, is_approved: true });
    setSaving(false);
    if (error) {
      toast(error.message);
      return;
    }
    invalidate();
    toast(form.id ? "Editorial review updated" : "Editorial review added");
    cancel();
  };

  const toggleApproved = async (r: EditorialReviewRow) => {
    const { error } = await supabase
      .from("editorial_reviews")
      .update({ is_approved: !r.is_approved })
      .eq("id", r.id);
    if (error) {
      toast(error.message);
      return;
    }
    invalidate();
    toast(r.is_approved ? "Editorial review unapproved" : "Editorial review approved");
  };

  const softDelete = async (id: string) => {
    if (!confirm("Remove this editorial review? It will no longer show on the storefront.")) return;
    const { error } = await supabase
      .from("editorial_reviews")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast(error.message);
      return;
    }
    invalidate();
    toast("Editorial review removed");
  };

  return (
    <div style={{ marginTop: 32 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 4,
          gap: 12,
        }}
      >
        <h2 className="admin-h1" style={{ fontSize: 20, marginBottom: 0 }}>
          Editorial reviews
        </h2>
        {!formOpen && (
          <button
            className="btn-ink"
            onClick={startAdd}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <IconPlus size={14} /> New editorial review
          </button>
        )}
      </div>
      <p className="admin-sub">
        Curated showcase reviews — no customer account needed. Used to fill in ratings/reviews on
        products before real customer reviews exist.
      </p>

      {formOpen && (
        <div className="admin-card">
          <div className="form-field">
            <label className="form-label">Product</label>
            <select
              className="form-input"
              value={form.productId}
              onChange={(e) => set("productId", e.target.value)}
            >
              <option value="">Select a product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="form-field">
              <label className="form-label">Reviewer name</label>
              <input
                className="form-input"
                value={form.reviewerName}
                onChange={(e) => set("reviewerName", e.target.value)}
              />
            </div>
            <div className="form-field">
              <label className="form-label">Reviewer location</label>
              <input
                className="form-input"
                value={form.reviewerLocation}
                onChange={(e) => set("reviewerLocation", e.target.value)}
                placeholder="e.g. Delhi (optional)"
              />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="form-field">
              <label className="form-label">Rating</label>
              <select
                className="form-input"
                value={form.rating}
                onChange={(e) => set("rating", e.target.value)}
              >
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n} star{n === 1 ? "" : "s"}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Sort order</label>
              <input
                className="form-input"
                type="number"
                value={form.sortOrder}
                onChange={(e) => set("sortOrder", e.target.value)}
              />
            </div>
          </div>
          <div className="form-field">
            <label className="form-label">Review text</label>
            <textarea
              className="form-textarea"
              rows={4}
              value={form.body}
              onChange={(e) => set("body", e.target.value)}
            />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="cta-primary" onClick={() => void save()} disabled={saving}>
              {saving ? "Saving…" : form.id ? "Save changes" : "Add review"}
            </button>
            <button className="btn-outline" onClick={cancel}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="admin-card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Reviewer</th>
              <th>Rating</th>
              <th>Approved</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: 40, color: "var(--ink3)" }}>
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading &&
              editorialReviews.map((r) => (
                <tr key={r.id}>
                  <td>{r.product_name}</td>
                  <td>
                    <button
                      onClick={() => startEdit(r)}
                      style={{
                        background: "none",
                        border: "none",
                        padding: 0,
                        cursor: "pointer",
                        color: "var(--ink)",
                        fontWeight: 500,
                        textDecoration: "underline",
                      }}
                    >
                      {r.reviewer_name}
                    </button>
                    {r.reviewer_location && (
                      <div style={{ fontSize: 10, color: "var(--ink3)" }}>
                        {r.reviewer_location}
                      </div>
                    )}
                  </td>
                  <td>
                    <Stars rating={r.rating} />
                  </td>
                  <td>
                    <label
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={r.is_approved}
                        onChange={() => void toggleApproved(r)}
                      />
                      <span className={`pill ${r.is_approved ? "pill-live" : "pill-off"}`}>
                        {r.is_approved ? "Approved" : "Unapproved"}
                      </span>
                    </label>
                  </td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <button className="btn-text-rust" onClick={() => softDelete(r.id)}>
                      <IconTrash size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            {!isLoading && editorialReviews.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: 40, color: "var(--ink3)" }}>
                  No editorial reviews yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
