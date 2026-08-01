import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAdminOrders, ADMIN_ORDERS_PAGE_SIZE } from "@/hooks/useAdminOrders";
import { useToast } from "@/lib/toast";
import { formatPrice } from "@/types/database";
import type { Order } from "@/types/database";

export const Route = createFileRoute("/admin/orders")({
  component: OrdersAdmin,
});

const STATUS_OPTIONS: (Order["status"] | "all")[] = [
  "all",
  "pending",
  "confirmed",
  "dispatched",
  "delivered",
  "cancelled",
  "refunded",
];

function OrdersAdmin() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState<Order["status"] | "all">("all");
  const [dispatchingId, setDispatchingId] = useState<string | null>(null);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");

  const { data, isLoading } = useAdminOrders({ page, status });
  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / ADMIN_ORDERS_PAGE_SIZE));

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-orders"] });

  const confirmOrder = async (id: string) => {
    const { error } = await supabase.from("orders").update({ status: "confirmed" }).eq("id", id);
    if (error) {
      toast(error.message);
      return;
    }
    invalidate();
    toast("Order confirmed");
  };

  const submitDispatch = async (id: string) => {
    if (!trackingNumber.trim()) {
      toast("Enter a tracking number");
      return;
    }
    const { error } = await supabase
      .from("orders")
      .update({
        status: "dispatched",
        tracking_number: trackingNumber.trim(),
        tracking_url: trackingUrl.trim() || null,
        dispatched_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) {
      toast(error.message);
      return;
    }
    setDispatchingId(null);
    setTrackingNumber("");
    setTrackingUrl("");
    invalidate();
    toast("Order dispatched");
  };

  const deliverOrder = async (id: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ status: "delivered", delivered_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast(error.message);
      return;
    }
    invalidate();
    toast("Order marked delivered");
  };

  return (
    <>
      <h1 className="admin-h1">Orders</h1>
      <p className="admin-sub">
        {total} order{total === 1 ? "" : "s"}
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s}
            className={status === s ? "btn-ink" : "btn-outline"}
            onClick={() => {
              setStatus(s);
              setPage(0);
            }}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <div className="admin-card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Total</th>
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
              rows.map((o) => (
                <tr key={o.id}>
                  <td>
                    <div style={{ fontWeight: 500, color: "var(--ink)" }}>{o.order_number}</div>
                    <div style={{ fontSize: 10, color: "var(--ink3)" }}>
                      {new Date(o.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                  </td>
                  <td>
                    <div>{o.customer?.full_name || o.shipping_address?.full_name || "—"}</div>
                    <div style={{ fontSize: 10, color: "var(--ink3)" }}>
                      {o.shipping_address?.phone}
                    </div>
                  </td>
                  <td>
                    {o.items.length} item{o.items.length === 1 ? "" : "s"}
                  </td>
                  <td>{formatPrice(o.total)}</td>
                  <td>
                    <span className={`pill pill-${o.status}`}>{o.status}</span>
                  </td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    {o.status === "pending" && (
                      <button className="btn-text-ink" onClick={() => confirmOrder(o.id)}>
                        Confirm
                      </button>
                    )}
                    {o.status === "confirmed" && dispatchingId !== o.id && (
                      <button className="btn-text-ink" onClick={() => setDispatchingId(o.id)}>
                        Dispatch
                      </button>
                    )}
                    {o.status === "confirmed" && dispatchingId === o.id && (
                      <div
                        style={{
                          display: "flex",
                          gap: 6,
                          alignItems: "center",
                          justifyContent: "flex-end",
                        }}
                      >
                        <input
                          className="form-input"
                          style={{ width: 130, padding: "6px 8px" }}
                          placeholder="Tracking #"
                          value={trackingNumber}
                          onChange={(e) => setTrackingNumber(e.target.value)}
                        />
                        <input
                          className="form-input"
                          style={{ width: 130, padding: "6px 8px" }}
                          placeholder="Tracking URL"
                          value={trackingUrl}
                          onChange={(e) => setTrackingUrl(e.target.value)}
                        />
                        <button className="btn-text-ink" onClick={() => submitDispatch(o.id)}>
                          Save
                        </button>
                        <button className="btn-text-rust" onClick={() => setDispatchingId(null)}>
                          Cancel
                        </button>
                      </div>
                    )}
                    {o.status === "dispatched" && (
                      <button className="btn-text-ink" onClick={() => deliverOrder(o.id)}>
                        Mark delivered
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: 40, color: "var(--ink3)" }}>
                  No orders in this view.
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
