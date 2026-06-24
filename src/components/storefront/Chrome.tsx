import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { IconSearch, IconHeart, IconShoppingBag, IconMenu2, IconX, IconUser } from "@tabler/icons-react";
import { useCart } from "@/lib/cart-context";
import { getCategoriesStore, getPages } from "@/lib/storage";
import { seedCategories, seedPages } from "@/lib/seed";
import { useUserAuth } from "@/lib/user-auth";

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

function usePagesLive() {
  const [pages, setPages] = useState(seedPages);
  useEffect(() => {
    setPages(getPages());
    const refresh = () => setPages(getPages());
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, []);
  return pages;
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
        <AccountMenu />
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

function AccountMenu() {
  const { user, signOut } = useUserAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  if (!user) {
    return (
      <Link to="/auth" aria-label="Sign in" title="Sign in">
        <IconUser />
      </Link>
    );
  }

  const initial = user.name.trim().charAt(0).toUpperCase() || "U";

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        style={{
          width: 28, height: 28, borderRadius: "50%",
          background: "var(--ink)", color: "#fff",
          fontSize: 12, fontWeight: 500, border: "none", cursor: "pointer",
          display: "grid", placeItems: "center",
        }}
      >
        {initial}
      </button>
      {open && (
        <div style={{
          position: "absolute", right: 0, top: "calc(100% + 8px)",
          background: "#fff", border: "1px solid var(--line)", borderRadius: 8,
          minWidth: 220, boxShadow: "0 8px 24px rgba(0,0,0,0.08)", padding: 12, zIndex: 50,
        }}>
          <div style={{ fontSize: 13, color: "var(--ink)", fontWeight: 500 }}>{user.name}</div>
          <div style={{ fontSize: 11, color: "var(--ink3)" }}>{user.mobile}</div>
          {user.email
            ? <div style={{ fontSize: 11, color: "var(--ink3)", marginBottom: 10 }}>{user.email}</div>
            : <div style={{ fontSize: 11, color: "var(--ink3)", fontStyle: "italic", marginBottom: 10 }}>No email added</div>}
          <Link
            to="/account"
            onClick={() => setOpen(false)}
            style={{
              display: "block", textAlign: "left", padding: "8px 10px", marginBottom: 6,
              background: "var(--cream)", border: "1px solid var(--line)", borderRadius: 6,
              fontSize: 12, color: "var(--ink)", textDecoration: "none",
            }}
          >
            My account
          </Link>
          <button
            onClick={() => { setOpen(false); signOut(); }}
            style={{
              width: "100%", textAlign: "left", padding: "8px 10px",
              background: "transparent", border: "1px solid var(--line)", borderRadius: 6,
              fontSize: 12, color: "var(--ink)", cursor: "pointer",
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export function Footer() {
  const cats = useCategoriesLive();
  const pages = usePagesLive();
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
          <div className="footer-col-title">Information</div>
          {pages.map((p) => (
            <Link key={p.slug} to="/page/$slug" params={{ slug: p.slug }} className="footer-link">{p.title}</Link>
          ))}
        </div>
        <div>
          <div className="footer-col-title">Help</div>
          <Link to="/contact" className="footer-link">Contact us</Link>
          <Link to="/shop" className="footer-link">All products</Link>
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


