import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { IconLock } from "@tabler/icons-react";
import { useCart, cartSubtotal } from "@/lib/cart-context";
import { getProducts, addInquiry } from "@/lib/storage";
import { fmt } from "@/components/storefront/ProductCard";
import { useToast } from "@/lib/toast";
import {
  capitalizeName,
  findOrCreateUserByMobile,
  normalizeMobile,
  useUserAuth,
  validateMobile,
  validateName,
} from "@/lib/user-auth";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — Yaawun" },
      { name: "description", content: "Complete your Yaawun order." },
      { name: "robots", content: "noindex" },
      { property: "og:url", content: "/checkout" },
    ],
    links: [{ rel: "canonical", href: "/checkout" }],
  }),
  component: Checkout,
});

function Checkout() {
  const { lines, clear } = useCart();
  const products = getProducts();
  const subtotal = cartSubtotal(lines);
  const delivery = subtotal === 0 ? 0 : subtotal >= 999 ? 0 : 99;
  const total = subtotal + delivery;
  const toast = useToast();
  const navigate = useNavigate();
  const { user, signIn } = useUserAuth();

  const [form, setForm] = useState({ name: "", phone: "", address: "", city: "", pincode: "", notes: "" });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});

  // Pre-fill from signed-in user.
  useEffect(() => {
    if (user) setForm((f) => ({ ...f, name: f.name || user.name, phone: f.phone || user.mobile }));
  }, [user]);

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const place = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: Partial<Record<keyof typeof form, string>> = {};

    const nameRes = validateName(form.name);
    if (!nameRes.ok) nextErrors.name = nameRes.error;

    const phoneRes = validateMobile(form.phone);
    if (!phoneRes.ok) nextErrors.phone = phoneRes.error;

    if (!form.address.trim()) nextErrors.address = "Address is required.";
    if (!form.city.trim()) nextErrors.city = "City is required.";
    if (!/^\d{6}$/.test(form.pincode.trim())) nextErrors.pincode = "Enter a valid 6-digit PIN code.";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      toast("Please fix the highlighted fields");
      return;
    }

    const cleanName = nameRes.ok ? nameRes.value : capitalizeName(form.name);
    const cleanPhone = phoneRes.ok ? phoneRes.value : normalizeMobile(form.phone);

    // Silently create or fetch the customer's account by mobile and sign them in.
    const account = findOrCreateUserByMobile(cleanPhone, cleanName);
    if (!user) signIn(account);

    addInquiry({
      id: `INQ-${Date.now()}`,
      createdAt: Date.now(),
      customer: { name: cleanName, phone: cleanPhone, address: form.address, city: form.city, pincode: form.pincode, notes: form.notes },
      lines: lines.map((l) => {
        const p = products.find((x) => x.id === l.productId)!;
        return { productId: l.productId, name: p.name, qty: l.qty, price: p.price };
      }),
      subtotal, delivery, total,
      status: "new",
    });
    clear();
    toast("Order placed — we'll contact you shortly");
    setTimeout(() => navigate({ to: "/" }), 800);
  };

  if (lines.length === 0) {
    return (
      <div className="cart-wrap-page">
        <h1 className="cart-title">Checkout</h1>
        <p style={{ color: "var(--ink3)", fontSize: 13 }}>
          Your bag is empty. <Link to="/shop" style={{ color: "var(--gold)" }}>Browse products</Link>.
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
            {!user && (
              <div style={{
                background: "var(--cream)", border: "1px solid var(--line)",
                borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "var(--ink2)", marginBottom: 14,
              }}>
                You're checking out as a guest. We'll create your account automatically using your mobile number so you can track this order later.
              </div>
            )}
            <div className="form-field">
              <label className="form-label">Full name *</label>
              <input className="form-input" value={form.name} onChange={update("name")}
                onBlur={() => setForm((f) => ({ ...f, name: f.name.trim() ? capitalizeName(f.name.trim()) : f.name }))} required />
              {errors.name && <div style={{ color: "#b91c1c", fontSize: 12, marginTop: 4 }}>{errors.name}</div>}
            </div>
            <div className="form-field">
              <label className="form-label">Mobile *</label>
              <input className="form-input" type="tel" inputMode="tel" value={form.phone} onChange={update("phone")} required />
              {errors.phone && <div style={{ color: "#b91c1c", fontSize: 12, marginTop: 4 }}>{errors.phone}</div>}
            </div>
            <div className="form-field">
              <label className="form-label">Address *</label>
              <textarea className="form-textarea" value={form.address} onChange={update("address")} required />
              {errors.address && <div style={{ color: "#b91c1c", fontSize: 12, marginTop: 4 }}>{errors.address}</div>}
            </div>
            <div className="form-field">
              <label className="form-label">City *</label>
              <input className="form-input" value={form.city} onChange={update("city")} required />
              {errors.city && <div style={{ color: "#b91c1c", fontSize: 12, marginTop: 4 }}>{errors.city}</div>}
            </div>
            <div className="form-field">
              <label className="form-label">PIN code *</label>
              <input className="form-input" inputMode="numeric" maxLength={6} value={form.pincode}
                onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value.replace(/[^\d]/g, "").slice(0, 6) }))} required />
              {errors.pincode && <div style={{ color: "#b91c1c", fontSize: 12, marginTop: 4 }}>{errors.pincode}</div>}
            </div>
            <div className="form-field"><label className="form-label">Notes</label><textarea className="form-textarea" value={form.notes} onChange={update("notes")} placeholder="Any special instructions?" /></div>
          </div>
          <button type="submit" className="cart-cta">Place order</button>
          <div className="cart-payment-note">
            <IconLock />Online payments coming soon · For now we'll confirm on WhatsApp and accept COD
          </div>
        </form>
        <aside className="cart-summary">
          <div className="cart-sum-title">Order summary</div>
          {lines.map((l) => {
            const p = products.find((x) => x.id === l.productId);
            if (!p) return null;
            return (
              <div key={l.productId} className="cart-row">
                <span>{p.name} × {l.qty}</span>
                <span>{fmt(p.price * l.qty)}</span>
              </div>
            );
          })}
          <hr className="divider" style={{ margin: "10px 0" }} />
          <div className="cart-row"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
          <div className={`cart-row${delivery === 0 ? " free" : ""}`}><span>Delivery</span><span>{delivery === 0 ? "Free" : fmt(delivery)}</span></div>
          <div className="cart-row total"><span>Total</span><span>{fmt(total)}</span></div>
        </aside>
      </div>
    </div>
  );
}
