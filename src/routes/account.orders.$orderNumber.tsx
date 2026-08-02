import { createFileRoute, Link } from "@tanstack/react-router";
import { useMyOrder } from "@/hooks/useMyOrders";
import { formatPrice } from "@/types/database";
import { OrderStatusBadge } from "@/routes/account.orders";

export const Route = createFileRoute("/account/orders/$orderNumber")({
  component: OrderDetail,
});

function OrderDetail() {
  const { orderNumber } = Route.useParams();
  const { data: order, isLoading } = useMyOrder(orderNumber);

  if (isLoading) return <p style={{ color: "var(--ink3)" }}>Loading…</p>;
  if (!order)
    return (
      <h2 className="serif" style={{ fontSize: 22, fontWeight: 400 }}>
        Order not found
      </h2>
    );

  return (
    <div>
      <Link
        to="/account/orders"
        style={{ display: "inline-block", marginBottom: 12, fontSize: 12, color: "var(--ink2)" }}
      >
        ← Back to orders
      </Link>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
          marginBottom: 16,
        }}
      >
        <div>
          <h2 className="serif" style={{ fontSize: 22, fontWeight: 400, marginBottom: 2 }}>
            {order.order_number}
          </h2>
          <p style={{ fontSize: 12, color: "var(--ink3)" }}>
            Placed{" "}
            {new Date(order.created_at).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div style={cardStyle}>
          <div style={cardTitle}>Payment</div>
          <div style={{ textTransform: "uppercase", fontSize: 12, letterSpacing: 0.4 }}>
            {order.payment_method ?? "—"}
          </div>
        </div>
        <div style={cardStyle}>
          <div style={cardTitle}>Tracking</div>
          {order.tracking_number ? (
            order.tracking_url ? (
              <a
                href={order.tracking_url}
                target="_blank"
                rel="noreferrer"
                style={{ color: "var(--gold)", fontSize: 13 }}
              >
                {order.tracking_number}
              </a>
            ) : (
              <span style={{ fontSize: 13 }}>{order.tracking_number}</span>
            )
          ) : (
            <span style={{ fontSize: 13, color: "var(--ink3)" }}>Not dispatched yet</span>
          )}
        </div>
      </div>

      <div style={{ ...cardStyle, marginBottom: 16 }}>
        <div style={cardTitle}>Shipping address</div>
        {order.shipping_address ? (
          <div style={{ fontSize: 13, color: "var(--ink2)" }}>
            <div style={{ color: "var(--ink)", fontWeight: 500 }}>
              {order.shipping_address.full_name}
            </div>
            <div>{order.shipping_address.line1}</div>
            {order.shipping_address.line2 && <div>{order.shipping_address.line2}</div>}
            <div>
              {order.shipping_address.city}, {order.shipping_address.state} —{" "}
              {order.shipping_address.pincode}
            </div>
            <div style={{ color: "var(--ink3)", marginTop: 4 }}>{order.shipping_address.phone}</div>
          </div>
        ) : (
          <span style={{ color: "var(--ink3)", fontSize: 13 }}>No address on file</span>
        )}
      </div>

      <div style={{ ...cardStyle, padding: 0, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--ink3)" }}>
              <th style={th}>Product</th>
              <th style={th}>Qty</th>
              <th style={th}>Unit price</th>
              <th style={th}>Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items?.map((item) => (
              <tr key={item.id} style={{ borderTop: "1px solid var(--line)" }}>
                <td style={td}>
                  <div>{item.product_name}</div>
                  {item.variant_label && (
                    <div style={{ fontSize: 11, color: "var(--ink3)" }}>{item.variant_label}</div>
                  )}
                </td>
                <td style={td}>{item.quantity}</td>
                <td style={td}>{formatPrice(item.unit_price)}</td>
                <td style={td}>{formatPrice(item.total_price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div
          style={{
            padding: 16,
            borderTop: "1px solid var(--line)",
            display: "grid",
            gap: 4,
            maxWidth: 260,
            marginLeft: "auto",
          }}
        >
          <Row label="Subtotal" value={formatPrice(order.subtotal)} />
          <Row label="Delivery" value={formatPrice(order.delivery_charge)} />
          {order.discount > 0 && (
            <Row label="Discount" value={`− ${formatPrice(order.discount)}`} />
          )}
          <Row label="Total" value={formatPrice(order.total)} strong />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        fontWeight: strong ? 600 : 400,
        color: strong ? "var(--ink)" : "var(--ink3)",
      }}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid var(--line)",
  borderRadius: 12,
  padding: 16,
};
const cardTitle: React.CSSProperties = { fontSize: 12, color: "var(--ink3)", marginBottom: 8 };
const th: React.CSSProperties = { padding: "10px 14px", fontWeight: 500, fontSize: 11 };
const td: React.CSSProperties = { padding: "10px 14px", verticalAlign: "top" };
