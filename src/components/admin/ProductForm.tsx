import { useEffect, useState } from "react";
import { ImageUploader } from "./ImageUploader";
import { getCategoriesStore } from "@/lib/storage";
import { type Product, type ProductItem, type ProductFlag, slugify } from "@/lib/types";
import { useToast } from "@/lib/toast";

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

export function ProductForm({ initial, onSave, submitLabel }: Props) {
  const [p, setP] = useState<Product>({ ...initial, mainImageIndex: initial.mainImageIndex ?? 0, tags: initial.tags ?? [], flags: initial.flags ?? [] });
  const toast = useToast();
  const [cats, setCats] = useState(getCategoriesStore());

  useEffect(() => { setP({ ...initial, mainImageIndex: initial.mainImageIndex ?? 0, tags: initial.tags ?? [], flags: initial.flags ?? [] }); }, [initial]);
  useEffect(() => {
    const refresh = () => setCats(getCategoriesStore());
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

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!p.name.trim()) { toast("Please add a product name"); return; }
    if (p.price <= 0) { toast("Please set a sale price"); return; }
    // If a non-zero main image is selected, swap it to index 0 so the
    // storefront's "first image" rendering picks it up.
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
              <option value="New in">New in</option>
              <option value="Bestseller">Bestseller</option>
              <option value="Sale">Sale</option>
              <option value="Limited">Limited</option>
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
          <label className="form-label">Tags (comma-separated)</label>
          <input
            className="form-input"
            value={(p.tags ?? []).join(", ")}
            onChange={(e) => set("tags", e.target.value.split(",").map((t) => t.trim()).filter(Boolean))}
            placeholder="pashmina, ivory, festive"
          />
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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
          <div className="form-field"><label className="form-label">Fabric</label><input className="form-input" value={p.fabric} onChange={(e) => set("fabric", e.target.value)} /></div>
          <div className="form-field"><label className="form-label">Embroidery</label><input className="form-input" value={p.embroidery} onChange={(e) => set("embroidery", e.target.value)} /></div>
          <div className="form-field"><label className="form-label">Care</label><input className="form-input" value={p.care} onChange={(e) => set("care", e.target.value)} /></div>
        </div>
      </div>

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
