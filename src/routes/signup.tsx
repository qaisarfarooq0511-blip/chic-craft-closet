import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { authStore } from "@/lib/auth-store";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { capitalizeName, normalizeMobile, validateMobile, validateName } from "@/lib/user-auth";

type Search = { redirect?: string };

export const Route = createFileRoute("/signup")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Create account — Yaawun" },
      { name: "description", content: "Create your Yaawun account." },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { isAuthenticated } = useSupabaseAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [confirmationPending, setConfirmationPending] = useState(false);

  const targetPath = search.redirect && search.redirect.startsWith("/") ? search.redirect : "/";

  useEffect(() => {
    if (isAuthenticated) navigate({ to: targetPath, replace: true });
  }, [isAuthenticated, targetPath, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};

    const nameRes = validateName(fullName);
    if (!nameRes.ok) next.fullName = nameRes.error;

    if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = "Enter a valid email address.";

    let cleanPhone: string | null = null;
    if (phone.trim()) {
      const phoneRes = validateMobile(phone);
      if (!phoneRes.ok) next.phone = phoneRes.error;
      else cleanPhone = phoneRes.value;
    }

    if (password.length < 6) next.password = "Password must be at least 6 characters.";
    if (password !== confirmPassword) next.confirmPassword = "Passwords don't match.";

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setBusy(true);
    const cleanName = nameRes.ok ? nameRes.value : capitalizeName(fullName);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: cleanName } },
    });
    if (error) {
      setBusy(false);
      setErrors({ form: error.message });
      return;
    }

    if (data.session && data.user) {
      if (cleanPhone) {
        await supabase.from("profiles").update({ phone: cleanPhone }).eq("id", data.user.id);
      }
      await authStore.refreshProfile();
      setBusy(false);
      navigate({ to: targetPath, replace: true });
      return;
    }

    // Email confirmation required — no active session yet.
    setBusy(false);
    setConfirmationPending(true);
  };

  if (confirmationPending) {
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
            textAlign: "center",
          }}
        >
          <h1
            className="serif"
            style={{ fontSize: 24, fontWeight: 400, color: "var(--ink)", marginBottom: 10 }}
          >
            Check your email
          </h1>
          <p style={{ color: "var(--ink3)", fontSize: 13 }}>
            We've sent a confirmation link to <strong>{email}</strong>. Click it, then come back and
            sign in.
          </p>
          <Link to="/login" className="btn-ink" style={{ marginTop: 20, display: "inline-block" }}>
            Go to sign in
          </Link>
        </div>
      </div>
    );
  }

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
          Create your account
        </h1>
        <p style={{ color: "var(--ink3)", fontSize: 13, marginBottom: 22 }}>
          Join Yaawun to track orders and check out faster.
        </p>

        <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12, color: "var(--ink2)" }}>Full name</span>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              style={inputStyle}
              autoFocus
            />
            {errors.fullName && <div style={errorStyle}>{errors.fullName}</div>}
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12, color: "var(--ink2)" }}>Email</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
            />
            {errors.email && <div style={errorStyle}>{errors.email}</div>}
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12, color: "var(--ink2)" }}>Mobile (optional)</span>
            <input
              type="tel"
              inputMode="tel"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={inputStyle}
            />
            {errors.phone && <div style={errorStyle}>{errors.phone}</div>}
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12, color: "var(--ink2)" }}>Password</span>
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
            />
            {errors.password && <div style={errorStyle}>{errors.password}</div>}
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12, color: "var(--ink2)" }}>Confirm password</span>
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={inputStyle}
            />
            {errors.confirmPassword && <div style={errorStyle}>{errors.confirmPassword}</div>}
          </label>
          {errors.form && <div style={errorStyle}>{errors.form}</div>}
          <button type="submit" className="btn-ink" disabled={busy} style={{ marginTop: 6 }}>
            {busy ? "Creating account…" : "Create account"}
          </button>
        </form>

        <div style={{ marginTop: 14, textAlign: "center", fontSize: 12, color: "var(--ink3)" }}>
          Already have an account?{" "}
          <Link
            to="/login"
            search={{ redirect: search.redirect }}
            style={{ color: "var(--gold)", textDecoration: "underline" }}
          >
            Sign in
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
