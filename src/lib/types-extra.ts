// Content-management types (hero, categories, sections). Split into a
// separate file to avoid a circular type import inside types.ts.

export interface HeroContent {
  eyebrow: string;
  headline: string;           // newlines render as <br/>
  sub: string;
  ctaPrimary: { label: string; href: string };
  ctaSecondary: { label: string; href: string };
  images: {
    main: string;             // data URL or asset URL
    smallLeft: string;
    smallRight: string;
  };
}

export interface CategoryRow {
  id: string;
  slug: string;
  name: string;
  label?: string | null;      // e.g. "New in", "Trending", "Popular"
  order: number;
  image?: string | null;      // optional category tile background
}

export type SectionRule =
  | { type: "category"; value: string }   // category name
  | { type: "flag"; value: "new" | "trending" | "featured" }
  | { type: "tag"; value: string };

export interface SectionRow {
  id: string;
  title: string;
  subtitle?: string;
  mode: "manual" | "rule";
  productIds?: number[];      // manual
  rule?: SectionRule;         // rule-based
  limit?: number;             // max products to show, default 6
  order: number;
  visible: boolean;
}

export interface StaticPage {
  slug: string;               // url segment, e.g. "about-us"
  title: string;              // page H1 + nav label
  body: string;               // HTML or plain text (newlines preserved)
  updatedAt: number;
  order: number;
}
