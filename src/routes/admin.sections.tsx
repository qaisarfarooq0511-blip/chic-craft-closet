import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { IconTrash, IconArrowUp, IconArrowDown, IconEye, IconEyeOff } from "@tabler/icons-react";
import {
  getSections, saveSections, upsertSection, deleteSection,
  getCategoriesStore, getProducts,
} from "@/lib/storage";
import type { SectionRow, SectionRule } from "@/lib/types";
import { useToast } from "@/lib/toast";

export const Route = createFileRoute("/admin/sections")({
  component: SectionsAdmin,
});

function SectionsAdmin() {
  const toast = useToast();
  const [sections, setSections] = useState<SectionRow[]>([]);
  const [cats, setCats] = useState(getCategoriesStore());
  const [products, setProducts] = useState(getProducts());

  useEffect(() => {
    setSections(getSections());
    setCats(getCategoriesStore());
    setProducts(getProducts());
  }, []);

  const refresh = () => setSections(getSections());

  const add = () => {
    const s: SectionRow = {
      id: `sec-${Date.now()}`,
      title: "New section",
      mode: "manual",
      productIds: [],
      limit: 6,
      order: sections.length,
      visible: true,
    };
    upsertSection(s);
    refresh();
  };

  const update = (id: string, patch: Partial<SectionRow>) => {
    const next = sections.map((s) => (s.id === id ? { ...s, ...patch } : s));
    saveSections(next);
    setSections(next);
  };

  const move = (id: string, dir: -1 | 1) => {
    const idx = sections.findIndex((s) => s.id === id);
    const target = idx + dir;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    [next[idx], next[target]] = [next[target], next[idx]];
    const re = next.map((s, i) => ({ ...s, order: i }));
    saveSections(re);
    setSections(re);
  };

  const remove = (id: string) => {
    if (!confirm("Delete this section?")) return;
    deleteSection(id);
    refresh();
    toast("Section deleted");
  };

  const setRule = (id: string, type: SectionRule["type"], value: string) => {
    update(id, { rule: { type, value } as SectionRule });
  };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 className="admin-h1">Homepage sections</h1>
          <p className="admin-sub">Curated product strips shown on the homepage below the category tiles. Pick products manually or by rule.</p>
        </div>
        <button className="btn-ink" onClick={add}>+ Add section</button>
      </div>

      {sections.map((s, idx) => (
        <div key={s.id} className="admin-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <input className="form-input" value={s.title} onChange={(e) => update(s.id, { title: e.target.value })} style={{ fontSize: 16, fontWeight: 500 }} />
              <input className="form-input" value={s.subtitle ?? ""} placeholder="Subtitle (optional)" onChange={(e) => update(s.id, { subtitle: e.target.value })} style={{ marginTop: 6 }} />
            </div>
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <button className="btn-text-ink" onClick={() => update(s.id, { visible: !s.visible })} title={s.visible ? "Hide" : "Show"}>
                {s.visible ? <IconEye size={16} /> : <IconEyeOff size={16} />}
              </button>
              <button className="btn-text-ink" disabled={idx === 0} onClick={() => move(s.id, -1)}><IconArrowUp size={16} /></button>
              <button className="btn-text-ink" disabled={idx === sections.length - 1} onClick={() => move(s.id, 1)}><IconArrowDown size={16} /></button>
              <button className="btn-text-rust" onClick={() => remove(s.id)}><IconTrash size={16} /></button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 120px", gap: 10, marginBottom: 12 }}>
            <div className="form-field">
              <label className="form-label">Source</label>
              <select className="form-select" value={s.mode} onChange={(e) => update(s.id, { mode: e.target.value as "manual" | "rule" })}>
                <option value="manual">Manual — pick products</option>
                <option value="rule">Rule — auto-fill by criteria</option>
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Status</label>
              <div style={{ fontSize: 12, color: s.visible ? "var(--ink)" : "var(--ink3)", padding: "8px 0" }}>
                {s.visible ? "Visible on homepage" : "Hidden"}
              </div>
            </div>
            <div className="form-field">
              <label className="form-label">Max items</label>
              <input className="form-input" type="number" min="1" max="20" value={s.limit ?? 6} onChange={(e) => update(s.id, { limit: Number(e.target.value) })} />
            </div>
          </div>

          {s.mode === "rule" && (
            <div style={{ background: "var(--cream2)", padding: 12, borderRadius: 8, marginBottom: 12 }}>
              <div className="form-label" style={{ marginBottom: 8 }}>Rule</div>
              <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 10 }}>
                <select className="form-select" value={s.rule?.type ?? "flag"} onChange={(e) => {
                  const type = e.target.value as SectionRule["type"];
                  const defaultVal = type === "flag" ? "featured" : type === "category" ? (cats[0]?.name ?? "") : "";
                  setRule(s.id, type, defaultVal);
                }}>
                  <option value="flag">Has flag…</option>
                  <option value="category">In category…</option>
                  <option value="tag">Has tag…</option>
                </select>
                {s.rule?.type === "flag" ? (
                  <select className="form-select" value={s.rule.value} onChange={(e) => setRule(s.id, "flag", e.target.value)}>
                    <option value="featured">Featured</option>
                    <option value="new">New In</option>
                    <option value="trending">Trending</option>
                  </select>
                ) : s.rule?.type === "category" ? (
                  <select className="form-select" value={s.rule.value} onChange={(e) => setRule(s.id, "category", e.target.value)}>
                    {cats.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                ) : (
                  <input className="form-input" value={s.rule?.value ?? ""} onChange={(e) => setRule(s.id, "tag", e.target.value)} placeholder="tag name, e.g. pashmina" />
                )}
              </div>
            </div>
          )}

          {s.mode === "manual" && (
            <div>
              <div className="form-label" style={{ marginBottom: 8 }}>Products in this section ({(s.productIds ?? []).length})</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 8, maxHeight: 280, overflowY: "auto", padding: 4, border: "0.5px solid var(--b)", borderRadius: 8 }}>
                {products.map((p) => {
                  const on = (s.productIds ?? []).includes(p.id);
                  return (
                    <label key={p.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: 6, fontSize: 11, cursor: "pointer", background: on ? "var(--cream2)" : undefined, borderRadius: 6 }}>
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={(e) => {
                          const ids = new Set(s.productIds ?? []);
                          if (e.target.checked) ids.add(p.id); else ids.delete(p.id);
                          update(s.id, { productIds: Array.from(ids) });
                        }}
                      />
                      <div className="admin-thumb" style={{ background: p.bg, width: 30, height: 30 }}>
                        {p.images[0] && <img src={p.images[0]} alt="" />}
                      </div>
                      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ))}

      {sections.length === 0 && (
        <div className="admin-card" style={{ textAlign: "center", color: "var(--ink3)", padding: 40 }}>
          No sections yet. Click "+ Add section" to start.
        </div>
      )}
    </>
  );
}
