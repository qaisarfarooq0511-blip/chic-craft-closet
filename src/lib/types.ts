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

// Resolves a slug to a category name. On the client we consult the live
// categories store (so admin-created categories work); on the server we fall
// back to the default CATEGORIES seed.
export const categoryFromSlug = (slug: string): Category | null => {
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("yaawun:categories:v1");
      if (raw) {
        const list = JSON.parse(raw) as { slug: string; name: string }[];
        const m = list.find((c) => c.slug === slug);
        if (m) return m.name;
      }
    } catch { /* ignore */ }
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
  sizes?: string[];                  // optional size options (e.g. "0-3 Months")
  hsnCode?: string | null;           // HSN code for GST (price is inclusive of GST)
  tldr?: string;                     // short 1-2 sentence summary for AEO / quick scan
  faqs?: { q: string; a: string }[]; // per-product Q&A; falls back to global FAQs in config
  createdAt: number;
}

export interface CartLine {
  productId: number;
  qty: number;
}

export interface InquiryFulfillment {
  partner: string;            // shipping partner (from config)
  awb: string;                // AWB / tracking number
  shippingCost: number;       // cost incurred by merchant
  expectedDelivery: string;   // ISO date (yyyy-mm-dd)
  trackingLink?: string;
  fulfilledAt: number;
}

export interface InquiryCancellation {
  reason: string;             // reason (from config)
  note?: string;
  cancelledAt: number;
}

export interface Inquiry {
  id: string;
  createdAt: number;
  customer: { name: string; phone: string; address: string; city: string; pincode: string; notes?: string };
  lines: { productId: number; name: string; qty: number; price: number; mrp?: number }[];
  subtotal: number;           // sum of sale price * qty
  mrpTotal?: number;          // sum of MRP * qty (pre-discount)
  discount?: number;          // total discount applied (mrpTotal - subtotal + coupon)
  couponCode?: string | null;
  delivery: number;
  total: number;              // final price charged
  status: "new" | "contacted" | "fulfilled" | "cancelled";
  fulfillment?: InquiryFulfillment;
  cancellation?: InquiryCancellation;
}

export const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Re-export extra types for convenience
export type { HeroContent, CategoryRow, SectionRow, SectionRule, StaticPage } from "./types-extra";
