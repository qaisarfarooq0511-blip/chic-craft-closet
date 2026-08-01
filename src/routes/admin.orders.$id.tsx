import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAdminOrder } from "@/hooks/useAdminOrder";
import { NotificationService } from "@/services/NotificationService";
import { useToast } from "@/lib/toast";
import { formatPrice } from "@/types/database";

export const Route = createFileRoute("/admin/orders/$id")({
  component: OrderDetail,
});

function OrderDetail() {
  const { id } = Route.useParams();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data: order, isLoading } = useAdminOrder(id);

  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [busy, setBusy] = useState(false);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-order", id] });
    queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
  };

  if (isLoading) return <p style={{ color: "var(--ink3)" }}>Loading…</p>;
  if (!order) return <h1 className="admin-h1">Order not found</h1>;

  const customerName = order.customer?.full_name || order.shipping_address?.full_name || "—";

  const confirmOrder = async () => {
    setBusy(true);
    const { error } = await supabase.from("orders").update({ status: "confirmed" }).eq("id", id);
    setBusy(false);
    if (error) {
      toast(error.message);
      return;
    }
    await NotificationService.send(order.customer_id, "order_confirmed", {
      order_number: order.order_number,
      customer_name: customerName,
    });
    invalidate();
    toast("Order confirmed");
  };

  const dispatchOrder = async () => {
    if (!trackingNumber.trim()) {
      toast("Enter a tracking number");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("orders")
      .update({
        status: "dispatched",
        tracking_number: trackingNumber.trim(),
        tracking_url: trackingUrl.trim() || null,
        dispatched_at: new Date().toISOString(),
      })
      .eq("id", id);
    setBusy(false);
    if (error) {
      toast(error.message);
      return;
    }
    await NotificationService.send(order.customer_id, "order_dispatched", {
      order_number: order.order_number,
      customer_name: customerName,
      tracking_number: trackingNumber.trim(),
      tracking_url: trackingUrl.trim() || undefined,
    });
    invalidate();
    toast("Order dispatched");
  };

  const deliverOrder = async () => {
    setBusy(true);
    const { error } = await supabase
      .from("orders")
      .update({ status: "delivered", delivered_at: new Date().toISOString() })
      .eq("id", id);
    setBusy(false);
    if (error) {
      toast(error.message);
      return;
    }
    await NotificationService.send(order.customer_id, "order_delivered", {
      order_number: order.order_number,
      customer_name: customerName,
    });
    invalidate();
    toast("Order marked delivered");
  };

  const cancelOrder = async () => {
    if (!confirm(`Cancel order ${order.order_number}? This cannot be undone from here.`)) return;
    setBusy(true);
    const { error } = await supabase.from("orders").update({ status: "cancelled" }).eq("id", id);
    setBusy(false);
    if (error) {
      toast(error.message);
      return;
    }
    await NotificationService.send(order.customer_id, "order_cancelled", {
      order_number: order.order_number,
      customer_name: customerName,
    });
    invalidate();
    toast("Order cancelled");
  };

  return (
    <>
      <Link
        to="/admin/orders"
        className="btn-text-ink"
        style={{ display: "inline-block", marginBottom: 12 }}
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
        }}
      >
        <div>
          <h1 className="admin-h1">{order.order_number}</h1>
          <p className="admin-sub">
            Placed{" "}
            {new Date(order.created_at).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
        <span className={`pill pill-${order.status}`}>{order.status}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 4 }}>
        <div className="admin-card">
          <div className="cart-sum-title" style={{ marginBottom: 8 }}>
            Customer
          </div>
          <div>{customerName}</div>
          <div style={{ color: "var(--ink3)", fontSize: 12 }}>{order.shipping_address?.phone}</div>
        </div>

        <div className="admin-card">
          <div className="cart-sum-title" style={{ marginBottom: 8 }}>
            Payment
          </div>
          <div style={{ textTransform: "uppercase", fontSize: 12, letterSpacing: 0.4 }}>
            {order.payment_method ?? "—"}
          </div>
          {order.payment_id && (
            <div style={{ color: "var(--ink3)", fontSize: 12, marginTop: 2 }}>
              {order.payment_id}
            </div>
          )}
        </div>
      </div>

      <div className="admin-card">
        <div className="cart-sum-title" style={{ marginBottom: 8 }}>
          Shipping address
        </div>
        {order.shipping_address ? (
          <>
            <div>{order.shipping_address.full_name}</div>
            <div>{order.shipping_address.line1}</div>
            {order.shipping_address.line2 && <div>{order.shipping_address.line2}</div>}
            <div>
              {order.shipping_address.city}, {order.shipping_address.state} —{" "}
              {order.shipping_address.pincode}
            </div>
            <div style={{ color: "var(--ink3)", fontSize: 12, marginTop: 4 }}>
              {order.shipping_address.phone}
            </div>
          </>
        ) : (
          <span style={{ color: "var(--ink3)" }}>No address on file</span>
        )}
      </div>

      <div className="admin-card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Qty</th>
              <th>Unit price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items?.map((item) => (
              <tr key={item.id}>
                <td>{item.product_name}</td>
                <td>{item.quantity}</td>
                <td>{formatPrice(item.unit_price)}</td>
                <td>{formatPrice(item.total_price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div
          style={{
            padding: 16,
            borderTop: "0.5px solid var(--line)",
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

      {order.tracking_number && (
        <div className="admin-card">
          <div className="cart-sum-title" style={{ marginBottom: 4 }}>
            Tracking
          </div>
          <div>{order.tracking_number}</div>
          {order.tracking_url && (
            <a
              href={order.tracking_url}
              target="_blank"
              rel="noreferrer"
              style={{ color: "var(--gold)", fontSize: 12 }}
            >
              {order.tracking_url}
            </a>
          )}
        </div>
      )}

      <div className="admin-card">
        <div className="cart-sum-title" style={{ marginBottom: 8 }}>
          Update status
        </div>

        {order.status === "pending" && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="cta-primary" onClick={confirmOrder} disabled={busy}>
              Confirm order
            </button>
            <button className="btn-text-rust" onClick={cancelOrder} disabled={busy}>
              Cancel order
            </button>
          </div>
        )}

        {order.status === "confirmed" && (
          <div style={{ display: "grid", gap: 10, maxWidth: 360 }}>
            <div className="form-field">
              <label className="form-label">Tracking number</label>
              <input
                className="form-input"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
              />
            </div>
            <div className="form-field">
              <label className="form-label">Tracking URL (optional)</label>
              <input
                className="form-input"
                value={trackingUrl}
                onChange={(e) => setTrackingUrl(e.target.value)}
              />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="cta-primary" onClick={dispatchOrder} disabled={busy}>
                Dispatch
              </button>
              <button className="btn-text-rust" onClick={cancelOrder} disabled={busy}>
                Cancel order
              </button>
            </div>
          </div>
        )}

        {order.status === "dispatched" && (
          <button className="cta-primary" onClick={deliverOrder} disabled={busy}>
            Mark delivered
          </button>
        )}

        {(order.status === "delivered" ||
          order.status === "cancelled" ||
          order.status === "refunded") && (
          <p style={{ color: "var(--ink3)", fontSize: 13 }}>
            This order is {order.status} — no further status changes here.
          </p>
        )}
      </div>
    </>
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
