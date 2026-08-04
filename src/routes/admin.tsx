import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
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
  IconFileText,
  IconSettings,
  IconUsers,
  IconUserCog,
  IconTicket,
  IconAdjustmentsHorizontal,
} from "@tabler/icons-react";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Admin — Yaawun" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: AdminRoute,
});

function AdminRoute() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // /admin/login must be reachable while signed out — it's the one path this gate doesn't cover.
  if (pathname === "/admin/login") return <Outlet />;
  return (
    <ProtectedRoute role="admin" loginPath="/admin/login">
      <AdminShell />
    </ProtectedRoute>
  );
}

function AdminShell() {
  const { session, profile } = useSupabaseAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const links = [
    { to: "/admin", label: "Dashboard", icon: <IconLayoutDashboard />, exact: true },
    { to: "/admin/hero", label: "Hero banner", icon: <IconPhoto /> },
    { to: "/admin/categories", label: "Categories", icon: <IconCategory /> },
    { to: "/admin/sections", label: "Sections", icon: <IconLayoutGrid /> },
    { to: "/admin/products", label: "Products", icon: <IconPackage /> },
    { to: "/admin/pages", label: "Static pages", icon: <IconFileText /> },
    { to: "/admin/reviews", label: "Reviews", icon: <IconStar /> },
    { to: "/admin/orders", label: "Orders", icon: <IconReceipt /> },
    { to: "/admin/customers", label: "Customers", icon: <IconUsers /> },
    { to: "/admin/users", label: "Users", icon: <IconUserCog /> },
    { to: "/admin/coupons", label: "Coupons", icon: <IconTicket /> },
    { to: "/admin/settings", label: "Store settings", icon: <IconAdjustmentsHorizontal /> },
    { to: "/admin/config", label: "Configuration", icon: <IconSettings /> },
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
          <Link to="/" className="admin-nav-link">
            <IconExternalLink />
            <span>View storefront</span>
          </Link>
          <button
            className="admin-nav-link"
            onClick={() => void supabase.auth.signOut()}
            style={{ width: "100%", background: "none", border: "none", textAlign: "left" }}
          >
            <IconLogout />
            <span>Sign out</span>
          </button>
          <div style={{ fontSize: 10, color: "var(--ink3)", padding: "8px 10px" }}>
            {profile?.full_name || session?.user.email || session?.user.phone}
          </div>
        </div>
      </aside>
      <section className="admin-main">
        <Outlet />
      </section>
    </div>
  );
}
