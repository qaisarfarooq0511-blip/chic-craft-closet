import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type SectionKey = "hero" | "reviews" | "footer";

export type Palette = {
  /** Dark background color */
  bg: string;
  /** Accent color used for small labels/captions (overrides --gold2 inside section) */
  accent: string;
};

export type Preset = {
  id: string;
  name: string;
  description: string;
  palette: Palette;
};

export const PRESETS: Preset[] = [
  { id: "current", name: "Charcoal brown", description: "Warm-tinted near-black", palette: { bg: "#1C1410", accent: "#D4A843" } },
  { id: "forest",  name: "Deep forest green", description: "Dark pine with gold accent", palette: { bg: "#0D1F17", accent: "#A5D6A7" } },
  { id: "plum",    name: "Midnight plum", description: "Deep violet with gold accent", palette: { bg: "#1A0F2E", accent: "#C5A8F0" } },
  { id: "navy",    name: "Ink navy", description: "Deep blue-black with gold", palette: { bg: "#0E1628", accent: "#8EAFD4" } },
  { id: "teal",    name: "Smoked teal", description: "Dark teal black with gold", palette: { bg: "#0C1F1E", accent: "#80CBC4" } },
  { id: "black",   name: "Charcoal black", description: "Neutral near-black, max contrast", palette: { bg: "#111111", accent: "#D4A843" } },
];

export const DEFAULT_PRESET_ID = "current";

export type SectionConfig =
  | { kind: "preset"; presetId: string }
  | { kind: "custom"; palette: Palette };

export type ThemeState = Record<SectionKey, SectionConfig>;

const STORAGE_KEY = "yaawun:section-themes";

const DEFAULT_STATE: ThemeState = {
  hero:    { kind: "preset", presetId: DEFAULT_PRESET_ID },
  reviews: { kind: "preset", presetId: DEFAULT_PRESET_ID },
  footer:  { kind: "preset", presetId: DEFAULT_PRESET_ID },
};

export function resolvePalette(cfg: SectionConfig): Palette {
  if (cfg.kind === "custom") return cfg.palette;
  return (PRESETS.find((p) => p.id === cfg.presetId) ?? PRESETS[0]).palette;
}

function loadState(): ThemeState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw);
    return {
      hero: parsed.hero ?? DEFAULT_STATE.hero,
      reviews: parsed.reviews ?? DEFAULT_STATE.reviews,
      footer: parsed.footer ?? DEFAULT_STATE.footer,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function applyToDocument(state: ThemeState) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  (Object.keys(state) as SectionKey[]).forEach((k) => {
    const { bg, accent } = resolvePalette(state[k]);
    root.style.setProperty(`--theme-${k}-bg`, bg);
    root.style.setProperty(`--theme-${k}-accent`, accent);
  });
}

type ThemeCtx = {
  state: ThemeState;
  setSection: (key: SectionKey, cfg: SectionConfig) => void;
  resetAll: () => void;
};

const Ctx = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ThemeState>(DEFAULT_STATE);

  // Hydrate from storage on mount; also subscribe to cross-tab updates.
  useEffect(() => {
    const next = loadState();
    setState(next);
    applyToDocument(next);
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        const fresh = loadState();
        setState(fresh);
        applyToDocument(fresh);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setSection = useCallback((key: SectionKey, cfg: SectionConfig) => {
    setState((prev) => {
      const next = { ...prev, [key]: cfg };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      applyToDocument(next);
      return next;
    });
  }, []);

  const resetAll = useCallback(() => {
    try { window.localStorage.removeItem(STORAGE_KEY); } catch {}
    setState(DEFAULT_STATE);
    applyToDocument(DEFAULT_STATE);
  }, []);

  const value = useMemo(() => ({ state, setSection, resetAll }), [state, setSection, resetAll]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTheme must be used inside ThemeProvider");
  return v;
}
