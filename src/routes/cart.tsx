import { createFileRoute, Link } from "@tanstack/react-router";
import { IconShoppingBag, IconLock } from "@tabler/icons-react";
import { useCart, cartSubtotal } from "@/lib/cart-context";
import { getProducts } from "@/lib/storage";
import { fmt } from "@/components/storefront/ProductCard";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your bag — Yaawun" },
      { name: "description", content: "Review the items in your Yaawun bag and proceed to checkout." },
      { name: "robots", content: "noindex" },
      { property: "og:url", content: "/cart" },
    ],
    links: [{ rel: "canonical", href: "/cart" }],
  }),
  component: CartPage,
});

function CartPage() {
  const { lines, update, remove } = useCart();
  const products = getProducts();
  const subtotal = cartSubtotal(lines);
  const delivery = subtotal === 0 ? 0 : subtotal >= 999 ? 0 : 99;
  const total = subtotal + delivery;

  return (
    <div className="cart-wrap-page">
      <h1 className="cart-title">Your bag</h1>
      {lines.length === 0 ? (
        <div className="cart-empty">
          <IconShoppingBag />
          <div className="cart-empty-title">Your bag is empty</div>
          <p className="cart-empty-sub">Looks like you haven't added anything yet.</p>
          <Link to="/shop" className="btn-gold">Shop now</Link>
        </div>
      ) : (
        <div className="cart-body">
          <div>
            {lines.map((l) => {
              const p = products.find((x) => x.id === l.productId);
              if (!p) return null;
              return (
                <div key={l.productId} className="cart-item">
                  <div className="cart-item-img" style={{ background: p.bg }}>
                    {p.images[0] ? <img src={p.images[0]} alt={p.name} /> : <span className="ph" style={{ fontSize: 9 }}>Photo</span>}
                  </div>
                  <div>
                    <div className="cart-item-cat">{p.category}</div>
                    <div className="cart-item-name">{p.name}{p.subtitle ? ` — ${p.subtitle}` : ""}</div>
                    <div className="cart-item-qty">
                      <button className="ciq-btn" onClick={() => update(l.productId, l.qty - 1)} aria-label="Decrease">−</button>
                      <span className="ciq-val">{l.qty}</span>
                      <button className="ciq-btn" onClick={() => update(l.productId, l.qty + 1)} aria-label="Increase">+</button>
                    </div>
                    <button className="cart-item-remove" onClick={() => remove(l.productId)}>Remove</button>
                  </div>
                  <div className="cart-item-price">{fmt(p.price * l.qty)}</div>
                </div>
              );
            })}
          </div>

          <aside className="cart-summary">
            <div className="cart-sum-title">Order summary</div>
            <div className="cart-row"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
            <div className={`cart-row${delivery === 0 ? " free" : ""}`}>
              <span>Delivery</span>
              <span>{delivery === 0 ? "Free" : fmt(delivery)}</span>
            </div>
            {delivery > 0 && (
              <div style={{ fontSize: 10, color: "var(--ink3)", marginBottom: 8 }}>
                Add {fmt(999 - subtotal)} more for free delivery
              </div>
            )}
            <div className="cart-row total"><span>Total</span><span>{fmt(total)}</span></div>
            <div className="promo-row">
              <input className="promo-input" placeholder="Promo code" />
              <button className="promo-btn">Apply</button>
            </div>
            <Link to="/checkout" className="cart-cta" style={{ display: "block", textAlign: "center" }}>Proceed to checkout</Link>
            <div className="cart-payment-note"><IconLock />Secure checkout · UPI · COD available</div>
          </aside>
        </div>
      )}
    </div>
  );
}
