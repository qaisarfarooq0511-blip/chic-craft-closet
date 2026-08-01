import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [{ title: "Set new password — Yaawun" }, { name: "robots", content: "noindex" }],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  // Supabase's password-recovery link signs the visitor in via the URL hash automatically (detectSessionInUrl: true).
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
    setTimeout(() => navigate({ to: "/", replace: true }), 1500);
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
          Set a new password
        </h1>
        {done ? (
          <p style={{ color: "var(--ink3)", fontSize: 13, marginTop: 10 }}>
            Password updated — redirecting you home…
          </p>
        ) : (
          <form onSubmit={submit} style={{ display: "grid", gap: 12, marginTop: 16 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, color: "var(--ink2)" }}>New password</span>
              <input
                type="password"
                autoFocus
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={inputStyle}
              />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, color: "var(--ink2)" }}>Confirm new password</span>
              <input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={inputStyle}
              />
            </label>
            {error && <div style={errorStyle}>{error}</div>}
            <button type="submit" className="btn-ink" disabled={busy} style={{ marginTop: 6 }}>
              {busy ? "Saving…" : "Save new password"}
            </button>
          </form>
        )}
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
