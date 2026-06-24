import { createFileRoute, useNavigate, useSearch, Link } from "@tanstack/react-router";
import { useState } from "react";
import { createUser, findUserByMobile, normalizeMobile, useUserAuth } from "@/lib/user-auth";

type Search = { redirect?: string };

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — Yaawun" },
      { name: "description", content: "Sign in or create your Yaawun account with your mobile number." },
    ],
  }),
  component: AuthPage,
});

type Step = "mobile" | "otp" | "name";

function AuthPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth" });
  const { user, signIn } = useUserAuth();

  const [step, setStep] = useState<Step>("mobile");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isNew, setIsNew] = useState(false);

  if (user) {
    // Already signed in — bounce away.
    if (typeof window !== "undefined") {
      const target = search.redirect && search.redirect.startsWith("/") ? search.redirect : "/";
      window.location.replace(target);
    }
    return null;
  }

  const goAfterAuth = (u: { id: string; mobile: string; name: string; createdAt: number }) => {
    signIn(u);
    const target = search.redirect && search.redirect.startsWith("/") ? search.redirect : "/";
    navigate({ to: target });
  };

  const submitMobile = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const digits = mobile.replace(/[^\d]/g, "");
    if (digits.length < 10) { setError("Enter a valid mobile number"); return; }
    const existing = findUserByMobile(mobile);
    setIsNew(!existing);
    setStep("otp");
  };

  const submitOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^\d{6}$/.test(otp)) { setError("Enter the 6-digit code"); return; }
    // Dev mode: any 6-digit code is accepted. Real OTP provider to be wired later.
    if (isNew) {
      setStep("name");
    } else {
      const existing = findUserByMobile(mobile)!;
      goAfterAuth(existing);
    }
  };

  const submitName = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 2) { setError("Please enter your full name"); return; }
    const u = createUser(mobile, name);
    goAfterAuth(u);
  };

  return (
    <div style={{ minHeight: "70vh", display: "grid", placeItems: "center", padding: "48px 16px", background: "var(--cream)" }}>
      <div style={{ width: "100%", maxWidth: 420, background: "#fff", border: "1px solid var(--line)", borderRadius: 12, padding: 28 }}>
        <h1 className="serif" style={{ fontSize: 28, fontWeight: 400, color: "var(--ink)", marginBottom: 6 }}>
          {step === "mobile" ? "Sign in or sign up" : step === "otp" ? "Verify your number" : "Just one more thing"}
        </h1>
        <p style={{ color: "var(--ink3)", fontSize: 13, marginBottom: 22 }}>
          {step === "mobile" && "We'll send a one-time code to your mobile."}
          {step === "otp" && <>Enter the 6-digit code sent to <strong>{normalizeMobile(mobile)}</strong>.</>}
          {step === "name" && "Tell us your name so we can personalise your orders."}
        </p>

        {step === "mobile" && (
          <form onSubmit={submitMobile} style={{ display: "grid", gap: 12 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, color: "var(--ink2)" }}>Mobile number</span>
              <input
                type="tel"
                inputMode="tel"
                autoFocus
                placeholder="+91 98765 43210"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                style={inputStyle}
              />
            </label>
            {error && <div style={errorStyle}>{error}</div>}
            <button type="submit" className="btn-ink" style={{ marginTop: 6 }}>Send code</button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={submitOtp} style={{ display: "grid", gap: 12 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, color: "var(--ink2)" }}>One-time code</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                autoFocus
                placeholder="••••••"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/[^\d]/g, ""))}
                style={{ ...inputStyle, letterSpacing: 6, fontSize: 18, textAlign: "center" }}
              />
            </label>
            <div style={{ fontSize: 11, color: "var(--ink3)" }}>
              Dev mode: any 6-digit code works. OTP provider will be connected later.
            </div>
            {error && <div style={errorStyle}>{error}</div>}
            <button type="submit" className="btn-ink" style={{ marginTop: 6 }}>
              {isNew ? "Continue" : "Sign in"}
            </button>
            <button type="button" onClick={() => { setStep("mobile"); setOtp(""); }}
              style={linkBtnStyle}>Change number</button>
          </form>
        )}

        {step === "name" && (
          <form onSubmit={submitName} style={{ display: "grid", gap: 12 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, color: "var(--ink2)" }}>Full name</span>
              <input
                type="text"
                autoFocus
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={inputStyle}
              />
            </label>
            {error && <div style={errorStyle}>{error}</div>}
            <button type="submit" className="btn-ink" style={{ marginTop: 6 }}>Create account</button>
          </form>
        )}

        <div style={{ marginTop: 18, textAlign: "center", fontSize: 12, color: "var(--ink3)" }}>
          <Link to="/" style={{ color: "inherit", textDecoration: "underline" }}>Back to home</Link>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid var(--line)",
  borderRadius: 8,
  fontSize: 14,
  background: "#fff",
  color: "var(--ink)",
  outline: "none",
};

const errorStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#b91c1c",
  background: "#fef2f2",
  border: "1px solid #fecaca",
  padding: "8px 10px",
  borderRadius: 6,
};

const linkBtnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "var(--ink2)",
  fontSize: 12,
  textDecoration: "underline",
  cursor: "pointer",
  padding: 0,
};
