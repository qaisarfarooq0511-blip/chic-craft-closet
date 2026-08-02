import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  IconSearch,
  IconHeart,
  IconShoppingBag,
  IconMenu2,
  IconX,
  IconUser,
  IconLoader2,
  IconBrandWhatsapp,
} from "@tabler/icons-react";
import { useCart } from "@/hooks/useCart";
import { useCategories } from "@/hooks/useCategories";
import { useProductSearch, SEARCH_MIN_LENGTH } from "@/hooks/useProductSearch";
import { useStoreWhatsapp } from "@/hooks/useStoreWhatsapp";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/lib/supabase";
import { formatPrice } from "@/types/database";
import { productImageUrl } from "@/lib/product-images";

export function Topbar() {
  return (
    <div className="topbar">
      ✦ &nbsp; Free delivery on orders above ₹999 &nbsp;·&nbsp; New Kashmiri shawls now live
      &nbsp;·&nbsp; COD available &nbsp; ✦
    </div>
  );
}

export function Navbar() {
  const { count } = useCart();
  const [open, setOpen] = useState(false);
  const { data: cats = [] } = useCategories();

  const close = () => setOpen(false);

  const shortName = (n: string) =>
    n === "Kashmiri Shawls" ? "Shawls" : n === "Dress Material" ? "Dress material" : n;

  return (
    <nav className="navbar">
      <Link to="/" className="nav-logo" onClick={close}>
        Yaawun
      </Link>

      <div className={`nav-links${open ? " mobile-open" : ""}`}>
        <Link
          to="/"
          className="nav-link"
          activeOptions={{ exact: true }}
          activeProps={{ className: "nav-link active" }}
          onClick={close}
        >
          Home
        </Link>
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
        <Link
          to="/about"
          className="nav-link"
          activeProps={{ className: "nav-link active" }}
          onClick={close}
        >
          About
        </Link>
      </div>

      <div className="nav-actions">
        <SearchMenu />
        <Link to="/account/wishlist" aria-label="Wishlist">
          <IconHeart />
        </Link>
        <AccountMenu />
        <Link to="/cart" className="cart-wrap" aria-label="Cart">
          <IconShoppingBag />
          {count > 0 && <span className="cart-dot" />}
        </Link>
        <button
          className="mobile-toggle"
          aria-label="Toggle menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <IconX /> : <IconMenu2 />}
        </button>
      </div>
    </nav>
  );
}

function SearchMenu() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 10);
  }, [open]);

  const { results, isLoading } = useProductSearch(q);
  const term = q.trim();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (term.length < SEARCH_MIN_LENGTH) return;
    setOpen(false);
    navigate({ to: "/search", search: { q: term } });
  };

  const go = (slug: string) => {
    setOpen(false);
    setQ("");
    navigate({ to: "/product/$slug", params: { slug } });
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Search products"
        style={{
          background: "transparent",
          border: "none",
          padding: 0,
          cursor: "pointer",
          color: "inherit",
          display: "inline-flex",
        }}
      >
        <IconSearch />
      </button>
      {open && (
        <div className="search-popover">
          <form onSubmit={submit} style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <IconSearch size={16} style={{ color: "var(--ink3)", flexShrink: 0 }} />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search shawls, dresses…"
              className="search-input"
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ("")}
                aria-label="Clear"
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--ink3)",
                  padding: 0,
                  display: "inline-flex",
                }}
              >
                <IconX size={16} />
              </button>
            )}
          </form>
          {term.length >= SEARCH_MIN_LENGTH && (
            <div style={{ marginTop: 10, maxHeight: 360, overflowY: "auto" }}>
              {isLoading ? (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    padding: "16px 4px",
                    color: "var(--ink3)",
                  }}
                >
                  <IconLoader2 className="spin" size={18} />
                </div>
              ) : results.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--ink3)", padding: "12px 4px" }}>
                  No products match "{term}".
                </div>
              ) : (
                results.map((p) => {
                  const img = productImageUrl(p.images.find((i) => i.is_primary) ?? p.images[0]);
                  return (
                    <button
                      key={p.id}
                      onClick={() => go(p.slug)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        width: "100%",
                        padding: 8,
                        background: "transparent",
                        border: "none",
                        borderRadius: 6,
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 6,
                          background: "var(--cream2)",
                          flexShrink: 0,
                          overflow: "hidden",
                        }}
                      >
                        {img && (
                          <img
                            src={img}
                            alt=""
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        )}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            fontSize: 13,
                            color: "var(--ink)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {p.name}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--ink3)" }}>
                          {p.category?.name} · {formatPrice(p.price)}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
              {!isLoading && (
                <Link
                  to="/search"
                  search={{ q: term }}
                  onClick={() => {
                    setOpen(false);
                    setQ("");
                  }}
                  style={{
                    display: "block",
                    marginTop: 6,
                    width: "100%",
                    padding: 8,
                    fontSize: 12,
                    background: "var(--cream)",
                    border: "1px solid var(--line)",
                    borderRadius: 6,
                    textAlign: "center",
                    color: "var(--ink)",
                    textDecoration: "none",
                  }}
                >
                  See all results for "{term}"
                </Link>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AccountMenu() {
  const { session, profile } = useSupabaseAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  if (!session) {
    return (
      <Link to="/login" aria-label="Sign in" title="Sign in">
        <IconUser />
      </Link>
    );
  }

  const displayName = profile?.full_name || session.user.email || session.user.phone || "Account";
  const initial = displayName.trim().charAt(0).toUpperCase() || "U";

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: "var(--ink)",
          color: "#fff",
          fontSize: 12,
          fontWeight: 500,
          border: "none",
          cursor: "pointer",
          display: "grid",
          placeItems: "center",
        }}
      >
        {initial}
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 8px)",
            background: "#fff",
            border: "1px solid var(--b)",
            borderRadius: 8,
            minWidth: 220,
            boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            padding: 12,
            zIndex: 50,
          }}
        >
          <div style={{ fontSize: 13, color: "var(--ink)", fontWeight: 500 }}>{displayName}</div>
          <div style={{ fontSize: 11, color: "var(--ink3)", marginBottom: 10 }}>
            {session.user.email || session.user.phone}
          </div>
          <Link
            to="/account/orders"
            onClick={() => setOpen(false)}
            style={{
              display: "block",
              padding: "8px 10px",
              fontSize: 12,
              color: "var(--ink)",
              textDecoration: "none",
              borderRadius: 6,
              marginBottom: 6,
            }}
          >
            My Orders
          </Link>
          <button
            onClick={() => {
              setOpen(false);
              void supabase.auth.signOut();
            }}
            style={{
              width: "100%",
              textAlign: "left",
              padding: "8px 10px",
              background: "transparent",
              border: "1px solid var(--b)",
              borderRadius: 6,
              fontSize: 12,
              color: "var(--ink)",
              cursor: "pointer",
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
  const { data: cats = [] } = useCategories();
  const { whatsapp } = useStoreWhatsapp();
  const whatsappHref = whatsapp
    ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(
        "Hi, I have a question about Yaawun. Can you help me?",
      )}`
    : null;

  return (
    <footer className="footer">
      <div className="footer-top">
        <div>
          <div className="footer-logo">Yaawun</div>
          <div className="footer-tag">Crafted with care</div>
          <p className="footer-desc">
            Your neighbourhood store, now online.
            <br />
            Quality you can trust, delivered to your door.
          </p>
        </div>
        <div>
          <div className="footer-col-title">Shop</div>
          {cats.map((c) => (
            <Link
              key={c.id}
              to="/shop/$category"
              params={{ category: c.slug }}
              className="footer-link"
            >
              {c.name}
            </Link>
          ))}
        </div>
        <div>
          <div className="footer-col-title">Help</div>
          <Link to="/pages/$slug" params={{ slug: "returns-policy" }} className="footer-link">
            Returns Policy
          </Link>
          <Link to="/pages/$slug" params={{ slug: "faqs" }} className="footer-link">
            FAQs
          </Link>
          <Link to="/contact" className="footer-link">
            Contact us
          </Link>
          {whatsappHref && (
            <a
              href={whatsappHref}
              className="footer-link"
              target="_blank"
              rel="noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <IconBrandWhatsapp size={14} /> WhatsApp us
            </a>
          )}
        </div>
        <div>
          <div className="footer-col-title">Legal</div>
          <Link to="/pages/$slug" params={{ slug: "terms" }} className="footer-link">
            Terms of Use
          </Link>
          <Link to="/pages/$slug" params={{ slug: "privacy-policy" }} className="footer-link">
            Privacy Policy
          </Link>
        </div>
        <div>
          <div className="footer-col-title">Connect</div>
          <a href="https://instagram.com/" className="footer-link" target="_blank" rel="noreferrer">
            Instagram
          </a>
          <Link to="/admin" className="footer-link">
            Store admin
          </Link>
        </div>
      </div>
      <div className="footer-bottom">
        <span className="footer-copy">
          © {new Date().getFullYear()} Yaawun · All rights reserved
        </span>
        <span className="footer-copy">Made with care in India</span>
      </div>
    </footer>
  );
}
