import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

const KEYS = ["store_whatsapp", "store_phone", "store_email"] as const;

export interface ContactDetails {
  whatsapp: string | null;
  phone: string | null;
  email: string | null;
}

// Same hide-if-placeholder logic as useStoreWhatsapp.ts's WhatsApp button:
// unset, a template marker, the known dummy seed value, "XXXXXXXXXX"-style
// placeholders, or too few digits to be a real phone number.
function sanitizePhone(raw: unknown, knownPlaceholderDigits: string): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.includes("{{") || trimmed.includes("}}")) return null;
  if (/x{3,}/i.test(trimmed)) return null;
  const digits = trimmed.replace(/\D/g, "");
  if (digits === knownPlaceholderDigits) return null;
  if (digits.length < 10) return null;
  return digits;
}

function sanitizeEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.includes("{{") || trimmed.includes("}}")) return null;
  if (!trimmed.includes("@")) return null;
  if (/example\.com$/i.test(trimmed) || /^your-?email/i.test(trimmed)) return null;
  return trimmed;
}

/** Exported so route loaders can ensureQueryData() with the exact same queryFn as useContactDetails(). */
export async function fetchContactDetails(): Promise<ContactDetails> {
  const { data, error } = await supabase.from("site_settings").select("key, value").in("key", KEYS);
  if (error) throw error;

  const map: Record<string, unknown> = {};
  for (const row of data ?? []) map[row.key] = row.value;

  return {
    whatsapp: sanitizePhone(map.store_whatsapp, "919000000000"),
    // store_phone has no known dummy digit-string like WhatsApp's seed value --
    // "" never matches a real 10+ digit number, so this comparison is inert
    // unless a future seed/placeholder value is added here too.
    phone: sanitizePhone(map.store_phone, ""),
    email: sanitizeEmail(map.store_email),
  };
}

/** WhatsApp/phone/email for the contact page, one query, each hidden if unset/placeholder. */
export function useContactDetails() {
  const query = useQuery({
    queryKey: ["contact-details"],
    queryFn: fetchContactDetails,
    staleTime: 5 * 60 * 1000,
  });
  return {
    whatsapp: query.data?.whatsapp ?? null,
    phone: query.data?.phone ?? null,
    email: query.data?.email ?? null,
    isLoading: query.isLoading,
  };
}
