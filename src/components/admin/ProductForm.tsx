import { useEffect, useMemo, useState } from "react";
import { ImageUploader } from "./ImageUploader";
import { getCategoriesStore, getConfig, computeTaxBreakup } from "@/lib/storage";
import { type Product, type ProductItem, type ProductFlag, slugify } from "@/lib/types";
import { useToast } from "@/lib/toast";
import { Link } from "@tanstack/react-router";


interface Props {
  initial: Product;
  onSave: (p: Product) => void;
  submitLabel: string;
}

const FLAGS: { value: ProductFlag; label: string }[] = [
  { value: "new", label: "New In" },
  { value: "trending", label: "Trending" },
  { value: "featured", label: "Featured" },
];

const splitCSV = (s: string): string[] =>
  s ? s.split(/,\s*/).map((x) => x.trim()).filter(Boolean) : [];

function MultiChip({
  options,
  selected,
  onChange,
}: {
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (v: string) => {
    onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  };
  if (options.length === 0) {
    return (
      <p style={{ fontSize: 11, color: "var(--ink3)" }}>
        No options yet — add some in <Link to="/admin/config" style={{ textDecoration: "underline" }}>Configuration</Link>.
      </p>
    );
  }
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {options.map((v) => {
        const on = selected.includes(v);
        return (
          <button
            key={v}
            type="button"
            onClick={() => toggle(v)}
            className={on ? "btn-ink" : "btn-outline"}
            style={{ fontSize: 11, padding: "5px 10px" }}
          >
            {on ? "✓ " : ""}{v}
          </button>
        );
      })}
    </div>
  );
}

export function ProductForm({ initial, onSave, submitLabel }: Props) {
  const [p, setP] = useState<Product>({ ...initial, mainImageIndex: initial.mainImageIndex ?? 0, tags: initial.tags ?? [], flags: initial.flags ?? [], sizes: initial.sizes ?? [], faqs: initial.faqs ?? [] });
  const toast = useToast();
  const [cats, setCats] = useState(getCategoriesStore());
  const [config, setConfig] = useState(getConfig());

  useEffect(() => { setP({ ...initial, mainImageIndex: initial.mainImageIndex ?? 0, tags: initial.tags ?? [], flags: initial.flags ?? [], sizes: initial.sizes ?? [], faqs: initial.faqs ?? [] }); }, [initial]);
  useEffect(() => {
    const refresh = () => { setCats(getCategoriesStore()); setConfig(getConfig()); };
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, []);

  const set = <K extends keyof Product>(k: K, v: Product[K]) => setP((x) => ({ ...x, [k]: v }));

  const updateItem = (i: number, patch: Partial<ProductItem>) =>
    setP((x) => ({ ...x, items: x.items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)) }));
  const addItem = () => setP((x) => ({ ...x, items: [...x.items, { name: "", length: "", width: "", weight: "" }] }));
  const removeItem = (i: number) => setP((x) => ({ ...x, items: x.items.filter((_, idx) => idx !== i) }));

  const toggleFlag = (f: ProductFlag) => {
    const have = p.flags?.includes(f);
    set("flags", have ? p.flags!.filter((x) => x !== f) : [...(p.flags ?? []), f]);
  };

  // Multi-select state derived from existing comma-joined fields
  const fabricList = splitCSV(p.fabric);
  const embroideryList = splitCSV(p.embroidery);
  const careList = splitCSV(p.care);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!p.name.trim()) { toast("Please add a product name"); return; }
    if (p.price <= 0) { toast("Please set a sale price"); return; }
    let images = p.images;
    if ((p.mainImageIndex ?? 0) > 0 && images.length > 1) {
      const idx = p.mainImageIndex!;
      images = [images[idx], ...images.filter((_, i) => i !== idx)];
    }
    onSave({
      ...p,
      images,
      mainImageIndex: 0,
      slug: `${slugify(p.name)}-${p.id}`,
      pieces: p.items.length || 1,
    });
  };

  return (
    <form onSubmit={submit}>
      <div className="admin-card">
        <div className="cart-sum-title" style={{ marginBottom: 14 }}>Basics</div>
        <div className="form-field"><label className="form-label">Title *</label>
          <input className="form-input" value={p.name} onChange={(e) => set("name", e.target.value)} required />
        </div>
        <div className="form-field"><label className="form-label">Subtitle</label>
          <input className="form-input" value={p.subtitle ?? ""} onChange={(e) => set("subtitle", e.target.value)} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div className="form-field"><label className="form-label">Category *</label>
            <select className="form-select" value={p.category} onChange={(e) => set("category", e.target.value)}>
              {cats.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-field"><label className="form-label">Type</label>
            <input className="form-input" value={p.type} onChange={(e) => set("type", e.target.value)} placeholder="e.g. Chikankari, Pashmina" />
          </div>
        </div>
        <div className="form-field"><label className="form-label">Description</label>
          <textarea className="form-textarea" value={p.desc} onChange={(e) => set("desc", e.target.value)} rows={4} />
        </div>
        <div className="form-field">
          <label className="form-label">TL;DR / short summary <span style={{ color: "var(--ink3)", fontWeight: 400 }}>(1–2 sentences, used by AI search engines &amp; shown above the description)</span></label>
          <textarea
            className="form-textarea"
            rows={2}
            value={p.tldr ?? ""}
            onChange={(e) => set("tldr", e.target.value)}
            placeholder="e.g. Ivory pure pashmina shawl with hand-done sozni embroidery, woven in Kashmir."
          />
        </div>
        <div className="form-field">
          <label className="form-label">Highlight note (golden box on product page)</label>
          <textarea
            className="form-textarea"
            value={p.note ?? ""}
            rows={2}
            onChange={(e) => set("note", e.target.value)}
            placeholder='e.g. "This is an unstitched set. Dimensions below show fabric cut lengths — take these to your tailor for stitching."'
          />
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--ink2)" }}>
          <input type="checkbox" checked={p.listed} onChange={(e) => set("listed", e.target.checked)} /> Listed (visible on storefront)
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--ink2)", marginTop: 8 }}>
          <input type="checkbox" checked={p.isUnstitched} onChange={(e) => set("isUnstitched", e.target.checked)} /> Unstitched (tailor callout)
        </label>
      </div>

      <div className="admin-card">
        <div className="cart-sum-title" style={{ marginBottom: 14 }}>Pricing &amp; inventory</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
          <div className="form-field"><label className="form-label">MRP (₹)</label>
            <input className="form-input" type="number" min="0" value={p.was ?? ""} onChange={(e) => set("was", e.target.value ? Number(e.target.value) : null)} placeholder="Optional"/>
          </div>
          <div className="form-field"><label className="form-label">Sale price (₹) *</label>
            <input className="form-input" type="number" min="0" value={p.price} onChange={(e) => set("price", Number(e.target.value))} required />
          </div>
          <div className="form-field"><label className="form-label">Stock *</label>
            <input className="form-input" type="number" min="0" value={p.stock} onChange={(e) => set("stock", Number(e.target.value))} />
          </div>
          <div className="form-field"><label className="form-label">Average rating (0–5)</label>
            <input className="form-input" type="number" min="0" max="5" step="0.1" value={p.rating} onChange={(e) => set("rating", Number(e.target.value))} />
          </div>
          <div className="form-field"><label className="form-label">Number of reviews</label>
            <input className="form-input" type="number" min="0" value={p.reviewsCount} onChange={(e) => set("reviewsCount", Number(e.target.value))} />
          </div>
          <div className="form-field"><label className="form-label">Corner badge</label>
            <select className="form-select" value={p.badge ?? ""} onChange={(e) => set("badge", e.target.value || null)}>
              <option value="">No badge</option>
              {config.badges.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
        </div>

        <div className="form-field" style={{ marginTop: 10 }}>
          <label className="form-label">Flags (used by rule-based homepage sections)</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {FLAGS.map((f) => {
              const on = p.flags?.includes(f.value);
              return (
                <button key={f.value} type="button" onClick={() => toggleFlag(f.value)}
                  className={on ? "btn-ink" : "btn-outline"}
                  style={{ fontSize: 11 }}>
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="form-field">
          <label className="form-label">Tags (multi-select)</label>
          <MultiChip options={config.tags} selected={p.tags ?? []} onChange={(v) => set("tags", v)} />
        </div>
        <div className="form-field">
          <label className="form-label">Sizes (multi-select — leave blank if not applicable)</label>
          <MultiChip options={config.sizes} selected={p.sizes ?? []} onChange={(v) => set("sizes", v)} />
          <p style={{ fontSize: 11, color: "var(--ink3)", marginTop: 4 }}>
            If sizes are selected, customers must pick one before adding to bag.
          </p>
        </div>
      </div>

      <div className="admin-card">
        <ImageUploader
          value={p.images}
          onChange={(imgs) => set("images", imgs)}
          mainIndex={p.mainImageIndex ?? 0}
          onMainIndexChange={(i) => set("mainImageIndex", i)}
          max={5}
          target="product"
        />
      </div>

      <div className="admin-card">
        <div className="cart-sum-title" style={{ marginBottom: 14 }}>Fabric &amp; care</div>
        <div className="form-field">
          <label className="form-label">Fabric (multi-select)</label>
          <MultiChip options={config.fabrics} selected={fabricList} onChange={(v) => set("fabric", v.join(", "))} />
        </div>
        <div className="form-field">
          <label className="form-label">Embroidery (multi-select)</label>
          <MultiChip options={config.embroideries} selected={embroideryList} onChange={(v) => set("embroidery", v.join(", "))} />
        </div>
        <div className="form-field">
          <label className="form-label">Care (multi-select)</label>
          <MultiChip options={config.careOptions} selected={careList} onChange={(v) => set("care", v.join(", "))} />
        </div>
      </div>

      <TaxSection
        price={p.price}
        hsnCode={p.hsnCode ?? null}
        hsnCodes={config.hsnCodes}
        onChange={(code) => set("hsnCode", code)}
      />


      <div className="admin-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div className="cart-sum-title" style={{ marginBottom: 0 }}>Pieces &amp; dimensions</div>
          <button type="button" className="btn-outline" onClick={addItem}>+ Add piece</button>
        </div>
        {p.items.map((it, i) => (
          <div key={i} style={{ border: "0.5px solid var(--b)", borderRadius: 8, padding: 12, marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <div className="form-label">Piece {i + 1}</div>
              {p.items.length > 1 && <button type="button" className="btn-text-rust" onClick={() => removeItem(i)}>Remove</button>}
            </div>
            <div className="form-field"><input className="form-input" placeholder="Name (e.g. Top / Shawl)" value={it.name} onChange={(e) => updateItem(i, { name: e.target.value })} /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <input className="form-input" placeholder="Length" value={it.length} onChange={(e) => updateItem(i, { length: e.target.value })} />
              <input className="form-input" placeholder="Width" value={it.width} onChange={(e) => updateItem(i, { width: e.target.value })} />
              <input className="form-input" placeholder="Weight" value={it.weight} onChange={(e) => updateItem(i, { weight: e.target.value })} />
            </div>
          </div>
        ))}
      </div>

      <div className="admin-card">
        <div className="cart-sum-title" style={{ marginBottom: 14 }}>What's in the package</div>
        <textarea
          className="form-textarea"
          rows={4}
          value={p.includes.join("\n")}
          onChange={(e) => set("includes", e.target.value.split("\n").map((l) => l.trim()).filter(Boolean))}
          placeholder={"One item per line, e.g.:\n1 × Pashmina shawl\nYaawun branded gift box"}
        />
      </div>

      <button type="submit" className="cta-primary">{submitLabel}</button>
    </form>
  );
}

function TaxSection({
  price,
  hsnCode,
  hsnCodes,
  onChange,
}: {
  price: number;
  hsnCode: string | null;
  hsnCodes: { code: string; description?: string; gstRate: number }[];
  onChange: (code: string | null) => void;
}) {
  const selected = hsnCodes.find((h) => h.code === hsnCode) ?? null;
  const breakup = useMemo(
    () => (selected && price > 0 ? computeTaxBreakup(price, selected.gstRate) : null),
    [selected, price],
  );
  return (
    <div className="admin-card">
      <div className="cart-sum-title" style={{ marginBottom: 4 }}>Tax information</div>
      <p style={{ fontSize: 11, color: "var(--ink3)", marginBottom: 12 }}>
        Sale price is treated as <strong>inclusive of GST</strong>. The tax breakup below is for your records and the customer invoice — it is never shown on storefront pricing.
      </p>
      <div className="form-field">
        <label className="form-label">HSN code</label>
        <select
          className="form-select"
          value={hsnCode ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
        >
          <option value="">— Select HSN code —</option>
          {hsnCodes.map((h) => (
            <option key={h.code} value={h.code}>
              {h.code} — {h.description ?? "—"} ({h.gstRate}% GST)
            </option>
          ))}
        </select>
        {hsnCodes.length === 0 && (
          <p style={{ fontSize: 11, color: "var(--ink3)", marginTop: 4 }}>
            No HSN codes yet — add them in <Link to="/admin/config" style={{ textDecoration: "underline" }}>Configuration</Link>.
          </p>
        )}
      </div>
      {breakup && (
        <div style={{ background: "var(--cream)", borderRadius: 8, padding: 12, fontSize: 12, color: "var(--ink2)", display: "grid", gap: 4 }}>
          <Row label={`Taxable value (base)`} value={`₹${breakup.base.toFixed(2)}`} />
          <Row label={`CGST @ ${(breakup.rate / 2).toFixed(2)}%`} value={`₹${breakup.cgst.toFixed(2)}`} />
          <Row label={`SGST @ ${(breakup.rate / 2).toFixed(2)}%`} value={`₹${breakup.sgst.toFixed(2)}`} />
          <Row label={`Total GST (${breakup.rate}%)`} value={`₹${breakup.gst.toFixed(2)}`} />
          <div style={{ borderTop: "1px solid var(--line)", marginTop: 4, paddingTop: 4 }}>
            <Row label="Price (inclusive)" value={`₹${breakup.total.toFixed(2)}`} bold />
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: bold ? 600 : 400 }}>
      <span>{label}</span><span>{value}</span>
    </div>
  );
}

