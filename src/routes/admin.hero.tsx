import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/hero")({
  component: HeroAdmin,
});

function HeroAdmin() {
  return (
    <>
      <h1 className="admin-h1">Hero Banner</h1>
      <div className="admin-card" style={{ textAlign: "center", padding: "48px 24px" }}>
        <p style={{ fontSize: 14, color: "var(--ink2)", marginBottom: 20 }}>
          Hero banner settings have moved to Store Settings.
        </p>
        <Link to="/admin/settings" className="cta-primary" style={{ display: "inline-block" }}>
          Go to Store Settings → Hero Banner
        </Link>
      </div>
    </>
  );
}
