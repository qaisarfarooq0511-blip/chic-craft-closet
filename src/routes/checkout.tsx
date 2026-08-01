import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { IconLock } from "@tabler/icons-react";
import { useCart, cartLinePrice } from "@/hooks/useCart";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { supabase } from "@/lib/supabase";
import { NotificationService } from "@/services/NotificationService";
import { formatPrice } from "@/types/database";
import { useToast } from "@/lib/toast";
import { capitalizeName, validateMobile, validateName } from "@/lib/user-auth";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — Yaawun" },
      { name: "description", content: "Complete your Yaawun order." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <ProtectedRoute loginPath="/login">
      <Checkout />
    </ProtectedRoute>
  ),
});

function Checkout() {
  const { lines, subtotal, clear } = useCart();
  const { user, profile } = useSupabaseAuth();
  const delivery = subtotal === 0 ? 0 : subtotal >= 99900 ? 0 : 9900;
  const total = subtotal + delivery;
  const toast = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    line1: "",
    line2: "",
    city: "",
    state: "Jammu & Kashmir",
    pincode: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    if (profile)
      setForm((f) => ({
        ...f,
        name: f.name || profile.full_name || "",
        phone: f.phone || profile.phone || "",
      }));
  }, [profile]);

  const update =
    (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const place = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const nextErrors: Partial<Record<keyof typeof form, string>> = {};

    const nameRes = validateName(form.name);
    if (!nameRes.ok) nextErrors.name = nameRes.error;
    const phoneRes = validateMobile(form.phone);
    if (!phoneRes.ok) nextErrors.phone = phoneRes.error;
    if (!form.line1.trim()) nextErrors.line1 = "Address is required.";
    if (!form.city.trim()) nextErrors.city = "City is required.";
    if (!/^\d{6}$/.test(form.pincode.trim()))
      nextErrors.pincode = "Enter a valid 6-digit PIN code.";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      toast("Please fix the highlighted fields");
      return;
    }
    if (lines.some((l) => !l.product)) {
      toast("Some items in your bag are no longer available — please remove them first.");
      return;
    }

    setPlacing(true);
    try {
      const cleanName = nameRes.ok ? nameRes.value : capitalizeName(form.name);
      const cleanPhone = phoneRes.ok ? phoneRes.value : form.phone;

      const { data: address, error: addrError } = await supabase
        .from("addresses")
        .insert({
          customer_id: user.id,
          full_name: cleanName,
          phone: cleanPhone,
          line1: form.line1.trim(),
          line2: form.line2.trim() || null,
          city: form.city.trim(),
          state: form.state.trim() || "Jammu & Kashmir",
          pincode: form.pincode.trim(),
        })
        .select()
        .single();
      if (addrError) throw addrError;

      const { data: orderNumber, error: numError } = await supabase.rpc("generate_order_number");
      if (numError) throw numError;

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          order_number: orderNumber,
          customer_id: user.id,
          shipping_address_id: address.id,
          status: "pending",
          payment_method: "cod",
          subtotal,
          delivery_charge: delivery,
          discount: 0,
          total,
          notes: form.notes.trim() || null,
        })
        .select()
        .single();
      if (orderError) throw orderError;

      const items = lines.map((l) => {
        const unitPrice = cartLinePrice(l);
        const variantLabel =
          [l.variant?.colour?.name, l.variant?.size?.label].filter(Boolean).join(" · ") || null;
        return {
          order_id: order.id,
          product_id: l.productId,
          product_name: l.product!.name,
          product_slug: l.product!.slug,
          variant_id: l.variantId,
          variant_label: variantLabel,
          quantity: l.quantity,
          unit_price: unitPrice,
          total_price: unitPrice * l.quantity,
        };
      });
      const { error: itemsError } = await supabase.from("order_items").insert(items);
      if (itemsError) throw itemsError;

      await NotificationService.send(user.id, "order_confirmed", {
        order_number: orderNumber,
        customer_name: cleanName,
      });
      await clear();

      navigate({ to: "/order-confirmation/$orderNumber", params: { orderNumber } });
    } catch (err) {
      console.error(err);
      toast(err instanceof Error ? err.message : "Failed to place order");
    } finally {
      setPlacing(false);
    }
  };

  if (lines.length === 0) {
    return (
      <div className="cart-wrap-page">
        <h1 className="cart-title">Checkout</h1>
        <p style={{ color: "var(--ink3)", fontSize: 13 }}>
          Your bag is empty.{" "}
          <Link to="/shop" style={{ color: "var(--gold)" }}>
            Browse products
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="cart-wrap-page">
      <h1 className="cart-title">Checkout</h1>
      <div className="cart-body">
        <form onSubmit={place} noValidate>
          <div className="admin-card">
            <div className="cart-sum-title">Delivery details</div>
            <div className="form-field">
              <label className="form-label">Full name *</label>
              <input
                className="form-input"
                value={form.name}
                onChange={update("name")}
                onBlur={() =>
                  setForm((f) => ({
                    ...f,
                    name: f.name.trim() ? capitalizeName(f.name.trim()) : f.name,
                  }))
                }
                required
              />
              {errors.name && (
                <div style={{ color: "#b91c1c", fontSize: 12, marginTop: 4 }}>{errors.name}</div>
              )}
            </div>
            <div className="form-field">
              <label className="form-label">Mobile *</label>
              <input
                className="form-input"
                type="tel"
                inputMode="tel"
                value={form.phone}
                onChange={update("phone")}
                required
              />
              {errors.phone && (
                <div style={{ color: "#b91c1c", fontSize: 12, marginTop: 4 }}>{errors.phone}</div>
              )}
            </div>
            <div className="form-field">
              <label className="form-label">Address line 1 *</label>
              <input
                className="form-input"
                value={form.line1}
                onChange={update("line1")}
                required
              />
              {errors.line1 && (
                <div style={{ color: "#b91c1c", fontSize: 12, marginTop: 4 }}>{errors.line1}</div>
              )}
            </div>
            <div className="form-field">
              <label className="form-label">Address line 2</label>
              <input
                className="form-input"
                value={form.line2}
                onChange={update("line2")}
                placeholder="Optional"
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="form-field">
                <label className="form-label">City *</label>
                <input
                  className="form-input"
                  value={form.city}
                  onChange={update("city")}
                  required
                />
                {errors.city && (
                  <div style={{ color: "#b91c1c", fontSize: 12, marginTop: 4 }}>{errors.city}</div>
                )}
              </div>
              <div className="form-field">
                <label className="form-label">State</label>
                <input className="form-input" value={form.state} onChange={update("state")} />
              </div>
            </div>
            <div className="form-field">
              <label className="form-label">PIN code *</label>
              <input
                className="form-input"
                inputMode="numeric"
                maxLength={6}
                value={form.pincode}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    pincode: e.target.value.replace(/[^\d]/g, "").slice(0, 6),
                  }))
                }
                required
              />
              {errors.pincode && (
                <div style={{ color: "#b91c1c", fontSize: 12, marginTop: 4 }}>{errors.pincode}</div>
              )}
            </div>
            <div className="form-field">
              <label className="form-label">Notes</label>
              <textarea
                className="form-textarea"
                value={form.notes}
                onChange={update("notes")}
                placeholder="Any special instructions?"
              />
            </div>
          </div>
          <button type="submit" className="cart-cta" disabled={placing}>
            {placing ? "Placing order…" : "Place order"}
          </button>
          <div className="cart-payment-note">
            <IconLock />
            Cash on delivery · Online payments coming soon
          </div>
        </form>
        <aside className="cart-summary">
          <div className="cart-sum-title">Order summary</div>
          {lines.map((l) => {
            if (!l.product) return null;
            const variantText = [l.variant?.colour?.name, l.variant?.size?.label]
              .filter(Boolean)
              .join(" · ");
            return (
              <div key={`${l.productId}-${l.variantId ?? "none"}`} className="cart-row">
                <span>
                  {l.product.name}
                  {variantText && ` (${variantText})`} × {l.quantity}
                </span>
                <span>{formatPrice(cartLinePrice(l) * l.quantity)}</span>
              </div>
            );
          })}
          <hr className="divider" style={{ margin: "10px 0" }} />
          <div className="cart-row">
            <span>Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className={`cart-row${delivery === 0 ? " free" : ""}`}>
            <span>Delivery</span>
            <span>{delivery === 0 ? "Free" : formatPrice(delivery)}</span>
          </div>
          <div className="cart-row total">
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
