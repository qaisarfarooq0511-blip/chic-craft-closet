import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useAdminOrders, ADMIN_ORDERS_PAGE_SIZE } from "@/hooks/useAdminOrders";
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
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState<Order["status"] | "all">("all");

  const { data, isLoading } = useAdminOrders({ page, status });
  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / ADMIN_ORDERS_PAGE_SIZE));

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
                  <td style={{ textAlign: "right" }}>
                    <Link to="/admin/orders/$id" params={{ id: o.id }} className="btn-text-ink">
                      View
                    </Link>
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
