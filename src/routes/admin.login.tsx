import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { MagicLinkForm } from "@/components/MagicLinkForm";

export const Route = createFileRoute("/admin/login")({
  head: () => ({
    meta: [{ title: "Admin sign in — Yaawun" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin, loading } = useSupabaseAuth();

  useEffect(() => {
    if (!loading && isAuthenticated && isAdmin) navigate({ to: "/admin", replace: true });
  }, [loading, isAuthenticated, isAdmin, navigate]);

  return (
    <div
      style={{
        minHeight: "calc(100vh - 60px)",
        display: "grid",
        placeItems: "center",
        background: "var(--cream2)",
        padding: 24,
      }}
    >
      <div>
        <div className="eyebrow" style={{ marginBottom: 8, textAlign: "center" }}>
          Yaawun admin
        </div>
        <MagicLinkForm
          title="Sign in"
          subtitle="We'll email you a sign-in link."
          redirectPath="/admin"
        />
        {!loading && isAuthenticated && !isAdmin && (
          <div style={{ marginTop: 12, textAlign: "center", fontSize: 12, color: "var(--rust)" }}>
            You're signed in with an account that doesn't have admin access.
          </div>
        )}
      </div>
    </div>
  );
}
