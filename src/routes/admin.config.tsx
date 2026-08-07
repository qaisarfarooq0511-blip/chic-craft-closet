import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useColourOptions } from "@/hooks/useColourOptions";
import { getConfig, saveConfig, type AppConfig, type HsnCode } from "@/lib/storage";
import { useToast } from "@/lib/toast";
import type { ColourOption } from "@/types/database";

export const Route = createFileRoute("/admin/config")({
  component: ConfigAdmin,
});

type ListKey =
  | "badges"
  | "fabrics"
  | "embroideries"
  | "careOptions"
  | "tags"
  | "sizes"
  | "shippingPartners"
  | "cancellationReasons";

const LIST_FIELDS: { key: ListKey; label: string; hint: string }[] = [
  {
    key: "badges",
    label: "Corner Badges",
    hint: "Shown on product cards (e.g. New in, Bestseller).",
  },
  { key: "fabrics", label: "Fabrics", hint: "Available fabric options (Cotton, Silk, Linen…)." },
  { key: "embroideries", label: "Embroideries", hint: "Embroidery styles (Sozni, Chikankari…)." },
  { key: "careOptions", label: "Care Instructions", hint: "Care label options (Dry clean only…)." },
  { key: "tags", label: "Tags", hint: "Used by rule-based homepage sections." },
  { key: "sizes", label: "Sizes", hint: "All available size labels (XS–XL, age ranges…)." },
  {
    key: "shippingPartners",
    label: "Shipping Partners",
    hint: "Couriers selectable when marking an order fulfilled (Delhivery, Blue Dart…).",
  },
  {
    key: "cancellationReasons",
    label: "Cancellation Reasons",
    hint: "Reasons selectable when an admin cancels an order.",
  },
];

function ListEditor({
  label,
  hint,
  values,
  onChange,
}: {
  label: string;
  hint: string;
  values: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    if (values.some((x) => x.toLowerCase() === v.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...values, v]);
    setDraft("");
  };
  return (
    <div className="admin-card">
      <div className="cart-sum-title" style={{ marginBottom: 4 }}>
        {label}
      </div>
      <p style={{ fontSize: 11, color: "var(--ink3)", marginBottom: 12 }}>{hint}</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {values.length === 0 && (
          <span style={{ fontSize: 12, color: "var(--ink3)" }}>No values yet.</span>
        )}
        {values.map((v) => (
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
              onClick={() => onChange(values.filter((x) => x !== v))}
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
          placeholder={`Add new ${label.toLowerCase().replace(/s$/, "")}`}
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

function ConfigAdmin() {
  const [cfg, setCfg] = useState<AppConfig>(getConfig());
  const toast = useToast();

  useEffect(() => {
    setCfg(getConfig());
  }, []);

  const update = <K extends keyof AppConfig>(k: K, v: AppConfig[K]) =>
    setCfg((c) => ({ ...c, [k]: v }));

  const save = () => {
    const max = Math.max(1, Math.floor(cfg.maxQtyPerItem || 1));
    const next = { ...cfg, maxQtyPerItem: max };
    saveConfig(next);
    setCfg(next);
    toast("Configuration saved");
  };

  return (
    <>
      <h1 className="admin-h1">Configuration</h1>
      <p className="admin-sub">
        Manage option lists used across product forms and store-wide limits. Changes apply
        immediately.
      </p>

      <ColoursEditor />

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
            value={cfg.maxQtyPerItem}
            onChange={(e) => update("maxQtyPerItem", Number(e.target.value))}
          />
          <p style={{ fontSize: 11, color: "var(--ink3)", marginTop: 4 }}>
            A customer cannot add more than this many of a single product to their bag.
          </p>
        </div>
      </div>

      {LIST_FIELDS.map((f) => (
        <ListEditor
          key={f.key}
          label={f.label}
          hint={f.hint}
          values={cfg[f.key]}
          onChange={(next) => update(f.key, next)}
        />
      ))}

      <HsnEditor values={cfg.hsnCodes} onChange={(next) => update("hsnCodes", next)} />

      <GlobalFaqEditor values={cfg.globalFaqs} onChange={(next) => update("globalFaqs", next)} />

      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        <button type="button" className="cta-primary" onClick={save}>
          Save configuration
        </button>
      </div>
    </>
  );
}

function HsnEditor({
  values,
  onChange,
}: {
  values: HsnCode[];
  onChange: (next: HsnCode[]) => void;
}) {
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [gstRate, setGstRate] = useState<number | "">("");

  const add = () => {
    const c = code.trim();
    const r = typeof gstRate === "number" ? gstRate : Number(gstRate);
    if (!c || !Number.isFinite(r) || r < 0) return;
    if (values.some((h) => h.code.toLowerCase() === c.toLowerCase())) return;
    onChange([...values, { code: c, description: description.trim() || undefined, gstRate: r }]);
    setCode("");
    setDescription("");
    setGstRate("");
  };

  const updateRow = (i: number, patch: Partial<HsnCode>) =>
    onChange(values.map((h, idx) => (idx === i ? { ...h, ...patch } : h)));
  const remove = (i: number) => onChange(values.filter((_, idx) => idx !== i));

  return (
    <div className="admin-card">
      <div className="cart-sum-title" style={{ marginBottom: 4 }}>
        HSN codes &amp; GST rates
      </div>
      <p style={{ fontSize: 11, color: "var(--ink3)", marginBottom: 12 }}>
        Add HSN codes with their applicable GST rate (in %). Product prices are stored as{" "}
        <strong>inclusive of GST</strong>, and the breakup is auto-derived from the selected HSN.
      </p>

      {values.length === 0 && (
        <p style={{ fontSize: 12, color: "var(--ink3)", marginBottom: 10 }}>No HSN codes yet.</p>
      )}

      {values.length > 0 && (
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
          {values.map((h, i) => (
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
                onChange={(e) => updateRow(i, { code: e.target.value })}
              />
              <input
                className="form-input"
                value={h.description ?? ""}
                onChange={(e) => updateRow(i, { description: e.target.value })}
              />
              <input
                className="form-input"
                type="number"
                min={0}
                step={0.5}
                value={h.gstRate}
                onChange={(e) => updateRow(i, { gstRate: Number(e.target.value) })}
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

function GlobalFaqEditor({
  values,
  onChange,
}: {
  values: { q: string; a: string }[];
  onChange: (v: { q: string; a: string }[]) => void;
}) {
  const update = (i: number, patch: Partial<{ q: string; a: string }>) =>
    onChange(values.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  const remove = (i: number) => onChange(values.filter((_, idx) => idx !== i));
  const add = () => onChange([...values, { q: "", a: "" }]);
  return (
    <div className="admin-card">
      <div className="cart-sum-title" style={{ marginBottom: 4 }}>
        Global FAQs
      </div>
      <p style={{ fontSize: 11, color: "var(--ink3)", marginBottom: 12 }}>
        Shown on product pages that don't have their own FAQs, and emitted as <code>FAQPage</code>{" "}
        structured data for AI search engines.
      </p>
      <div style={{ display: "grid", gap: 10 }}>
        {values.map((row, i) => (
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
              onChange={(e) => update(i, { q: e.target.value })}
            />
            <textarea
              className="form-textarea"
              rows={2}
              placeholder="Answer"
              value={row.a}
              onChange={(e) => update(i, { a: e.target.value })}
            />
          </div>
        ))}
        <button type="button" className="btn-outline" onClick={add} style={{ alignSelf: "start" }}>
          + Add FAQ
        </button>
      </div>
    </div>
  );
}
