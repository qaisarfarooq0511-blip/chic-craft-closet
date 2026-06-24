import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  capitalizeName,
  deleteAddress,
  getAddresses,
  setDefaultAddress,
  upsertAddress,
  useUserAuth,
  validateMobile,
  validateName,
  type Address,
} from "@/lib/user-auth";

export const Route = createFileRoute("/account/addresses")({
  component: AddressesPage,
});

type Form = {
  id?: string;
  label: string;
  name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
};

const empty = (): Form => ({
  label: "Home", name: "", phone: "", line1: "", line2: "", city: "",
  state: "", pincode: "", isDefault: false,
});

function AddressesPage() {
  const { user } = useUserAuth();
  const [list, setList] = useState<Address[]>([]);
  const [form, setForm] = useState<Form | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});

  useEffect(() => {
    if (!user) return;
    const refresh = () => setList(getAddresses(user.id));
    refresh();
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, [user]);

  if (!user) return null;

  const startNew = () => {
    setForm({ ...empty(), name: user.name, phone: user.mobile, isDefault: list.length === 0 });
    setErrors({});
  };
  const startEdit = (a: Address) => {
    setForm({
      id: a.id, label: a.label ?? "Home", name: a.name, phone: a.phone,
      line1: a.line1, line2: a.line2 ?? "", city: a.city, state: a.state ?? "",
      pincode: a.pincode, isDefault: !!a.isDefault,
    });
    setErrors({});
  };
  const cancel = () => { setForm(null); setErrors({}); };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    const next: Partial<Record<keyof Form, string>> = {};
    const nameRes = validateName(form.name);
    if (!nameRes.ok) next.name = nameRes.error;
    const phoneRes = validateMobile(form.phone);
    if (!phoneRes.ok) next.phone = phoneRes.error;
    if (!form.line1.trim()) next.line1 = "Address line is required.";
    if (!form.city.trim()) next.city = "City is required.";
    if (!/^\d{6}$/.test(form.pincode.trim())) next.pincode = "Enter a valid 6-digit PIN.";
    setErrors(next);
    if (Object.keys(next).length) return;

    const addr: Address = {
      id: form.id ?? (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now())),
      userId: user.id,
      label: form.label.trim() || undefined,
      name: nameRes.ok ? nameRes.value : capitalizeName(form.name),
      phone: phoneRes.ok ? phoneRes.value : form.phone,
      line1: form.line1.trim(),
      line2: form.line2.trim() || undefined,
      city: form.city.trim(),
      state: form.state.trim() || undefined,
      pincode: form.pincode.trim(),
      isDefault: form.isDefault || list.length === 0,
      createdAt: Date.now(),
    };
    upsertAddress(addr);
    setList(getAddresses(user.id));
    setForm(null);
  };

  const remove = (id: string) => {
    if (!confirm("Remove this address?")) return;
    deleteAddress(id);
    setList(getAddresses(user.id));
  };

  const makeDefault = (id: string) => {
    setDefaultAddress(user.id, id);
    setList(getAddresses(user.id));
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h2 className="serif" style={{ fontSize: 22, fontWeight: 400, margin: 0 }}>Address Book</h2>
        {!form && (
          <button onClick={startNew} className="btn-ink" style={{ padding: "8px 14px", fontSize: 13 }}>
            + Add address
          </button>
        )}
      </div>

      {form && (
        <form onSubmit={save} style={{ ...cardStyle, marginBottom: 16, padding: 18 }}>
          <div style={gridForm}>
            <Field label="Label">
              <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="Home / Office" style={inputStyle} />
            </Field>
            <Field label="Full name *" error={errors.name}>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                onBlur={() => setForm((f) => f ? { ...f, name: f.name.trim() ? capitalizeName(f.name.trim()) : f.name } : f)}
                style={inputStyle} />
            </Field>
            <Field label="Mobile *" error={errors.phone}>
              <input value={form.phone} inputMode="tel"
                onChange={(e) => setForm({ ...form, phone: e.target.value })} style={inputStyle} />
            </Field>
            <Field label="Address line 1 *" error={errors.line1} full>
              <input value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })}
                placeholder="House / flat, street" style={inputStyle} />
            </Field>
            <Field label="Address line 2" full>
              <input value={form.line2} onChange={(e) => setForm({ ...form, line2: e.target.value })}
                placeholder="Landmark, area" style={inputStyle} />
            </Field>
            <Field label="City *" error={errors.city}>
              <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} style={inputStyle} />
            </Field>
            <Field label="State">
              <input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} style={inputStyle} />
            </Field>
            <Field label="PIN code *" error={errors.pincode}>
              <input value={form.pincode} inputMode="numeric" maxLength={6}
                onChange={(e) => setForm({ ...form, pincode: e.target.value.replace(/[^\d]/g, "").slice(0, 6) })} style={inputStyle} />
            </Field>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, fontSize: 13, color: "var(--ink2)" }}>
            <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} />
            Make this my default address
          </label>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button type="submit" className="btn-ink" style={{ padding: "9px 16px", fontSize: 13 }}>
              {form.id ? "Save changes" : "Save address"}
            </button>
            <button type="button" onClick={cancel} style={ghostBtn}>Cancel</button>
          </div>
        </form>
      )}

      {list.length === 0 && !form ? (
        <div style={{
          background: "#fff", border: "1px dashed var(--line)", borderRadius: 12,
          padding: "48px 24px", textAlign: "center",
        }}>
          <div style={{ fontSize: 16, color: "var(--ink)", marginBottom: 6 }}>No saved addresses</div>
          <div style={{ fontSize: 13, color: "var(--ink3)" }}>Add an address to speed up checkout.</div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {list.map((a) => (
            <article key={a.id} style={cardStyle}>
              <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <strong style={{ fontSize: 14 }}>{a.label || "Address"}</strong>
                  {a.isDefault && (
                    <span style={{ background: "var(--cream)", border: "1px solid var(--line)", fontSize: 10, padding: "2px 8px", borderRadius: 999, color: "var(--ink2)" }}>
                      Default
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", gap: 12, fontSize: 12 }}>
                  {!a.isDefault && <button onClick={() => makeDefault(a.id)} style={linkBtn}>Set default</button>}
                  <button onClick={() => startEdit(a)} style={linkBtn}>Edit</button>
                  <button onClick={() => remove(a.id)} style={{ ...linkBtn, color: "#b91c1c" }}>Delete</button>
                </div>
              </header>
              <div style={{ fontSize: 13, color: "var(--ink)" }}>{a.name}</div>
              <div style={{ fontSize: 13, color: "var(--ink2)" }}>
                {a.line1}{a.line2 ? `, ${a.line2}` : ""}<br />
                {a.city}{a.state ? `, ${a.state}` : ""} {a.pincode}
              </div>
              <div style={{ fontSize: 12, color: "var(--ink3)", marginTop: 4 }}>{a.phone}</div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, error, full, children }: { label: string; error?: string; full?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gap: 4, gridColumn: full ? "1 / -1" : undefined }}>
      <span style={{ fontSize: 12, color: "var(--ink2)" }}>{label}</span>
      {children}
      {error && <span style={{ fontSize: 12, color: "#b91c1c" }}>{error}</span>}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: "#fff", border: "1px solid var(--line)", borderRadius: 12, padding: 16,
};
const gridForm: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12,
};
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", border: "1.5px solid #d4cfc7", borderRadius: 8,
  fontSize: 14, background: "#fff", color: "var(--ink)", outline: "none",
  boxShadow: "inset 0 1px 2px rgba(0,0,0,0.03)",
};
const ghostBtn: React.CSSProperties = {
  padding: "9px 14px", background: "transparent", color: "var(--ink)",
  border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, cursor: "pointer",
};
const linkBtn: React.CSSProperties = {
  background: "transparent", border: "none", color: "var(--ink)", fontSize: 12,
  cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3, padding: 0,
};
