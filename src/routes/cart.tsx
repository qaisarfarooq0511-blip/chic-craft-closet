import { createFileRoute, Link } from "@tanstack/react-router";
import { IconShoppingBag, IconLock } from "@tabler/icons-react";
import { useCart } from "@/hooks/useCart";
import { formatPrice } from "@/types/database";
import { productImageUrl } from "@/lib/cloudinary";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your bag — Yaawun" },
      {
        name: "description",
        content: "Review the items in your Yaawun bag and proceed to checkout.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { lines, subtotal, updateQty, remove } = useCart();
  const delivery = subtotal === 0 ? 0 : subtotal >= 99900 ? 0 : 9900;
  const total = subtotal + delivery;

  return (
    <div className="cart-wrap-page">
      <h1 className="cart-title">Your bag</h1>
      {lines.length === 0 ? (
        <div className="cart-empty">
          <IconShoppingBag />
          <div className="cart-empty-title">Your bag is empty</div>
          <p className="cart-empty-sub">Looks like you haven't added anything yet.</p>
          <Link to="/shop" className="btn-gold">
            Shop now
          </Link>
        </div>
      ) : (
        <div className="cart-body">
          <div>
            {lines.map((l) => {
              const p = l.product;
              const img = p
                ? productImageUrl(p.images.find((i) => i.is_primary) ?? p.images[0])
                : null;
              return (
                <div key={l.productId} className="cart-item">
                  <div className="cart-item-img" style={{ background: "var(--cream2)" }}>
                    {img ? (
                      <img src={img} alt={p?.name} />
                    ) : (
                      <span className="ph" style={{ fontSize: 9 }}>
                        {p ? "Photo" : "Unavailable"}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="cart-item-cat">{p?.category?.name}</div>
                    <div className="cart-item-name">
                      {p
                        ? `${p.name}${p.subtitle ? ` — ${p.subtitle}` : ""}`
                        : "This item is no longer available"}
                    </div>
                    {p && (
                      <div className="cart-item-qty">
                        <button
                          className="ciq-btn"
                          onClick={() => updateQty(l.productId, l.quantity - 1)}
                          aria-label="Decrease"
                        >
                          −
                        </button>
                        <span className="ciq-val">{l.quantity}</span>
                        <button
                          className="ciq-btn"
                          onClick={() => updateQty(l.productId, l.quantity + 1)}
                          aria-label="Increase"
                        >
                          +
                        </button>
                      </div>
                    )}
                    <button className="cart-item-remove" onClick={() => remove(l.productId)}>
                      Remove
                    </button>
                  </div>
                  <div className="cart-item-price">
                    {p ? formatPrice(p.price * l.quantity) : ""}
                  </div>
                </div>
              );
            })}
          </div>

          <aside className="cart-summary">
            <div className="cart-sum-title">Order summary</div>
            <div className="cart-row">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className={`cart-row${delivery === 0 ? " free" : ""}`}>
              <span>Delivery</span>
              <span>{delivery === 0 ? "Free" : formatPrice(delivery)}</span>
            </div>
            {delivery > 0 && (
              <div style={{ fontSize: 10, color: "var(--ink3)", marginBottom: 8 }}>
                Add {formatPrice(99900 - subtotal)} more for free delivery
              </div>
            )}
            <div className="cart-row total">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
            <Link
              to="/checkout"
              className="cart-cta"
              style={{ display: "block", textAlign: "center" }}
            >
              Proceed to checkout
            </Link>
            <div className="cart-payment-note">
              <IconLock />
              Secure checkout · COD available
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
