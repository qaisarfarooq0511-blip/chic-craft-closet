import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { getInquiries } from "@/lib/storage";
import { fmt } from "@/components/storefront/ProductCard";
import { normalizeMobile, useUserAuth } from "@/lib/user-auth";

export const Route = createFileRoute("/account/orders")({
  component: OrdersPage,
});

function OrdersPage() {
  const { user } = useUserAuth();

  const orders = useMemo(() => {
    if (!user) return [];
    const mine = normalizeMobile(user.mobile);
    return getInquiries().filter((o) => normalizeMobile(o.customer.phone) === mine);
  }, [user]);

  return (
    <div>
      <h2 className="serif" style={{ fontSize: 22, fontWeight: 400, marginBottom: 16 }}>My Orders</h2>

      {orders.length === 0 ? (
        <EmptyState
          title="No orders yet"
          body="Once you place your first order, you'll see it here."
          cta={<Link to="/shop" className="btn-ink" style={{ display: "inline-block", padding: "10px 18px", fontSize: 13 }}>Start shopping</Link>}
        />
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {orders.map((o) => (
            <article key={o.id} style={cardStyle}>
              <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{o.id}</div>
                  <div style={{ fontSize: 12, color: "var(--ink3)" }}>
                    Placed {new Date(o.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                </div>
                <StatusPill status={o.status} />
              </header>
              <div style={{ display: "grid", gap: 4, marginBottom: 10 }}>
                {o.lines.map((l) => (
                  <div key={l.productId} style={{ fontSize: 13, color: "var(--ink2)", display: "flex", justifyContent: "space-between" }}>
                    <span>{l.name} × {l.qty}</span>
                    <span>{fmt(l.price * l.qty)}</span>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: "1px solid var(--line)", paddingTop: 8, display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "var(--ink3)" }}>{o.lines.reduce((n, l) => n + l.qty, 0)} items · delivery to {o.customer.city}</span>
                <strong>{fmt(o.total)}</strong>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const colors: Record<string, { bg: string; fg: string }> = {
    new: { bg: "#fef3c7", fg: "#92400e" },
    contacted: { bg: "#dbeafe", fg: "#1e40af" },
    fulfilled: { bg: "#dcfce7", fg: "#166534" },
    cancelled: { bg: "#fee2e2", fg: "#991b1b" },
  };
  const c = colors[status] ?? { bg: "var(--cream)", fg: "var(--ink2)" };
  return (
    <span style={{
      background: c.bg, color: c.fg, fontSize: 11, padding: "3px 10px",
      borderRadius: 999, textTransform: "capitalize", fontWeight: 500,
    }}>{status}</span>
  );
}

export function EmptyState({ title, body, cta }: { title: string; body: string; cta?: React.ReactNode }) {
  return (
    <div style={{
      background: "#fff", border: "1px dashed var(--line)", borderRadius: 12,
      padding: "48px 24px", textAlign: "center",
    }}>
      <div style={{ fontSize: 16, color: "var(--ink)", marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, color: "var(--ink3)", marginBottom: cta ? 16 : 0 }}>{body}</div>
      {cta}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: "#fff", border: "1px solid var(--line)", borderRadius: 12, padding: 16,
};
