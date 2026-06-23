export const CATEGORIES = [
  "Kashmiri Shawls",
  "Dress Material",
  "Kidswear",
  "Accessories",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const categorySlug = (c: string) =>
  c.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const categoryFromSlug = (slug: string): Category | null =>
  (CATEGORIES.find((c) => categorySlug(c) === slug) ?? null) as Category | null;

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
  date: string; // human-readable
  rating: number; // 1-5
  text: string;
  status: "pending" | "approved" | "rejected";
  reply?: string;
}

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
  bg: string; // fallback color when no image
  desc: string;
  isUnstitched: boolean;
  pieces: number;
  fabric: string;
  embroidery: string;
  care: string;
  items: ProductItem[];
  includes: string[];
  images: string[]; // data URLs
  createdAt: number;
}

export interface CartLine {
  productId: number;
  qty: number;
}

export interface Inquiry {
  id: string;
  createdAt: number;
  customer: { name: string; phone: string; email?: string; address: string; city: string; pincode: string; notes?: string };
  lines: { productId: number; name: string; qty: number; price: number }[];
  subtotal: number;
  delivery: number;
  total: number;
  status: "new" | "contacted" | "fulfilled" | "cancelled";
}

export const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
