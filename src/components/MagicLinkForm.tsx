import { useState } from "react";
import { supabase } from "@/lib/supabase";

interface Props {
  title: string;
  subtitle: string;
  /** Relative path the magic link should land the visitor on once clicked — the
   * absolute origin is added at submit time (client-only; `window` doesn't exist
   * during this page's SSR render). */
  redirectPath: string;
}

export function MagicLinkForm({ title, subtitle, redirectPath }: Props) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}${redirectPath}` },
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
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
          style={{ fontSize: 26, fontWeight: 400, color: "var(--ink)", marginBottom: 10 }}
        >
          Check your email
        </h1>
        <p style={{ color: "var(--ink3)", fontSize: 13 }}>
          We've sent a sign-in link to <strong>{email}</strong>. Click it to continue — this tab can
          stay open.
        </p>
      </div>
    );
  }

  return (
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
        {title}
      </h1>
      <p style={{ color: "var(--ink3)", fontSize: 13, marginBottom: 22 }}>{subtitle}</p>

      <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 12, color: "var(--ink2)" }}>Email</span>
          <input
            type="email"
            autoFocus
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />
        </label>
        {error && <div style={errorStyle}>{error}</div>}
        <button type="submit" className="btn-ink" disabled={busy} style={{ marginTop: 6 }}>
          {busy ? "Sending…" : "Send magic link"}
        </button>
      </form>
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
