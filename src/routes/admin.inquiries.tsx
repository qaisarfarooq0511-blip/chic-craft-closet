import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { IconEye, IconPencil, IconBrandWhatsapp, IconX } from "@tabler/icons-react";
import { getInquiries, updateInquiry, getConfig } from "@/lib/storage";
import { normalizeMobile } from "@/lib/user-auth";
import { fmt } from "@/components/storefront/ProductCard";
import { useToast } from "@/lib/toast";
import type { Inquiry, InquiryFulfillment, InquiryCancellation } from "@/lib/types";

export const Route = createFileRoute("/admin/inquiries")({
  validateSearch: (s: Record<string, unknown>) => ({
    phone: typeof s.phone === "string" ? s.phone : undefined,
    name: typeof s.name === "string" ? s.name : undefined,
  }),
  component: InquiriesAdmin,
});

type ModalState =
  | { kind: "view"; inquiry: Inquiry }
  | { kind: "fulfill"; inquiry: Inquiry }
  | { kind: "cancel"; inquiry: Inquiry }
  | null;

function InquiriesAdmin() {
  const { phone, name } = Route.useSearch();
  const [, force] = useState(0);
  const [modal, setModal] = useState<ModalState>(null);
  const toast = useToast();

  // Filters
  const [fOrderId, setFOrderId] = useState("");
  const [fDateFrom, setFDateFrom] = useState("");
  const [fDateTo, setFDateTo] = useState("");
  const [fProduct, setFProduct] = useState("");
  const [fStatus, setFStatus] = useState<string>("");
  const [fSource, setFSource] = useState<string>("");
  const [fMin, setFMin] = useState("");
  const [fMax, setFMax] = useState("");

  const all = typeof window !== "undefined" ? getInquiries() : [];
  const base = useMemo(() => (
    phone ? all.filter((i) => normalizeMobile(i.customer.phone) === normalizeMobile(phone)) : all
  ), [all, phone]);

  const sources = useMemo(() => {
    const s = new Set<string>();
    base.forEach((i) => { if (i.source) s.add(i.source); });
    return Array.from(s).sort();
  }, [base]);

  const list = useMemo(() => {
    const fromTs = fDateFrom ? new Date(fDateFrom + "T00:00:00").getTime() : null;
    const toTs = fDateTo ? new Date(fDateTo + "T23:59:59").getTime() : null;
    const min = fMin !== "" && Number.isFinite(Number(fMin)) ? Number(fMin) : null;
    const max = fMax !== "" && Number.isFinite(Number(fMax)) ? Number(fMax) : null;
    const oid = fOrderId.trim().toLowerCase();
    const prod = fProduct.trim().toLowerCase();
    return base.filter((i) => {
      if (oid && !i.id.toLowerCase().includes(oid)) return false;
      if (fromTs !== null && i.createdAt < fromTs) return false;
      if (toTs !== null && i.createdAt > toTs) return false;
      if (prod && !i.lines.some((l) => l.name.toLowerCase().includes(prod))) return false;
      if (fStatus && i.status !== fStatus) return false;
      if (fSource && (i.source ?? "") !== fSource) return false;
      if (min !== null && i.total < min) return false;
      if (max !== null && i.total > max) return false;
      return true;
    });
  }, [base, fOrderId, fDateFrom, fDateTo, fProduct, fStatus, fSource, fMin, fMax]);

  const activeFilters = !!(fOrderId || fDateFrom || fDateTo || fProduct || fStatus || fSource || fMin || fMax);
  const clearFilters = () => {
    setFOrderId(""); setFDateFrom(""); setFDateTo(""); setFProduct("");
    setFStatus(""); setFSource(""); setFMin(""); setFMax("");
  };

  const refresh = () => force((n) => n + 1);

  const saveInquiry = (i: Inquiry) => { updateInquiry(i); refresh(); };

  const onFulfill = (inquiry: Inquiry, data: InquiryFulfillment) => {
    saveInquiry({ ...inquiry, status: "fulfilled", fulfillment: data });
    toast(`Order ${inquiry.id} marked fulfilled`);
    setModal(null);
  };

  const onCancel = (inquiry: Inquiry, data: InquiryCancellation) => {
    saveInquiry({ ...inquiry, status: "cancelled", cancellation: data });
    toast(`Order ${inquiry.id} cancelled`);
    setModal(null);
  };

  return (
    <>
      <h1 className="admin-h1">Orders</h1>
      <p className="admin-sub">Order ledger with fulfillment and cancellation workflows.</p>

      {phone && (
        <div className="admin-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div style={{ fontSize: 13, color: "var(--ink2)" }}>
            Filtered by customer{name ? `: ${name}` : ""} ({phone}) — {base.length} order{base.length === 1 ? "" : "s"}
          </div>
          <Link to="/admin/inquiries" className="btn-outline">Clear customer filter</Link>
        </div>
      )}

      {base.length > 0 && (
        <div className="admin-card" style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
            <FilterField label="Order ID">
              <input className="form-input" value={fOrderId} onChange={(e) => setFOrderId(e.target.value)} placeholder="e.g. INQ-…" />
            </FilterField>
            <FilterField label="Date from">
              <input className="form-input" type="date" value={fDateFrom} onChange={(e) => setFDateFrom(e.target.value)} />
            </FilterField>
            <FilterField label="Date to">
              <input className="form-input" type="date" value={fDateTo} onChange={(e) => setFDateTo(e.target.value)} />
            </FilterField>
            <FilterField label="Product title">
              <input className="form-input" value={fProduct} onChange={(e) => setFProduct(e.target.value)} placeholder="Contains…" />
            </FilterField>
            <FilterField label="Status">
              <select className="form-select" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
                <option value="">All</option>
                <option value="new">new</option>
                <option value="contacted">contacted</option>
                <option value="fulfilled">fulfilled</option>
                <option value="cancelled">cancelled</option>
              </select>
            </FilterField>
            <FilterField label="Source">
              <select className="form-select" value={fSource} onChange={(e) => setFSource(e.target.value)}>
                <option value="">All</option>
                {sources.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </FilterField>
            <FilterField label="Final ≥ (₹)">
              <input className="form-input" type="number" min={0} value={fMin} onChange={(e) => setFMin(e.target.value)} />
            </FilterField>
            <FilterField label="Final ≤ (₹)">
              <input className="form-input" type="number" min={0} value={fMax} onChange={(e) => setFMax(e.target.value)} />
            </FilterField>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "var(--ink3)" }}>
            <span>Showing {list.length} of {base.length} order{base.length === 1 ? "" : "s"}</span>
            {activeFilters && (
              <button type="button" className="btn-outline" onClick={clearFilters}>Clear filters</button>
            )}
          </div>
        </div>
      )}

      {list.length === 0 ? (
        <div className="admin-card" style={{ textAlign: "center", padding: 40, color: "var(--ink3)" }}>
          {base.length === 0 ? "No orders yet." : "No orders match the current filters."}
        </div>
      ) : (
        <div className="admin-card" style={{ padding: 0, overflowX: "auto" }}>
          <table className="orders-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Date</th>
                <th>Items</th>
                <th style={{ textAlign: "right" }}>MRP</th>
                <th style={{ textAlign: "right" }}>Sale</th>
                <th style={{ textAlign: "right" }}>Discount</th>
                <th style={{ textAlign: "right" }}>Final</th>
                <th>Source</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((i) => {
                const mrpTotal = i.mrpTotal ?? i.lines.reduce((s, l) => s + (l.mrp ?? l.price) * l.qty, 0);
                const discount = i.discount ?? Math.max(0, mrpTotal - i.subtotal);
                const totalQty = i.lines.reduce((s, l) => s + l.qty, 0);
                return (
                  <tr key={i.id}>
                    <td style={{ fontFamily: "monospace", fontSize: 11 }}>{i.id}</td>
                    <td style={{ fontSize: 12 }}>{new Date(i.createdAt).toLocaleString()}</td>
                    <td style={{ fontSize: 12, maxWidth: 280 }}>
                      <div style={{ color: "var(--ink2)" }}>
                        {i.lines.slice(0, 2).map((l) => `${l.name} ×${l.qty}`).join(", ")}
                        {i.lines.length > 2 && ` +${i.lines.length - 2} more`}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--ink3)", marginTop: 2 }}>
                        {i.lines.length} item{i.lines.length === 1 ? "" : "s"} · {totalQty} qty
                      </div>
                    </td>
                    <td style={{ textAlign: "right", fontSize: 12 }}>{fmt(mrpTotal)}</td>
                    <td style={{ textAlign: "right", fontSize: 12 }}>{fmt(i.subtotal)}</td>
                    <td style={{ textAlign: "right", fontSize: 12, color: discount > 0 ? "var(--rust)" : "var(--ink3)" }}>
                      {discount > 0 ? `−${fmt(discount)}` : "—"}
                      {i.couponCode && <div style={{ fontSize: 9, color: "var(--ink3)" }}>{i.couponCode}</div>}
                    </td>
                    <td style={{ textAlign: "right", fontSize: 13, fontWeight: 600 }}>{fmt(i.total)}</td>
                    <td style={{ fontSize: 11, color: "var(--ink3)", textTransform: "capitalize" }}>{i.source ?? "—"}</td>
                    <td>
                      <StatusPill status={i.status} />
                    </td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <button className="icon-btn" title="View" onClick={() => setModal({ kind: "view", inquiry: i })}>
                        <IconEye size={16} />
                      </button>
                      {i.status !== "cancelled" && i.status !== "fulfilled" && (
                        <button className="icon-btn" title="Fulfill / edit" onClick={() => setModal({ kind: "fulfill", inquiry: i })}>
                          <IconPencil size={16} />
                        </button>
                      )}
                      <a
                        className="icon-btn"
                        href={`https://wa.me/${i.customer.phone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        title="WhatsApp customer"
                      >
                        <IconBrandWhatsapp size={16} />
                      </a>
                      {i.status !== "cancelled" && i.status !== "fulfilled" && (
                        <button className="icon-btn icon-btn-danger" title="Cancel order" onClick={() => setModal({ kind: "cancel", inquiry: i })}>
                          <IconX size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modal?.kind === "view" && (
        <ViewModal inquiry={modal.inquiry} onClose={() => setModal(null)} />
      )}
      {modal?.kind === "fulfill" && (
        <FulfillModal
          inquiry={modal.inquiry}
          onClose={() => setModal(null)}
          onSubmit={(data) => onFulfill(modal.inquiry, data)}
        />
      )}
      {modal?.kind === "cancel" && (
        <CancelModal
          inquiry={modal.inquiry}
          onClose={() => setModal(null)}
          onSubmit={(data) => onCancel(modal.inquiry, data)}
        />
      )}

      <OrdersTableStyles />
    </>
  );
}

function StatusPill({ status }: { status: Inquiry["status"] }) {
  const cls =
    status === "new" ? "pill-pending"
    : status === "fulfilled" ? "pill-approved"
    : status === "cancelled" ? "pill-rejected"
    : "pill-live";
  return <span className={`pill ${cls}`}>{status}</span>;
}

/* ──────────── Modal shell ──────────── */
function Modal({ title, onClose, children, maxWidth = 560 }: { title: string; onClose: () => void; children: React.ReactNode; maxWidth?: number }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(28,20,16,0.5)", zIndex: 1000,
        display: "grid", placeItems: "center", padding: 16, overflowY: "auto",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="admin-card"
        style={{ width: "100%", maxWidth, margin: 0, maxHeight: "90vh", overflowY: "auto" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div className="serif" style={{ fontSize: 20, color: "var(--ink)" }}>{title}</div>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><IconX size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ──────────── View Modal ──────────── */
function ViewModal({ inquiry, onClose }: { inquiry: Inquiry; onClose: () => void }) {
  const mrpTotal = inquiry.mrpTotal ?? inquiry.lines.reduce((s, l) => s + (l.mrp ?? l.price) * l.qty, 0);
  const discount = inquiry.discount ?? Math.max(0, mrpTotal - inquiry.subtotal);

  return (
    <Modal title={`Order ${inquiry.id}`} onClose={onClose} maxWidth={620}>
      <div style={{ fontSize: 12, color: "var(--ink3)", marginBottom: 14 }}>
        Placed {new Date(inquiry.createdAt).toLocaleString()} · <StatusPill status={inquiry.status} /> · Source: <span style={{ textTransform: "capitalize" }}>{inquiry.source ?? "—"}</span>
      </div>

      <SectionTitle>Customer</SectionTitle>
      <div style={{ fontSize: 13, color: "var(--ink2)", lineHeight: 1.7, marginBottom: 16 }}>
        <strong style={{ color: "var(--ink)" }}>{inquiry.customer.name}</strong><br />
        {inquiry.customer.phone}<br />
        {inquiry.customer.address}, {inquiry.customer.city} — {inquiry.customer.pincode}
        {inquiry.customer.notes && <><br /><em style={{ color: "var(--ink3)" }}>Note: {inquiry.customer.notes}</em></>}
      </div>

      <SectionTitle>Items</SectionTitle>
      <table className="orders-table" style={{ marginBottom: 16 }}>
        <thead>
          <tr><th>Item</th><th style={{ textAlign: "right" }}>Qty</th><th style={{ textAlign: "right" }}>MRP</th><th style={{ textAlign: "right" }}>Sale</th><th style={{ textAlign: "right" }}>Subtotal</th></tr>
        </thead>
        <tbody>
          {inquiry.lines.map((l) => (
            <tr key={l.productId}>
              <td style={{ fontSize: 12 }}>{l.name}</td>
              <td style={{ textAlign: "right", fontSize: 12 }}>{l.qty}</td>
              <td style={{ textAlign: "right", fontSize: 12 }}>{fmt((l.mrp ?? l.price))}</td>
              <td style={{ textAlign: "right", fontSize: 12 }}>{fmt(l.price)}</td>
              <td style={{ textAlign: "right", fontSize: 12 }}>{fmt(l.price * l.qty)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ borderTop: "0.5px solid var(--b)", paddingTop: 12, display: "grid", gap: 6, fontSize: 13 }}>
        <Row label="MRP total" value={fmt(mrpTotal)} />
        {discount > 0 && <Row label={`Discount${inquiry.couponCode ? ` (${inquiry.couponCode})` : ""}`} value={`−${fmt(discount)}`} color="var(--rust)" />}
        <Row label="Subtotal" value={fmt(inquiry.subtotal)} />
        <Row label="Delivery" value={inquiry.delivery === 0 ? "Free" : fmt(inquiry.delivery)} />
        <Row label="Final total" value={fmt(inquiry.total)} bold />
      </div>

      {inquiry.fulfillment && (
        <>
          <SectionTitle style={{ marginTop: 18 }}>Fulfillment</SectionTitle>
          <div style={{ fontSize: 12, color: "var(--ink2)", lineHeight: 1.8 }}>
            <div><strong>Partner:</strong> {inquiry.fulfillment.partner}</div>
            <div><strong>AWB:</strong> {inquiry.fulfillment.awb}</div>
            <div><strong>Shipping cost:</strong> {fmt(inquiry.fulfillment.shippingCost)}</div>
            <div><strong>Expected delivery:</strong> {inquiry.fulfillment.expectedDelivery}</div>
            {inquiry.fulfillment.trackingLink && (
              <div><strong>Tracking:</strong> <a href={inquiry.fulfillment.trackingLink} target="_blank" rel="noreferrer" style={{ color: "var(--gold)" }}>{inquiry.fulfillment.trackingLink}</a></div>
            )}
            <div style={{ color: "var(--ink3)", fontSize: 11 }}>Fulfilled {new Date(inquiry.fulfillment.fulfilledAt).toLocaleString()}</div>
          </div>
        </>
      )}

      {inquiry.cancellation && (
        <>
          <SectionTitle style={{ marginTop: 18 }}>Cancellation</SectionTitle>
          <div style={{ fontSize: 12, color: "var(--ink2)", lineHeight: 1.8 }}>
            <div><strong>Reason:</strong> {inquiry.cancellation.reason}</div>
            {inquiry.cancellation.note && <div><strong>Note:</strong> {inquiry.cancellation.note}</div>}
            <div style={{ color: "var(--ink3)", fontSize: 11 }}>Cancelled {new Date(inquiry.cancellation.cancelledAt).toLocaleString()}</div>
          </div>
        </>
      )}
    </Modal>
  );
}

function Row({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: bold ? 600 : 400, color: color ?? "var(--ink2)" }}>
      <span>{label}</span><span>{value}</span>
    </div>
  );
}

function SectionTitle({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div className="form-label" style={{ marginBottom: 8, ...style }}>{children}</div>
  );
}

/* ──────────── Fulfill Modal ──────────── */
function FulfillModal({ inquiry, onClose, onSubmit }: { inquiry: Inquiry; onClose: () => void; onSubmit: (d: InquiryFulfillment) => void }) {
  const cfg = getConfig();
  const partners = cfg.shippingPartners;
  const existing = inquiry.fulfillment;
  const [partner, setPartner] = useState(existing?.partner ?? partners[0] ?? "");
  const [awb, setAwb] = useState(existing?.awb ?? "");
  const [shippingCost, setShippingCost] = useState<string>(existing ? String(existing.shippingCost) : "");
  const [expectedDelivery, setExpectedDelivery] = useState(existing?.expectedDelivery ?? "");
  const [trackingLink, setTrackingLink] = useState(existing?.trackingLink ?? "");
  const [err, setErr] = useState<string | null>(null);
  const toast = useToast();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partner) return setErr("Select a shipping partner.");
    if (!awb.trim()) return setErr("AWB / tracking number is required.");
    const cost = Number(shippingCost);
    if (!Number.isFinite(cost) || cost < 0) return setErr("Enter a valid shipping cost.");
    if (!expectedDelivery) return setErr("Expected delivery date is required.");
    setErr(null);
    onSubmit({
      partner,
      awb: awb.trim(),
      shippingCost: cost,
      expectedDelivery,
      trackingLink: trackingLink.trim() || undefined,
      fulfilledAt: Date.now(),
    });
  };

  if (partners.length === 0) {
    return (
      <Modal title={`Fulfill ${inquiry.id}`} onClose={onClose}>
        <p style={{ fontSize: 13, color: "var(--ink2)", marginBottom: 14 }}>
          No shipping partners configured yet.
        </p>
        <Link to="/admin/config" className="btn-ink" onClick={() => { toast("Add partners under Configuration"); }}>
          Go to Configuration
        </Link>
      </Modal>
    );
  }

  return (
    <Modal title={`Mark ${inquiry.id} fulfilled`} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="form-field">
          <label className="form-label">Shipping partner *</label>
          <select className="form-select" value={partner} onChange={(e) => setPartner(e.target.value)}>
            {partners.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="form-field">
          <label className="form-label">AWB / tracking number *</label>
          <input className="form-input" value={awb} onChange={(e) => setAwb(e.target.value)} />
        </div>
        <div className="form-field">
          <label className="form-label">Shipping cost incurred (₹) *</label>
          <input className="form-input" type="number" min={0} step="0.01" value={shippingCost} onChange={(e) => setShippingCost(e.target.value)} />
        </div>
        <div className="form-field">
          <label className="form-label">Expected delivery date *</label>
          <input className="form-input" type="date" value={expectedDelivery} onChange={(e) => setExpectedDelivery(e.target.value)} />
        </div>
        <div className="form-field">
          <label className="form-label">Tracking link</label>
          <input className="form-input" type="url" placeholder="https://…" value={trackingLink} onChange={(e) => setTrackingLink(e.target.value)} />
        </div>
        {err && <div style={{ color: "var(--rust)", fontSize: 12, marginBottom: 10 }}>{err}</div>}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button type="button" className="btn-outline" onClick={onClose}>Close</button>
          <button type="submit" className="btn-ink">Mark fulfilled</button>
        </div>
      </form>
    </Modal>
  );
}

/* ──────────── Cancel Modal ──────────── */
function CancelModal({ inquiry, onClose, onSubmit }: { inquiry: Inquiry; onClose: () => void; onSubmit: (d: InquiryCancellation) => void }) {
  const cfg = getConfig();
  const reasons = cfg.cancellationReasons;
  const [reason, setReason] = useState(reasons[0] ?? "");
  const [note, setNote] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const proceed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) return setErr("Select a cancellation reason.");
    setErr(null);
    setConfirming(true);
  };

  const confirmCancel = () => {
    onSubmit({ reason, note: note.trim() || undefined, cancelledAt: Date.now() });
  };

  if (reasons.length === 0) {
    return (
      <Modal title={`Cancel ${inquiry.id}`} onClose={onClose}>
        <p style={{ fontSize: 13, color: "var(--ink2)", marginBottom: 14 }}>
          No cancellation reasons configured. Add them under <Link to="/admin/config" style={{ color: "var(--gold)" }}>Configuration</Link>.
        </p>
      </Modal>
    );
  }

  if (confirming) {
    return (
      <Modal title="Confirm cancellation" onClose={() => setConfirming(false)}>
        <p style={{ fontSize: 13, color: "var(--ink2)", marginBottom: 16, lineHeight: 1.6 }}>
          You're about to cancel <strong>{inquiry.id}</strong> for <strong>{inquiry.customer.name}</strong> ({fmt(inquiry.total)}).
          Reason: <em>{reason}</em>.
          <br /><br />This cannot be undone. Continue?
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button type="button" className="btn-outline" onClick={() => setConfirming(false)}>Go back</button>
          <button type="button" className="btn-ink" style={{ background: "var(--rust)" }} onClick={confirmCancel}>Yes, cancel order</button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={`Cancel ${inquiry.id}`} onClose={onClose}>
      <form onSubmit={proceed}>
        <div className="form-field">
          <label className="form-label">Cancellation reason *</label>
          <select className="form-select" value={reason} onChange={(e) => setReason(e.target.value)}>
            {reasons.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div className="form-field">
          <label className="form-label">Internal note (optional)</label>
          <textarea className="form-textarea" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Any additional context for the team…" />
        </div>
        {err && <div style={{ color: "var(--rust)", fontSize: 12, marginBottom: 10 }}>{err}</div>}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button type="button" className="btn-outline" onClick={onClose}>Close</button>
          <button type="submit" className="btn-ink" style={{ background: "var(--rust)" }}>Continue</button>
        </div>
      </form>
    </Modal>
  );
}

/* ──────────── Inline styles for the orders table ──────────── */
function OrdersTableStyles() {
  return (
    <style>{`
      .orders-table { width: 100%; border-collapse: collapse; }
      .orders-table thead th {
        text-align: left;
        font-size: 10px;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: var(--ink3);
        padding: 12px 14px;
        border-bottom: 0.5px solid var(--b);
        background: var(--cream2);
        white-space: nowrap;
      }
      .orders-table tbody td {
        padding: 12px 14px;
        border-bottom: 0.5px solid var(--b);
        color: var(--ink2);
        vertical-align: top;
      }
      .orders-table tbody tr:last-child td { border-bottom: none; }
      .orders-table tbody tr:hover { background: var(--cream2); }
      .icon-btn {
        background: none;
        border: 0.5px solid var(--b);
        color: var(--ink2);
        width: 28px; height: 28px;
        display: inline-flex; align-items: center; justify-content: center;
        border-radius: var(--r);
        cursor: pointer;
        margin-left: 4px;
        transition: background .15s, color .15s, border-color .15s;
      }
      .icon-btn:hover { background: var(--ink); color: var(--cream); border-color: var(--ink); }
      .icon-btn-danger:hover { background: var(--rust); border-color: var(--rust); }
    `}</style>
  );
}
