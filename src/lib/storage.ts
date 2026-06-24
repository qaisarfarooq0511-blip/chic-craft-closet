import type { Product, Review, Inquiry, CartLine, HeroContent, CategoryRow, SectionRow, StaticPage } from "./types";
import { seedProducts, seedReviews, seedCategories, seedHero, seedSections, seedPages } from "./seed";

const KEY = {
  products: "yaawun:products:v1",
  reviews: "yaawun:reviews:v1",
  cart: "yaawun:cart:v1",
  inquiries: "yaawun:inquiries:v1",
  auth: "yaawun:auth:v1",
  hero: "yaawun:hero:v1",
  categories: "yaawun:categories:v1",
  sections: "yaawun:sections:v1",
  pages: "yaawun:pages:v1",
  config: "yaawun:config:v1",
  seeded: "yaawun:seeded:v6",
  pagesSeed: "yaawun:pages-seed:v2",
} as const;

export interface AppConfig {
  badges: string[];
  fabrics: string[];
  embroideries: string[];
  careOptions: string[];
  tags: string[];
  sizes: string[];
  maxQtyPerItem: number;
}

export const DEFAULT_CONFIG: AppConfig = {
  badges: ["New in", "Bestseller", "Sale", "Limited"],
  fabrics: ["Pure Pashmina", "Pure cotton", "Soft cotton", "Silk", "Linen", "Wool", "Brass base"],
  embroideries: ["Sozni hand-done", "Hand chikankari", "Kundan setting", "Machine floral", "Zardozi", "Aari"],
  careOptions: ["Dry clean only", "Hand wash cold", "Machine wash 30°C", "Avoid moisture", "Iron on low"],
  tags: ["pashmina", "ivory", "chikankari", "cotton", "earrings", "kundan", "festive", "bridal", "casual"],
  sizes: ["XS", "S", "M", "L", "XL", "XXL", "Free Size", "0-3 Months", "3-6 Months", "6-12 Months", "12-18 Months", "2-4 yrs", "4-8 yrs"],
  maxQtyPerItem: 10,
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
    maxQtyPerItem: stored.maxQtyPerItem ?? DEFAULT_CONFIG.maxQtyPerItem,
  };
};
export const saveConfig = (c: AppConfig) => write(KEY.config, c);

