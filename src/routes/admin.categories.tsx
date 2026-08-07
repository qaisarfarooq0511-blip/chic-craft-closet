import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { IconTrash, IconGripVertical, IconArrowUp, IconArrowDown } from "@tabler/icons-react";
import { supabase } from "@/lib/supabase";
import { useAdminCategories, type AdminCategoryRow } from "@/hooks/useAdminCategories";
import { useSizeScales } from "@/hooks/useSizeScales";
import { categorySlug } from "@/lib/types";
import { useToast } from "@/lib/toast";
import type { Category } from "@/types/database";

export const Route = createFileRoute("/admin/categories")({
  component: CategoriesAdmin,
});

// Falls back to the raw DB name for any scale added later without an entry here.
const SIZE_SCALE_LABELS: Record<string, string> = {
  age_infant: "Infant (0–24 months)",
  age_kids: "Kids (age sizes)",
  age_teens: "Teens (age sizes)",
  adult_clothing: "Adult clothing (XS–XXL)",
  free_size: "Free size",
  dress_material: "Dress material (no sizing)",
};

function CategoriesAdmin() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data: serverCats = [], isLoading } = useAdminCategories();
  const { data: sizeScales = [] } = useSizeScales();
  const [cats, setCats] = useState<AdminCategoryRow[]>([]);
  const [slugErrors, setSlugErrors] = useState<Record<string, string>>({});

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

  const onSlugChange = (id: string, slug: string) => {
    updateLocal(id, { slug });
    setSlugErrors((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const clearSlugError = (id: string) =>
    setSlugErrors((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });

  const onSlugBlur = async (id: string) => {
    const c = cats.find((x) => x.id === id);
    if (!c) return;
    const trimmed = c.slug.trim();
    if (!trimmed) {
      setSlugErrors((prev) => ({ ...prev, [id]: "Slug is required" }));
      return;
    }

    // Pre-check against the DB's own unique constraint (which doesn't care
    // about deleted_at either) so a collision shows an inline error instead
    // of a raw Postgres error toast. Own row excluded so re-saving the
    // current value doesn't false-positive.
    const { data: conflict, error: checkError } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", trimmed)
      .neq("id", id)
      .maybeSingle();
    if (checkError) {
      toast(checkError.message);
      return;
    }
    if (conflict) {
      setSlugErrors((prev) => ({ ...prev, [id]: "This slug is already in use" }));
      return;
    }

    clearSlugError(id);
    void persistField(id, { slug: trimmed });
  };

  const onDescriptionChange = (id: string, description: string) =>
    updateLocal(id, { description: description || null });
  const onDescriptionBlur = (id: string) => {
    const c = cats.find((x) => x.id === id);
    if (!c) return;
    void persistField(id, { description: c.description });
  };

  const onSizeScaleChange = (id: string, value: string) => {
    const default_size_scale_id = value || null;
    updateLocal(id, { default_size_scale_id });
    void persistField(id, { default_size_scale_id });
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

  const restore = async (id: string) => {
    const { error } = await supabase.from("categories").update({ deleted_at: null }).eq("id", id);
    if (error) {
      toast(error.message);
      return;
    }
    invalidate();
    toast("Category restored");
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
              <th>Size scale</th>
              <th>Products</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: 40, color: "var(--ink3)" }}>
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading &&
              cats.map((c, i) => {
                const isDeleted = !!c.deleted_at;
                return (
                  <tr key={c.id} style={isDeleted ? { opacity: 0.5 } : undefined}>
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
                      {isDeleted && (
                        <div style={{ fontSize: 10, color: "var(--ink3)", marginTop: 2 }}>
                          Deleted
                        </div>
                      )}
                    </td>
                    <td>
                      <input
                        className="form-input"
                        style={{ fontFamily: "monospace", fontSize: 11 }}
                        value={c.slug}
                        onChange={(e) => onSlugChange(c.id, e.target.value)}
                        onBlur={() => void onSlugBlur(c.id)}
                      />
                      {slugErrors[c.id] && (
                        <div style={{ color: "#b91c1c", fontSize: 11, marginTop: 4 }}>
                          {slugErrors[c.id]}
                        </div>
                      )}
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
                    <td>
                      <select
                        className="form-input"
                        value={c.default_size_scale_id ?? ""}
                        onChange={(e) => onSizeScaleChange(c.id, e.target.value)}
                      >
                        <option value="">No size options</option>
                        {sizeScales.map((s) => (
                          <option key={s.id} value={s.id}>
                            {SIZE_SCALE_LABELS[s.name] ?? s.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>{c.product_count}</td>
                    <td style={{ textAlign: "right" }}>
                      {isDeleted ? (
                        <button className="btn-text-ink" onClick={() => restore(c.id)}>
                          Restore
                        </button>
                      ) : (
                        <button className="btn-text-rust" onClick={() => remove(c.id)}>
                          <IconTrash size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            {!isLoading && cats.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: 40, color: "var(--ink3)" }}>
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
