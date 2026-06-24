import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import {
  getAllUsers,
  createUser,
  updateUserRecord,
  deleteUserRecord,
  validateName,
  validateMobile,
  normalizeMobile,
  type AppUser,
} from "@/lib/user-auth";
import { getInquiries } from "@/lib/storage";
import { fmt } from "@/components/storefront/ProductCard";
import { useToast } from "@/lib/toast";

export const Route = createFileRoute("/admin/customers")({
  component: CustomersAdmin,
});

function CustomersAdmin() {
  const [, force] = useState(0);
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [viewingOrders, setViewingOrders] = useState<AppUser | null>(null);
  const [adding, setAdding] = useState(false);

  const users = useMemo(() => {
    const all = getAllUsers();
    if (!search.trim()) return all;
    const q = search.toLowerCase();
    return all.filter((u) =>
      u.name.toLowerCase().includes(q) ||
      u.mobile.includes(q) ||
      (u.email ?? "").toLowerCase().includes(q),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, editing, adding, viewingOrders]);

  const refresh = () => force((n) => n + 1);

  const ordersFor = (u: AppUser) => {
    const norm = normalizeMobile(u.mobile);
    return getInquiries().filter((i) => normalizeMobile(i.customer.phone) === norm);
  };

  const isOptedIn = (u: AppUser) => u.newsletterOptIn !== false;

  return (
    <>
      <h1 className="admin-h1">Customers</h1>
      <p className="admin-sub">Everyone who has signed up or checked out. Manage details, newsletter preferences, and view their orders.</p>

      <div className="admin-card" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <input
          className="form-input"
          placeholder="Search by name, mobile or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 220 }}
        />
        <button className="btn-ink" onClick={() => setAdding(true)}>+ Add customer</button>
      </div>

      {users.length === 0 && (
        <div className="admin-card" style={{ textAlign: "center", padding: 40, color: "var(--ink3)" }}>
          No customers yet.
        </div>
      )}

      {users.map((u) => {
        const orders = ordersFor(u);
        return (
          <div key={u.id} className="admin-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div className="serif" style={{ fontSize: 20, color: "var(--ink)" }}>{u.name}</div>
                <div style={{ fontSize: 12, color: "var(--ink2)", marginTop: 4, lineHeight: 1.7 }}>
                  {u.mobile}{u.email ? ` · ${u.email}` : ""}<br />
                  Joined {new Date(u.createdAt).toLocaleDateString()} · {orders.length} order{orders.length === 1 ? "" : "s"}
                </div>
                <div style={{ marginTop: 8 }}>
                  <span className={`pill pill-${isOptedIn(u) ? "approved" : "rejected"}`}>
                    Newsletter: {isOptedIn(u) ? "Opted in" : "Opted out"}
                  </span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="btn-outline" onClick={() => setViewingOrders(u)} disabled={orders.length === 0}>
                  View orders
                </button>
                <button
                  className="btn-outline"
                  onClick={() => {
                    updateUserRecord(u.id, { newsletterOptIn: !isOptedIn(u) });
                    toast(isOptedIn(u) ? "Opted out of newsletter" : "Opted in to newsletter");
                    refresh();
                  }}
                >
                  {isOptedIn(u) ? "Opt out" : "Opt in"}
                </button>
                <button className="btn-outline" onClick={() => setEditing(u)}>Edit</button>
                <button
                  className="btn-text-rust"
                  onClick={() => {
                    if (confirm(`Delete ${u.name}? This cannot be undone.`)) {
                      deleteUserRecord(u.id);
                      toast("Customer deleted");
                      refresh();
                    }
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {editing && (
        <EditModal
          user={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); refresh(); toast("Customer updated"); }}
        />
      )}
      {adding && (
        <AddModal
          onClose={() => setAdding(false)}
          onAdded={() => { setAdding(false); refresh(); toast("Customer added"); }}
        />
      )}
      {viewingOrders && (
        <OrdersModal
          user={viewingOrders}
          orders={ordersFor(viewingOrders)}
          onClose={() => setViewingOrders(null)}
        />
      )}
    </>
  );
}

function ModalShell({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(28,20,16,.55)",
        display: "grid", placeItems: "center", padding: 16, zIndex: 100,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="admin-card"
        style={{ width: "100%", maxWidth: 520, maxHeight: "90vh", overflow: "auto", margin: 0 }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div className="cart-sum-title" style={{ marginBottom: 0 }}>{title}</div>
          <button onClick={onClose} className="btn-outline" style={{ padding: "4px 10px" }}>Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function EditModal({ user, onClose, onSaved }: { user: AppUser; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email ?? "");
  const [mobile, setMobile] = useState(user.mobile);
  const [optIn, setOptIn] = useState(user.newsletterOptIn !== false);
  const [err, setErr] = useState<string | null>(null);
  const toast = useToast();

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const n = validateName(name); if (!n.ok) { setErr(n.error); return; }
    const m = validateMobile(mobile); if (!m.ok) { setErr(m.error); return; }
    updateUserRecord(user.id, { name: n.value, email, mobile: m.value, newsletterOptIn: optIn });
    onSaved();
    void toast;
  };

  return (
    <ModalShell onClose={onClose} title="Edit customer">
      <form onSubmit={save}>
        <div className="form-field"><label className="form-label">Name</label>
          <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="form-field"><label className="form-label">Mobile</label>
          <input className="form-input" value={mobile} onChange={(e) => setMobile(e.target.value)} />
        </div>
        <div className="form-field"><label className="form-label">Email</label>
          <input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--ink2)", margin: "8px 0 14px" }}>
          <input type="checkbox" checked={optIn} onChange={(e) => setOptIn(e.target.checked)} />
          Subscribed to newsletter
        </label>
        {err && <div style={{ color: "var(--rust)", fontSize: 12, marginBottom: 10 }}>{err}</div>}
        <button type="submit" className="cta-primary">Save changes</button>
      </form>
    </ModalShell>
  );
}

function AddModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const n = validateName(name); if (!n.ok) { setErr(n.error); return; }
    const m = validateMobile(mobile); if (!m.ok) { setErr(m.error); return; }
    createUser(m.value, n.value, email || undefined);
    onAdded();
  };

  return (
    <ModalShell onClose={onClose} title="Add customer">
      <form onSubmit={save}>
        <div className="form-field"><label className="form-label">Name *</label>
          <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="form-field"><label className="form-label">Mobile *</label>
          <input className="form-input" value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="10-digit mobile" required />
        </div>
        <div className="form-field"><label className="form-label">Email</label>
          <input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        {err && <div style={{ color: "var(--rust)", fontSize: 12, marginBottom: 10 }}>{err}</div>}
        <button type="submit" className="cta-primary">Add customer</button>
      </form>
    </ModalShell>
  );
}

function OrdersModal({
  user,
  orders,
  onClose,
}: {
  user: AppUser;
  orders: ReturnType<typeof getInquiries>;
  onClose: () => void;
}) {
  return (
    <ModalShell onClose={onClose} title={`Orders — ${user.name}`}>
      {orders.length === 0 && (
        <p style={{ fontSize: 13, color: "var(--ink3)" }}>No orders for this customer.</p>
      )}
      {orders.map((i) => (
        <div key={i.id} style={{ border: "0.5px solid var(--b)", borderRadius: 8, padding: 12, marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <div style={{ fontSize: 11, color: "var(--ink3)" }}>{i.id} · {new Date(i.createdAt).toLocaleString()}</div>
            <span className={`pill pill-${i.status === "new" ? "pending" : i.status === "fulfilled" ? "approved" : i.status === "cancelled" ? "rejected" : "live"}`}>{i.status}</span>
          </div>
          {i.lines.map((l) => (
            <div key={l.productId} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--ink2)", padding: "2px 0" }}>
              <span>{l.name} × {l.qty}</span>
              <span>{fmt(l.price * l.qty)}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, paddingTop: 6, borderTop: "0.5px solid var(--b)", fontWeight: 600 }}>
            <span>Total</span><span>{fmt(i.total)}</span>
          </div>
        </div>
      ))}
    </ModalShell>
  );
}
