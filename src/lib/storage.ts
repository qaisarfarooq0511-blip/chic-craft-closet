import type { Product, Review, Inquiry, CartLine } from "./types";
import { seedProducts, seedReviews } from "./seed";

const KEY = {
  products: "yaawun:products:v1",
  reviews: "yaawun:reviews:v1",
  cart: "yaawun:cart:v1",
  inquiries: "yaawun:inquiries:v1",
  auth: "yaawun:auth:v1",
  seeded: "yaawun:seeded:v1",
} as const;

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
  } catch (e) {
    console.warn("storage write failed", key, e);
  }
}

export function ensureSeeded() {
  if (!isBrowser()) return;
  if (localStorage.getItem(KEY.seeded)) return;
  write(KEY.products, seedProducts);
  write(KEY.reviews, seedReviews);
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

// Inquiries (orders)
export const getInquiries = (): Inquiry[] => read<Inquiry[]>(KEY.inquiries, []);
export const saveInquiries = (i: Inquiry[]) => write(KEY.inquiries, i);
export const addInquiry = (i: Inquiry) => saveInquiries([i, ...getInquiries()]);
export const updateInquiry = (i: Inquiry) =>
  saveInquiries(getInquiries().map((x) => (x.id === i.id ? i : x)));

// Auth (placeholder, local only)
export const ADMIN_EMAIL = "amiga.qaisar@gmail.com";
export const ADMIN_PASSWORD = "yaawun-admin";
export const getAuth = (): { email: string } | null => read(KEY.auth, null);
export const setAuth = (a: { email: string } | null) => {
  if (a) write(KEY.auth, a);
  else if (isBrowser()) localStorage.removeItem(KEY.auth);
};
