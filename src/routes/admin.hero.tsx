import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getHero, saveHero } from "@/lib/storage";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { useToast } from "@/lib/toast";
import type { HeroContent } from "@/lib/types";

export const Route = createFileRoute("/admin/hero")({
  component: HeroAdmin,
});

function HeroAdmin() {
  const toast = useToast();
  const [h, setH] = useState<HeroContent | null>(null);

  useEffect(() => { setH(getHero()); }, []);

  if (!h) return <div className="admin-h1">Loading…</div>;

  const set = <K extends keyof HeroContent>(k: K, v: HeroContent[K]) => setH({ ...h, [k]: v });
  const setImg = (which: keyof HeroContent["images"], src: string | undefined) => {
    setH({ ...h, images: { ...h.images, [which]: src ?? "" } });
  };

  const save = () => { saveHero(h); toast("Hero saved"); };

  return (
    <>
      <h1 className="admin-h1">Hero banner</h1>
      <p className="admin-sub">The big headline, copy, CTAs and images at the top of the homepage.</p>

      <div className="admin-card">
        <div className="cart-sum-title" style={{ marginBottom: 14 }}>Copy</div>
        <div className="form-field"><label className="form-label">Eyebrow</label>
          <input className="form-input" value={h.eyebrow} onChange={(e) => set("eyebrow", e.target.value)} />
        </div>
        <div className="form-field"><label className="form-label">Headline (use Enter for line breaks)</label>
          <textarea className="form-textarea" rows={3} value={h.headline} onChange={(e) => set("headline", e.target.value)} />
        </div>
        <div className="form-field"><label className="form-label">Subtitle</label>
          <textarea className="form-textarea" rows={2} value={h.sub} onChange={(e) => set("sub", e.target.value)} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div className="form-field"><label className="form-label">Primary button label</label>
            <input className="form-input" value={h.ctaPrimary.label} onChange={(e) => set("ctaPrimary", { ...h.ctaPrimary, label: e.target.value })} />
          </div>
          <div className="form-field"><label className="form-label">Primary button link</label>
            <input className="form-input" value={h.ctaPrimary.href} onChange={(e) => set("ctaPrimary", { ...h.ctaPrimary, href: e.target.value })} />
          </div>
          <div className="form-field"><label className="form-label">Secondary button label</label>
            <input className="form-input" value={h.ctaSecondary.label} onChange={(e) => set("ctaSecondary", { ...h.ctaSecondary, label: e.target.value })} />
          </div>
          <div className="form-field"><label className="form-label">Secondary button link</label>
            <input className="form-input" value={h.ctaSecondary.href} onChange={(e) => set("ctaSecondary", { ...h.ctaSecondary, href: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="admin-card">
        <ImageUploader
          label="Main hero image"
          hint="Tall portrait image — featured on the right side of the hero."
          value={h.images.main ? [h.images.main] : []}
          onChange={(imgs) => setImg("main", imgs[0])}
          max={1}
          enableMain={false}
          target="heroMain"
        />
      </div>

      <div className="admin-card">
        <ImageUploader
          label="Secondary image — left"
          hint="Small image under the main one."
          value={h.images.smallLeft ? [h.images.smallLeft] : []}
          onChange={(imgs) => setImg("smallLeft", imgs[0])}
          max={1}
          enableMain={false}
          target="heroSmall"
        />
      </div>

      <div className="admin-card">
        <ImageUploader
          label="Secondary image — right"
          hint="Second small image under the main one."
          value={h.images.smallRight ? [h.images.smallRight] : []}
          onChange={(imgs) => setImg("smallRight", imgs[0])}
          max={1}
          enableMain={false}
          target="heroSmall"
        />
      </div>

      <button className="cta-primary" onClick={save}>Save hero</button>
    </>
  );
}
