import { createFileRoute, Link } from "@tanstack/react-router";
import { useAdminDashboard } from "@/hooks/useAdminDashboard";
import {
  useNotificationQueueStats,
  useFailedNotifications,
  useRetryNotification,
} from "@/hooks/useNotificationQueue";
import { useToast } from "@/lib/toast";
import { formatPrice } from "@/types/database";

export const Route = createFileRoute("/admin/")({
  component: Dashboard,
});

function Dashboard() {
  const { data } = useAdminDashboard();
  const toast = useToast();
  const { data: notifStats } = useNotificationQueueStats();
  const { data: failedNotifs = [] } = useFailedNotifications();
  const retryNotification = useRetryNotification();

  const retry = async (id: string) => {
    try {
      await retryNotification(id);
      toast("Notification requeued");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not requeue notification");
    }
  };

  const stats = [
    { label: "Live products", value: data?.liveProducts ?? "—" },
    { label: "Out of stock", value: data?.outOfStock ?? "—" },
    { label: "Low stock (< 5)", value: data?.lowStock ?? "—" },
    { label: "Total orders", value: data?.totalOrders ?? "—" },
    { label: "Pending orders", value: data?.pendingOrders ?? "—" },
  ];

  const revenue = [
    { label: "Today", value: data ? formatPrice(data.revenueToday) : "—" },
    { label: "This week", value: data ? formatPrice(data.revenueWeek) : "—" },
    { label: "This month", value: data ? formatPrice(data.revenueMonth) : "—" },
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
          marginBottom: 16,
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

      <div className="admin-card" style={{ marginBottom: 16 }}>
        <div className="cart-sum-title" style={{ marginBottom: 12 }}>
          Revenue
        </div>
        <p style={{ fontSize: 11, color: "var(--ink3)", marginBottom: 12 }}>
          Excludes cancelled and refunded orders.
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))",
            gap: 12,
          }}
        >
          {revenue.map((r) => (
            <div key={r.label}>
              <div className="form-label">{r.label}</div>
              <div className="serif" style={{ fontSize: 24, fontWeight: 300, color: "var(--ink)" }}>
                {r.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div className="admin-card">
          <div className="cart-sum-title" style={{ marginBottom: 12 }}>
            Orders by status
          </div>
          {data ? (
            <div style={{ display: "grid", gap: 8 }}>
              {(Object.keys(data.ordersByStatus) as (keyof typeof data.ordersByStatus)[]).map(
                (status) => (
                  <div
                    key={status}
                    style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}
                  >
                    <span className={`pill pill-${status}`}>{status}</span>
                    <span style={{ color: "var(--ink)" }}>{data.ordersByStatus[status]}</span>
                  </div>
                ),
              )}
            </div>
          ) : (
            <span style={{ color: "var(--ink3)" }}>Loading…</span>
          )}
        </div>

        <div className="admin-card">
          <div className="cart-sum-title" style={{ marginBottom: 4 }}>
            Top products this month
          </div>
          <p style={{ fontSize: 11, color: "var(--ink3)", marginBottom: 10 }}>
            By quantity ordered, excludes cancelled/refunded.
          </p>
          {data && data.topProducts.length === 0 && (
            <span style={{ color: "var(--ink3)", fontSize: 13 }}>No orders this month yet.</span>
          )}
          {data && data.topProducts.length > 0 && (
            <div style={{ display: "grid", gap: 8 }}>
              {data.topProducts.map((p, i) => (
                <div
                  key={p.productId}
                  style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}
                >
                  <span>
                    {i + 1}. {p.productName}
                  </span>
                  <span style={{ color: "var(--ink3)" }}>{p.quantity} sold</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="admin-card" style={{ marginBottom: 16 }}>
        <div className="cart-sum-title" style={{ marginBottom: 12 }}>
          Notification queue
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div>
            <div className="form-label">Queued</div>
            <div className="serif" style={{ fontSize: 24, fontWeight: 300, color: "var(--ink)" }}>
              {notifStats?.queuedCount ?? "—"}
            </div>
          </div>
          <div>
            <div className="form-label">Failed</div>
            <div className="serif" style={{ fontSize: 24, fontWeight: 300, color: "var(--ink)" }}>
              {notifStats?.failedCount ?? "—"}
            </div>
          </div>
          <div>
            <div className="form-label">Last processed</div>
            <div style={{ fontSize: 13, color: "var(--ink2)", marginTop: 6 }}>
              {notifStats?.lastProcessedAt
                ? new Date(notifStats.lastProcessedAt).toLocaleString("en-IN")
                : "Never"}
            </div>
          </div>
        </div>

        {failedNotifs.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--ink3)" }}>No failed notifications.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Channel</th>
                  <th>Attempts</th>
                  <th>Last error</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {failedNotifs.map((n) => (
                  <tr key={n.id}>
                    <td>{n.event_type}</td>
                    <td style={{ textTransform: "uppercase", fontSize: 11 }}>{n.channel}</td>
                    <td>{n.attempts}</td>
                    <td style={{ color: "var(--ink3)", fontSize: 12 }}>{n.last_error ?? "—"}</td>
                    <td style={{ fontSize: 12 }}>
                      {new Date(n.created_at).toLocaleDateString("en-IN")}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button className="btn-outline" onClick={() => retry(n.id)}>
                        Retry
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
