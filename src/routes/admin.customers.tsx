import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  useAdminCustomers,
  useAdminCustomer,
  ADMIN_CUSTOMERS_PAGE_SIZE,
} from "@/hooks/useAdminCustomers";
import { formatPrice } from "@/types/database";

export const Route = createFileRoute("/admin/customers")({
  component: CustomersAdmin,
});

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function CustomersAdmin() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading } = useAdminCustomers({ search, page });
  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const from = total === 0 ? 0 : page * ADMIN_CUSTOMERS_PAGE_SIZE + 1;
  const to = Math.min(total, (page + 1) * ADMIN_CUSTOMERS_PAGE_SIZE);

  return (
    <>
      <h1 className="admin-h1">Customers</h1>
      <p className="admin-sub">
        {total} customer{total === 1 ? "" : "s"}. Real order history and lifetime spend — for access
        control, use the Users page instead.
      </p>

      <div className="admin-card" style={{ marginBottom: 14 }}>
        <input
          className="form-input"
          placeholder="Search by name or email"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          style={{ maxWidth: 320 }}
        />
      </div>

      <div className="admin-card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name / Email</th>
              <th>Phone</th>
              <th>Joined</th>
              <th>Orders</th>
              <th>Total spent</th>
              <th>Last order</th>
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
              rows.map((c) => (
                <tr key={c.id} onClick={() => setSelectedId(c.id)} style={{ cursor: "pointer" }}>
                  <td>
                    <div style={{ fontWeight: 500, color: "var(--ink)" }}>{c.full_name || "—"}</div>
                    <div style={{ fontSize: 10, color: "var(--ink3)" }}>{c.email || "—"}</div>
                  </td>
                  <td>{c.phone || "—"}</td>
                  <td>{formatDate(c.created_at)}</td>
                  <td>{c.order_count}</td>
                  <td>{formatPrice(c.total_spent)}</td>
                  <td>{formatDate(c.last_order_at)}</td>
                </tr>
              ))}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: 40, color: "var(--ink3)" }}>
                  No customers yet. Customers appear here once they sign up and place an order.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {total > 0 && (
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
            Showing {from}-{to} of {total} customers
          </span>
          <button
            className="btn-outline"
            disabled={to >= total}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}

      {selectedId && <CustomerPanel customerId={selectedId} onClose={() => setSelectedId(null)} />}
    </>
  );
}

function CustomerPanel({ customerId, onClose }: { customerId: string; onClose: () => void }) {
  const { data, isLoading } = useAdminCustomer(customerId);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(28,20,16,.45)",
        zIndex: 100,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="admin-card"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "100%",
          maxWidth: 440,
          margin: 0,
          borderRadius: 0,
          overflowY: "auto",
          animation: "customer-panel-slide-in .2s ease-out",
        }}
      >
        <style>{`
          @keyframes customer-panel-slide-in {
            from { transform: translateX(24px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
        `}</style>

        <button
          onClick={onClose}
          className="btn-outline"
          style={{ padding: "4px 10px", float: "right" }}
        >
          × Close
        </button>

        {isLoading && (
          <div style={{ padding: 40, textAlign: "center", color: "var(--ink3)" }}>Loading…</div>
        )}

        {data && (
          <>
            <div className="serif" style={{ fontSize: 22, color: "var(--ink)", marginTop: 4 }}>
              {data.profile.full_name || "—"}
            </div>
            <div style={{ fontSize: 13, color: "var(--ink2)", marginBottom: 16 }}>
              {data.profile.email || "—"}
            </div>

            <div
              style={{
                display: "flex",
                gap: 16,
                padding: "12px 0",
                borderTop: "0.5px solid var(--b)",
                borderBottom: "0.5px solid var(--b)",
                marginBottom: 16,
                fontSize: 14,
                color: "var(--ink)",
              }}
            >
              <span>
                <strong>{data.stats.total_orders}</strong> order
                {data.stats.total_orders === 1 ? "" : "s"}
              </span>
              <span>·</span>
              <span>
                <strong>{formatPrice(data.stats.total_spent)}</strong> total spent
              </span>
            </div>

            <div style={{ fontSize: 12, color: "var(--ink2)", lineHeight: 1.8, marginBottom: 20 }}>
              {data.profile.phone && <div>Phone: {data.profile.phone}</div>}
              <div>Joined {formatDate(data.profile.created_at)}</div>
              <div>Last sign-in {formatDate(data.profile.last_sign_in_at)}</div>
            </div>

            <div className="cart-sum-title" style={{ marginBottom: 10 }}>
              Order history
            </div>

            {data.orders.length === 0 && (
              <p style={{ fontSize: 13, color: "var(--ink3)" }}>No orders yet.</p>
            )}

            {data.orders.map((o) => (
              <Link
                key={o.id}
                to="/admin/orders/$id"
                params={{ id: o.id }}
                style={{ textDecoration: "none" }}
              >
                <div
                  style={{
                    border: "0.5px solid var(--b)",
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 10,
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}
                  >
                    <span style={{ fontWeight: 500, color: "var(--ink)" }}>{o.order_number}</span>
                    <span className={`pill pill-${o.status}`}>{o.status}</span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 12,
                      color: "var(--ink2)",
                    }}
                  >
                    <span>
                      {formatDate(o.created_at)} · {o.item_count} item
                      {o.item_count === 1 ? "" : "s"}
                    </span>
                    <span style={{ fontWeight: 500 }}>{formatPrice(o.total)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
