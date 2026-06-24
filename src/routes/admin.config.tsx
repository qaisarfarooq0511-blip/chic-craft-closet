import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getConfig, saveConfig, type AppConfig } from "@/lib/storage";
import { useToast } from "@/lib/toast";

export const Route = createFileRoute("/admin/config")({
  component: ConfigAdmin,
});

type ListKey = "badges" | "fabrics" | "embroideries" | "careOptions" | "tags" | "sizes";

const LIST_FIELDS: { key: ListKey; label: string; hint: string }[] = [
  { key: "badges", label: "Corner Badges", hint: "Shown on product cards (e.g. New in, Bestseller)." },
  { key: "fabrics", label: "Fabrics", hint: "Available fabric options (Cotton, Silk, Linen…)." },
  { key: "embroideries", label: "Embroideries", hint: "Embroidery styles (Sozni, Chikankari…)." },
  { key: "careOptions", label: "Care Instructions", hint: "Care label options (Dry clean only…)." },
  { key: "tags", label: "Tags", hint: "Used by rule-based homepage sections." },
  { key: "sizes", label: "Sizes", hint: "All available size labels (XS–XL, age ranges…)." },
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
    if (values.some((x) => x.toLowerCase() === v.toLowerCase())) { setDraft(""); return; }
    onChange([...values, v]);
    setDraft("");
  };
  return (
    <div className="admin-card">
      <div className="cart-sum-title" style={{ marginBottom: 4 }}>{label}</div>
      <p style={{ fontSize: 11, color: "var(--ink3)", marginBottom: 12 }}>{hint}</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {values.length === 0 && <span style={{ fontSize: 12, color: "var(--ink3)" }}>No values yet.</span>}
        {values.map((v) => (
          <span key={v} className="btn-outline" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, padding: "5px 8px 5px 10px" }}>
            {v}
            <button
              type="button"
              onClick={() => onChange(values.filter((x) => x !== v))}
              aria-label={`Remove ${v}`}
              style={{ background: "none", border: "none", color: "var(--rust)", cursor: "pointer", fontSize: 14, lineHeight: 1 }}
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
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={`Add new ${label.toLowerCase().replace(/s$/, "")}`}
          style={{ flex: 1 }}
        />
        <button type="button" className="btn-ink" onClick={add}>Add</button>
      </div>
    </div>
  );
}

function ConfigAdmin() {
  const [cfg, setCfg] = useState<AppConfig>(getConfig());
  const toast = useToast();

  useEffect(() => { setCfg(getConfig()); }, []);

  const update = <K extends keyof AppConfig>(k: K, v: AppConfig[K]) => setCfg((c) => ({ ...c, [k]: v }));

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
      <p className="admin-sub">Manage option lists used across product forms and store-wide limits. Changes apply immediately.</p>

      <div className="admin-card">
        <div className="cart-sum-title" style={{ marginBottom: 14 }}>Cart limits</div>
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

      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        <button type="button" className="cta-primary" onClick={save}>Save configuration</button>
      </div>
    </>
  );
}
