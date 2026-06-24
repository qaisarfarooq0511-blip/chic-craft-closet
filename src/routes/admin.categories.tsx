import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { IconTrash, IconGripVertical, IconArrowUp, IconArrowDown } from "@tabler/icons-react";
import { getCategoriesStore, saveCategories, upsertCategory, deleteCategory } from "@/lib/storage";
import { categorySlug, type CategoryRow } from "@/lib/types";
import { useToast } from "@/lib/toast";

export const Route = createFileRoute("/admin/categories")({
  component: CategoriesAdmin,
});

function CategoriesAdmin() {
  const toast = useToast();
  const [cats, setCats] = useState<CategoryRow[]>([]);

  useEffect(() => { setCats(getCategoriesStore()); }, []);

  const refresh = () => setCats(getCategoriesStore());

  const addNew = () => {
    const name = "New category";
    const c: CategoryRow = {
      id: `cat-${Date.now()}`,
      name,
      slug: `${categorySlug(name)}-${Math.floor(Math.random() * 1000)}`,
      label: null,
      order: cats.length,
      image: null,
    };
    upsertCategory(c);
    refresh();
  };

  const update = (id: string, patch: Partial<CategoryRow>) => {
    const updated = cats.map((c) => (c.id === id ? { ...c, ...patch } : c));
    saveCategories(updated);
    setCats(updated);
  };

  const updateName = (id: string, name: string) => {
    const c = cats.find((x) => x.id === id);
    if (!c) return;
    update(id, { name, slug: categorySlug(name) || c.slug });
  };

  const move = (id: string, dir: -1 | 1) => {
    const idx = cats.findIndex((c) => c.id === id);
    if (idx < 0) return;
    const target = idx + dir;
    if (target < 0 || target >= cats.length) return;
    const next = [...cats];
    [next[idx], next[target]] = [next[target], next[idx]];
    const re = next.map((c, i) => ({ ...c, order: i }));
    saveCategories(re);
    setCats(re);
  };

  const remove = (id: string) => {
    if (!confirm("Delete this category? Existing products keep their stored category name.")) return;
    deleteCategory(id);
    refresh();
    toast("Category deleted");
  };

  const save = () => { saveCategories(cats); toast("Categories saved"); };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 className="admin-h1">Categories</h1>
          <p className="admin-sub">These appear in the homepage tile strip and the main nav.</p>
        </div>
        <button className="btn-ink" onClick={addNew}>+ Add category</button>
      </div>

      <div className="admin-card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th></th>
              <th>Name</th>
              <th>Slug (URL)</th>
              <th>Label badge</th>
              <th>Order</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {cats.map((c, i) => (
              <tr key={c.id}>
                <td><IconGripVertical size={14} style={{ color: "var(--ink3)" }} /></td>
                <td>
                  <input className="form-input" value={c.name} onChange={(e) => updateName(c.id, e.target.value)} />
                </td>
                <td style={{ fontFamily: "monospace", fontSize: 11, color: "var(--ink3)" }}>/shop/{c.slug}</td>
                <td>
                  <input className="form-input" value={c.label ?? ""} onChange={(e) => update(c.id, { label: e.target.value || null })} placeholder='e.g. "New In"' />
                </td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button className="btn-text-ink" disabled={i === 0} onClick={() => move(c.id, -1)} title="Move up"><IconArrowUp size={14} /></button>
                  <button className="btn-text-ink" disabled={i === cats.length - 1} onClick={() => move(c.id, 1)} title="Move down" style={{ marginLeft: 6 }}><IconArrowDown size={14} /></button>
                </td>
                <td style={{ textAlign: "right" }}>
                  <button className="btn-text-rust" onClick={() => remove(c.id)}><IconTrash size={14} /></button>
                </td>
              </tr>
            ))}
            {cats.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: 40, color: "var(--ink3)" }}>No categories yet. Add the first one above.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <button className="cta-primary" onClick={save}>Save changes</button>
    </>
  );
}
