import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { IconUser, IconShoppingBag, IconHeart, IconMapPin } from "@tabler/icons-react";
import { useUserAuth } from "@/lib/user-auth";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "My Account — Yaawun" },
      { name: "description", content: "Manage your Yaawun profile, orders, wishlist and saved addresses." },
    ],
  }),
  component: AccountLayout,
});

const NAV: { to: string; label: string; icon: typeof IconUser; exact?: boolean }[] = [
  { to: "/account", label: "My Account", icon: IconUser, exact: true },
  { to: "/account/orders", label: "My Orders", icon: IconShoppingBag },
  { to: "/account/wishlist", label: "Wishlist", icon: IconHeart },
  { to: "/account/addresses", label: "Address Book", icon: IconMapPin },
];

function AccountLayout() {
  const navigate = useNavigate();
  const { user, signOut } = useUserAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!user) navigate({ to: "/auth", search: { redirect: pathname }, replace: true });
  }, [user, navigate, pathname]);

  if (!user) return null;

  return (
    <main className="container" style={{ maxWidth: 980, padding: "40px 20px 80px" }}>
      <div style={{ marginBottom: 8 }}>
        <Link to="/" className="muted-link" style={{ fontSize: 12 }}>← Back to store</Link>
      </div>
      <h1 className="serif" style={{ fontSize: 32, fontWeight: 400, marginBottom: 4 }}>Hi, {user.name.split(" ")[0]}</h1>
      <p style={{ color: "var(--ink3)", marginBottom: 28, fontSize: 14 }}>
        Manage your profile, orders, wishlist and saved addresses.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 220px) 1fr", gap: 28, alignItems: "start" }}>
        <aside style={{ position: "sticky", top: 80 }}>
          <nav style={{
            background: "#fff", border: "1px solid var(--line)", borderRadius: 12,
            padding: 8, display: "grid", gap: 2,
          }}>
            {NAV.map(({ to, label, icon: Icon, exact }) => {
              const active = exact ? pathname === to : pathname.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 12px", borderRadius: 8, fontSize: 13,
                    color: active ? "var(--ink)" : "var(--ink2)",
                    background: active ? "var(--cream)" : "transparent",
                    fontWeight: active ? 500 : 400,
                    textDecoration: "none",
                  }}
                >
                  <Icon size={16} />{label}
                </Link>
              );
            })}
          </nav>
          <button onClick={signOut} style={{
            marginTop: 12, width: "100%", padding: "10px 14px",
            background: "transparent", color: "var(--ink)",
            border: "1px solid var(--line)", borderRadius: 8,
            fontSize: 13, cursor: "pointer",
          }}>Sign out</button>
        </aside>

        <section style={{ minWidth: 0 }}>
          <Outlet />
        </section>
      </div>
    </main>
  );
}
