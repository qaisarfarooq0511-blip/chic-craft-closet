import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { IconLock } from "@tabler/icons-react";
import { useCart, cartSubtotal } from "@/lib/cart-context";
import { getProducts, addInquiry } from "@/lib/storage";
import { fmt } from "@/components/storefront/ProductCard";
import { useToast } from "@/lib/toast";

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

  const [form, setForm] = useState({ name: "", phone: "", address: "", city: "", pincode: "", notes: "" });
  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const place = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.address || !form.city || !form.pincode) {
      toast("Please fill all required fields");
      return;
    }
    addInquiry({
      id: `INQ-${Date.now()}`,
      createdAt: Date.now(),
      customer: form,
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
        <form onSubmit={place}>
          <div className="admin-card">
            <div className="cart-sum-title">Delivery details</div>
            <div className="form-field"><label className="form-label">Full name *</label><input className="form-input" value={form.name} onChange={update("name")} required /></div>
            <div className="form-field"><label className="form-label">Phone *</label><input className="form-input" value={form.phone} onChange={update("phone")} required /></div>
            <div className="form-field"><label className="form-label">Email</label><input className="form-input" type="email" value={form.email} onChange={update("email")} /></div>
            <div className="form-field"><label className="form-label">Address *</label><textarea className="form-textarea" value={form.address} onChange={update("address")} required /></div>
            <div className="form-field"><label className="form-label">City *</label><input className="form-input" value={form.city} onChange={update("city")} required /></div>
            <div className="form-field"><label className="form-label">PIN code *</label><input className="form-input" value={form.pincode} onChange={update("pincode")} required /></div>
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
