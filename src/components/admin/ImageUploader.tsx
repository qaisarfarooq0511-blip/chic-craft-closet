import { useState, type ChangeEvent } from "react";
import { IconUpload, IconX, IconStar, IconStarFilled, IconSparkles, IconLoader2 } from "@tabler/icons-react";
import { aiEnhance, fileToDataUrl, resizeToTarget, TARGETS, type TargetSize } from "@/lib/image-pipeline";
import { useToast } from "@/lib/toast";

interface ImageItem {
  src: string;
  enhancing?: boolean;
}

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
  mainIndex?: number;
  onMainIndexChange?: (i: number) => void;
  max?: number;
  target?: TargetSize | keyof typeof TARGETS;
  enableMain?: boolean;
  enableEnhance?: boolean;
  label?: string;
  hint?: string;
}

export function ImageUploader({
  value, onChange,
  mainIndex = 0, onMainIndexChange,
  max = 5,
  target = "product",
  enableMain = true,
  enableEnhance = true,
  label = "Photos",
  hint = "Upload up to 5 photos. The first (or starred) one is the main image. Enhance to clean the background and resize automatically.",
}: Props) {
  const toast = useToast();
  const [busy, setBusy] = useState<number | "all" | null>(null);

  const t: TargetSize = typeof target === "string" ? TARGETS[target] : target;

  const onFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    const remaining = max - value.length;
    const take = files.slice(0, Math.max(0, remaining));
    if (files.length > take.length) toast(`Only ${remaining} more image${remaining === 1 ? "" : "s"} allowed`);
    if (!take.length) return;
    setBusy("all");
    try {
      const next: string[] = [];
      for (const f of take) {
        const raw = await fileToDataUrl(f);
        const resized = await resizeToTarget(raw, t);
        next.push(resized);
      }
      onChange([...value, ...next]);
      toast(`${next.length} image${next.length === 1 ? "" : "s"} added`);
    } catch (err) {
      console.error(err);
      toast("Image processing failed");
    } finally {
      setBusy(null);
    }
  };

  const remove = (i: number) => {
    const next = value.filter((_, idx) => idx !== i);
    onChange(next);
    if (onMainIndexChange) {
      if (i === mainIndex) onMainIndexChange(0);
      else if (i < mainIndex) onMainIndexChange(mainIndex - 1);
    }
  };

  const enhanceOne = async (i: number) => {
    setBusy(i);
    try {
      const out = await aiEnhance(value[i]);
      const resized = await resizeToTarget(out, t);
      const next = [...value];
      next[i] = resized;
      onChange(next);
      toast("Image enhanced");
    } catch (err) {
      console.error(err);
      toast(err instanceof Error ? err.message : "Enhance failed");
    } finally {
      setBusy(null);
    }
  };

  const setMain = (i: number) => {
    onMainIndexChange?.(i);
  };

  return (
    <div>
      <div className="cart-sum-title" style={{ marginBottom: 6 }}>{label}</div>
      <p style={{ fontSize: 11, color: "var(--ink3)", marginBottom: 10 }}>{hint}</p>

      {value.length < max && (
        <label className="image-uploader">
          {busy === "all" ? <IconLoader2 className="spin" /> : <IconUpload />}
          <div style={{ fontSize: 13, color: "var(--ink2)", marginBottom: 4 }}>
            {busy === "all" ? "Processing…" : "Click to upload photos"}
          </div>
          <div className="image-uploader-hint">JPG / PNG / HEIC · {max - value.length} slot{max - value.length === 1 ? "" : "s"} left · auto-resized to {t.width}×{t.height}</div>
          <input type="file" accept="image/*" multiple onChange={onFiles} style={{ display: "none" }} disabled={busy !== null} />
        </label>
      )}

      {value.length > 0 && (
        <div className="image-thumbs" style={{ marginTop: 14 }}>
          {value.map((src, i) => {
            const isMain = i === mainIndex;
            const isBusy = busy === i;
            return (
              <div key={i} className="image-thumb" style={{ position: "relative", outline: isMain ? "2px solid var(--gold)" : undefined, outlineOffset: 2 }}>
                <img src={src} alt={`Photo ${i + 1}`} />
                {isBusy && (
                  <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,.7)", display: "grid", placeItems: "center" }}>
                    <IconLoader2 className="spin" />
                  </div>
                )}
                <button type="button" className="image-thumb-x" onClick={() => remove(i)} aria-label="Remove" disabled={isBusy}>
                  <IconX />
                </button>
                <div style={{ position: "absolute", left: 6, top: 6, display: "flex", gap: 4 }}>
                  {enableMain && (
                    <button
                      type="button"
                      onClick={() => setMain(i)}
                      title={isMain ? "Main image" : "Set as main"}
                      style={{ background: "rgba(255,255,255,.92)", border: "none", borderRadius: 999, width: 26, height: 26, display: "grid", placeItems: "center", cursor: "pointer", color: isMain ? "var(--gold)" : "var(--ink2)" }}
                    >
                      {isMain ? <IconStarFilled size={14} /> : <IconStar size={14} />}
                    </button>
                  )}
                  {enableEnhance && (
                    <button
                      type="button"
                      onClick={() => enhanceOne(i)}
                      disabled={isBusy || busy !== null}
                      title="AI enhance"
                      style={{ background: "rgba(255,255,255,.92)", border: "none", borderRadius: 999, width: 26, height: 26, display: "grid", placeItems: "center", cursor: "pointer", color: "var(--ink2)" }}
                    >
                      <IconSparkles size={14} />
                    </button>
                  )}
                </div>
                {isMain && (
                  <div style={{ position: "absolute", bottom: 6, left: 6, background: "var(--gold)", color: "white", fontSize: 9, fontWeight: 600, padding: "2px 6px", borderRadius: 4, letterSpacing: 0.5, textTransform: "uppercase" }}>Main</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
