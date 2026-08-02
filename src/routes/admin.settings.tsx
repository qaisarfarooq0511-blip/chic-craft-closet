import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useToast } from "@/lib/toast";

export const Route = createFileRoute("/admin/settings")({
  component: SiteSettingsAdmin,
});

const SETTINGS_KEYS = [
  "announcement_bar",
  "free_delivery_threshold",
  "delivery_charge",
  "store_whatsapp",
  "seo_site_name",
  "seo_site_description",
  "hero_eyebrow",
  "hero_headline",
  "hero_subheadline",
  "hero_cta_primary_label",
  "hero_cta_primary_href",
  "hero_cta_secondary_label",
  "hero_cta_secondary_href",
] as const;

interface FormState {
  announcementBar: string;
  freeDeliveryThresholdRupees: string;
  deliveryChargeRupees: string;
  storeWhatsapp: string;
  seoSiteName: string;
  seoSiteDescription: string;
  heroEyebrow: string;
  heroHeadline: string;
  heroSubheadline: string;
  heroCtaPrimaryLabel: string;
  heroCtaPrimaryHref: string;
  heroCtaSecondaryLabel: string;
  heroCtaSecondaryHref: string;
}

const EMPTY_FORM: FormState = {
  announcementBar: "",
  freeDeliveryThresholdRupees: "",
  deliveryChargeRupees: "",
  storeWhatsapp: "",
  seoSiteName: "",
  seoSiteDescription: "",
  heroEyebrow: "",
  heroHeadline: "",
  heroSubheadline: "",
  heroCtaPrimaryLabel: "",
  heroCtaPrimaryHref: "",
  heroCtaSecondaryLabel: "",
  heroCtaSecondaryHref: "",
};

async function fetchSettings(): Promise<Record<string, unknown>> {
  const { data, error } = await supabase
    .from("site_settings")
    .select("key, value")
    .in("key", SETTINGS_KEYS);
  if (error) throw error;
  const map: Record<string, unknown> = {};
  for (const row of data ?? []) map[row.key] = row.value;
  return map;
}

const paiseToRupeeString = (paise: unknown): string =>
  typeof paise === "number" ? String(paise / 100) : "";
const str = (value: unknown): string => (typeof value === "string" ? value : "");

type SavingSection = "announcementDelivery" | "seo" | "hero" | null;

function SiteSettingsAdmin() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { session } = useSupabaseAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-site-settings"],
    queryFn: fetchSettings,
  });

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState<SavingSection>(null);

  useEffect(() => {
    if (!data) return;
    setForm({
      announcementBar: str(data.announcement_bar),
      freeDeliveryThresholdRupees: paiseToRupeeString(data.free_delivery_threshold),
      deliveryChargeRupees: paiseToRupeeString(data.delivery_charge),
      storeWhatsapp: str(data.store_whatsapp),
      seoSiteName: str(data.seo_site_name),
      seoSiteDescription: str(data.seo_site_description),
      heroEyebrow: str(data.hero_eyebrow),
      heroHeadline: str(data.hero_headline),
      heroSubheadline: str(data.hero_subheadline),
      heroCtaPrimaryLabel: str(data.hero_cta_primary_label),
      heroCtaPrimaryHref: str(data.hero_cta_primary_href),
      heroCtaSecondaryLabel: str(data.hero_cta_secondary_label),
      heroCtaSecondaryHref: str(data.hero_cta_secondary_href),
    });
  }, [data]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const upsertKeys = async (rows: { key: string; value: unknown }[]) => {
    const updated_by = session?.user.id;
    const updated_at = new Date().toISOString();
    const { error } = await supabase
      .from("site_settings")
      .upsert(rows.map((r) => ({ ...r, updated_by, updated_at })));
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ["admin-site-settings"] });
  };

  const saveAnnouncementDelivery = async () => {
    const freeDeliveryThreshold = Math.round(Number(form.freeDeliveryThresholdRupees) * 100);
    const deliveryCharge = Math.round(Number(form.deliveryChargeRupees) * 100);

    if (!Number.isFinite(freeDeliveryThreshold) || freeDeliveryThreshold < 0) {
      toast("Free delivery threshold must be a valid amount");
      return;
    }
    if (!Number.isFinite(deliveryCharge) || deliveryCharge < 0) {
      toast("Delivery charge must be a valid amount");
      return;
    }

    setSaving("announcementDelivery");
    try {
      await upsertKeys([
        { key: "announcement_bar", value: form.announcementBar },
        { key: "free_delivery_threshold", value: freeDeliveryThreshold },
        { key: "delivery_charge", value: deliveryCharge },
        { key: "store_whatsapp", value: form.storeWhatsapp },
      ]);
      toast("Announcement & delivery settings saved");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(null);
    }
  };

  const saveSeo = async () => {
    setSaving("seo");
    try {
      await upsertKeys([
        { key: "seo_site_name", value: form.seoSiteName },
        { key: "seo_site_description", value: form.seoSiteDescription },
      ]);
      toast("SEO settings saved");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(null);
    }
  };

  const saveHero = async () => {
    setSaving("hero");
    try {
      await upsertKeys([
        { key: "hero_eyebrow", value: form.heroEyebrow },
        { key: "hero_headline", value: form.heroHeadline },
        { key: "hero_subheadline", value: form.heroSubheadline },
        { key: "hero_cta_primary_label", value: form.heroCtaPrimaryLabel },
        { key: "hero_cta_primary_href", value: form.heroCtaPrimaryHref },
        { key: "hero_cta_secondary_label", value: form.heroCtaSecondaryLabel },
        { key: "hero_cta_secondary_href", value: form.heroCtaSecondaryHref },
      ]);
      toast("Hero banner settings saved");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(null);
    }
  };

  return (
    <>
      <h1 className="admin-h1">Store settings</h1>
      <p className="admin-sub">
        Read by the storefront directly — changes go live immediately, no deploy needed.
      </p>

      {isLoading ? (
        <div className="admin-card">Loading…</div>
      ) : (
        <>
          <div className="admin-card">
            <div className="cart-sum-title" style={{ marginBottom: 4 }}>
              Announcement & delivery
            </div>
            <p style={{ fontSize: 11, color: "var(--ink3)", marginBottom: 12 }}>
              Announcement bar shown at the top of every storefront page; delivery threshold and
              charge shown at cart/checkout.
            </p>
            <div className="form-field">
              <label className="form-label">Announcement bar</label>
              <textarea
                className="form-textarea"
                rows={2}
                value={form.announcementBar}
                onChange={(e) => update("announcementBar", e.target.value)}
              />
            </div>
            <div
              style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, maxWidth: 480 }}
            >
              <div className="form-field">
                <label className="form-label">Free delivery threshold (₹)</label>
                <input
                  className="form-input"
                  type="number"
                  min={0}
                  step={1}
                  value={form.freeDeliveryThresholdRupees}
                  onChange={(e) => update("freeDeliveryThresholdRupees", e.target.value)}
                />
                <p style={{ fontSize: 11, color: "var(--ink3)", marginTop: 4 }}>
                  Orders at or above this amount ship free.
                </p>
              </div>
              <div className="form-field">
                <label className="form-label">Delivery charge (₹)</label>
                <input
                  className="form-input"
                  type="number"
                  min={0}
                  step={1}
                  value={form.deliveryChargeRupees}
                  onChange={(e) => update("deliveryChargeRupees", e.target.value)}
                />
                <p style={{ fontSize: 11, color: "var(--ink3)", marginTop: 4 }}>
                  Charged below the free delivery threshold.
                </p>
              </div>
            </div>
            <div className="form-field" style={{ maxWidth: 280 }}>
              <label className="form-label">Store WhatsApp number (+91)</label>
              <input
                className="form-input"
                value={form.storeWhatsapp}
                onChange={(e) => update("storeWhatsapp", e.target.value)}
                placeholder="919000000000"
              />
              <p style={{ fontSize: 11, color: "var(--ink3)", marginTop: 4 }}>
                With country code, no + or spaces (e.g. 919000000000).
              </p>
            </div>
            <button
              className="cta-primary"
              onClick={saveAnnouncementDelivery}
              disabled={saving !== null}
            >
              {saving === "announcementDelivery" ? "Saving…" : "Save"}
            </button>
          </div>

          <div className="admin-card">
            <div className="cart-sum-title" style={{ marginBottom: 4 }}>
              SEO
            </div>
            <p style={{ fontSize: 11, color: "var(--ink3)", marginBottom: 12 }}>
              Site-wide name and description used in search results and social sharing.
            </p>
            <div className="form-field">
              <label className="form-label">Site name</label>
              <input
                className="form-input"
                value={form.seoSiteName}
                onChange={(e) => update("seoSiteName", e.target.value)}
              />
            </div>
            <div className="form-field">
              <label className="form-label">Site description</label>
              <textarea
                className="form-textarea"
                rows={3}
                value={form.seoSiteDescription}
                onChange={(e) => update("seoSiteDescription", e.target.value)}
              />
            </div>
            <button className="cta-primary" onClick={saveSeo} disabled={saving !== null}>
              {saving === "seo" ? "Saving…" : "Save"}
            </button>
          </div>

          <div className="admin-card">
            <div className="cart-sum-title" style={{ marginBottom: 4 }}>
              Hero banner
            </div>
            <p style={{ fontSize: 11, color: "var(--ink3)", marginBottom: 12 }}>
              Homepage hero text and call-to-action buttons.
            </p>
            <div className="form-field">
              <label className="form-label">Eyebrow</label>
              <input
                className="form-input"
                value={form.heroEyebrow}
                onChange={(e) => update("heroEyebrow", e.target.value)}
              />
            </div>
            <div className="form-field">
              <label className="form-label">Headline</label>
              <input
                className="form-input"
                value={form.heroHeadline}
                onChange={(e) => update("heroHeadline", e.target.value)}
              />
              <p style={{ fontSize: 11, color: "var(--ink3)", marginTop: 4 }}>
                Use \n for a line break.
              </p>
            </div>
            <div className="form-field">
              <label className="form-label">Subheadline</label>
              <input
                className="form-input"
                value={form.heroSubheadline}
                onChange={(e) => update("heroSubheadline", e.target.value)}
              />
            </div>
            <div
              style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, maxWidth: 560 }}
            >
              <div className="form-field">
                <label className="form-label">Primary CTA label</label>
                <input
                  className="form-input"
                  value={form.heroCtaPrimaryLabel}
                  onChange={(e) => update("heroCtaPrimaryLabel", e.target.value)}
                />
              </div>
              <div className="form-field">
                <label className="form-label">Primary CTA link</label>
                <input
                  className="form-input"
                  value={form.heroCtaPrimaryHref}
                  onChange={(e) => update("heroCtaPrimaryHref", e.target.value)}
                />
              </div>
              <div className="form-field">
                <label className="form-label">Secondary CTA label</label>
                <input
                  className="form-input"
                  value={form.heroCtaSecondaryLabel}
                  onChange={(e) => update("heroCtaSecondaryLabel", e.target.value)}
                />
              </div>
              <div className="form-field">
                <label className="form-label">Secondary CTA link</label>
                <input
                  className="form-input"
                  value={form.heroCtaSecondaryHref}
                  onChange={(e) => update("heroCtaSecondaryHref", e.target.value)}
                />
              </div>
            </div>
            <button className="cta-primary" onClick={saveHero} disabled={saving !== null}>
              {saving === "hero" ? "Saving…" : "Save"}
            </button>
          </div>
        </>
      )}
    </>
  );
}
