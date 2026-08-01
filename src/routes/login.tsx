import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";

type Search = { redirect?: string };

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — Yaawun" },
      { name: "description", content: "Sign in to your Yaawun account." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { isAuthenticated } = useSupabaseAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const targetPath = search.redirect && search.redirect.startsWith("/") ? search.redirect : "/";

  useEffect(() => {
    if (isAuthenticated) navigate({ to: targetPath, replace: true });
  }, [isAuthenticated, targetPath, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) {
      setError(
        error.message === "Invalid login credentials"
          ? "Incorrect email or password."
          : error.message,
      );
      return;
    }
    navigate({ to: targetPath, replace: true });
  };

  return (
    <div
      style={{
        minHeight: "70vh",
        display: "grid",
        placeItems: "center",
        padding: "48px 16px",
        background: "var(--cream)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#fff",
          border: "1px solid var(--b)",
          borderRadius: 12,
          padding: 28,
        }}
      >
        <h1
          className="serif"
          style={{ fontSize: 28, fontWeight: 400, color: "var(--ink)", marginBottom: 6 }}
        >
          Sign in
        </h1>
        <p style={{ color: "var(--ink3)", fontSize: 13, marginBottom: 22 }}>
          Welcome back to Yaawun.
        </p>

        <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12, color: "var(--ink2)" }}>Email</span>
            <input
              type="email"
              autoFocus
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
            />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12, color: "var(--ink2)" }}>Password</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
            />
          </label>
          {error && <div style={errorStyle}>{error}</div>}
          <button type="submit" className="btn-ink" disabled={busy} style={{ marginTop: 6 }}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div style={{ marginTop: 14, textAlign: "center", fontSize: 12, color: "var(--ink3)" }}>
          <Link to="/forgot-password" style={{ color: "inherit", textDecoration: "underline" }}>
            Forgot password?
          </Link>
        </div>
        <div style={{ marginTop: 10, textAlign: "center", fontSize: 12, color: "var(--ink3)" }}>
          New to Yaawun?{" "}
          <Link
            to="/signup"
            search={{ redirect: search.redirect }}
            style={{ color: "var(--gold)", textDecoration: "underline" }}
          >
            Create an account
          </Link>
        </div>
        <div style={{ marginTop: 18, textAlign: "center", fontSize: 12, color: "var(--ink3)" }}>
          <Link to="/" style={{ color: "inherit", textDecoration: "underline" }}>
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  border: "1.5px solid #d4cfc7",
  borderRadius: 8,
  fontSize: 15,
  background: "#fff",
  color: "var(--ink)",
  outline: "none",
  boxShadow: "inset 0 1px 2px rgba(0,0,0,0.03)",
};

const errorStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#b91c1c",
  background: "#fef2f2",
  border: "1px solid #fecaca",
  padding: "8px 10px",
  borderRadius: 6,
};
