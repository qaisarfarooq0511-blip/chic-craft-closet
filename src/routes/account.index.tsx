import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { capitalizeName, useUserAuth, validateName } from "@/lib/user-auth";

export const Route = createFileRoute("/account/")({
  component: AccountOverview,
});

function AccountOverview() {
  const { user, updateUser } = useUserAuth();

  const [editing, setEditing] = useState<"name" | "email" | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [emailDraft, setEmailDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!savedMsg) return;
    const t = setTimeout(() => setSavedMsg(null), 2500);
    return () => clearTimeout(t);
  }, [savedMsg]);

  if (!user) return <div />;

  const startEditName = () => { setNameDraft(user.name); setError(null); setEditing("name"); };
  const startEditEmail = () => { setEmailDraft(user.email ?? ""); setError(null); setEditing("email"); };
  const cancel = () => { setEditing(null); setError(null); };

  const saveName = (e: React.FormEvent) => {
    e.preventDefault();
    const v = validateName(nameDraft);
    if (!v.ok) { setError(v.error); return; }
    updateUser({ name: v.value });
    setEditing(null);
    setSavedMsg("Name updated");
  };

  const saveEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const v = emailDraft.trim();
    if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      setError("Please enter a valid email address.");
      return;
    }
    updateUser({ email: v });
    setEditing(null);
    setSavedMsg(v ? "Email updated" : "Email removed");
  };

  return (
    <div>
      <h2 className="serif" style={{ fontSize: 22, fontWeight: 400, marginBottom: 16 }}>Profile details</h2>

      {savedMsg && (
        <div style={{
          marginBottom: 16, padding: "10px 12px", borderRadius: 8,
          background: "#eef7ee", border: "1px solid #cfe6cf", color: "#2e5d2e", fontSize: 13,
        }}>{savedMsg}</div>
      )}

      <section style={cardStyle}>
        <Row label="Full name" value={user.name} editing={editing === "name"} onEdit={startEditName}>
          <form onSubmit={saveName} style={formRow}>
            <input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={() => setNameDraft((n) => (n.trim() ? capitalizeName(n.trim()) : n))}
              placeholder="Your full name"
              autoFocus
              style={inputStyle}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" style={primaryBtn}>Save</button>
              <button type="button" onClick={cancel} style={ghostBtn}>Cancel</button>
            </div>
          </form>
        </Row>

        <Divider />

        <Row
          label="Mobile number"
          value={user.mobile}
          hint="Your registered mobile number cannot be changed."
        />

        <Divider />

        <Row
          label="Email address"
          value={user.email || "Not added yet"}
          muted={!user.email}
          editing={editing === "email"}
          onEdit={startEditEmail}
          editLabel={user.email ? "Edit" : "Add email"}
        >
          <form onSubmit={saveEmail} style={formRow}>
            <input
              type="email"
              value={emailDraft}
              onChange={(e) => setEmailDraft(e.target.value)}
              placeholder="you@example.com"
              autoFocus
              style={inputStyle}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" style={primaryBtn}>Save</button>
              <button type="button" onClick={cancel} style={ghostBtn}>Cancel</button>
            </div>
          </form>
        </Row>

        {error && (
          <div style={{ marginTop: 12, color: "#b03a2e", fontSize: 13 }}>{error}</div>
        )}
      </section>
    </div>
  );
}

function Row({
  label, value, hint, muted, editing, onEdit, editLabel, children,
}: {
  label: string;
  value: string;
  hint?: string;
  muted?: boolean;
  editing?: boolean;
  onEdit?: () => void;
  editLabel?: string;
  children?: React.ReactNode;
}) {
  return (
    <div style={{ padding: "16px 0" }}>
      <div style={{ fontSize: 12, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 }}>
        {label}
      </div>
      {editing ? (
        children
      ) : (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ fontSize: 15, color: muted ? "var(--ink3)" : "var(--ink)", fontStyle: muted ? "italic" : "normal" }}>
            {value}
          </div>
          {onEdit && (
            <button onClick={onEdit} style={linkBtn}>{editLabel ?? "Edit"}</button>
          )}
        </div>
      )}
      {hint && !editing && (
        <div style={{ fontSize: 12, color: "var(--ink3)", marginTop: 6 }}>{hint}</div>
      )}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: "var(--line)" }} />;
}

const cardStyle: React.CSSProperties = {
  background: "#fff", border: "1px solid var(--line)", borderRadius: 12, padding: "8px 20px",
};
const formRow: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 10 };
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", border: "1.5px solid #d4cfc7", borderRadius: 8,
  fontSize: 15, background: "#fff", color: "var(--ink)", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.03)",
};
const primaryBtn: React.CSSProperties = {
  padding: "9px 16px", background: "var(--ink)", color: "#fff", border: "none",
  borderRadius: 8, fontSize: 13, cursor: "pointer",
};
const ghostBtn: React.CSSProperties = {
  padding: "9px 14px", background: "transparent", color: "var(--ink)",
  border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, cursor: "pointer",
};
const linkBtn: React.CSSProperties = {
  background: "transparent", border: "none", color: "var(--ink)", fontSize: 13,
  cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3, padding: 0,
};
