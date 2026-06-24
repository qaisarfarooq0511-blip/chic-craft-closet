import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  getCoupons,
  upsertCoupon,
  deleteCoupon,
  getCategoriesStore,
  getProducts,
  type Coupon,
  type CouponDiscountType,
  type PaymentMode,
} from "@/lib/storage";
import { useToast } from "@/lib/toast";

export const Route = createFileRoute("/admin/coupons")({
  component: CouponsAdmin,
});

const PAYMENT_MODES: { id: PaymentMode; label: string }[] = [
  { id: "cod", label: "Cash on Delivery" },
  { id: "upi", label: "UPI" },
  { id: "card", label: "Credit / Debit Card" },
  { id: "netbanking", label: "Netbanking" },
  { id: "wallet", label: "Wallet" },
];

function toDateInput(ms: number) {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function fromDateInput(v: string, endOfDay = false) {
  const [y, m, d] = v.split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  if (endOfDay) dt.setHours(23, 59, 59, 999);
  return dt.getTime();
}

function blankCoupon(): Coupon {
  const now = Date.now();
  return {
    id: `cpn-${now}`,
    code: "",
    description: "",
    discountType: "percent",
    amount: 10,
    maxDiscountCap: null,
    minOrderValue: null,
    globalUsageLimit: null,
    perUserLimit: 1,
    usedCount: 0,
    includedCategories: [],
    excludedCategories: [],
    includedProductIds: [],
    excludedProductIds: [],
    paymentModes: [],
    startsAt: now,
    expiresAt: now + 30 * 24 * 60 * 60 * 1000,
    active: true,
    createdAt: now,
  };
}

function CouponsAdmin() {
  const toast = useToast();
  const [list, setList] = useState<Coupon[]>([]);
  const [editing, setEditing] = useState<Coupon | null>(null);

  const refresh = () => setList(getCoupons());
  useEffect(() => { refresh(); }, []);

  const onSave = (c: Coupon) => {
    const code = c.code.trim().toUpperCase();
    if (!code) { toast("Coupon code is required"); return; }
    if (c.expiresAt < c.startsAt) { toast("Expiry must be after issue date"); return; }
    if (c.discountType === "percent" && (c.amount <= 0 || c.amount > 100)) {
      toast("Percent must be between 1 and 100"); return;
    }
    if (c.discountType === "flat" && c.amount <= 0) { toast("Flat amount must be greater than 0"); return; }
    upsertCoupon({ ...c, code });
    setEditing(null);
    refresh();
    toast("Coupon saved");
  };

  const onDelete = (c: Coupon) => {
    if (!confirm(`Delete coupon ${c.code}?`)) return;
    deleteCoupon(c.id);
    refresh();
    toast("Coupon deleted");
  };

  return (
    <>
      <h1 className="admin-h1">Coupons</h1>
      <p className="admin-sub">Create and manage discount codes. Control eligibility by product, category, payment mode, and usage caps.</p>

      <div className="admin-card" style={{ display: "flex", justifyContent: "flex-end" }}>
        <button className="btn-ink" onClick={() => setEditing(blankCoupon())}>+ New coupon</button>
      </div>

      {list.length === 0 && (
        <div className="admin-card" style={{ textAlign: "center", padding: 40, color: "var(--ink3)" }}>
          No coupons yet. Create your first one.
        </div>
      )}

      {list.map((c) => {
        const expired = c.expiresAt < Date.now();
        const notYet = c.startsAt > Date.now();
        const live = c.active && !expired && !notYet;
        const statusLabel = !c.active ? "Disabled" : expired ? "Expired" : notYet ? "Scheduled" : "Live";
        const statusPill = !c.active || expired ? "rejected" : notYet ? "pending" : "approved";
        return (
          <div key={c.id} className="admin-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div className="serif" style={{ fontSize: 22, color: "var(--ink)", letterSpacing: 0.5 }}>{c.code}</div>
                <div style={{ fontSize: 12, color: "var(--ink2)", marginTop: 4, lineHeight: 1.7 }}>
                  {c.discountType === "percent"
                    ? `${c.amount}% off${c.maxDiscountCap ? ` · max ₹${c.maxDiscountCap}` : ""}`
                    : `Flat ₹${c.amount} off`}
                  {c.minOrderValue ? ` · min order ₹${c.minOrderValue}` : ""}
                  <br />
                  Valid {new Date(c.startsAt).toLocaleDateString()} — {new Date(c.expiresAt).toLocaleDateString()}
                  <br />
                  Used {c.usedCount}{c.globalUsageLimit ? ` / ${c.globalUsageLimit}` : ""}
                  {c.perUserLimit ? ` · ${c.perUserLimit} per user` : ""}
                </div>
                {c.description && (
                  <div style={{ fontSize: 12, color: "var(--ink3)", marginTop: 6, fontStyle: "italic" }}>{c.description}</div>
                )}
                <div style={{ marginTop: 8 }}>
                  <span className={`pill pill-${statusPill}`}>{statusLabel}</span>
                  {live && c.paymentModes.length > 0 && (
                    <span className="pill pill-live" style={{ marginLeft: 6 }}>
                      {c.paymentModes.length} payment mode{c.paymentModes.length === 1 ? "" : "s"}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="btn-outline" onClick={() => setEditing(c)}>Edit</button>
                <button className="btn-text-rust" onClick={() => onDelete(c)}>Delete</button>
              </div>
            </div>
          </div>
        );
      })}

      {editing && (
        <CouponEditor coupon={editing} onClose={() => setEditing(null)} onSave={onSave} />
      )}
    </>
  );
}

function CouponEditor({
  coupon,
  onClose,
  onSave,
}: {
  coupon: Coupon;
  onClose: () => void;
  onSave: (c: Coupon) => void;
}) {
  const [c, setC] = useState<Coupon>(coupon);
  const categories = useMemo(() => getCategoriesStore(), []);
  const products = useMemo(() => getProducts(), []);
  const [productQuery, setProductQuery] = useState("");

  const set = <K extends keyof Coupon>(k: K, v: Coupon[K]) => setC((p) => ({ ...p, [k]: v }));

  const toggleIn = <T,>(arr: T[], v: T): T[] => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const filteredProducts = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    if (!q) return products.slice(0, 12);
    return products.filter((p) => p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q)).slice(0, 30);
  }, [productQuery, products]);

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(28,20,16,.55)", display: "grid", placeItems: "center", padding: 16, zIndex: 100 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="admin-card"
        style={{ width: "100%", maxWidth: 640, maxHeight: "92vh", overflow: "auto", margin: 0 }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div className="cart-sum-title" style={{ marginBottom: 0 }}>{coupon.code ? `Edit ${coupon.code}` : "New coupon"}</div>
          <button onClick={onClose} className="btn-outline" style={{ padding: "4px 10px" }}>Close</button>
        </div>

        <Section title="Code & description">
          <Row>
            <Field label="Coupon code *">
              <input
                className="form-input"
                value={c.code}
                onChange={(e) => set("code", e.target.value.toUpperCase())}
                placeholder="FESTIVE20"
                maxLength={32}
              />
            </Field>
            <Field label="Status">
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--ink2)", height: 38 }}>
                <input type="checkbox" checked={c.active} onChange={(e) => set("active", e.target.checked)} />
                Active
              </label>
            </Field>
          </Row>
          <Field label="Description (internal)">
            <textarea
              className="form-input"
              value={c.description ?? ""}
              onChange={(e) => set("description", e.target.value)}
              rows={2}
              maxLength={200}
              placeholder="Diwali promo for festive collection"
            />
          </Field>
        </Section>

        <Section title="Discount">
          <Row>
            <Field label="Discount type">
              <select
                className="form-input"
                value={c.discountType}
                onChange={(e) => set("discountType", e.target.value as CouponDiscountType)}
              >
                <option value="percent">Percentage off</option>
                <option value="flat">Flat amount off</option>
              </select>
            </Field>
            <Field label={c.discountType === "percent" ? "Percent off (%)" : "Flat off (₹)"}>
              <input
                className="form-input"
                type="number"
                min={1}
                max={c.discountType === "percent" ? 100 : undefined}
                value={c.amount}
                onChange={(e) => set("amount", Number(e.target.value))}
              />
            </Field>
          </Row>
          <Row>
            {c.discountType === "percent" && (
              <Field label="Max discount cap (₹)">
                <input
                  className="form-input"
                  type="number"
                  min={0}
                  value={c.maxDiscountCap ?? ""}
                  onChange={(e) => set("maxDiscountCap", e.target.value === "" ? null : Number(e.target.value))}
                  placeholder="Optional"
                />
              </Field>
            )}
            <Field label="Min order value (₹)">
              <input
                className="form-input"
                type="number"
                min={0}
                value={c.minOrderValue ?? ""}
                onChange={(e) => set("minOrderValue", e.target.value === "" ? null : Number(e.target.value))}
                placeholder="Optional"
              />
            </Field>
          </Row>
        </Section>

        <Section title="Usage limits">
          <Row>
            <Field label="Global usage limit">
              <input
                className="form-input"
                type="number"
                min={0}
                value={c.globalUsageLimit ?? ""}
                onChange={(e) => set("globalUsageLimit", e.target.value === "" ? null : Number(e.target.value))}
                placeholder="Unlimited"
              />
            </Field>
            <Field label="Per user limit">
              <input
                className="form-input"
                type="number"
                min={0}
                value={c.perUserLimit ?? ""}
                onChange={(e) => set("perUserLimit", e.target.value === "" ? null : Number(e.target.value))}
                placeholder="Unlimited"
              />
            </Field>
          </Row>
        </Section>

        <Section title="Validity">
          <Row>
            <Field label="Issue date *">
              <input
                className="form-input"
                type="date"
                value={toDateInput(c.startsAt)}
                onChange={(e) => set("startsAt", fromDateInput(e.target.value, false))}
              />
            </Field>
            <Field label="Expiry date *">
              <input
                className="form-input"
                type="date"
                value={toDateInput(c.expiresAt)}
                onChange={(e) => set("expiresAt", fromDateInput(e.target.value, true))}
              />
            </Field>
          </Row>
        </Section>

        <Section title="Categories">
          <div style={{ fontSize: 11, color: "var(--ink3)", marginBottom: 8 }}>
            Leave both empty to allow all categories. Excluded wins over included.
          </div>
          <Field label="Included categories">
            <ChipGroup
              options={categories.map((cat) => ({ id: cat.name, label: cat.name }))}
              selected={c.includedCategories}
              onToggle={(id) => set("includedCategories", toggleIn(c.includedCategories, id))}
            />
          </Field>
          <Field label="Excluded categories">
            <ChipGroup
              options={categories.map((cat) => ({ id: cat.name, label: cat.name }))}
              selected={c.excludedCategories}
              onToggle={(id) => set("excludedCategories", toggleIn(c.excludedCategories, id))}
              tone="rust"
            />
          </Field>
        </Section>

        <Section title="Products">
          <div style={{ fontSize: 11, color: "var(--ink3)", marginBottom: 8 }}>
            Search products to include or exclude. Leave both empty to allow all.
          </div>
          <input
            className="form-input"
            placeholder="Search product by name or slug"
            value={productQuery}
            onChange={(e) => setProductQuery(e.target.value)}
            style={{ marginBottom: 8 }}
          />
          <div style={{ maxHeight: 180, overflow: "auto", border: "0.5px solid var(--b)", borderRadius: 6, padding: 8 }}>
            {filteredProducts.map((p) => {
              const inc = c.includedProductIds.includes(p.id);
              const exc = c.excludedProductIds.includes(p.id);
              return (
                <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", borderBottom: "0.5px solid var(--b)" }}>
                  <span style={{ fontSize: 12, color: "var(--ink2)" }}>{p.name} <span style={{ color: "var(--ink3)" }}>· {p.category}</span></span>
                  <span style={{ display: "flex", gap: 6 }}>
                    <button
                      type="button"
                      className={inc ? "btn-ink" : "btn-outline"}
                      style={{ padding: "2px 8px", fontSize: 11 }}
                      onClick={() => set("includedProductIds", toggleIn(c.includedProductIds, p.id))}
                    >
                      {inc ? "Included" : "Include"}
                    </button>
                    <button
                      type="button"
                      className={exc ? "btn-text-rust" : "btn-outline"}
                      style={{ padding: "2px 8px", fontSize: 11 }}
                      onClick={() => set("excludedProductIds", toggleIn(c.excludedProductIds, p.id))}
                    >
                      {exc ? "Excluded" : "Exclude"}
                    </button>
                  </span>
                </div>
              );
            })}
            {filteredProducts.length === 0 && (
              <div style={{ fontSize: 12, color: "var(--ink3)", padding: 8 }}>No products match.</div>
            )}
          </div>
          {(c.includedProductIds.length > 0 || c.excludedProductIds.length > 0) && (
            <div style={{ fontSize: 11, color: "var(--ink3)", marginTop: 8 }}>
              {c.includedProductIds.length} included · {c.excludedProductIds.length} excluded
            </div>
          )}
        </Section>

        <Section title="Payment modes">
          <div style={{ fontSize: 11, color: "var(--ink3)", marginBottom: 8 }}>
            Leave empty to allow all payment modes.
          </div>
          <ChipGroup
            options={PAYMENT_MODES.map((p) => ({ id: p.id, label: p.label }))}
            selected={c.paymentModes}
            onToggle={(id) => set("paymentModes", toggleIn(c.paymentModes, id as PaymentMode))}
          />
        </Section>

        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <button className="cta-primary" onClick={() => onSave(c)}>Save coupon</button>
          <button className="btn-outline" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 14, paddingTop: 14, borderTop: "0.5px solid var(--b)" }}>
      <div className="form-label" style={{ textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>{children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="form-field">
      <label className="form-label">{label}</label>
      {children}
    </div>
  );
}

function ChipGroup({
  options,
  selected,
  onToggle,
  tone = "ink",
}: {
  options: { id: string; label: string }[];
  selected: string[];
  onToggle: (id: string) => void;
  tone?: "ink" | "rust";
}) {
  if (options.length === 0) {
    return <div style={{ fontSize: 12, color: "var(--ink3)" }}>None available.</div>;
  }
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {options.map((o) => {
        const active = selected.includes(o.id);
        const cls = active ? (tone === "rust" ? "btn-text-rust" : "btn-ink") : "btn-outline";
        return (
          <button
            key={o.id}
            type="button"
            className={cls}
            style={{ padding: "4px 10px", fontSize: 12 }}
            onClick={() => onToggle(o.id)}
          >
            {active ? "✓ " : ""}{o.label}
          </button>
        );
      })}
    </div>
  );
}
