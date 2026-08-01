import { useEffect, useState } from "react";
import { normalizeAndValidatePhone, requestOtp, verifyOtp, DEV_BYPASS } from "@/lib/otp-auth";

const RESEND_SECONDS = 30;

interface Props {
  title: string;
  subtitle: string;
  onVerified: (result: { isNewUser?: boolean }) => void | Promise<void>;
}

export function PhoneOtpForm({ title, subtitle, onVerified }: Props) {
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const v = normalizeAndValidatePhone(phone);
    if (!v.ok) {
      setError(v.error);
      return;
    }
    setBusy(true);
    const res = await requestOtp(v.value);
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setStep("otp");
    setResendIn(RESEND_SECONDS);
  };

  const resend = async () => {
    if (resendIn > 0) return;
    setError(null);
    setBusy(true);
    const res = await requestOtp(phone);
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setResendIn(RESEND_SECONDS);
  };

  const submitOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code.");
      return;
    }
    setBusy(true);
    const res = await verifyOtp(phone, code);
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    await onVerified({ isNewUser: res.isNewUser });
  };

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
      <p style={{ color: "var(--ink3)", fontSize: 13, marginBottom: 22 }}>
        {step === "phone" ? (
          subtitle
        ) : (
          <>
            Enter the 6-digit code sent to <strong>{phone}</strong>.
          </>
        )}
      </p>

      {step === "phone" && (
        <form onSubmit={sendOtp} style={{ display: "grid", gap: 12 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12, color: "var(--ink2)" }}>Mobile number</span>
            <input
              type="tel"
              inputMode="tel"
              autoFocus
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={inputStyle}
            />
          </label>
          {error && <div style={errorStyle}>{error}</div>}
          <button type="submit" className="btn-ink" disabled={busy} style={{ marginTop: 6 }}>
            {busy ? "Sending…" : "Send OTP"}
          </button>
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
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^\d]/g, "").slice(0, 6))}
              style={{ ...inputStyle, letterSpacing: 6, fontSize: 18, textAlign: "center" }}
            />
          </label>
          {DEV_BYPASS && (
            <div style={{ fontSize: 11, color: "var(--ink3)" }}>
              Dev mode: the code is always 123456.
            </div>
          )}
          {error && <div style={errorStyle}>{error}</div>}
          <button type="submit" className="btn-ink" disabled={busy} style={{ marginTop: 6 }}>
            {busy ? "Verifying…" : "Verify"}
          </button>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button
              type="button"
              onClick={() => {
                setStep("phone");
                setCode("");
                setError(null);
              }}
              style={linkBtnStyle}
            >
              Change number
            </button>
            <button
              type="button"
              onClick={resend}
              disabled={resendIn > 0 || busy}
              style={linkBtnStyle}
            >
              {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
            </button>
          </div>
        </form>
      )}
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

const linkBtnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "var(--ink2)",
  fontSize: 12,
  textDecoration: "underline",
  cursor: "pointer",
  padding: 0,
};
