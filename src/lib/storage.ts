import type { Product, Review, Inquiry, CartLine, HeroContent, CategoryRow, SectionRow, StaticPage } from "./types";
import { seedProducts, seedReviews, seedCategories, seedHero, seedSections, seedPages } from "./seed";
import { K, readLocal, writeLocal, removeLocal } from "./store-sync";

const KEY = {
  products: K.products,
  reviews: K.reviews,
  cart: K.cart,
  inquiries: K.inquiries,
  auth: K.auth,
  hero: K.hero,
  categories: K.categories,
  sections: K.sections,
  pages: K.pages,
  config: K.config,
  coupons: K.coupons,
  seeded: "yaawun:seeded:v6",
  pagesSeed: "yaawun:pages-seed:v2",
} as const;

export type CouponDiscountType = "percent" | "flat";
export type PaymentMode = "cod" | "upi" | "card" | "netbanking" | "wallet";

export interface Coupon {
  id: string;
  code: string;                       // stored uppercase
  description?: string;
  discountType: CouponDiscountType;
  amount: number;                     // percent (1-100) or flat (₹)
  maxDiscountCap?: number | null;     // only for percent
  minOrderValue?: number | null;
  globalUsageLimit?: number | null;   // total uses across all users
  perUserLimit?: number | null;
  usedCount: number;
  includedCategories: string[];       // empty = all
  excludedCategories: string[];
  includedProductIds: number[];       // empty = all
  excludedProductIds: number[];
  paymentModes: PaymentMode[];        // empty = all
  startsAt: number;                   // epoch ms
  expiresAt: number;                  // epoch ms
  active: boolean;
  createdAt: number;
}


export interface HsnCode {
  code: string;
  description?: string;
  gstRate: number; // total GST % (e.g. 5, 12, 18)
}

export interface FaqEntry { q: string; a: string }

export interface AppConfig {
  badges: string[];
  fabrics: string[];
  embroideries: string[];
  careOptions: string[];
  tags: string[];
  sizes: string[];
  shippingPartners: string[];
  cancellationReasons: string[];
  maxQtyPerItem: number;
  hsnCodes: HsnCode[];
  globalFaqs: FaqEntry[];
}

export const DEFAULT_CONFIG: AppConfig = {
  badges: ["New in", "Bestseller", "Sale", "Limited"],
  fabrics: ["Pure Pashmina", "Pure cotton", "Soft cotton", "Silk", "Linen", "Wool", "Brass base"],
  embroideries: ["Sozni hand-done", "Hand chikankari", "Kundan setting", "Machine floral", "Zardozi", "Aari"],
  careOptions: ["Dry clean only", "Hand wash cold", "Machine wash 30°C", "Avoid moisture", "Iron on low"],
  tags: ["pashmina", "ivory", "chikankari", "cotton", "earrings", "kundan", "festive", "bridal", "casual"],
  sizes: ["XS", "S", "M", "L", "XL", "XXL", "Free Size", "0-3 Months", "3-6 Months", "6-12 Months", "12-18 Months", "2-4 yrs", "4-8 yrs"],
  shippingPartners: ["Delhivery", "Blue Dart", "DTDC", "India Post", "Shiprocket", "Ekart", "XpressBees"],
  cancellationReasons: ["Customer requested cancellation", "Out of stock", "Address unreachable", "Payment failed", "Duplicate order", "Suspected fraud", "Other"],
  maxQtyPerItem: 10,
  hsnCodes: [
    { code: "6214", description: "Shawls, scarves, mufflers (textile)", gstRate: 5 },
    { code: "5208", description: "Cotton woven fabrics", gstRate: 5 },
    { code: "6204", description: "Women's apparel (stitched)", gstRate: 12 },
    { code: "6209", description: "Babies' / kids' garments", gstRate: 12 },
    { code: "7117", description: "Imitation jewellery", gstRate: 18 },
  ],
  globalFaqs: [
    { q: "What are Yaawun's shipping timelines?", a: "Orders are processed within 1–2 business days and typically delivered within 3–7 business days across India. Free shipping on orders above ₹999." },
    { q: "What is the return and exchange policy?", a: "We offer a 7-day return window from the date of delivery. Items must be unused, unwashed and returned with original packaging. Free return pickup is available across most pincodes." },
    { q: "Are the prices inclusive of GST?", a: "Yes, all prices on Yaawun are inclusive of GST. A detailed tax invoice is available in your account once the order is placed." },
    { q: "How do I find my size?", a: "Each product page lists fabric cut lengths (for unstitched sets) or finished garment sizes. For ready-to-wear pieces, refer to the size guide linked from the size selector." },
    { q: "How should I care for my Yaawun pieces?", a: "Most natural fabric pieces are best dry-cleaned; care instructions are listed on every product page. For embroidered work, avoid moisture, store folded with muslin, and iron on low heat." },
  ],
};



const isBrowser = () => typeof window !== "undefined";

function read<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    // Manually fire storage event for same-tab listeners.
    window.dispatchEvent(new StorageEvent("storage", { key }));
  } catch (e) {
    console.warn("storage write failed", key, e);
  }
}

export function ensureSeeded() {
  if (!isBrowser()) return;
  if (localStorage.getItem(KEY.seeded)) {
    // Make sure pages exist even if user had a previous seed.
    if (!localStorage.getItem(KEY.pages)) {
      localStorage.setItem(KEY.pages, JSON.stringify(seedPages));
    }
    return;
  }
  localStorage.setItem(KEY.products, JSON.stringify(seedProducts));
  localStorage.setItem(KEY.reviews, JSON.stringify(seedReviews));
  localStorage.setItem(KEY.hero, JSON.stringify(seedHero));
  localStorage.setItem(KEY.categories, JSON.stringify(seedCategories));
  localStorage.setItem(KEY.sections, JSON.stringify(seedSections));
  localStorage.setItem(KEY.pages, JSON.stringify(seedPages));
  localStorage.setItem(KEY.seeded, "1");
}

// Products
export const getProducts = (): Product[] => {
  ensureSeeded();
  return read<Product[]>(KEY.products, seedProducts);
};
export const saveProducts = (products: Product[]) => write(KEY.products, products);
export const getProduct = (id: number): Product | undefined =>
  getProducts().find((p) => p.id === id);
export const getProductBySlug = (slug: string): Product | undefined =>
  getProducts().find((p) => p.slug === slug);
export const upsertProduct = (p: Product) => {
  const all = getProducts();
  const i = all.findIndex((x) => x.id === p.id);
  if (i >= 0) all[i] = p;
  else all.push(p);
  saveProducts(all);
};
export const deleteProduct = (id: number) => saveProducts(getProducts().filter((p) => p.id !== id));
export const nextProductId = () => Math.max(0, ...getProducts().map((p) => p.id)) + 1;

// Reviews
export const getReviews = (): Review[] => {
  ensureSeeded();
  return read<Review[]>(KEY.reviews, seedReviews);
};
export const saveReviews = (reviews: Review[]) => write(KEY.reviews, reviews);
export const getReviewsFor = (productId: number, onlyApproved = true): Review[] =>
  getReviews().filter((r) => r.productId === productId && (!onlyApproved || r.status === "approved"));
export const addReview = (r: Review) => saveReviews([r, ...getReviews()]);
export const updateReview = (r: Review) =>
  saveReviews(getReviews().map((x) => (x.id === r.id ? r : x)));
export const deleteReview = (id: string) => saveReviews(getReviews().filter((r) => r.id !== id));

// Cart
export const getCart = (): CartLine[] => read<CartLine[]>(KEY.cart, []);
export const saveCart = (lines: CartLine[]) => write(KEY.cart, lines);

// Inquiries
export const getInquiries = (): Inquiry[] => read<Inquiry[]>(KEY.inquiries, []);
export const saveInquiries = (i: Inquiry[]) => write(KEY.inquiries, i);
export const addInquiry = (i: Inquiry) => saveInquiries([i, ...getInquiries()]);
export const updateInquiry = (i: Inquiry) =>
  saveInquiries(getInquiries().map((x) => (x.id === i.id ? i : x)));

// Hero
export const getHero = (): HeroContent => {
  ensureSeeded();
  return read<HeroContent>(KEY.hero, seedHero);
};
export const saveHero = (h: HeroContent) => write(KEY.hero, h);

// Categories
export const getCategoriesStore = (): CategoryRow[] => {
  ensureSeeded();
  const list = read<CategoryRow[]>(KEY.categories, seedCategories);
  return [...list].sort((a, b) => a.order - b.order);
};
export const saveCategories = (cats: CategoryRow[]) => write(KEY.categories, cats);
export const upsertCategory = (c: CategoryRow) => {
  const all = getCategoriesStore();
  const i = all.findIndex((x) => x.id === c.id);
  if (i >= 0) all[i] = c; else all.push(c);
  saveCategories(all);
};
export const deleteCategory = (id: string) => saveCategories(getCategoriesStore().filter((c) => c.id !== id));

// Sections
export const getSections = (): SectionRow[] => {
  ensureSeeded();
  const list = read<SectionRow[]>(KEY.sections, seedSections);
  return [...list].sort((a, b) => a.order - b.order);
};
export const saveSections = (s: SectionRow[]) => write(KEY.sections, s);
export const upsertSection = (s: SectionRow) => {
  const all = getSections();
  const i = all.findIndex((x) => x.id === s.id);
  if (i >= 0) all[i] = s; else all.push(s);
  saveSections(all);
};
export const deleteSection = (id: string) => saveSections(getSections().filter((s) => s.id !== id));

// Resolve a section's products at render time.
export const resolveSectionProducts = (s: SectionRow, products: Product[]): Product[] => {
  const limit = s.limit ?? 6;
  const listed = products.filter((p) => p.listed);
  if (s.mode === "manual") {
    const ids = s.productIds ?? [];
    return ids.map((id) => listed.find((p) => p.id === id)).filter(Boolean).slice(0, limit) as Product[];
  }
  if (!s.rule) return listed.slice(0, limit);
  const { type, value } = s.rule;
  let matches: Product[] = [];
  if (type === "category") matches = listed.filter((p) => p.category === value);
  else if (type === "flag") matches = listed.filter((p) => p.flags?.includes(value as "new" | "trending" | "featured"));
  else if (type === "tag") matches = listed.filter((p) => p.tags?.includes(value));
  return matches.slice(0, limit);
};

function migratePages() {
  if (!isBrowser()) return;
  if (localStorage.getItem(KEY.pagesSeed) === "1") return;
  const existing = read<StaticPage[]>(KEY.pages, []);
  const merged = seedPages.map((sp) => {
    const existingPage = existing.find((ep) => ep.slug === sp.slug);
    return existingPage ? { ...existingPage, body: sp.body, updatedAt: Date.now() } : sp;
  });
  const existingSlugs = new Set(existing.map((ep) => ep.slug));
  const newPages = seedPages.filter((sp) => !existingSlugs.has(sp.slug));
  const result = [...merged, ...newPages].sort((a, b) => a.order - b.order);
  write(KEY.pages, result);
  localStorage.setItem(KEY.pagesSeed, "1");
}

// Static pages
export const getPages = (): StaticPage[] => {
  ensureSeeded();
  migratePages();
  const list = read<StaticPage[]>(KEY.pages, seedPages);
  return [...list].sort((a, b) => a.order - b.order);
};
export const getPage = (slug: string): StaticPage | undefined =>
  getPages().find((p) => p.slug === slug);
export const savePages = (pages: StaticPage[]) => write(KEY.pages, pages);
export const upsertPage = (p: StaticPage) => {
  const all = getPages();
  const i = all.findIndex((x) => x.slug === p.slug);
  if (i >= 0) all[i] = p; else all.push(p);
  savePages(all);
};
export const deletePage = (slug: string) =>
  savePages(getPages().filter((p) => p.slug !== slug));

// Auth (placeholder, local only)
export const ADMIN_EMAIL = "amiga.qaisar@gmail.com";
export const ADMIN_PASSWORD = "yaawun-admin";
export const getAuth = (): { email: string } | null => read(KEY.auth, null);
export const setAuth = (a: { email: string } | null) => {
  if (a) write(KEY.auth, a);
  else if (isBrowser()) localStorage.removeItem(KEY.auth);
};

// App config (admin-managed option lists + global limits).
export const getConfig = (): AppConfig => {
  const stored = read<Partial<AppConfig>>(KEY.config, {});
  return {
    badges: stored.badges ?? DEFAULT_CONFIG.badges,
    fabrics: stored.fabrics ?? DEFAULT_CONFIG.fabrics,
    embroideries: stored.embroideries ?? DEFAULT_CONFIG.embroideries,
    careOptions: stored.careOptions ?? DEFAULT_CONFIG.careOptions,
    tags: stored.tags ?? DEFAULT_CONFIG.tags,
    sizes: stored.sizes ?? DEFAULT_CONFIG.sizes,
    shippingPartners: stored.shippingPartners ?? DEFAULT_CONFIG.shippingPartners,
    cancellationReasons: stored.cancellationReasons ?? DEFAULT_CONFIG.cancellationReasons,
    maxQtyPerItem: stored.maxQtyPerItem ?? DEFAULT_CONFIG.maxQtyPerItem,
    hsnCodes: stored.hsnCodes ?? DEFAULT_CONFIG.hsnCodes,
    globalFaqs: stored.globalFaqs ?? DEFAULT_CONFIG.globalFaqs,
  };
};
export const saveConfig = (c: AppConfig) => write(KEY.config, c);

// Tax helper — prices are GST-inclusive.
export const computeTaxBreakup = (priceInclusive: number, gstRate: number) => {
  const base = priceInclusive / (1 + gstRate / 100);
  const gst = priceInclusive - base;
  return {
    base: Math.round(base * 100) / 100,
    gst: Math.round(gst * 100) / 100,
    cgst: Math.round((gst / 2) * 100) / 100,
    sgst: Math.round((gst / 2) * 100) / 100,
    igst: Math.round(gst * 100) / 100,
    rate: gstRate,
    total: priceInclusive,
  };
};



// Coupons
export const getCoupons = (): Coupon[] => read<Coupon[]>(KEY.coupons, []);
export const saveCoupons = (list: Coupon[]) => write(KEY.coupons, list);
export const upsertCoupon = (c: Coupon) => {
  const all = getCoupons();
  const i = all.findIndex((x) => x.id === c.id);
  if (i >= 0) all[i] = c; else all.unshift(c);
  saveCoupons(all);
};
export const deleteCoupon = (id: string) => saveCoupons(getCoupons().filter((c) => c.id !== id));


