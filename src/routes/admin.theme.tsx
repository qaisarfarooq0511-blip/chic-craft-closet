import { createFileRoute } from "@tanstack/react-router";
import {
  PRESETS,
  useTheme,
  resolvePalette,
  type SectionKey,
  type SectionConfig,
} from "@/lib/theme-context";

export const Route = createFileRoute("/admin/theme")({
  head: () => ({
    meta: [
      { title: "Theme — Yaawun admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ThemePage,
});

const SECTIONS: { key: SectionKey; label: string; blurb: string }[] = [
  { key: "hero",    label: "Hero",    blurb: "Top banner on the homepage." },
  { key: "reviews", label: "Reviews", blurb: "Dark reviews band below featured products." },
  { key: "footer",  label: "Footer",  blurb: "Footer band across every page." },
];

function ThemePage() {
  const { state, setSection, resetAll } = useTheme();

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div>
          <div className="eyebrow">Appearance</div>
          <h1 className="admin-h1">Section themes</h1>
          <p style={{ fontSize: 12, color: "var(--ink3)", marginTop: 6, maxWidth: 560 }}>
            Mix and match palettes across the Hero, Reviews, and Footer sections. Changes apply
            globally and live-update on the storefront.
          </p>
        </div>
        <button className="btn-outline" onClick={resetAll}>Reset all to Current</button>
      </div>

      <div style={{ display: "grid", gap: 24, marginTop: 24 }}>
        {SECTIONS.map((s) => (
          <SectionPanel
            key={s.key}
            section={s}
            cfg={state[s.key]}
            onChange={(cfg) => setSection(s.key, cfg)}
          />
        ))}
      </div>
    </div>
  );
}

function SectionPanel({
  section,
  cfg,
  onChange,
}: {
  section: { key: SectionKey; label: string; blurb: string };
  cfg: SectionConfig;
  onChange: (c: SectionConfig) => void;
}) {
  const resolved = resolvePalette(cfg);

  return (
    <div className="admin-card" style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div className="eyebrow">{section.label}</div>
          <div style={{ fontSize: 13, color: "var(--ink3)", marginTop: 4 }}>{section.blurb}</div>
        </div>
        <PreviewSwatch bg={resolved.bg} accent={resolved.accent} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10, marginTop: 16 }}>
        {PRESETS.map((p) => {
          const active = cfg.kind === "preset" && cfg.presetId === p.id;
          return (
            <button
              key={p.id}
              onClick={() => onChange({ kind: "preset", presetId: p.id })}
              style={{
                cursor: "pointer",
                textAlign: "left",
                padding: 10,
                borderRadius: "var(--r2)",
                border: active ? "1.5px solid var(--gold)" : "0.5px solid var(--b)",
                background: "var(--cream)",
                display: "flex",
                gap: 10,
                alignItems: "center",
              }}
            >
              <span style={{ width: 36, height: 36, borderRadius: 6, background: p.palette.bg, position: "relative", flexShrink: 0 }}>
                <span style={{ position: "absolute", right: 4, bottom: 4, width: 12, height: 12, borderRadius: 3, background: p.palette.accent }} />
              </span>
              <span style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: "var(--ink)" }}>{p.name}</div>
                <div style={{ fontSize: 10, color: "var(--ink3)", marginTop: 2 }}>{p.palette.bg.toUpperCase()}</div>
              </span>
            </button>
          );
        })}

        <button
          onClick={() =>
            onChange({
              kind: "custom",
              palette: cfg.kind === "custom" ? cfg.palette : { ...resolved },
            })
          }
          style={{
            cursor: "pointer",
            textAlign: "left",
            padding: 10,
            borderRadius: "var(--r2)",
            border: cfg.kind === "custom" ? "1.5px solid var(--gold)" : "0.5px dashed var(--b2)",
            background: "var(--cream)",
            display: "flex",
            gap: 10,
            alignItems: "center",
          }}
        >
          <span style={{
            width: 36, height: 36, borderRadius: 6, flexShrink: 0,
            background: "conic-gradient(#1C1410, #D4A843, #A5D6A7, #C5A8F0, #8EAFD4, #80CBC4, #1C1410)",
          }} />
          <span>
            <div style={{ fontSize: 12, fontWeight: 500, color: "var(--ink)" }}>Custom palette</div>
            <div style={{ fontSize: 10, color: "var(--ink3)", marginTop: 2 }}>Pick your own colors</div>
          </span>
        </button>
      </div>

      {cfg.kind === "custom" && (
        <div style={{ marginTop: 14, padding: 14, borderRadius: "var(--r2)", background: "var(--cream2)", display: "flex", gap: 20, flexWrap: "wrap" }}>
          <ColorField
            label="Background"
            value={cfg.palette.bg}
            onChange={(v) => onChange({ kind: "custom", palette: { ...cfg.palette, bg: v } })}
          />
          <ColorField
            label="Accent"
            value={cfg.palette.accent}
            onChange={(v) => onChange({ kind: "custom", palette: { ...cfg.palette, accent: v } })}
          />
        </div>
      )}
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span className="form-label">{label}</span>
      <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: 44, height: 36, border: "0.5px solid var(--b)", borderRadius: 6, background: "transparent", cursor: "pointer" }}
        />
        <input
          className="form-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: 110, fontFamily: "monospace", fontSize: 12 }}
        />
      </span>
    </label>
  );
}

function PreviewSwatch({ bg, accent }: { bg: string; accent: string }) {
  return (
    <div style={{
      background: bg,
      padding: "10px 14px",
      borderRadius: "var(--r2)",
      display: "flex",
      alignItems: "center",
      gap: 10,
      minWidth: 200,
    }}>
      <span style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", color: "#FAF7F2", fontSize: 16 }}>
        Yaawun
      </span>
      <span style={{ fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: accent }}>
        Preview
      </span>
    </div>
  );
}
