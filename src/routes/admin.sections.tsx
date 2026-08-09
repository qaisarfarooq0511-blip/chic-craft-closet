import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  IconTrash,
  IconArrowUp,
  IconArrowDown,
  IconEye,
  IconEyeOff,
  IconX,
} from "@tabler/icons-react";
import { supabase } from "@/lib/supabase";
import { useBadgeOptions } from "@/hooks/useBadgeOptions";
import { useCategories } from "@/hooks/useCategories";
import { useProductSearch, SEARCH_MIN_LENGTH } from "@/hooks/useProductSearch";
import { productImageUrl } from "@/lib/product-images";
import { useToast } from "@/lib/toast";
import type { Section, SectionMode } from "@/types/database";

export const Route = createFileRoute("/admin/sections")({
  component: SectionsAdmin,
});

const MODE_LABELS: Record<SectionMode, string> = {
  manual: "Manual picks",
  category: "By category",
  badge: "By badge",
};

async function fetchAdminSections(): Promise<Section[]> {
  const { data, error } = await supabase
    .from("sections")
    .select("*")
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

function SectionsAdmin() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data: sections = [], isLoading } = useQuery({
    queryKey: ["admin-sections"],
    queryFn: fetchAdminSections,
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-sections"] });
  const invalidateHome = () => queryClient.invalidateQueries({ queryKey: ["home-sections"] });

  const addSection = async () => {
    const nextSortOrder =
      sections.length === 0 ? 1 : Math.max(...sections.map((s) => s.sort_order)) + 1;
    const { data, error } = await supabase
      .from("sections")
      .insert({ title: "New section", mode: "manual", max_products: 8, sort_order: nextSortOrder })
      .select("id")
      .single();
    if (error) {
      toast(error.message);
      return;
    }
    invalidate();
    setEditingId(data.id);
  };

  const toggleActive = async (id: string, is_active: boolean) => {
    const { error } = await supabase.from("sections").update({ is_active }).eq("id", id);
    if (error) {
      toast(error.message);
      return;
    }
    invalidate();
    invalidateHome();
  };

  const move = async (id: string, dir: -1 | 1) => {
    const idx = sections.findIndex((s) => s.id === id);
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= sections.length) return;
    const current = sections[idx];
    const target = sections[targetIdx];
    const [err1, err2] = await Promise.all([
      supabase.from("sections").update({ sort_order: target.sort_order }).eq("id", current.id),
      supabase.from("sections").update({ sort_order: current.sort_order }).eq("id", target.id),
    ]).then((results) => results.map((r) => r.error));
    if (err1 || err2) toast((err1 ?? err2)!.message);
    invalidate();
    invalidateHome();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this section?")) return;
    const { error } = await supabase
      .from("sections")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast(error.message);
      return;
    }
    invalidate();
    invalidateHome();
    toast("Section deleted");
  };

  const editingSection = sections.find((s) => s.id === editingId) ?? null;

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div>
          <h1 className="admin-h1">Homepage sections</h1>
          <p className="admin-sub">
            Manage product strips on your homepage. Changes go live immediately.
          </p>
        </div>
        <button className="btn-ink" onClick={addSection}>
          + Add section
        </button>
      </div>

      {isLoading && (
        <div
          className="admin-card"
          style={{ textAlign: "center", padding: 40, color: "var(--ink3)" }}
        >
          Loading…
        </div>
      )}

      {!isLoading &&
        sections.map((s, idx) => (
          <div key={s.id} className="admin-card">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 10,
              }}
            >
              <div>
                <div style={{ fontSize: 16, fontWeight: 500 }}>{s.title}</div>
                <div style={{ fontSize: 12, color: "var(--ink3)", marginTop: 2 }}>
                  {MODE_LABELS[s.mode]}
                  {s.rule_value ? ` — ${s.rule_value}` : ""} · max {s.max_products}
                </div>
              </div>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <button
                  className="btn-text-ink"
                  onClick={() => toggleActive(s.id, !s.is_active)}
                  title={s.is_active ? "Hide from homepage" : "Show on homepage"}
                >
                  {s.is_active ? <IconEye size={16} /> : <IconEyeOff size={16} />}
                </button>
                <button
                  className="btn-text-ink"
                  disabled={idx === 0}
                  onClick={() => move(s.id, -1)}
                  title="Move up"
                >
                  <IconArrowUp size={16} />
                </button>
                <button
                  className="btn-text-ink"
                  disabled={idx === sections.length - 1}
                  onClick={() => move(s.id, 1)}
                  title="Move down"
                >
                  <IconArrowDown size={16} />
                </button>
                <button className="btn-outline" onClick={() => setEditingId(s.id)}>
                  Edit
                </button>
                <button className="btn-text-rust" onClick={() => remove(s.id)}>
                  <IconTrash size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}

      {!isLoading && sections.length === 0 && (
        <div
          className="admin-card"
          style={{ textAlign: "center", color: "var(--ink3)", padding: 40 }}
        >
          No sections yet. Click "+ Add section" to start.
        </div>
      )}

      {editingSection && (
        <SectionModal section={editingSection} onClose={() => setEditingId(null)} />
      )}
    </>
  );
}

function SectionModal({ section, onClose }: { section: Section; onClose: () => void }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data: badgeOptions = [] } = useBadgeOptions();
  const { data: categories = [] } = useCategories();

  const [title, setTitle] = useState(section.title);
  const [subtitle, setSubtitle] = useState(section.subtitle ?? "");
  const [mode, setMode] = useState<SectionMode>(section.mode);
  const [ruleValue, setRuleValue] = useState(section.rule_value ?? "");
  const [maxProducts, setMaxProducts] = useState(String(section.max_products));
  const [isActive, setIsActive] = useState(section.is_active);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const save = async () => {
    if (!title.trim()) {
      setErr("Title is required.");
      return;
    }
    setSaving(true);
    const payload = {
      title: title.trim(),
      subtitle: subtitle.trim() || null,
      mode,
      rule_value: mode === "manual" ? null : ruleValue || null,
      max_products: Math.max(1, parseInt(maxProducts, 10) || 8),
      is_active: isActive,
    };
    const { error } = await supabase.from("sections").update(payload).eq("id", section.id);
    setSaving(false);
    if (error) {
      setErr(error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["admin-sections"] });
    queryClient.invalidateQueries({ queryKey: ["home-sections"] });
    toast("Section saved");
    onClose();
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(28,20,16,.55)",
        display: "grid",
        placeItems: "center",
        padding: 16,
        zIndex: 100,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="admin-card"
        style={{ width: "100%", maxWidth: 560, maxHeight: "90vh", overflow: "auto", margin: 0 }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
          }}
        >
          <div className="cart-sum-title" style={{ marginBottom: 0 }}>
            Edit section
          </div>
          <button onClick={onClose} className="btn-outline" style={{ padding: "4px 10px" }}>
            Close
          </button>
        </div>

        <div className="form-field">
          <label className="form-label">Title</label>
          <input className="form-input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="form-field">
          <label className="form-label">Subtitle (optional)</label>
          <input
            className="form-input"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 10 }}>
          <div className="form-field">
            <label className="form-label">Source</label>
            <select
              className="form-select"
              value={mode}
              onChange={(e) => {
                setMode(e.target.value as SectionMode);
                setRuleValue("");
              }}
            >
              <option value="badge">By badge</option>
              <option value="category">By category</option>
              <option value="manual">Manual picks</option>
            </select>
          </div>
          <div className="form-field">
            <label className="form-label">Max products</label>
            <input
              className="form-input"
              type="number"
              min={1}
              max={24}
              value={maxProducts}
              onChange={(e) => setMaxProducts(e.target.value)}
            />
          </div>
        </div>

        {mode === "badge" && (
          <div className="form-field">
            <label className="form-label">Badge</label>
            <select
              className="form-select"
              value={ruleValue}
              onChange={(e) => setRuleValue(e.target.value)}
            >
              <option value="">Select a badge</option>
              {badgeOptions.map((b) => (
                <option key={b.id} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {mode === "category" && (
          <div className="form-field">
            <label className="form-label">Category</label>
            <select
              className="form-select"
              value={ruleValue}
              onChange={(e) => setRuleValue(e.target.value)}
            >
              <option value="">Select a category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            color: "var(--ink2)",
            margin: "10px 0 14px",
          }}
        >
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          Active (visible on homepage)
        </label>

        {err && <div style={{ color: "var(--rust)", fontSize: 12, marginBottom: 10 }}>{err}</div>}

        <button
          type="button"
          className="cta-primary"
          onClick={save}
          disabled={saving}
          style={{ marginBottom: mode === "manual" ? 18 : 0 }}
        >
          {saving ? "Saving…" : "Save"}
        </button>

        {mode === "manual" && <ManualProductPicker sectionId={section.id} />}
      </div>
    </div>
  );
}

interface SectionProductRow {
  id: string;
  product_id: string;
  sort_order: number;
  name: string;
  imageUrl: string | null;
}

async function fetchSectionProducts(sectionId: string): Promise<SectionProductRow[]> {
  const { data, error } = await supabase
    .from("section_products")
    .select(
      "id, product_id, sort_order, product:products(name, images:product_images(storage_path, is_primary))",
    )
    .eq("section_id", sectionId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => {
    const product = row.product as unknown as {
      name: string;
      images: { storage_path: string; is_primary: boolean }[] | null;
    } | null;
    const images = product?.images ?? [];
    const primary = images.find((i) => i.is_primary) ?? images[0];
    return {
      id: row.id as string,
      product_id: row.product_id as string,
      sort_order: row.sort_order as number,
      name: product?.name ?? "Unknown product",
      imageUrl: primary ? productImageUrl(primary) : null,
    };
  });
}

function ManualProductPicker({ sectionId }: { sectionId: string }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [term, setTerm] = useState("");
  const { results, isLoading: searching } = useProductSearch(term);
  const { data: picked = [], isLoading } = useQuery({
    queryKey: ["section-products", sectionId],
    queryFn: () => fetchSectionProducts(sectionId),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["section-products", sectionId] });
    queryClient.invalidateQueries({ queryKey: ["home-sections"] });
  };

  const pickedIds = new Set(picked.map((p) => p.product_id));

  const add = async (productId: string) => {
    if (pickedIds.has(productId)) return;
    const nextSortOrder =
      picked.length === 0 ? 0 : Math.max(...picked.map((p) => p.sort_order)) + 1;
    const { error } = await supabase
      .from("section_products")
      .insert({ section_id: sectionId, product_id: productId, sort_order: nextSortOrder });
    if (error) {
      toast(error.message);
      return;
    }
    setTerm("");
    invalidate();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("section_products").delete().eq("id", id);
    if (error) {
      toast(error.message);
      return;
    }
    invalidate();
  };

  const move = async (id: string, dir: -1 | 1) => {
    const idx = picked.findIndex((p) => p.id === id);
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= picked.length) return;
    const current = picked[idx];
    const target = picked[targetIdx];
    const [err1, err2] = await Promise.all([
      supabase
        .from("section_products")
        .update({ sort_order: target.sort_order })
        .eq("id", current.id),
      supabase
        .from("section_products")
        .update({ sort_order: current.sort_order })
        .eq("id", target.id),
    ]).then((results) => results.map((r) => r.error));
    if (err1 || err2) toast((err1 ?? err2)!.message);
    invalidate();
  };

  return (
    <div style={{ borderTop: "0.5px solid var(--b)", paddingTop: 14 }}>
      <div className="form-label" style={{ marginBottom: 8 }}>
        Products in this section ({picked.length})
      </div>
      <input
        className="form-input"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder="Search products by name…"
        style={{ marginBottom: 8 }}
      />
      {term.trim().length >= SEARCH_MIN_LENGTH && (
        <div
          style={{
            border: "0.5px solid var(--b)",
            borderRadius: 8,
            marginBottom: 12,
            maxHeight: 160,
            overflowY: "auto",
          }}
        >
          {searching && (
            <div style={{ padding: 10, fontSize: 12, color: "var(--ink3)" }}>Searching…</div>
          )}
          {!searching && results.length === 0 && (
            <div style={{ padding: 10, fontSize: 12, color: "var(--ink3)" }}>No matches.</div>
          )}
          {!searching &&
            results.map((p) => (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: 8,
                  borderBottom: "0.5px solid var(--b)",
                }}
              >
                <span style={{ flex: 1, fontSize: 12 }}>{p.name}</span>
                <button
                  type="button"
                  className="btn-outline"
                  style={{ fontSize: 11, padding: "4px 8px" }}
                  disabled={pickedIds.has(p.id)}
                  onClick={() => add(p.id)}
                >
                  {pickedIds.has(p.id) ? "Added" : "Add"}
                </button>
              </div>
            ))}
        </div>
      )}

      {!isLoading && picked.length === 0 && (
        <div style={{ fontSize: 12, color: "var(--ink3)" }}>No products picked yet.</div>
      )}
      {!isLoading &&
        picked.map((p, idx) => (
          <div
            key={p.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 0",
              borderBottom: "0.5px solid var(--b)",
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                background: "var(--cream2)",
                borderRadius: 4,
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              {p.imageUrl && (
                <img
                  src={p.imageUrl}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              )}
            </div>
            <span style={{ flex: 1, fontSize: 12 }}>{p.name}</span>
            <button
              type="button"
              className="btn-text-ink"
              disabled={idx === 0}
              onClick={() => move(p.id, -1)}
            >
              <IconArrowUp size={14} />
            </button>
            <button
              type="button"
              className="btn-text-ink"
              disabled={idx === picked.length - 1}
              onClick={() => move(p.id, 1)}
            >
              <IconArrowDown size={14} />
            </button>
            <button type="button" className="btn-text-rust" onClick={() => remove(p.id)}>
              <IconX size={14} />
            </button>
          </div>
        ))}
    </div>
  );
}
