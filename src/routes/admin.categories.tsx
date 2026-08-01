import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { IconTrash, IconGripVertical, IconArrowUp, IconArrowDown } from "@tabler/icons-react";
import { supabase } from "@/lib/supabase";
import { useAdminCategories } from "@/hooks/useAdminCategories";
import { categorySlug } from "@/lib/types";
import { useToast } from "@/lib/toast";
import type { Category } from "@/types/database";

export const Route = createFileRoute("/admin/categories")({
  component: CategoriesAdmin,
});

function CategoriesAdmin() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data: serverCats = [], isLoading } = useAdminCategories();
  const [cats, setCats] = useState<Category[]>([]);

  // Resync local draft from the server whenever fresh data arrives (after any
  // mutation invalidates the query, or on first load).
  useEffect(() => {
    setCats(serverCats);
  }, [serverCats]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-categories"] });

  const addNew = async () => {
    const name = "New category";
    const slug = `${categorySlug(name)}-${Date.now().toString(36)}`;
    const nextSortOrder = cats.length === 0 ? 0 : Math.max(...cats.map((c) => c.sort_order)) + 1;
    const { error } = await supabase
      .from("categories")
      .insert({ name, slug, sort_order: nextSortOrder });
    if (error) {
      toast(error.message);
      return;
    }
    invalidate();
    toast("Category added");
  };

  // Local-only edit while typing; persisted on blur so we don't hit the DB on every keystroke.
  const updateLocal = (id: string, patch: Partial<Category>) => {
    setCats((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const persistField = async (id: string, patch: Partial<Category>) => {
    const { error } = await supabase.from("categories").update(patch).eq("id", id);
    if (error) {
      toast(error.message);
      invalidate(); // roll back local edit to last known-good server state
      return;
    }
    invalidate();
  };

  const onNameChange = (id: string, name: string) => {
    const c = cats.find((x) => x.id === id);
    if (!c) return;
    updateLocal(id, { name, slug: categorySlug(name) || c.slug });
  };

  const onNameBlur = (id: string) => {
    const c = cats.find((x) => x.id === id);
    if (!c) return;
    void persistField(id, { name: c.name, slug: c.slug });
  };

  const onSlugChange = (id: string, slug: string) => updateLocal(id, { slug });
  const onSlugBlur = (id: string) => {
    const c = cats.find((x) => x.id === id);
    if (!c) return;
    void persistField(id, { slug: c.slug });
  };

  const onDescriptionChange = (id: string, description: string) =>
    updateLocal(id, { description: description || null });
  const onDescriptionBlur = (id: string) => {
    const c = cats.find((x) => x.id === id);
    if (!c) return;
    void persistField(id, { description: c.description });
  };

  const move = async (id: string, dir: -1 | 1) => {
    const idx = cats.findIndex((c) => c.id === id);
    if (idx < 0) return;
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= cats.length) return;

    const current = cats[idx];
    const target = cats[targetIdx];

    const next = [...cats];
    [next[idx], next[targetIdx]] = [
      { ...next[targetIdx], sort_order: current.sort_order },
      { ...next[idx], sort_order: target.sort_order },
    ];
    setCats(next);

    const [err1, err2] = await Promise.all([
      supabase.from("categories").update({ sort_order: target.sort_order }).eq("id", current.id),
      supabase.from("categories").update({ sort_order: current.sort_order }).eq("id", target.id),
    ]).then((results) => results.map((r) => r.error));

    if (err1 || err2) {
      toast((err1 ?? err2)!.message);
    }
    invalidate();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this category? Existing products keep their stored category reference."))
      return;
    const { error } = await supabase
      .from("categories")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast(error.message);
      return;
    }
    invalidate();
    toast("Category deleted");
  };

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
          <h1 className="admin-h1">Categories</h1>
          <p className="admin-sub">
            These appear in the homepage tile strip and the main nav. Changes go live immediately.
          </p>
        </div>
        <button className="btn-ink" onClick={addNew}>
          + Add category
        </button>
      </div>

      <div className="admin-card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th></th>
              <th>Name</th>
              <th>Slug (URL)</th>
              <th>Description</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: 40, color: "var(--ink3)" }}>
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading &&
              cats.map((c, i) => (
                <tr key={c.id}>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <IconGripVertical size={14} style={{ color: "var(--ink3)" }} />
                    <button
                      className="btn-text-ink"
                      disabled={i === 0}
                      onClick={() => move(c.id, -1)}
                      title="Move up"
                      style={{ marginLeft: 6 }}
                    >
                      <IconArrowUp size={14} />
                    </button>
                    <button
                      className="btn-text-ink"
                      disabled={i === cats.length - 1}
                      onClick={() => move(c.id, 1)}
                      title="Move down"
                      style={{ marginLeft: 6 }}
                    >
                      <IconArrowDown size={14} />
                    </button>
                  </td>
                  <td>
                    <input
                      className="form-input"
                      value={c.name}
                      onChange={(e) => onNameChange(c.id, e.target.value)}
                      onBlur={() => onNameBlur(c.id)}
                    />
                  </td>
                  <td>
                    <input
                      className="form-input"
                      style={{ fontFamily: "monospace", fontSize: 11 }}
                      value={c.slug}
                      onChange={(e) => onSlugChange(c.id, e.target.value)}
                      onBlur={() => onSlugBlur(c.id)}
                    />
                  </td>
                  <td>
                    <input
                      className="form-input"
                      value={c.description ?? ""}
                      onChange={(e) => onDescriptionChange(c.id, e.target.value)}
                      onBlur={() => onDescriptionBlur(c.id)}
                      placeholder="Optional"
                    />
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button className="btn-text-rust" onClick={() => remove(c.id)}>
                      <IconTrash size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            {!isLoading && cats.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: 40, color: "var(--ink3)" }}>
                  No categories yet. Add the first one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
