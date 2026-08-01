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
] as const;

interface FormState {
  announcementBar: string;
  freeDeliveryThresholdRupees: string;
  deliveryChargeRupees: string;
  storeWhatsapp: string;
}

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

function SiteSettingsAdmin() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { session } = useSupabaseAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-site-settings"],
    queryFn: fetchSettings,
  });

  const [form, setForm] = useState<FormState>({
    announcementBar: "",
    freeDeliveryThresholdRupees: "",
    deliveryChargeRupees: "",
    storeWhatsapp: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    setForm({
      announcementBar: typeof data.announcement_bar === "string" ? data.announcement_bar : "",
      freeDeliveryThresholdRupees: paiseToRupeeString(data.free_delivery_threshold),
      deliveryChargeRupees: paiseToRupeeString(data.delivery_charge),
      storeWhatsapp: typeof data.store_whatsapp === "string" ? data.store_whatsapp : "",
    });
  }, [data]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
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

    setSaving(true);
    const updated_by = session?.user.id;
    const updated_at = new Date().toISOString();

    const { error } = await supabase.from("site_settings").upsert([
      { key: "announcement_bar", value: form.announcementBar, updated_by, updated_at },
      { key: "free_delivery_threshold", value: freeDeliveryThreshold, updated_by, updated_at },
      { key: "delivery_charge", value: deliveryCharge, updated_by, updated_at },
      { key: "store_whatsapp", value: form.storeWhatsapp, updated_by, updated_at },
    ]);
    setSaving(false);

    if (error) {
      toast(error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["admin-site-settings"] });
    toast("Settings saved");
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
              Announcement bar
            </div>
            <p style={{ fontSize: 11, color: "var(--ink3)", marginBottom: 12 }}>
              Shown at the top of every storefront page.
            </p>
            <textarea
              className="form-textarea"
              rows={2}
              value={form.announcementBar}
              onChange={(e) => update("announcementBar", e.target.value)}
            />
          </div>

          <div className="admin-card">
            <div className="cart-sum-title" style={{ marginBottom: 4 }}>
              Delivery
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
          </div>

          <div className="admin-card">
            <div className="cart-sum-title" style={{ marginBottom: 4 }}>
              WhatsApp
            </div>
            <div className="form-field" style={{ maxWidth: 280 }}>
              <label className="form-label">Store WhatsApp number</label>
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
          </div>

          <button className="cta-primary" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </>
      )}
    </>
  );
}
