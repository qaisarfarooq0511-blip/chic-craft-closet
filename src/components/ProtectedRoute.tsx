import { useEffect } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";

interface Props {
  children: ReactNode;
  /** Required profile role. If set and the signed-in profile doesn't match, access is denied. */
  role?: "admin" | "customer";
  /** Where to send unauthenticated visitors. Defaults to the customer login page. */
  loginPath?: string;
}

export function ProtectedRoute({ children, role, loginPath = "/login" }: Props) {
  const { session, profile, loading, isAuthenticated } = useSupabaseAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const roleMismatch = !loading && isAuthenticated && role && profile?.role !== role;

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      navigate({ to: loginPath, search: { redirect: pathname }, replace: true });
    }
  }, [loading, isAuthenticated, navigate, loginPath, pathname]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "60vh",
          display: "grid",
          placeItems: "center",
          color: "var(--ink3)",
          fontSize: 13,
        }}
      >
        Loading…
      </div>
    );
  }

  if (!isAuthenticated) return null;

  if (roleMismatch) {
    return (
      <div
        style={{
          minHeight: "60vh",
          display: "grid",
          placeItems: "center",
          padding: 24,
          textAlign: "center",
        }}
      >
        <div>
          <h1 className="serif" style={{ fontSize: 24, color: "var(--ink)", marginBottom: 8 }}>
            Access denied
          </h1>
          <p style={{ color: "var(--ink3)", fontSize: 13 }}>
            This account ({session?.user.email}) doesn't have {role} access.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
