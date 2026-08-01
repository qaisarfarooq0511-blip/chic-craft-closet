import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/admin/")({
  component: Dashboard,
});

async function fetchDashboardStats() {
  const [products, outOfStock, orders, pendingOrders] = await Promise.all([
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .is("deleted_at", null),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .eq("stock_count", 0)
      .is("deleted_at", null),
    supabase.from("orders").select("id", { count: "exact", head: true }).is("deleted_at", null),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .is("deleted_at", null),
  ]);
  return {
    liveProducts: products.count ?? 0,
    outOfStock: outOfStock.count ?? 0,
    totalOrders: orders.count ?? 0,
    pendingOrders: pendingOrders.count ?? 0,
  };
}

function Dashboard() {
  const { data } = useQuery({ queryKey: ["admin-dashboard-stats"], queryFn: fetchDashboardStats });

  const stats = [
    { label: "Live products", value: data?.liveProducts ?? "—" },
    { label: "Out of stock", value: data?.outOfStock ?? "—" },
    { label: "Total orders", value: data?.totalOrders ?? "—" },
    { label: "Pending orders", value: data?.pendingOrders ?? "—" },
  ];

  return (
    <>
      <h1 className="admin-h1">Dashboard</h1>
      <p className="admin-sub">An overview of your store.</p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))",
          gap: 12,
          marginBottom: 24,
        }}
      >
        {stats.map((s) => (
          <div key={s.label} className="admin-card">
            <div className="form-label">{s.label}</div>
            <div
              className="serif"
              style={{ fontSize: 32, fontWeight: 300, color: "var(--ink)", marginTop: 4 }}
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <div className="admin-card">
        <div className="cart-sum-title" style={{ marginBottom: 4 }}>
          Quick actions
        </div>
        <p style={{ fontSize: 12, color: "var(--ink3)", marginBottom: 14 }}>
          Manage what's shown on the storefront.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link to="/admin/products/new" className="btn-ink">
            + Add new product
          </Link>
          <Link to="/admin/products" className="btn-outline">
            Manage products
          </Link>
          <Link to="/admin/reviews" className="btn-outline">
            Moderate reviews
          </Link>
          <Link to="/admin/orders" className="btn-outline">
            View orders{(data?.pendingOrders ?? 0) > 0 && ` (${data?.pendingOrders})`}
          </Link>
        </div>
      </div>
    </>
  );
}
