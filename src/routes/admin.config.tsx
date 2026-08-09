import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useColourOptions } from "@/hooks/useColourOptions";
import { useBadgeOptions } from "@/hooks/useBadgeOptions";
import { useFabricOptions } from "@/hooks/useFabricOptions";
import { useEmbroideryOptions } from "@/hooks/useEmbroideryOptions";
import { useCareOptions } from "@/hooks/useCareOptions";
import { useSizeScales } from "@/hooks/useSizeScales";
import type { HsnCode, FaqEntry } from "@/lib/storage";
import { useToast } from "@/lib/toast";
import type { ColourOption, SizeOption } from "@/types/database";

export const Route = createFileRoute("/admin/config")({
  component: ConfigAdmin,
});

const TAGS_FALLBACK = [
  "pashmina",
  "ivory",
  "chikankari",
  "cotton",
  "earrings",
  "kundan",
  "festive",
  "bridal",
  "casual",
];

const SHIPPING_PARTNERS_FALLBACK = [
  "Delhivery",
  "Blue Dart",
  "DTDC",
  "India Post",
  "Shiprocket",
  "Ekart",
  "XpressBees",
];

const CANCELLATION_REASONS_FALLBACK = [
  "Customer requested cancellation",
  "Out of stock",
  "Address unreachable",
  "Payment failed",
  "Duplicate order",
  "Suspected fraud",
  "Other",
];

const HSN_CODES_FALLBACK: HsnCode[] = [
  { code: "6214", description: "Shawls, scarves, mufflers (textile)", gstRate: 5 },
  { code: "5208", description: "Cotton woven fabrics", gstRate: 5 },
  { code: "6204", description: "Women's apparel (stitched)", gstRate: 12 },
  { code: "6209", description: "Babies' / kids' garments", gstRate: 12 },
  { code: "7117", description: "Imitation jewellery", gstRate: 18 },
];

const GLOBAL_FAQS_FALLBACK: FaqEntry[] = [
  {
    q: "What are Yaawun's shipping timelines?",
    a: "Orders are processed within 1–2 business days and typically delivered within 3–7 business days across India. Free shipping on orders above ₹999.",
  },
  {
    q: "What is the return and exchange policy?",
    a: "We offer a 7-day return window from the date of delivery. Items must be unused, unwashed and returned with original packaging. Free return pickup is available across most pincodes.",
  },
  {
    q: "Are the prices inclusive of GST?",
    a: "Yes, all prices on Yaawun are inclusive of GST. A detailed tax invoice is available in your account once the order is placed.",
  },
  {
    q: "How do I find my size?",
    a: "Each product page lists fabric cut lengths (for unstitched sets) or finished garment sizes. For ready-to-wear pieces, refer to the size guide linked from the size selector.",
  },
  {
    q: "How should I care for my Yaawun pieces?",
    a: "Most natural fabric pieces are best dry-cleaned; care instructions are listed on every product page. For embroidered work, avoid moisture, store folded with muslin, and iron on low heat.",
  },
];

async function fetchSiteSettingArray<T>(key: string): Promise<T[] | null> {
  const { data, error } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (error || !Array.isArray(data?.value)) return null;
  return data.value as T[];
}

async function saveSiteSettingArray(key: string, value: unknown) {
  const { error } = await supabase.from("site_settings").update({ value }).eq("key", key);
  return error;
}

function useSiteSettingArray<T>(key: string, fallback: T[]) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["site-setting", key],
    queryFn: () => fetchSiteSettingArray<T>(key),
  });
  return { values: data ?? fallback, isLoading, isError };
}

function StringListSiteSettingEditor({
  title,
  hint,
  settingKey,
  fallback,
  addPlaceholder,
}: {
  title: string;
  hint: string;
  settingKey: string;
  fallback: string[];
  addPlaceholder: string;
}) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { values, isLoading, isError } = useSiteSettingArray<string>(settingKey, fallback);
  const [draft, setDraft] = useState("");

  const persist = async (next: string[]) => {
    const error = await saveSiteSettingArray(settingKey, next);
    if (error) {
      toast(error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["site-setting", settingKey] });
  };

  const add = () => {
    const v = draft.trim();
    if (!v) return;
    if (values.some((x) => x.toLowerCase() === v.toLowerCase())) {
      setDraft("");
      return;
    }
    void persist([...values, v]);
    setDraft("");
  };

  const remove = (v: string) => void persist(values.filter((x) => x !== v));

  return (
    <div className="admin-card">
      <div className="cart-sum-title" style={{ marginBottom: 4 }}>
        {title}
      </div>
      <p style={{ fontSize: 11, color: "var(--ink3)", marginBottom: 12 }}>{hint}</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {isLoading && <span style={{ fontSize: 12, color: "var(--ink3)" }}>Loading…</span>}
        {isError && (
          <span style={{ fontSize: 12, color: "#b91c1c" }}>
            Couldn't load {title.toLowerCase()}.
          </span>
        )}
        {!isLoading && !isError && values.length === 0 && (
          <span style={{ fontSize: 12, color: "var(--ink3)" }}>No values yet.</span>
        )}
        {!isLoading &&
          !isError &&
          values.map((v) => (
            <span
              key={v}
              className="btn-outline"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 11,
                padding: "5px 8px 5px 10px",
              }}
            >
              {v}
              <button
                type="button"
                onClick={() => remove(v)}
                aria-label={`Remove ${v}`}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--rust)",
                  cursor: "pointer",
                  fontSize: 14,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </span>
          ))}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          className="form-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={addPlaceholder}
          style={{ flex: 1 }}
        />
        <button type="button" className="btn-ink" onClick={add}>
          Add
        </button>
      </div>
    </div>
  );
}

function properCase(raw: string): string {
  return raw
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

type OptionRow = { id: string; name: string; sort_order: number };
type OptionsTable = "badge_options" | "fabric_options" | "embroidery_options" | "care_options";

function TableChipEditor({
  title,
  hint,
  table,
  queryKey,
  options,
  isLoading,
  isError,
  addPlaceholder,
}: {
  title: string;
  hint: string;
  table: OptionsTable;
  queryKey: string;
  options: OptionRow[];
  isLoading: boolean;
  isError: boolean;
  addPlaceholder: string;
}) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [draftError, setDraftError] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: [queryKey] });
  const singular = title.toLowerCase().replace(/s$/, "");

  const add = async () => {
    const name = properCase(draft);
    if (!name) return;
    if (options.some((o) => o.name.toLowerCase() === name.toLowerCase())) {
      setDraftError(`This ${singular} already exists`);
      return;
    }
    const nextSortOrder =
      options.length === 0 ? 0 : Math.max(...options.map((o) => o.sort_order)) + 1;
    const { error } = await supabase
      .from(table)
      .insert({ name, sort_order: nextSortOrder, is_active: true });
    if (error) {
      toast(error.message);
      return;
    }
    setDraft("");
    setDraftError("");
    invalidate();
    toast(`${title.replace(/s$/, "")} added`);
  };

  const remove = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? Existing products keep their stored value.`)) return;
    const { error } = await supabase
      .from(table)
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast(error.message);
      return;
    }
    invalidate();
    toast(`${title.replace(/s$/, "")} deleted`);
  };

  return (
    <div className="admin-card">
      <div className="cart-sum-title" style={{ marginBottom: 4 }}>
        {title}
      </div>
      <p style={{ fontSize: 11, color: "var(--ink3)", marginBottom: 12 }}>{hint}</p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {isLoading && <span style={{ fontSize: 12, color: "var(--ink3)" }}>Loading…</span>}
        {isError && (
          <span style={{ fontSize: 12, color: "#b91c1c" }}>
            Couldn't load {title.toLowerCase()}.
          </span>
        )}
        {!isLoading && !isError && options.length === 0 && (
          <span style={{ fontSize: 12, color: "var(--ink3)" }}>No values yet.</span>
        )}
        {!isLoading &&
          !isError &&
          options.map((o) => (
            <span
              key={o.id}
              className="btn-outline"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 11,
                padding: "5px 8px 5px 10px",
              }}
            >
              {o.name}
              <button
                type="button"
                onClick={() => remove(o.id, o.name)}
                aria-label={`Remove ${o.name}`}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--rust)",
                  cursor: "pointer",
                  fontSize: 14,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </span>
          ))}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <input
            className="form-input"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setDraftError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void add();
              }
            }}
            placeholder={addPlaceholder}
          />
          {draftError && (
            <div style={{ color: "#b91c1c", fontSize: 11, marginTop: 4 }}>{draftError}</div>
          )}
        </div>
        <button type="button" className="btn-ink" onClick={add}>
          Add
        </button>
      </div>
    </div>
  );
}

async function fetchMaxQtyPerItem(): Promise<number> {
  const { data, error } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "max_qty_per_item")
    .maybeSingle();
  if (error) throw error;
  return typeof data?.value === "number" ? data.value : 10;
}

function CartLimitsEditor() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data: maxQty = 10, isLoading } = useQuery({
    queryKey: ["site-setting-max-qty-per-item"],
    queryFn: fetchMaxQtyPerItem,
  });
  const [draft, setDraft] = useState(String(maxQty));

  useEffect(() => setDraft(String(maxQty)), [maxQty]);

  const save = async () => {
    const value = Math.max(1, Math.floor(Number(draft) || 1));
    const { error } = await supabase
      .from("site_settings")
      .update({ value })
      .eq("key", "max_qty_per_item");
    if (error) {
      toast(error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["site-setting-max-qty-per-item"] });
    toast("Cart limit saved");
  };

  return (
    <div className="admin-card">
      <div className="cart-sum-title" style={{ marginBottom: 14 }}>
        Cart limits
      </div>
      <div className="form-field" style={{ maxWidth: 240 }}>
        <label className="form-label">Max quantity per item</label>
        <input
          className="form-input"
          type="number"
          min={1}
          value={isLoading ? "" : draft}
          disabled={isLoading}
          onChange={(e) => setDraft(e.target.value)}
        />
        <p style={{ fontSize: 11, color: "var(--ink3)", marginTop: 4 }}>
          A customer cannot add more than this many of a single product to their bag.
        </p>
      </div>
      <button type="button" className="btn-ink" onClick={save} style={{ marginTop: 10 }}>
        Save
      </button>
    </div>
  );
}

function ColoursEditor() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data: serverColours = [], isLoading, isError } = useColourOptions();
  const [colours, setColours] = useState<ColourOption[]>([]);
  const [draft, setDraft] = useState("");
  const [draftError, setDraftError] = useState("");

  // Soft-deleted colours are hidden from this list entirely, matching the
  // categories admin list — restoring one is a manual SQL operation.
  useEffect(() => {
    setColours(serverColours.filter((c) => !c.deleted_at));
  }, [serverColours]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["colour-options"] });

  const add = async () => {
    const name = properCase(draft);
    if (!name) return;
    if (colours.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      setDraftError("This colour already exists");
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
    setDraft("");
    setDraftError("");
    invalidate();
    toast("Colour added");
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
    <div className="admin-card">
      <div className="cart-sum-title" style={{ marginBottom: 4 }}>
        Colours
      </div>
      <p style={{ fontSize: 11, color: "var(--ink3)", marginBottom: 12 }}>
        Colours are shown as text labels on the product page — no hex code needed.
      </p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {isLoading && <span style={{ fontSize: 12, color: "var(--ink3)" }}>Loading…</span>}
        {isError && <span style={{ fontSize: 12, color: "#b91c1c" }}>Couldn't load colours.</span>}
        {!isLoading && !isError && colours.length === 0 && (
          <span style={{ fontSize: 12, color: "var(--ink3)" }}>No values yet.</span>
        )}
        {!isLoading &&
          !isError &&
          colours.map((c) => (
            <span
              key={c.id}
              className="btn-outline"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 11,
                padding: "5px 8px 5px 10px",
              }}
            >
              {c.name}
              <button
                type="button"
                onClick={() => remove(c.id, c.name)}
                aria-label={`Remove ${c.name}`}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--rust)",
                  cursor: "pointer",
                  fontSize: 14,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </span>
          ))}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <input
            className="form-input"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setDraftError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void add();
              }
            }}
            placeholder="Add new colour"
          />
          {draftError && (
            <div style={{ color: "#b91c1c", fontSize: 11, marginTop: 4 }}>{draftError}</div>
          )}
        </div>
        <button type="button" className="btn-ink" onClick={add}>
          Add
        </button>
      </div>
    </div>
  );
}

const SIZE_SCALE_LABELS: Record<string, string> = {
  adult_clothing: "Adult Clothing",
  age_infant: "Infant Sizes",
  age_kids: "Kids Sizes",
  age_teens: "Teen Sizes",
  dress_material: "Dress Material",
  free_size: "Free Size",
};

async function fetchAllSizeOptionsForConfig(): Promise<SizeOption[]> {
  const { data, error } = await supabase
    .from("size_options")
    .select("*")
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

function SizesEditor() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data: scales = [], isLoading: scalesLoading, isError: scalesError } = useSizeScales();
  const {
    data: allSizes = [],
    isLoading: sizesLoading,
    isError: sizesError,
  } = useQuery({
    queryKey: ["all-size-options"],
    queryFn: fetchAllSizeOptionsForConfig,
  });
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [newScaleName, setNewScaleName] = useState("");

  const isLoading = scalesLoading || sizesLoading;
  const isError = scalesError || sizesError;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["size-scales"] });
    queryClient.invalidateQueries({ queryKey: ["all-size-options"] });
  };

  const addSize = async (scaleId: string) => {
    const label = (drafts[scaleId] ?? "").trim();
    if (!label) return;
    const scaleSizes = allSizes.filter((s) => s.scale_id === scaleId);
    if (scaleSizes.some((s) => s.label.toLowerCase() === label.toLowerCase())) {
      toast("This size already exists");
      return;
    }
    const nextSortOrder =
      scaleSizes.length === 0 ? 1 : Math.max(...scaleSizes.map((s) => s.sort_order)) + 1;
    const { error } = await supabase
      .from("size_options")
      .insert({ scale_id: scaleId, label, sort_order: nextSortOrder });
    if (error) {
      toast(error.message);
      return;
    }
    setDrafts((d) => ({ ...d, [scaleId]: "" }));
    invalidate();
    toast("Size added");
  };

  const removeSize = async (id: string, label: string) => {
    if (
      !confirm(
        `Remove ${label}? Products using this size will not be affected but it won't be available for new variants.`,
      )
    )
      return;
    const { error } = await supabase
      .from("size_options")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast(error.message);
      return;
    }
    invalidate();
    toast("Size removed");
  };

  const addScale = async () => {
    const name = newScaleName.trim();
    if (!name) return;
    if (scales.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
      toast("This size group already exists");
      return;
    }
    const { error } = await supabase.from("size_scales").insert({ name });
    if (error) {
      toast(error.message);
      return;
    }
    setNewScaleName("");
    invalidate();
    toast("Size group added");
  };

  const removeScale = async (id: string) => {
    if (!confirm("Remove this size group?")) return;
    const { error } = await supabase
      .from("size_scales")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast(error.message);
      return;
    }
    invalidate();
    toast("Size group removed");
  };

  return (
    <div className="admin-card">
      <div className="cart-sum-title" style={{ marginBottom: 4 }}>
        Sizes
      </div>
      <p style={{ fontSize: 11, color: "var(--ink3)", marginBottom: 12 }}>
        Manage available sizes. Add new sizes to any group, then assign them to categories from the
        Categories page.
      </p>

      {isLoading && <p style={{ fontSize: 12, color: "var(--ink3)" }}>Loading…</p>}
      {isError && <p style={{ fontSize: 12, color: "#b91c1c" }}>Couldn't load sizes.</p>}

      {!isLoading &&
        !isError &&
        scales.map((scale) => {
          const scaleSizes = allSizes
            .filter((s) => s.scale_id === scale.id)
            .sort((a, b) => a.sort_order - b.sort_order);
          const canRemoveScale = scaleSizes.length === 0;
          return (
            <div
              key={scale.id}
              style={{
                marginBottom: 18,
                paddingBottom: 18,
                borderBottom: "0.5px solid var(--b)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink2)" }}>
                  {SIZE_SCALE_LABELS[scale.name] ?? scale.name}
                </div>
                <button
                  type="button"
                  className="btn-text-rust"
                  disabled={!canRemoveScale}
                  title={canRemoveScale ? undefined : "Remove all sizes first"}
                  onClick={() => removeScale(scale.id)}
                  style={{
                    fontSize: 11,
                    opacity: canRemoveScale ? 1 : 0.4,
                    cursor: canRemoveScale ? "pointer" : "not-allowed",
                  }}
                >
                  Remove group
                </button>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                {scaleSizes.length === 0 && (
                  <span style={{ fontSize: 12, color: "var(--ink3)" }}>No sizes yet.</span>
                )}
                {scaleSizes.map((s) => (
                  <span
                    key={s.id}
                    className="btn-outline"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 11,
                      padding: "5px 8px 5px 10px",
                    }}
                  >
                    {s.label}
                    <button
                      type="button"
                      onClick={() => removeSize(s.id, s.label)}
                      aria-label={`Remove ${s.label}`}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--rust)",
                        cursor: "pointer",
                        fontSize: 14,
                        lineHeight: 1,
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  className="form-input"
                  value={drafts[scale.id] ?? ""}
                  onChange={(e) => setDrafts((d) => ({ ...d, [scale.id]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void addSize(scale.id);
                    }
                  }}
                  placeholder="Add new size"
                  style={{ flex: 1 }}
                />
                <button type="button" className="btn-ink" onClick={() => addSize(scale.id)}>
                  Add
                </button>
              </div>
            </div>
          );
        })}

      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink2)", marginBottom: 8 }}>
          Add new size group
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            className="form-input"
            value={newScaleName}
            onChange={(e) => setNewScaleName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void addScale();
              }
            }}
            placeholder="New size group name"
            style={{ flex: 1 }}
          />
          <button type="button" className="btn-ink" onClick={addScale}>
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfigAdmin() {
  const {
    data: badgeOptions = [],
    isLoading: badgesLoading,
    isError: badgesError,
  } = useBadgeOptions();
  const {
    data: fabricOptions = [],
    isLoading: fabricsLoading,
    isError: fabricsError,
  } = useFabricOptions();
  const {
    data: embroideryOptions = [],
    isLoading: embroideriesLoading,
    isError: embroideriesError,
  } = useEmbroideryOptions();
  const { data: careOptions = [], isLoading: careLoading, isError: careError } = useCareOptions();

  return (
    <>
      <h1 className="admin-h1">Configuration</h1>
      <p className="admin-sub">
        Manage option lists used across product forms and store-wide limits. Changes apply
        immediately.
      </p>

      <ColoursEditor />

      <TableChipEditor
        title="Corner Badges"
        hint="Shown on product cards (e.g. New in, Bestseller)."
        table="badge_options"
        queryKey="badge-options"
        options={badgeOptions}
        isLoading={badgesLoading}
        isError={badgesError}
        addPlaceholder="Add new badge"
      />

      <TableChipEditor
        title="Fabrics"
        hint="Available fabric options (Cotton, Silk, Linen…)."
        table="fabric_options"
        queryKey="fabric-options"
        options={fabricOptions}
        isLoading={fabricsLoading}
        isError={fabricsError}
        addPlaceholder="Add new fabric"
      />

      <TableChipEditor
        title="Embroideries"
        hint="Embroidery styles (Sozni, Chikankari…)."
        table="embroidery_options"
        queryKey="embroidery-options"
        options={embroideryOptions}
        isLoading={embroideriesLoading}
        isError={embroideriesError}
        addPlaceholder="Add new embroidery"
      />

      <TableChipEditor
        title="Care Instructions"
        hint="Care label options (Dry clean only…)."
        table="care_options"
        queryKey="care-options"
        options={careOptions}
        isLoading={careLoading}
        isError={careError}
        addPlaceholder="Add new care instruction"
      />

      <SizesEditor />

      <CartLimitsEditor />

      <StringListSiteSettingEditor
        title="Tags"
        hint="Used by rule-based homepage sections."
        settingKey="config_tags"
        fallback={TAGS_FALLBACK}
        addPlaceholder="Add new tag"
      />

      <StringListSiteSettingEditor
        title="Shipping Partners"
        hint="Couriers selectable when marking an order fulfilled (Delhivery, Blue Dart…)."
        settingKey="config_shipping_partners"
        fallback={SHIPPING_PARTNERS_FALLBACK}
        addPlaceholder="Add new shipping partner"
      />

      <StringListSiteSettingEditor
        title="Cancellation Reasons"
        hint="Reasons selectable when an admin cancels an order."
        settingKey="config_cancellation_reasons"
        fallback={CANCELLATION_REASONS_FALLBACK}
        addPlaceholder="Add new cancellation reason"
      />

      <HsnEditor />

      <GlobalFaqEditor />
    </>
  );
}

const HSN_SETTING_KEY = "config_hsn_codes";

function HsnEditor() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const {
    values: serverRows,
    isLoading,
    isError,
  } = useSiteSettingArray<HsnCode>(HSN_SETTING_KEY, HSN_CODES_FALLBACK);
  const [rows, setRows] = useState<HsnCode[]>(HSN_CODES_FALLBACK);
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [gstRate, setGstRate] = useState<number | "">("");

  useEffect(() => setRows(serverRows), [serverRows]);

  const persist = async (next: HsnCode[]) => {
    const error = await saveSiteSettingArray(HSN_SETTING_KEY, next);
    if (error) {
      toast(error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["site-setting", HSN_SETTING_KEY] });
  };

  const add = () => {
    const c = code.trim();
    const r = typeof gstRate === "number" ? gstRate : Number(gstRate);
    if (!c || !Number.isFinite(r) || r < 0) return;
    if (rows.some((h) => h.code.toLowerCase() === c.toLowerCase())) return;
    const next = [...rows, { code: c, description: description.trim() || undefined, gstRate: r }];
    setRows(next);
    void persist(next);
    setCode("");
    setDescription("");
    setGstRate("");
  };

  const updateRowLocal = (i: number, patch: Partial<HsnCode>) =>
    setRows((prev) => prev.map((h, idx) => (idx === i ? { ...h, ...patch } : h)));
  const persistRows = () => void persist(rows);
  const remove = (i: number) => {
    const next = rows.filter((_, idx) => idx !== i);
    setRows(next);
    void persist(next);
  };

  return (
    <div className="admin-card">
      <div className="cart-sum-title" style={{ marginBottom: 4 }}>
        HSN codes &amp; GST rates
      </div>
      <p style={{ fontSize: 11, color: "var(--ink3)", marginBottom: 12 }}>
        Add HSN codes with their applicable GST rate (in %). Product prices are stored as{" "}
        <strong>inclusive of GST</strong>, and the breakup is auto-derived from the selected HSN.
      </p>

      {isLoading && <p style={{ fontSize: 12, color: "var(--ink3)" }}>Loading…</p>}
      {isError && <p style={{ fontSize: 12, color: "#b91c1c" }}>Couldn't load HSN codes.</p>}

      {!isLoading && !isError && rows.length === 0 && (
        <p style={{ fontSize: 12, color: "var(--ink3)", marginBottom: 10 }}>No HSN codes yet.</p>
      )}

      {!isLoading && !isError && rows.length > 0 && (
        <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "120px 1fr 110px 80px",
              gap: 8,
              fontSize: 11,
              color: "var(--ink3)",
              textTransform: "uppercase",
              letterSpacing: 0.4,
            }}
          >
            <span>HSN</span>
            <span>Description</span>
            <span>GST %</span>
            <span></span>
          </div>
          {rows.map((h, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "120px 1fr 110px 80px",
                gap: 8,
                alignItems: "center",
              }}
            >
              <input
                className="form-input"
                value={h.code}
                onChange={(e) => updateRowLocal(i, { code: e.target.value })}
                onBlur={persistRows}
              />
              <input
                className="form-input"
                value={h.description ?? ""}
                onChange={(e) => updateRowLocal(i, { description: e.target.value })}
                onBlur={persistRows}
              />
              <input
                className="form-input"
                type="number"
                min={0}
                step={0.5}
                value={h.gstRate}
                onChange={(e) => updateRowLocal(i, { gstRate: Number(e.target.value) })}
                onBlur={persistRows}
              />
              <button
                type="button"
                className="btn-text-rust"
                onClick={() => remove(i)}
                style={{ fontSize: 12 }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 110px auto", gap: 8 }}>
        <input
          className="form-input"
          placeholder="HSN code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <input
          className="form-input"
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <input
          className="form-input"
          placeholder="GST %"
          type="number"
          min={0}
          step={0.5}
          value={gstRate}
          onChange={(e) => setGstRate(e.target.value === "" ? "" : Number(e.target.value))}
        />
        <button type="button" className="btn-ink" onClick={add}>
          Add
        </button>
      </div>
    </div>
  );
}

const GLOBAL_FAQS_SETTING_KEY = "config_global_faqs";

function GlobalFaqEditor() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const {
    values: serverRows,
    isLoading,
    isError,
  } = useSiteSettingArray<FaqEntry>(GLOBAL_FAQS_SETTING_KEY, GLOBAL_FAQS_FALLBACK);
  const [rows, setRows] = useState<FaqEntry[]>(GLOBAL_FAQS_FALLBACK);

  useEffect(() => setRows(serverRows), [serverRows]);

  const persist = async (next: FaqEntry[]) => {
    const error = await saveSiteSettingArray(GLOBAL_FAQS_SETTING_KEY, next);
    if (error) {
      toast(error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["site-setting", GLOBAL_FAQS_SETTING_KEY] });
  };

  const updateLocal = (i: number, patch: Partial<FaqEntry>) =>
    setRows((prev) => prev.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  const persistRows = () => void persist(rows);
  const remove = (i: number) => {
    const next = rows.filter((_, idx) => idx !== i);
    setRows(next);
    void persist(next);
  };
  const add = () => {
    const next = [...rows, { q: "", a: "" }];
    setRows(next);
    void persist(next);
  };

  return (
    <div className="admin-card">
      <div className="cart-sum-title" style={{ marginBottom: 4 }}>
        Global FAQs
      </div>
      <p style={{ fontSize: 11, color: "var(--ink3)", marginBottom: 12 }}>
        Shown on product pages that don't have their own FAQs, and emitted as <code>FAQPage</code>{" "}
        structured data for AI search engines.
      </p>

      {isLoading && <p style={{ fontSize: 12, color: "var(--ink3)" }}>Loading…</p>}
      {isError && <p style={{ fontSize: 12, color: "#b91c1c" }}>Couldn't load Global FAQs.</p>}

      {!isLoading && !isError && (
        <div style={{ display: "grid", gap: 10 }}>
          {rows.map((row, i) => (
            <div
              key={i}
              style={{
                border: "1px solid var(--line)",
                borderRadius: 8,
                padding: 12,
                display: "grid",
                gap: 8,
              }}
            >
              <div
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
              >
                <span className="form-label" style={{ margin: 0 }}>
                  Q&amp;A #{i + 1}
                </span>
                <button
                  type="button"
                  className="btn-text-rust"
                  onClick={() => remove(i)}
                  style={{ fontSize: 12 }}
                >
                  Remove
                </button>
              </div>
              <input
                className="form-input"
                placeholder="Question"
                value={row.q}
                onChange={(e) => updateLocal(i, { q: e.target.value })}
                onBlur={persistRows}
              />
              <textarea
                className="form-textarea"
                rows={2}
                placeholder="Answer"
                value={row.a}
                onChange={(e) => updateLocal(i, { a: e.target.value })}
                onBlur={persistRows}
              />
            </div>
          ))}
          <button
            type="button"
            className="btn-outline"
            onClick={add}
            style={{ alignSelf: "start" }}
          >
            + Add FAQ
          </button>
        </div>
      )}
    </div>
  );
}
