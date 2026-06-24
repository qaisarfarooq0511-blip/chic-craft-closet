import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import {
  IconLayoutDashboard,
  IconPackage,
  IconStar,
  IconReceipt,
  IconPalette,
  IconLogout,
  IconExternalLink,
  IconPhoto,
  IconCategory,
  IconLayoutGrid,
} from "@tabler/icons-react";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { ADMIN_EMAIL, ADMIN_PASSWORD } from "@/lib/storage";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Yaawun" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: () => (
    <AuthProvider>
      <AdminGate />
    </AuthProvider>
  ),
});

function AdminGate() {
  const { email } = useAuth();
  if (!email) return <LoginScreen />;
  return <AdminShell />;
}

function LoginScreen() {
  const { signIn } = useAuth();
  const [e, setE] = useState(ADMIN_EMAIL);
  const [p, setP] = useState("");
  const [err, setErr] = useState<string | null>(null);

  return (
    <div style={{ minHeight: "calc(100vh - 60px)", display: "grid", placeItems: "center", background: "var(--cream2)", padding: 24 }}>
      <form
        onSubmit={(ev) => { ev.preventDefault(); const r = signIn(e, p); if (!r.ok) setErr(r.error ?? "Failed"); }}
        className="admin-card"
        style={{ width: "100%", maxWidth: 380, padding: "2rem" }}
      >
        <div className="eyebrow" style={{ marginBottom: 8 }}>Yaawun admin</div>
        <h1 className="serif" style={{ fontSize: 26, fontWeight: 300, color: "var(--ink)", marginBottom: 18 }}>Sign in</h1>
        <div className="form-field">
          <label className="form-label">Email</label>
          <input className="form-input" value={e} onChange={(ev) => setE(ev.target.value)} type="email" autoComplete="email" />
        </div>
        <div className="form-field">
          <label className="form-label">Password</label>
          <input className="form-input" value={p} onChange={(ev) => setP(ev.target.value)} type="password" autoComplete="current-password" />
        </div>
        {err && <div style={{ color: "var(--rust)", fontSize: 12, marginBottom: 10 }}>{err}</div>}
        <button type="submit" className="cta-primary">Sign in</button>
        <div style={{ marginTop: 14, fontSize: 11, color: "var(--ink3)", lineHeight: 1.7 }}>
          Temporary credentials (local only): <br />
          <code style={{ color: "var(--ink2)" }}>{ADMIN_EMAIL}</code> · <code style={{ color: "var(--ink2)" }}>{ADMIN_PASSWORD}</code>
          <br /><br />Replace with real authentication when we connect Lovable Cloud.
        </div>
      </form>
    </div>
  );
}

function AdminShell() {
  const { email, signOut } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const links = [
    { to: "/admin", label: "Dashboard", icon: <IconLayoutDashboard />, exact: true },
    { to: "/admin/hero", label: "Hero banner", icon: <IconPhoto /> },
    { to: "/admin/categories", label: "Categories", icon: <IconCategory /> },
    { to: "/admin/sections", label: "Sections", icon: <IconLayoutGrid /> },
    { to: "/admin/products", label: "Products", icon: <IconPackage /> },
    { to: "/admin/reviews", label: "Reviews", icon: <IconStar /> },
    { to: "/admin/inquiries", label: "Orders", icon: <IconReceipt /> },
    { to: "/admin/theme", label: "Theme", icon: <IconPalette /> },
  ];

  return (
    <div className="admin-wrap">
      <aside className="admin-side">
        <div className="admin-side-title">Yaawun admin</div>
        {links.map((l) => {
          const active = l.exact ? pathname === l.to : pathname.startsWith(l.to);
          return (
            <Link key={l.to} to={l.to} className={`admin-nav-link${active ? " active" : ""}`}>
              {l.icon}
              <span>{l.label}</span>
            </Link>
          );
        })}
        <div style={{ marginTop: 16, paddingTop: 12, borderTop: "0.5px solid var(--b)" }}>
          <Link to="/" className="admin-nav-link"><IconExternalLink /><span>View storefront</span></Link>
          <button className="admin-nav-link" onClick={signOut} style={{ width: "100%", background: "none", border: "none", textAlign: "left" }}>
            <IconLogout /><span>Sign out</span>
          </button>
          <div style={{ fontSize: 10, color: "var(--ink3)", padding: "8px 10px" }}>{email}</div>
        </div>
      </aside>
      <section className="admin-main">
        <Outlet />
      </section>
    </div>
  );
}
