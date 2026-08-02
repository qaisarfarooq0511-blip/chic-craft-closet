import { useEffect, useRef, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { authStore } from "@/lib/auth-store";

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

  const [refreshing, setRefreshing] = useState(false);
  const hasRefreshed = useRef(false);

  const roleMismatch = !loading && isAuthenticated && !!role && profile?.role !== role;

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      navigate({ to: loginPath, search: { redirect: pathname }, replace: true });
    }
  }, [loading, isAuthenticated, navigate, loginPath, pathname]);

  // A role mismatch might just be a stale in-memory profile -- e.g. an admin
  // role was granted in the DB after this session's profile was already
  // loaded into auth-store. Re-check once against the DB before concluding
  // access is actually denied.
  useEffect(() => {
    if (roleMismatch && !hasRefreshed.current) {
      hasRefreshed.current = true;
      setRefreshing(true);
      void authStore.refreshProfile().finally(() => setRefreshing(false));
    }
  }, [roleMismatch]);

  if (loading || (roleMismatch && refreshing)) {
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
            This account ({session?.user.email || session?.user.phone}) doesn't have {role} access.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
