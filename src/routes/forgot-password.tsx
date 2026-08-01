import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset password — Yaawun" },
      { name: "description", content: "Reset your Yaawun account password." },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
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
          style={{ fontSize: 26, fontWeight: 400, color: "var(--ink)", marginBottom: 6 }}
        >
          Reset your password
        </h1>
        {sent ? (
          <p style={{ color: "var(--ink3)", fontSize: 13, marginTop: 10 }}>
            If an account exists for <strong>{email}</strong>, we've sent a link to reset your
            password.
          </p>
        ) : (
          <>
            <p style={{ color: "var(--ink3)", fontSize: 13, marginBottom: 22 }}>
              Enter your email and we'll send you a reset link.
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
              {error && <div style={errorStyle}>{error}</div>}
              <button type="submit" className="btn-ink" disabled={busy} style={{ marginTop: 6 }}>
                {busy ? "Sending…" : "Send reset link"}
              </button>
            </form>
          </>
        )}
        <div style={{ marginTop: 18, textAlign: "center", fontSize: 12, color: "var(--ink3)" }}>
          <Link to="/login" style={{ color: "inherit", textDecoration: "underline" }}>
            Back to sign in
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
