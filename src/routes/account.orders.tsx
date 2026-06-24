import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { getInquiries, getConfig, getProduct, computeTaxBreakup } from "@/lib/storage";
import { fmt } from "@/components/storefront/ProductCard";
import { normalizeMobile, useUserAuth } from "@/lib/user-auth";
import type { Inquiry } from "@/lib/types";

export const Route = createFileRoute("/account/orders")({
  component: OrdersPage,
});

function OrdersPage() {
  const { user } = useUserAuth();
  const [invoiceFor, setInvoiceFor] = useState<Inquiry | null>(null);

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
              <div style={{ borderTop: "1px solid var(--line)", paddingTop: 8, display: "flex", justifyContent: "space-between", fontSize: 13, alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <span style={{ color: "var(--ink3)" }}>{o.lines.reduce((n, l) => n + l.qty, 0)} items · delivery to {o.customer.city}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <button
                    type="button"
                    onClick={() => setInvoiceFor(o)}
                    style={{ background: "none", border: "none", color: "var(--rust)", fontSize: 12, cursor: "pointer", textDecoration: "underline", padding: 0 }}
                  >
                    View invoice
                  </button>
                  <strong>{fmt(o.total)}</strong>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {invoiceFor && (
        <InvoiceModal order={invoiceFor} onClose={() => setInvoiceFor(null)} />
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

// ---------------- Invoice ----------------

interface InvoiceLine {
  productId: number;
  name: string;
  qty: number;
  price: number;          // unit price (GST inclusive)
  hsnCode: string;
  gstRate: number;
  lineTotal: number;      // inclusive
  base: number;           // exclusive
  cgst: number;
  sgst: number;
  gst: number;
}

function buildInvoice(order: Inquiry): {
  lines: InvoiceLine[];
  subtotalBase: number;
  totalCgst: number;
  totalSgst: number;
  totalGst: number;
  delivery: number;
  total: number;
} {
  const cfg = getConfig();
  const findRate = (hsn?: string | null) => {
    if (!hsn) return 5;
    return cfg.hsnCodes.find((h) => h.code === hsn)?.gstRate ?? 5;
  };
  const lines: InvoiceLine[] = order.lines.map((l) => {
    const prod = getProduct(l.productId);
    const hsn = prod?.hsnCode ?? "—";
    const rate = findRate(prod?.hsnCode);
    const lineTotal = l.price * l.qty;
    const br = computeTaxBreakup(lineTotal, rate);
    return {
      productId: l.productId,
      name: l.name,
      qty: l.qty,
      price: l.price,
      hsnCode: hsn || "—",
      gstRate: rate,
      lineTotal,
      base: br.base,
      cgst: br.cgst,
      sgst: br.sgst,
      gst: br.gst,
    };
  });
  const subtotalBase = round2(lines.reduce((n, l) => n + l.base, 0));
  const totalCgst = round2(lines.reduce((n, l) => n + l.cgst, 0));
  const totalSgst = round2(lines.reduce((n, l) => n + l.sgst, 0));
  const totalGst = round2(totalCgst + totalSgst);
  return {
    lines,
    subtotalBase,
    totalCgst,
    totalSgst,
    totalGst,
    delivery: order.delivery,
    total: order.total,
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const inr = (n: number) => `₹${n.toFixed(2)}`;

function InvoiceModal({ order, onClose }: { order: Inquiry; onClose: () => void }) {
  const inv = useMemo(() => buildInvoice(order), [order]);

  const download = () => {
    const html = invoiceHtml(order, inv);
    const w = window.open("", "_blank", "width=900,height=1000");
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
    // Give it a tick to render fonts, then prompt print (user can save as PDF).
    setTimeout(() => { w.focus(); w.print(); }, 350);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16, zIndex: 100,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: 12, maxWidth: 720, width: "100%",
          maxHeight: "90vh", overflow: "auto", padding: 24,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 className="serif" style={{ fontSize: 20, margin: 0 }}>Tax Invoice</h3>
          <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "var(--ink3)" }}>×</button>
        </div>

        <InvoiceBody order={order} inv={inv} />

        <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
          <button type="button" className="btn-outline" onClick={onClose}>Close</button>
          <button type="button" className="btn-ink" onClick={download}>Download / Print</button>
        </div>
        <p style={{ fontSize: 11, color: "var(--ink3)", marginTop: 10, textAlign: "right" }}>
          This is a sample invoice format — final format will be confirmed later.
        </p>
      </div>
    </div>
  );
}

function InvoiceBody({ order, inv }: { order: Inquiry; inv: ReturnType<typeof buildInvoice> }) {
  return (
    <div style={{ fontSize: 13, color: "var(--ink2)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="serif" style={{ fontSize: 18, color: "var(--ink)" }}>Yaawun</div>
          <div style={{ fontSize: 11, color: "var(--ink3)" }}>yaawun.com</div>
          <div style={{ fontSize: 11, color: "var(--ink3)" }}>GSTIN: 07AAAAA0000A1Z5 (sample)</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div><strong>Invoice #</strong> INV-{order.id}</div>
          <div><strong>Date</strong> {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</div>
          <div style={{ textTransform: "capitalize" }}><strong>Status</strong> {order.status}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Billed to</div>
          <div style={{ fontWeight: 500, color: "var(--ink)" }}>{order.customer.name}</div>
          <div>{order.customer.address}</div>
          <div>{order.customer.city} — {order.customer.pincode}</div>
          <div>{order.customer.phone}</div>
        </div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--line)", color: "var(--ink3)", textAlign: "left" }}>
            <th style={th}>Item</th>
            <th style={th}>HSN</th>
            <th style={{ ...th, textAlign: "right" }}>Qty</th>
            <th style={{ ...th, textAlign: "right" }}>Base</th>
            <th style={{ ...th, textAlign: "right" }}>GST</th>
            <th style={{ ...th, textAlign: "right" }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {inv.lines.map((l) => (
            <tr key={l.productId} style={{ borderBottom: "1px solid var(--line)" }}>
              <td style={td}>{l.name}</td>
              <td style={td}>{l.hsnCode}</td>
              <td style={{ ...td, textAlign: "right" }}>{l.qty}</td>
              <td style={{ ...td, textAlign: "right" }}>{inr(l.base)}</td>
              <td style={{ ...td, textAlign: "right" }}>{inr(l.gst)}<div style={{ fontSize: 10, color: "var(--ink3)" }}>@ {l.gstRate}%</div></td>
              <td style={{ ...td, textAlign: "right" }}>{inr(l.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: 16, marginLeft: "auto", maxWidth: 320, display: "grid", gap: 4 }}>
        <Row label="Taxable value" value={inr(inv.subtotalBase)} />
        <Row label="CGST" value={inr(inv.totalCgst)} />
        <Row label="SGST" value={inr(inv.totalSgst)} />
        <Row label="Total GST" value={inr(inv.totalGst)} />
        <Row label="Delivery" value={inv.delivery > 0 ? inr(inv.delivery) : "Free"} />
        <div style={{ borderTop: "1px solid var(--line)", paddingTop: 6, marginTop: 4 }}>
          <Row label="Grand total" value={inr(inv.total)} bold />
        </div>
      </div>

      <p style={{ fontSize: 10, color: "var(--ink3)", marginTop: 16 }}>
        All prices shown on the storefront are inclusive of GST. Tax components above are derived from the HSN code configured for each product.
      </p>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: bold ? 600 : 400, color: bold ? "var(--ink)" : undefined }}>
      <span>{label}</span><span>{value}</span>
    </div>
  );
}

const th: React.CSSProperties = { padding: "8px 6px", fontWeight: 500, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4 };
const td: React.CSSProperties = { padding: "8px 6px", verticalAlign: "top" };

function invoiceHtml(order: Inquiry, inv: ReturnType<typeof buildInvoice>): string {
  const rows = inv.lines.map((l) => `
    <tr>
      <td>${escapeHtml(l.name)}</td>
      <td>${escapeHtml(l.hsnCode)}</td>
      <td style="text-align:right">${l.qty}</td>
      <td style="text-align:right">${inr(l.base)}</td>
      <td style="text-align:right">${inr(l.gst)} <span style="color:#888;font-size:10px">@ ${l.gstRate}%</span></td>
      <td style="text-align:right">${inr(l.lineTotal)}</td>
    </tr>`).join("");
  const date = new Date(order.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  return `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${order.id}</title>
  <style>
    body { font-family: -apple-system, system-ui, sans-serif; color: #222; padding: 32px; }
    h1 { font-family: Georgia, serif; font-size: 22px; margin: 0 0 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
    th, td { padding: 8px 6px; border-bottom: 1px solid #eee; text-align: left; }
    th { font-size: 10px; text-transform: uppercase; color: #777; letter-spacing: 0.5px; }
    .totals { margin-left: auto; max-width: 320px; margin-top: 16px; font-size: 13px; }
    .totals .row { display:flex; justify-content: space-between; padding: 3px 0; }
    .totals .grand { border-top: 1px solid #ccc; margin-top: 6px; padding-top: 6px; font-weight: 600; }
    .head { display:flex; justify-content: space-between; margin-bottom: 16px; }
    .muted { color: #888; font-size: 11px; }
  </style></head><body>
  <div class="head">
    <div>
      <h1>Yaawun</h1>
      <div class="muted">yaawun.com</div>
      <div class="muted">GSTIN: 07AAAAA0000A1Z5 (sample)</div>
    </div>
    <div style="text-align:right">
      <div><strong>Invoice #</strong> INV-${escapeHtml(order.id)}</div>
      <div><strong>Date</strong> ${date}</div>
    </div>
  </div>
  <div>
    <div class="muted" style="text-transform:uppercase;letter-spacing:.5px;font-size:10px;margin-bottom:4px">Billed to</div>
    <div><strong>${escapeHtml(order.customer.name)}</strong></div>
    <div>${escapeHtml(order.customer.address)}</div>
    <div>${escapeHtml(order.customer.city)} — ${escapeHtml(order.customer.pincode)}</div>
    <div>${escapeHtml(order.customer.phone)}</div>
  </div>
  <table>
    <thead><tr><th>Item</th><th>HSN</th><th style="text-align:right">Qty</th><th style="text-align:right">Base</th><th style="text-align:right">GST</th><th style="text-align:right">Total</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="totals">
    <div class="row"><span>Taxable value</span><span>${inr(inv.subtotalBase)}</span></div>
    <div class="row"><span>CGST</span><span>${inr(inv.totalCgst)}</span></div>
    <div class="row"><span>SGST</span><span>${inr(inv.totalSgst)}</span></div>
    <div class="row"><span>Total GST</span><span>${inr(inv.totalGst)}</span></div>
    <div class="row"><span>Delivery</span><span>${inv.delivery > 0 ? inr(inv.delivery) : "Free"}</span></div>
    <div class="row grand"><span>Grand total</span><span>${inr(inv.total)}</span></div>
  </div>
  <p class="muted" style="margin-top:24px">All storefront prices are inclusive of GST. This is a sample invoice format.</p>
  </body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
