// Seed category names (used to bootstrap the categories store on first load).
export const CATEGORIES = [
  "Kashmiri Shawls",
  "Dress Material",
  "Kidswear",
  "Accessories",
] as const;

// Loosened to plain string so admin can add/rename categories dynamically.
export type Category = string;

export const categorySlug = (c: string) =>
  c.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Looks up a slug against the live categories store (with fallback to defaults during SSR).
import type { CategoryRow } from "./types-extra";

export const categoryFromSlug = (slug: string, list?: { slug: string; name: string }[]): Category | null => {
  if (list && list.length) {
    const m = list.find((c) => c.slug === slug);
    return m ? m.name : null;
  }
  const m = CATEGORIES.find((c) => categorySlug(c) === slug);
  return m ?? null;
};

export interface ProductItem {
  name: string;
  length: string;
  width: string;
  weight: string;
}

export interface Review {
  id: string;
  productId: number;
  name: string;
  location?: string;
  date: string;
  rating: number;
  text: string;
  status: "pending" | "approved" | "rejected";
  reply?: string;
}

export type ProductFlag = "new" | "trending" | "featured";

export interface Product {
  id: number;
  slug: string;
  name: string;
  subtitle?: string;
  category: Category;
  type: string;
  price: number;
  was?: number | null;
  stock: number;
  listed: boolean;
  badge?: string | null;
  rating: number;
  reviewsCount: number;
  bg: string;
  desc: string;
  isUnstitched: boolean;
  pieces: number;
  fabric: string;
  embroidery: string;
  care: string;
  items: ProductItem[];
  includes: string[];
  images: string[];                  // up to 5
  mainImageIndex?: number;           // which image is main; default 0
  note?: string;                     // golden-box callout on PDP
  tags?: string[];                   // free-form tags for rule-based sections
  flags?: ProductFlag[];             // new / trending / featured
  createdAt: number;
}

export interface CartLine {
  productId: number;
  qty: number;
}

export interface Inquiry {
  id: string;
  createdAt: number;
  customer: { name: string; phone: string; address: string; city: string; pincode: string; notes?: string };
  lines: { productId: number; name: string; qty: number; price: number }[];
  subtotal: number;
  delivery: number;
  total: number;
  status: "new" | "contacted" | "fulfilled" | "cancelled";
}

export const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Re-export extra types for convenience
export type { HeroContent, CategoryRow, SectionRow, SectionRule } from "./types-extra";
