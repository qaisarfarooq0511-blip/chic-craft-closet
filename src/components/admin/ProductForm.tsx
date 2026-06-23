import { useEffect, useState, type ChangeEvent } from "react";
import { IconUpload, IconX } from "@tabler/icons-react";
import { processImage } from "@/lib/image-processor";
import { CATEGORIES, type Category, type Product, type ProductItem, slugify } from "@/lib/types";
import { useToast } from "@/lib/toast";

interface Props {
  initial: Product;
  onSave: (p: Product) => void;
  submitLabel: string;
}

export function ProductForm({ initial, onSave, submitLabel }: Props) {
  const [p, setP] = useState<Product>(initial);
  const [processing, setProcessing] = useState(false);
  const toast = useToast();

  useEffect(() => { setP(initial); }, [initial]);

  const set = <K extends keyof Product>(k: K, v: Product[K]) => setP((x) => ({ ...x, [k]: v }));

  const onFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setProcessing(true);
    try {
      const processed = await Promise.all(files.map((f) => processImage(f, { maxSize: 900, quality: 0.82, square: true })));
      setP((x) => ({ ...x, images: [...x.images, ...processed] }));
      toast(`${processed.length} image${processed.length > 1 ? "s" : ""} enhanced & added`);
    } catch (err) {
      console.error(err);
      toast("Image processing failed");
    } finally {
      setProcessing(false);
      e.target.value = "";
    }
  };

  const removeImage = (i: number) => setP((x) => ({ ...x, images: x.images.filter((_, idx) => idx !== i) }));

  const updateItem = (i: number, patch: Partial<ProductItem>) =>
    setP((x) => ({ ...x, items: x.items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)) }));

  const addItem = () =>
    setP((x) => ({ ...x, items: [...x.items, { name: "", length: "", width: "", weight: "" }] }));

  const removeItem = (i: number) =>
    setP((x) => ({ ...x, items: x.items.filter((_, idx) => idx !== i) }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!p.name.trim()) { toast("Please add a product name"); return; }
    if (p.price <= 0) { toast("Please set a price"); return; }
    onSave({ ...p, slug: `${slugify(p.name)}-${p.id}`, pieces: p.items.length || 1 });
  };

  return (
    <form onSubmit={submit}>
      <div className="admin-card">
        <div className="cart-sum-title" style={{ marginBottom: 14 }}>Basics</div>
        <div className="form-field"><label className="form-label">Name *</label>
          <input className="form-input" value={p.name} onChange={(e) => set("name", e.target.value)} required />
        </div>
        <div className="form-field"><label className="form-label">Subtitle</label>
          <input className="form-input" value={p.subtitle ?? ""} onChange={(e) => set("subtitle", e.target.value)} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div className="form-field"><label className="form-label">Category *</label>
            <select className="form-select" value={p.category} onChange={(e) => set("category", e.target.value as Category)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-field"><label className="form-label">Type</label>
            <input className="form-input" value={p.type} onChange={(e) => set("type", e.target.value)} placeholder="e.g. Chikankari, Pashmina" />
          </div>
          <div className="form-field"><label className="form-label">Price (₹) *</label>
            <input className="form-input" type="number" min="0" value={p.price} onChange={(e) => set("price", Number(e.target.value))} required />
          </div>
          <div className="form-field"><label className="form-label">Was price (₹)</label>
            <input className="form-input" type="number" min="0" value={p.was ?? ""} onChange={(e) => set("was", e.target.value ? Number(e.target.value) : null)} />
          </div>
          <div className="form-field"><label className="form-label">Stock *</label>
            <input className="form-input" type="number" min="0" value={p.stock} onChange={(e) => set("stock", Number(e.target.value))} />
          </div>
          <div className="form-field"><label className="form-label">Badge (optional)</label>
            <select className="form-select" value={p.badge ?? ""} onChange={(e) => set("badge", e.target.value || null)}>
              <option value="">No badge</option>
              <option value="New in">New in</option>
              <option value="Bestseller">Bestseller</option>
              <option value="Sale">Sale</option>
              <option value="Limited">Limited</option>
            </select>
          </div>
        </div>
        <div className="form-field"><label className="form-label">Description</label>
          <textarea className="form-textarea" value={p.desc} onChange={(e) => set("desc", e.target.value)} rows={4} />
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--ink2)" }}>
          <input type="checkbox" checked={p.listed} onChange={(e) => set("listed", e.target.checked)} /> Listed (visible on storefront)
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--ink2)", marginTop: 8 }}>
          <input type="checkbox" checked={p.isUnstitched} onChange={(e) => set("isUnstitched", e.target.checked)} /> Unstitched (show tailor callout)
        </label>
      </div>

      <div className="admin-card">
        <div className="cart-sum-title" style={{ marginBottom: 14 }}>Photos</div>
        <p style={{ fontSize: 11, color: "var(--ink3)", marginBottom: 10 }}>
          Upload phone photos — we'll auto-crop to square, balance lighting, and convert to WebP. First image is the main one.
        </p>
        <label className="image-uploader">
          <IconUpload />
          <div style={{ fontSize: 13, color: "var(--ink2)", marginBottom: 4 }}>{processing ? "Processing…" : "Click to upload photos"}</div>
          <div className="image-uploader-hint">JPG, PNG, HEIC up to 10MB each</div>
          <input type="file" accept="image/*" multiple onChange={onFiles} style={{ display: "none" }} disabled={processing} />
        </label>
        {p.images.length > 0 && (
          <div className="image-thumbs">
            {p.images.map((src, i) => (
              <div key={i} className="image-thumb">
                <img src={src} alt={`Product ${i + 1}`} />
                <button type="button" className="image-thumb-x" onClick={() => removeImage(i)} aria-label="Remove"><IconX /></button>
              </div>
            ))}
          </div>
        )}
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

      <button type="submit" className="cta-primary" disabled={processing}>{submitLabel}</button>
    </form>
  );
}
