import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { getInquiries, updateInquiry } from "@/lib/storage";
import { fmt } from "@/components/storefront/ProductCard";
import { useToast } from "@/lib/toast";
import type { Inquiry } from "@/lib/types";

export const Route = createFileRoute("/admin/inquiries")({
  component: InquiriesAdmin,
});

function InquiriesAdmin() {
  const [, force] = useState(0);
  const toast = useToast();
  const list = typeof window !== "undefined" ? getInquiries() : [];

  const setStatus = (i: Inquiry, status: Inquiry["status"]) => {
    updateInquiry({ ...i, status });
    force((n) => n + 1);
    toast(`Order marked ${status}`);
  };

  return (
    <>
      <h1 className="admin-h1">Orders</h1>
      <p className="admin-sub">Customer checkouts. Reach out on WhatsApp or phone to confirm and arrange delivery.</p>

      {list.length === 0 && (
        <div className="admin-card" style={{ textAlign: "center", padding: 40, color: "var(--ink3)" }}>
          No orders yet.
        </div>
      )}

      {list.map((i) => (
        <div key={i.id} className="admin-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div className="form-label">{i.id} · {new Date(i.createdAt).toLocaleString()}</div>
              <div className="serif" style={{ fontSize: 20, color: "var(--ink)", marginTop: 2 }}>{i.customer.name}</div>
              <div style={{ fontSize: 12, color: "var(--ink2)", marginTop: 4, lineHeight: 1.7 }}>
                {i.customer.phone} {i.customer.email && `· ${i.customer.email}`}<br />
                {i.customer.address}, {i.customer.city} — {i.customer.pincode}
                {i.customer.notes && <><br /><em style={{ color: "var(--ink3)" }}>{i.customer.notes}</em></>}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="serif" style={{ fontSize: 22, color: "var(--ink)" }}>{fmt(i.total)}</div>
              <span className={`pill pill-${i.status === "new" ? "pending" : i.status === "fulfilled" ? "approved" : i.status === "cancelled" ? "rejected" : "live"}`}>{i.status}</span>
            </div>
          </div>
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "0.5px solid var(--b)" }}>
            {i.lines.map((l) => (
              <div key={l.productId} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--ink2)", padding: "4px 0" }}>
                <span>{l.name} × {l.qty}</span>
                <span>{fmt(l.price * l.qty)}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
            {i.status !== "contacted" && <button className="btn-outline" onClick={() => setStatus(i, "contacted")}>Mark contacted</button>}
            {i.status !== "fulfilled" && <button className="btn-ink" onClick={() => setStatus(i, "fulfilled")}>Mark fulfilled</button>}
            {i.status !== "cancelled" && <button className="btn-text-rust" onClick={() => setStatus(i, "cancelled")}>Cancel</button>}
            <a href={`https://wa.me/${i.customer.phone.replace(/\D/g, "")}`} className="btn-outline" target="_blank" rel="noreferrer">WhatsApp customer</a>
          </div>
        </div>
      ))}
    </>
  );
}
