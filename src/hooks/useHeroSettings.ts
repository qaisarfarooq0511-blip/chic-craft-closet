import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface HeroSettings {
  eyebrow: string;
  headline: string;
  sub: string;
  ctaPrimary: { label: string; href: string };
  ctaSecondary: { label: string; href: string };
}

const HERO_KEYS = [
  "hero_eyebrow",
  "hero_headline",
  "hero_subheadline",
  "hero_cta_primary_label",
  "hero_cta_primary_href",
  "hero_cta_secondary_label",
  "hero_cta_secondary_href",
] as const;

// Matches the migration's seeded values — used if a key is ever missing.
const DEFAULTS: HeroSettings = {
  eyebrow: "New collection · Summer 2025",
  headline: "Where every\nthread carries\na story",
  sub: "Unstitched dress materials, Kashmiri shawls, kidswear & handpicked accessories — curated with care for the modern Indian woman.",
  ctaPrimary: { label: "Shop now", href: "/shop" },
  ctaSecondary: { label: "Explore shawls", href: "/shop/kashmiri-shawls" },
};

/** Exported so route loaders can ensureQueryData() with the exact same queryFn as useHeroSettings(). */
export async function fetchHeroSettings(): Promise<HeroSettings> {
  const { data, error } = await supabase
    .from("site_settings")
    .select("key, value")
    .in("key", HERO_KEYS);
  if (error) throw error;

  const map: Record<string, unknown> = {};
  for (const row of data ?? []) map[row.key] = row.value;
  const str = (key: (typeof HERO_KEYS)[number], fallback: string): string =>
    typeof map[key] === "string" ? (map[key] as string) : fallback;

  return {
    eyebrow: str("hero_eyebrow", DEFAULTS.eyebrow),
    headline: str("hero_headline", DEFAULTS.headline),
    sub: str("hero_subheadline", DEFAULTS.sub),
    ctaPrimary: {
      label: str("hero_cta_primary_label", DEFAULTS.ctaPrimary.label),
      href: str("hero_cta_primary_href", DEFAULTS.ctaPrimary.href),
    },
    ctaSecondary: {
      label: str("hero_cta_secondary_label", DEFAULTS.ctaSecondary.label),
      href: str("hero_cta_secondary_href", DEFAULTS.ctaSecondary.href),
    },
  };
}

export function useHeroSettings() {
  return useQuery({
    queryKey: ["hero-settings"],
    queryFn: fetchHeroSettings,
    staleTime: 5 * 60 * 1000,
  });
}
