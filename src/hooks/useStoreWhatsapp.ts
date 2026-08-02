import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

const KEY = "store_whatsapp";

// Hides the button for anything that isn't a real number: unset, a template
// placeholder, the known dummy "919000000000" seed value, "91XXXXXXXXXX"-style
// placeholders, or too few digits to be a real phone number.
function sanitizeWhatsapp(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.includes("{{") || trimmed.includes("}}")) return null;
  if (/x{3,}/i.test(trimmed)) return null;
  const digits = trimmed.replace(/\D/g, "");
  if (digits === "919000000000") return null;
  if (digits.length < 10) return null;
  return digits;
}

/** Exported so route loaders can ensureQueryData() with the exact same queryFn as useStoreWhatsapp(). */
export async function fetchStoreWhatsapp(): Promise<string | null> {
  const { data, error } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", KEY)
    .maybeSingle();
  if (error) throw error;
  return sanitizeWhatsapp(data?.value);
}

export function useStoreWhatsapp() {
  const query = useQuery({
    queryKey: ["store-whatsapp"],
    queryFn: fetchStoreWhatsapp,
    staleTime: 5 * 60 * 1000,
  });
  return { whatsapp: query.data ?? null, isLoading: query.isLoading };
}
