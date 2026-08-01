import { useState } from "react";
import { IconX } from "@tabler/icons-react";
import { supabase } from "@/lib/supabase";
import { authStore } from "@/lib/auth-store";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { validateMobile } from "@/lib/user-auth";

/** Slim, dismissible nudge shown once after sign-in if the profile has no phone yet.
 * Purely a profile update — not auth. Not shown again this session once dismissed
 * or saved. */
export function AddPhonePrompt() {
  const { isAuthenticated, profile, loading } = useSupabaseAuth();
  const [dismissed, setDismissed] = useState(false);
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (loading || !isAuthenticated || !profile || profile.phone || dismissed) return null;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const v = validateMobile(phone);
    if (!v.ok) {
      setError(v.error);
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({ phone: v.value })
      .eq("id", profile.id);
    setBusy(false);
    if (error) {
      setError(
        error.code === "23505"
          ? "This number is already linked to another account."
          : error.message,
      );
      return;
    }
    await authStore.refreshProfile();
  };

  return (
    <div
      style={{
        background: "var(--cream2)",
        borderBottom: "0.5px solid var(--b)",
        padding: "10px 24px",
      }}
    >
      <form
        onSubmit={save}
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: 12, color: "var(--ink2)" }}>
          Add your mobile number for order updates:
        </span>
        <input
          type="tel"
          inputMode="tel"
          placeholder="+91 98765 43210"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          style={{
            padding: "6px 10px",
            border: "1px solid var(--b)",
            borderRadius: 6,
            fontSize: 12,
            minWidth: 160,
          }}
        />
        <button
          type="submit"
          className="btn-ink"
          disabled={busy}
          style={{ padding: "6px 14px", fontSize: 10 }}
        >
          {busy ? "Saving…" : "Save"}
        </button>
        {error && <span style={{ fontSize: 11, color: "#b91c1c" }}>{error}</span>}
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          style={{
            marginLeft: "auto",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--ink3)",
            display: "inline-flex",
          }}
        >
          <IconX size={16} />
        </button>
      </form>
    </div>
  );
}
