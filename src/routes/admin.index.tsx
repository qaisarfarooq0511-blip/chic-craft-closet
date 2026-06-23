import { createFileRoute, Link } from "@tanstack/react-router";
import { getProducts, getReviews, getInquiries } from "@/lib/storage";
import { fmt } from "@/components/storefront/ProductCard";

export const Route = createFileRoute("/admin/")({
  component: Dashboard,
});

function Dashboard() {
  const products = typeof window !== "undefined" ? getProducts() : [];
  const reviews = typeof window !== "undefined" ? getReviews() : [];
  const inquiries = typeof window !== "undefined" ? getInquiries() : [];
  const pending = reviews.filter((r) => r.status === "pending").length;
  const newInq = inquiries.filter((i) => i.status === "new").length;
  const live = products.filter((p) => p.listed).length;
  const lowStock = products.filter((p) => p.stock <= 5 && p.listed).length;
  const totalRevenue = inquiries.filter((i) => i.status !== "cancelled").reduce((s, i) => s + i.total, 0);

  const stats = [
    { label: "Live products", value: live },
    { label: "Low stock", value: lowStock },
    { label: "Pending reviews", value: pending },
    { label: "New orders", value: newInq },
  ];

  return (
    <>
      <h1 className="admin-h1">Dashboard</h1>
      <p className="admin-sub">An overview of your store. Everything runs from local storage in this preview.</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 12, marginBottom: 24 }}>
        {stats.map((s) => (
          <div key={s.label} className="admin-card">
            <div className="form-label">{s.label}</div>
            <div className="serif" style={{ fontSize: 32, fontWeight: 300, color: "var(--ink)", marginTop: 4 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="admin-card">
        <div className="cart-sum-title" style={{ marginBottom: 4 }}>Quick actions</div>
        <p style={{ fontSize: 12, color: "var(--ink3)", marginBottom: 14 }}>
          Manage what's shown on the storefront. Total order value to date: {fmt(totalRevenue)}.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link to="/admin/products/new" className="btn-ink">+ Add new product</Link>
          <Link to="/admin/products" className="btn-outline">Manage products</Link>
          <Link to="/admin/reviews" className="btn-outline">Moderate reviews{pending > 0 && ` (${pending})`}</Link>
          <Link to="/admin/inquiries" className="btn-outline">View orders{newInq > 0 && ` (${newInq})`}</Link>
        </div>
      </div>

      <div className="admin-card">
        <div className="cart-sum-title" style={{ marginBottom: 12 }}>Heads up</div>
        <ul style={{ fontSize: 12, color: "var(--ink2)", lineHeight: 1.9, paddingLeft: 18 }}>
          <li>All data lives in your browser's local storage during this preview phase.</li>
          <li>Image uploads are auto-enhanced (cropped to square, contrast normalized, converted to WebP).</li>
          <li>When ready, we'll move everything to Lovable Cloud and wire up real authentication + payments.</li>
        </ul>
      </div>
    </>
  );
}
