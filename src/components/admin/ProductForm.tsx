import { useEffect, useState } from "react";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { supabase } from "@/lib/supabase";
import { useCategories } from "@/hooks/useCategories";
import { useAdminProduct } from "@/hooks/useAdminProduct";
import { useToast } from "@/lib/toast";
import { slugify } from "@/lib/types";
import { CloudinaryImageUploader, type ProductImageDraft } from "./CloudinaryImageUploader";

const BADGES = ["", "New in", "Bestseller", "Sale", "Limited"];

interface PieceRow {
  id?: string;
  piece_name: string;
  length: string;
  width: string;
  weight: string;
}
interface IncludeRow {
  id?: string;
  description: string;
}

interface FormState {
  name: string;
  subtitle: string;
  categoryId: string;
  price: string; // rupees, as typed
  comparePrice: string;
  badge: string;
  description: string;
  fabric: string;
  embroidery: string;
  care: string;
  isUnstitched: boolean;
  stockCount: string;
  status: "draft" | "active";
  pieces: PieceRow[];
  includes: IncludeRow[];
  images: ProductImageDraft[];
}

const emptyForm: FormState = {
  name: "",
  subtitle: "",
  categoryId: "",
  price: "",
  comparePrice: "",
  badge: "",
  description: "",
  fabric: "",
  embroidery: "",
  care: "",
  isUnstitched: false,
  stockCount: "0",
  status: "draft",
  pieces: [{ piece_name: "", length: "", width: "", weight: "" }],
  includes: [],
  images: [],
};

async function generateUniqueSlug(base: string): Promise<string> {
  const root = slugify(base) || "product";
  for (let attempt = 0; attempt < 6; attempt++) {
    const candidate = attempt === 0 ? root : `${root}-${attempt + 1}`;
    const { data } = await supabase
      .from("products")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (!data) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}

interface Props {
  productId?: string; // undefined = create mode
  onSaved: () => void;
  submitLabel: string;
}

export function ProductForm({ productId, onSaved, submitLabel }: Props) {
  const toast = useToast();
  const { data: categories = [] } = useCategories();
  const { data: existing, isLoading: loadingExisting } = useAdminProduct(productId);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!existing) return;
    setForm({
      name: existing.name,
      subtitle: existing.subtitle ?? "",
      categoryId: existing.category_id,
      price: String(existing.price / 100),
      comparePrice: existing.compare_price ? String(existing.compare_price / 100) : "",
      badge: existing.badge ?? "",
      description: existing.description ?? "",
      fabric: existing.fabric ?? "",
      embroidery: existing.embroidery ?? "",
      care: existing.care ?? "",
      isUnstitched: existing.is_unstitched,
      stockCount: String(existing.stock_count),
      status: existing.status === "archived" ? "draft" : existing.status,
      pieces: existing.pieces.length
        ? existing.pieces.map((p) => ({
            id: p.id,
            piece_name: p.piece_name,
            length: p.length ?? "",
            width: p.width ?? "",
            weight: p.weight ?? "",
          }))
        : [{ piece_name: "", length: "", width: "", weight: "" }],
      includes: existing.includes.map((i) => ({ id: i.id, description: i.description })),
      images: existing.images.map((i) => ({
        id: i.id,
        cloudinary_id: i.cloudinary_id ?? "",
        storage_path: i.storage_path,
        is_primary: i.is_primary,
        sort_order: i.sort_order,
      })),
    });
  }, [existing]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const addPiece = () => {
    if (form.pieces.length >= 3) return;
    set("pieces", [...form.pieces, { piece_name: "", length: "", width: "", weight: "" }]);
  };
  const updatePiece = (i: number, patch: Partial<PieceRow>) =>
    set(
      "pieces",
      form.pieces.map((p, idx) => (idx === i ? { ...p, ...patch } : p)),
    );
  const removePiece = (i: number) =>
    set(
      "pieces",
      form.pieces.filter((_, idx) => idx !== i),
    );

  const addInclude = () => set("includes", [...form.includes, { description: "" }]);
  const updateInclude = (i: number, description: string) =>
    set(
      "includes",
      form.includes.map((inc, idx) => (idx === i ? { ...inc, description } : inc)),
    );
  const removeInclude = (i: number) =>
    set(
      "includes",
      form.includes.filter((_, idx) => idx !== i),
    );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!form.categoryId) {
      setError("Category is required.");
      return;
    }
    const priceNum = Math.round(parseFloat(form.price || "0") * 100);
    if (!priceNum || priceNum <= 0) {
      setError("Enter a valid price.");
      return;
    }
    const comparePriceNum = form.comparePrice.trim()
      ? Math.round(parseFloat(form.comparePrice) * 100)
      : null;
    if (comparePriceNum !== null && comparePriceNum <= priceNum) {
      setError("Compare-at price must be higher than the price.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        subtitle: form.subtitle.trim() || null,
        category_id: form.categoryId,
        price: priceNum,
        compare_price: comparePriceNum,
        badge: form.badge || null,
        description: form.description.trim() || null,
        fabric: form.fabric.trim() || null,
        embroidery: form.embroidery.trim() || null,
        care: form.care.trim() || null,
        is_unstitched: form.isUnstitched,
        stock_count: parseInt(form.stockCount, 10) || 0,
        status: form.status,
      };

      let id = productId;
      if (!id) {
        const slug = await generateUniqueSlug(form.name);
        const { data, error } = await supabase
          .from("products")
          .insert({ ...payload, slug })
          .select("id")
          .single();
        if (error) throw error;
        id = data.id;
      } else {
        const { error } = await supabase.from("products").update(payload).eq("id", id);
        if (error) throw error;
      }

      // --- pieces: delete removed, update existing, insert new ---
      const keepPieceIds = form.pieces.filter((p) => p.id).map((p) => p.id as string);
      const removedPieceIds = (existing?.pieces ?? [])
        .map((p) => p.id)
        .filter((pid) => !keepPieceIds.includes(pid));
      if (removedPieceIds.length) {
        await supabase
          .from("product_pieces")
          .update({ deleted_at: new Date().toISOString() })
          .in("id", removedPieceIds);
      }
      for (const [i, p] of form.pieces.entries()) {
        if (!p.piece_name.trim()) continue;
        const row = {
          piece_name: p.piece_name.trim(),
          length: p.length.trim() || null,
          width: p.width.trim() || null,
          weight: p.weight.trim() || null,
          piece_order: i + 1,
        };
        if (p.id) await supabase.from("product_pieces").update(row).eq("id", p.id);
        else await supabase.from("product_pieces").insert({ ...row, product_id: id });
      }

      // --- includes: delete removed, update existing, insert new ---
      const keepIncludeIds = form.includes.filter((i) => i.id).map((i) => i.id as string);
      const removedIncludeIds = (existing?.includes ?? [])
        .map((i) => i.id)
        .filter((iid) => !keepIncludeIds.includes(iid));
      if (removedIncludeIds.length) {
        await supabase
          .from("product_includes")
          .update({ deleted_at: new Date().toISOString() })
          .in("id", removedIncludeIds);
      }
      for (const [i, inc] of form.includes.entries()) {
        if (!inc.description.trim()) continue;
        const row = { description: inc.description.trim(), sort_order: i };
        if (inc.id) await supabase.from("product_includes").update(row).eq("id", inc.id);
        else await supabase.from("product_includes").insert({ ...row, product_id: id });
      }

      // --- images: delete removed, update existing (primary/order), insert new ---
      const keepImageIds = form.images.filter((img) => img.id).map((img) => img.id as string);
      const removedImageIds = (existing?.images ?? [])
        .map((img) => img.id)
        .filter((iid) => !keepImageIds.includes(iid));
      if (removedImageIds.length) {
        await supabase
          .from("product_images")
          .update({ deleted_at: new Date().toISOString() })
          .in("id", removedImageIds);
      }
      for (const [i, img] of form.images.entries()) {
        const row = {
          cloudinary_id: img.cloudinary_id,
          storage_path: img.storage_path,
          is_primary: img.is_primary,
          sort_order: i,
        };
        if (img.id) await supabase.from("product_images").update(row).eq("id", img.id);
        else await supabase.from("product_images").insert({ ...row, product_id: id });
      }

      toast(productId ? "Changes saved" : "Product created");
      onSaved();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to save product");
    } finally {
      setSaving(false);
    }
  };

  if (productId && loadingExisting) return <p style={{ color: "var(--ink3)" }}>Loading…</p>;

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 20, maxWidth: 720 }}>
      <div className="admin-card">
        <div className="form-field">
          <label className="form-label">Name *</label>
          <input
            className="form-input"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            required
          />
        </div>
        <div className="form-field">
          <label className="form-label">Subtitle</label>
          <input
            className="form-input"
            value={form.subtitle}
            onChange={(e) => set("subtitle", e.target.value)}
          />
        </div>
        <div className="form-field">
          <label className="form-label">Category *</label>
          <select
            className="form-input"
            value={form.categoryId}
            onChange={(e) => set("categoryId", e.target.value)}
            required
          >
            <option value="">Select a category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="form-field">
            <label className="form-label">Price (₹) *</label>
            <input
              className="form-input"
              type="number"
              min="0"
              step="1"
              value={form.price}
              onChange={(e) => set("price", e.target.value)}
              required
            />
          </div>
          <div className="form-field">
            <label className="form-label">Compare-at price (₹)</label>
            <input
              className="form-input"
              type="number"
              min="0"
              step="1"
              value={form.comparePrice}
              onChange={(e) => set("comparePrice", e.target.value)}
              placeholder="Optional — shown as strikethrough"
            />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="form-field">
            <label className="form-label">Badge</label>
            <select
              className="form-input"
              value={form.badge}
              onChange={(e) => set("badge", e.target.value)}
            >
              {BADGES.map((b) => (
                <option key={b} value={b}>
                  {b || "None"}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label className="form-label">Stock count</label>
            <input
              className="form-input"
              type="number"
              min="0"
              step="1"
              value={form.stockCount}
              onChange={(e) => set("stockCount", e.target.value)}
            />
          </div>
        </div>
        <div className="form-field">
          <label className="form-label">Description</label>
          <textarea
            className="form-textarea"
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <div className="form-field">
            <label className="form-label">Fabric</label>
            <input
              className="form-input"
              value={form.fabric}
              onChange={(e) => set("fabric", e.target.value)}
            />
          </div>
          <div className="form-field">
            <label className="form-label">Embroidery</label>
            <input
              className="form-input"
              value={form.embroidery}
              onChange={(e) => set("embroidery", e.target.value)}
            />
          </div>
          <div className="form-field">
            <label className="form-label">Care</label>
            <input
              className="form-input"
              value={form.care}
              onChange={(e) => set("care", e.target.value)}
            />
          </div>
        </div>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            color: "var(--ink2)",
            marginTop: 4,
          }}
        >
          <input
            type="checkbox"
            checked={form.isUnstitched}
            onChange={(e) => set("isUnstitched", e.target.checked)}
          />
          Unstitched (dimensions below are fabric cut lengths)
        </label>
        <div className="form-field" style={{ marginTop: 10 }}>
          <label className="form-label">Status</label>
          <select
            className="form-input"
            value={form.status}
            onChange={(e) => set("status", e.target.value as "draft" | "active")}
          >
            <option value="draft">Draft (hidden from storefront)</option>
            <option value="active">Active (live on storefront)</option>
          </select>
        </div>
      </div>

      <div className="admin-card">
        <div className="cart-sum-title" style={{ marginBottom: 10 }}>
          Pieces &amp; dimensions
        </div>
        {form.pieces.map((p, i) => (
          <div
            key={p.id ?? i}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr 1fr auto",
              gap: 8,
              marginBottom: 10,
              alignItems: "end",
            }}
          >
            <div className="form-field" style={{ margin: 0 }}>
              <label className="form-label">Piece {i + 1} name</label>
              <input
                className="form-input"
                value={p.piece_name}
                onChange={(e) => updatePiece(i, { piece_name: e.target.value })}
                placeholder="e.g. Shawl, Top"
              />
            </div>
            <div className="form-field" style={{ margin: 0 }}>
              <label className="form-label">Length</label>
              <input
                className="form-input"
                value={p.length}
                onChange={(e) => updatePiece(i, { length: e.target.value })}
                placeholder="2.5 m"
              />
            </div>
            <div className="form-field" style={{ margin: 0 }}>
              <label className="form-label">Width</label>
              <input
                className="form-input"
                value={p.width}
                onChange={(e) => updatePiece(i, { width: e.target.value })}
                placeholder="1 m"
              />
            </div>
            <div className="form-field" style={{ margin: 0 }}>
              <label className="form-label">Weight</label>
              <input
                className="form-input"
                value={p.weight}
                onChange={(e) => updatePiece(i, { weight: e.target.value })}
                placeholder="180 g"
              />
            </div>
            <button
              type="button"
              className="btn-text-rust"
              onClick={() => removePiece(i)}
              aria-label="Remove piece"
              style={{ marginBottom: 10 }}
            >
              <IconTrash size={16} />
            </button>
          </div>
        ))}
        {form.pieces.length < 3 && (
          <button
            type="button"
            className="btn-outline"
            onClick={addPiece}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <IconPlus size={14} /> Add piece
          </button>
        )}
      </div>

      <div className="admin-card">
        <div className="cart-sum-title" style={{ marginBottom: 10 }}>
          What's in the package
        </div>
        {form.includes.map((inc, i) => (
          <div key={inc.id ?? i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input
              className="form-input"
              value={inc.description}
              onChange={(e) => updateInclude(i, e.target.value)}
              placeholder="e.g. Top fabric — 3 m × 1 m"
            />
            <button
              type="button"
              className="btn-text-rust"
              onClick={() => removeInclude(i)}
              aria-label="Remove item"
            >
              <IconTrash size={16} />
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn-outline"
          onClick={addInclude}
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <IconPlus size={14} /> Add item
        </button>
      </div>

      <div className="admin-card">
        <CloudinaryImageUploader value={form.images} onChange={(images) => set("images", images)} />
      </div>

      {error && (
        <div
          style={{
            color: "#b91c1c",
            fontSize: 13,
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 6,
            padding: "10px 12px",
          }}
        >
          {error}
        </div>
      )}
      <button type="submit" className="btn-ink" disabled={saving} style={{ justifySelf: "start" }}>
        {saving ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
