import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { IconSearch, IconHeart, IconShoppingBag, IconMenu2, IconX } from "@tabler/icons-react";
import { useCart } from "@/lib/cart-context";
import { CATEGORIES, categorySlug } from "@/lib/types";
import { getCategoriesStore } from "@/lib/storage";
import { seedCategories } from "@/lib/seed";

function useCategoriesLive() {
  const [cats, setCats] = useState(seedCategories);
  useEffect(() => {
    setCats(getCategoriesStore());
    const refresh = () => setCats(getCategoriesStore());
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, []);
  return cats;
}

export function Topbar() {
  return (
    <div className="topbar">
      ✦ &nbsp; Free delivery on orders above ₹999 &nbsp;·&nbsp; New Kashmiri shawls now live &nbsp;·&nbsp; COD available &nbsp; ✦
    </div>
  );
}

export function Navbar() {
  const { count } = useCart();
  const [open, setOpen] = useState(false);
  const cats = useCategoriesLive();

  const close = () => setOpen(false);

  const shortName = (n: string) =>
    n === "Kashmiri Shawls" ? "Shawls" : n === "Dress Material" ? "Dress material" : n;

  return (
    <nav className="navbar">
      <Link to="/" className="nav-logo" onClick={close}>Yaawun</Link>

      <div className={`nav-links${open ? " mobile-open" : ""}`}>
        <Link to="/" className="nav-link" activeOptions={{ exact: true }} activeProps={{ className: "nav-link active" }} onClick={close}>Home</Link>
        {cats.map((c) => (
          <Link
            key={c.id}
            to="/shop/$category"
            params={{ category: c.slug }}
            className="nav-link"
            activeProps={{ className: "nav-link active" }}
            onClick={close}
          >
            {shortName(c.name)}
          </Link>
        ))}
        <Link to="/about" className="nav-link" activeProps={{ className: "nav-link active" }} onClick={close}>About</Link>
      </div>

      <div className="nav-actions">
        <Link to="/shop" aria-label="Search products"><IconSearch /></Link>
        <Link to="/about" aria-label="Visit store"><IconHeart /></Link>
        <Link to="/cart" className="cart-wrap" aria-label="Cart">
          <IconShoppingBag />
          {count > 0 && <span className="cart-dot" />}
        </Link>
        <button className="mobile-toggle" aria-label="Toggle menu" onClick={() => setOpen((v) => !v)}>
          {open ? <IconX /> : <IconMenu2 />}
        </button>
      </div>
    </nav>
  );
}

export function Footer() {
  const cats = useCategoriesLive();
  return (
    <footer className="footer">
      <div className="footer-top">
        <div>
          <div className="footer-logo">Yaawun</div>
          <div className="footer-tag">Crafted with care</div>
          <p className="footer-desc">Your neighbourhood store, now online.<br />Quality you can trust, delivered to your door.</p>
        </div>
        <div>
          <div className="footer-col-title">Shop</div>
          {cats.map((c) => (
            <Link key={c.id} to="/shop/$category" params={{ category: c.slug }} className="footer-link">{c.name}</Link>
          ))}
        </div>
        <div>
          <div className="footer-col-title">Help</div>
          <Link to="/contact" className="footer-link">Contact us</Link>
          <Link to="/about" className="footer-link">About Yaawun</Link>
          <Link to="/shop" className="footer-link">All products</Link>
        </div>
        <div>
          <div className="footer-col-title">Connect</div>
          <a href="https://wa.me/" className="footer-link" target="_blank" rel="noreferrer">WhatsApp</a>
          <a href="https://instagram.com/" className="footer-link" target="_blank" rel="noreferrer">Instagram</a>
          <Link to="/admin" className="footer-link">Store admin</Link>
        </div>
      </div>
      <div className="footer-bottom">
        <span className="footer-copy">© {new Date().getFullYear()} Yaawun · All rights reserved</span>
        <span className="footer-copy">Made with care in India</span>
      </div>
    </footer>
  );
}

void CATEGORIES; void categorySlug; // legacy exports retained for type compatibility
