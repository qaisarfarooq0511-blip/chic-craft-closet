import { createFileRoute, Link } from "@tanstack/react-router";
import { useMyOrders } from "@/hooks/useMyOrders";
import { formatPrice } from "@/types/database";
import type { OrderStatus } from "@/types/database";

export const Route = createFileRoute("/account/orders")({
  component: OrdersPage,
});

// bg = pastel background, fg = foreground text/accent. Reuses the app's existing
// --gold (amber) and --rust (red) tokens where the palette matches; blue/purple/
// green have no existing token so they're plain inline colours, not new CSS vars.
const STATUS_COLORS: Record<OrderStatus, { bg: string; fg: string }> = {
  pending: { bg: "#fdf0d5", fg: "var(--gold)" },
  confirmed: { bg: "#dbeafe", fg: "#1e40af" },
  dispatched: { bg: "#ede9fe", fg: "#6d28d9" },
  delivered: { bg: "#dcfce7", fg: "#166534" },
  cancelled: { bg: "#fee2e2", fg: "var(--rust)" },
  refunded: { bg: "var(--cream3)", fg: "var(--ink3)" },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const c = STATUS_COLORS[status];
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: 11,
        fontWeight: 500,
        textTransform: "capitalize",
        padding: "3px 10px",
        borderRadius: 999,
        background: c.bg,
        color: c.fg,
      }}
    >
      {status}
    </span>
  );
}

function OrdersPage() {
  const { data: orders = [], isLoading } = useMyOrders();

  if (isLoading) {
    return <p style={{ color: "var(--ink3)" }}>Loading…</p>;
  }

  if (orders.length === 0) {
    return (
      <EmptyState
        title="No orders yet"
        body="Once you place your first order, you'll see it here."
        cta={
          <Link
            to="/shop"
            className="btn-ink"
            style={{ display: "inline-block", padding: "10px 18px", fontSize: 13 }}
          >
            Start shopping
          </Link>
        }
      />
    );
  }

  return (
    <div>
      <h2 className="serif" style={{ fontSize: 22, fontWeight: 400, marginBottom: 16 }}>
        My Orders
      </h2>
      <div style={{ display: "grid", gap: 12 }}>
        {orders.map((o) => (
          <Link
            key={o.id}
            to="/account/orders/$orderNumber"
            params={{ orderNumber: o.order_number }}
            style={{
              display: "block",
              background: "#fff",
              border: "1px solid var(--line)",
              borderRadius: 12,
              padding: 16,
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: 8,
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>
                  {o.order_number}
                </div>
                <div style={{ fontSize: 12, color: "var(--ink3)" }}>
                  Placed{" "}
                  {new Date(o.created_at).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </div>
              </div>
              <OrderStatusBadge status={o.status} />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: 13,
                color: "var(--ink2)",
              }}
            >
              <span>
                {o.item_count} item{o.item_count === 1 ? "" : "s"}
              </span>
              <strong style={{ color: "var(--ink)" }}>{formatPrice(o.total)}</strong>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ title, body, cta }: { title: string; body: string; cta?: React.ReactNode }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px dashed var(--line)",
        borderRadius: 12,
        padding: "48px 24px",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 16, color: "var(--ink)", marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, color: "var(--ink3)", marginBottom: cta ? 16 : 0 }}>{body}</div>
      {cta}
    </div>
  );
}
