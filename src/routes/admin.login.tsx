import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";

export const Route = createFileRoute("/admin/login")({
  head: () => ({
    meta: [{ title: "Admin sign in — Yaawun" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin, loading } = useSupabaseAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && isAuthenticated && isAdmin) navigate({ to: "/admin", replace: true });
  }, [loading, isAuthenticated, isAdmin, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (signInError) {
      setBusy(false);
      setError(
        signInError.message === "Invalid login credentials"
          ? "Incorrect email or password."
          : signInError.message,
      );
      return;
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .maybeSingle();
    setBusy(false);
    if (profile?.role !== "admin") {
      await supabase.auth.signOut();
      setError("This account doesn't have admin access.");
      return;
    }
    navigate({ to: "/admin", replace: true });
  };

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
      <form
        onSubmit={submit}
        className="admin-card"
        style={{ width: "100%", maxWidth: 380, padding: "2rem" }}
      >
        <div className="eyebrow" style={{ marginBottom: 8 }}>
          Yaawun admin
        </div>
        <h1
          className="serif"
          style={{ fontSize: 26, fontWeight: 300, color: "var(--ink)", marginBottom: 18 }}
        >
          Sign in
        </h1>
        <div className="form-field">
          <label className="form-label">Email</label>
          <input
            className="form-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            autoComplete="email"
            required
          />
        </div>
        <div className="form-field">
          <label className="form-label">Password</label>
          <input
            className="form-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
        {error && (
          <div style={{ color: "var(--rust)", fontSize: 12, marginBottom: 10 }}>{error}</div>
        )}
        <button type="submit" className="cta-primary" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
