import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { IconTrash } from "@tabler/icons-react";
import { supabase } from "@/lib/supabase";
import { useColourOptions } from "@/hooks/useColourOptions";
import { useToast } from "@/lib/toast";
import type { ColourOption } from "@/types/database";

export const Route = createFileRoute("/admin/colours")({
  component: ColoursAdmin,
});

function properCase(raw: string): string {
  return raw
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function ColoursAdmin() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data: serverColours = [], isLoading, isError } = useColourOptions();
  const [colours, setColours] = useState<ColourOption[]>([]);
  const [newName, setNewName] = useState("");
  const [nameErrors, setNameErrors] = useState<Record<string, string>>({});
  const [newError, setNewError] = useState("");

  // Soft-deleted colours are hidden from this list entirely, matching the
  // categories admin list — restoring one is a manual SQL operation.
  useEffect(() => {
    setColours(serverColours.filter((c) => !c.deleted_at));
  }, [serverColours]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["colour-options"] });

  const isDuplicate = (name: string, excludeId?: string) =>
    colours.some((c) => c.id !== excludeId && c.name.toLowerCase() === name.toLowerCase());

  const addNew = async () => {
    const name = properCase(newName);
    if (!name) return;
    if (isDuplicate(name)) {
      setNewError("This colour already exists");
      return;
    }
    const nextSortOrder =
      colours.length === 0 ? 0 : Math.max(...colours.map((c) => c.sort_order)) + 1;
    const { error } = await supabase
      .from("colour_options")
      .insert({ name, sort_order: nextSortOrder, is_active: true });
    if (error) {
      toast(error.message);
      return;
    }
    setNewName("");
    setNewError("");
    invalidate();
    toast("Colour added");
  };

  const updateLocal = (id: string, patch: Partial<ColourOption>) => {
    setColours((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const onNameChange = (id: string, name: string) => {
    updateLocal(id, { name });
    setNameErrors((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const onNameBlur = async (id: string) => {
    const c = colours.find((x) => x.id === id);
    if (!c) return;
    const name = properCase(c.name);
    if (!name) {
      invalidate(); // revert to last known-good server value
      return;
    }
    if (isDuplicate(name, id)) {
      setNameErrors((prev) => ({ ...prev, [id]: "This colour already exists" }));
      return;
    }
    updateLocal(id, { name });
    const { error } = await supabase.from("colour_options").update({ name }).eq("id", id);
    if (error) {
      toast(error.message);
      invalidate();
      return;
    }
    invalidate();
  };

  const toggleActive = async (id: string, is_active: boolean) => {
    updateLocal(id, { is_active });
    const { error } = await supabase.from("colour_options").update({ is_active }).eq("id", id);
    if (error) {
      toast(error.message);
      invalidate();
      return;
    }
    invalidate();
  };

  const remove = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? Existing products keep their stored colour reference.`)) return;
    const { error } = await supabase
      .from("colour_options")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast(error.message);
      return;
    }
    invalidate();
    toast("Colour deleted");
  };

  return (
    <>
      <div>
        <h1 className="admin-h1">Colours</h1>
        <p className="admin-sub">
          Colours are shown as text labels on the product page — no hex code needed.
        </p>
      </div>

      <div className="admin-card" style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <input
            className="form-input"
            value={newName}
            onChange={(e) => {
              setNewName(e.target.value);
              setNewError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") void addNew();
            }}
            placeholder="New colour name, e.g. Maroon"
          />
          {newError && (
            <div style={{ color: "#b91c1c", fontSize: 11, marginTop: 4 }}>{newError}</div>
          )}
        </div>
        <button className="btn-ink" onClick={addNew}>
          + Add colour
        </button>
      </div>

      <div className="admin-card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Active</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={3} style={{ textAlign: "center", padding: 40, color: "var(--ink3)" }}>
                  Loading…
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={3} style={{ textAlign: "center", padding: 40, color: "#b91c1c" }}>
                  Couldn't load colours. Try refreshing.
                </td>
              </tr>
            )}
            {!isLoading &&
              !isError &&
              colours.map((c) => (
                <tr key={c.id}>
                  <td>
                    <input
                      className="form-input"
                      value={c.name}
                      onChange={(e) => onNameChange(c.id, e.target.value)}
                      onBlur={() => void onNameBlur(c.id)}
                    />
                    {nameErrors[c.id] && (
                      <div style={{ color: "#b91c1c", fontSize: 11, marginTop: 4 }}>
                        {nameErrors[c.id]}
                      </div>
                    )}
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={c.is_active}
                      onChange={(e) => void toggleActive(c.id, e.target.checked)}
                    />
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button className="btn-text-rust" onClick={() => remove(c.id, c.name)}>
                      <IconTrash size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            {!isLoading && !isError && colours.length === 0 && (
              <tr>
                <td colSpan={3} style={{ textAlign: "center", padding: 40, color: "var(--ink3)" }}>
                  No colours yet. Add the first one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
