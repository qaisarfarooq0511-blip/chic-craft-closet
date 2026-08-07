import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/lib/toast";
import { useSizeScales } from "@/hooks/useSizeScales";
import { useCategorySizes } from "@/hooks/useCategorySizes";
import type { SizeOption } from "@/types/database";

// Falls back to the raw DB name for any scale added later without an entry here.
const SIZE_SCALE_LABELS: Record<string, string> = {
  age_infant: "Infant (0–24 months)",
  age_kids: "Kids (age sizes)",
  age_teens: "Teens (age sizes)",
  adult_clothing: "Adult clothing (XS–XXL)",
  free_size: "Free size",
  dress_material: "Dress material (no sizing)",
};

async function fetchAllSizeOptions(): Promise<SizeOption[]> {
  const { data, error } = await supabase
    .from("size_options")
    .select("*")
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

function useAllSizeOptions() {
  return useQuery({ queryKey: ["all-size-options"], queryFn: fetchAllSizeOptions });
}

interface CategorySizesModalProps {
  categoryId: string;
  categoryName: string;
  onClose: () => void;
}

export function CategorySizesModal({ categoryId, categoryName, onClose }: CategorySizesModalProps) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data: scales = [], isLoading: loadingScales } = useSizeScales();
  const { data: allOptions = [], isLoading: loadingOptions } = useAllSizeOptions();
  const { data: assigned = [], isLoading: loadingAssigned } = useCategorySizes(categoryId);
  const [pending, setPending] = useState<Record<string, boolean>>({});

  const isLoading = loadingScales || loadingOptions || loadingAssigned;
  const assignedIds = new Set(assigned.map((s) => s.id));

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const toggle = async (sizeOptionId: string, checked: boolean) => {
    setPending((p) => ({ ...p, [sizeOptionId]: true }));
    const { error } = checked
      ? await supabase
          .from("category_sizes")
          .insert({ category_id: categoryId, size_option_id: sizeOptionId })
      : await supabase
          .from("category_sizes")
          .delete()
          .eq("category_id", categoryId)
          .eq("size_option_id", sizeOptionId);
    setPending((p) => ({ ...p, [sizeOptionId]: false }));
    if (error) {
      toast(error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["category-sizes", categoryId] });
    queryClient.invalidateQueries({ queryKey: ["category-size-counts"] });
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
        style={{ width: "100%", maxWidth: 520, maxHeight: "90vh", overflow: "auto", margin: 0 }}
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
            Sizes for {categoryName}
          </div>
          <button onClick={onClose} className="btn-outline" style={{ padding: "4px 10px" }}>
            Close
          </button>
        </div>

        {isLoading && (
          <div style={{ textAlign: "center", padding: 40, color: "var(--ink3)" }}>Loading…</div>
        )}

        {!isLoading && allOptions.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, color: "var(--ink3)" }}>
            No sizes exist yet. Add size scales and options first.
          </div>
        )}

        {!isLoading &&
          allOptions.length > 0 &&
          scales.map((scale) => {
            const options = allOptions.filter((o) => o.scale_id === scale.id);
            if (options.length === 0) return null;
            return (
              <div key={scale.id} style={{ marginBottom: 16 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--ink2)",
                    marginBottom: 8,
                  }}
                >
                  {SIZE_SCALE_LABELS[scale.name] ?? scale.name}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                  {options.map((o) => (
                    <label
                      key={o.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 12,
                        color: "var(--ink)",
                        opacity: pending[o.id] ? 0.5 : 1,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={assignedIds.has(o.id)}
                        disabled={!!pending[o.id]}
                        onChange={(e) => void toggle(o.id, e.target.checked)}
                      />
                      {o.label}
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
