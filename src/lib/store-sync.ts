/**
 * Cloud-backed store.
 *
 * The whole app reads/writes its data synchronously (products, orders,
 * customers, pages, ...). To move that data into the cloud database without
 * rewriting every screen, this module keeps an in-memory cache (mirrored to
 * localStorage for instant boot) and transparently syncs each collection to
 * the database:
 *
 *   boot      -> pullAll()  : database  ->  cache + localStorage
 *   mutation  -> writeLocal(): cache + localStorage, then push to database
 *
 * The database is the source of truth; localStorage is only an offline cache.
 */
import { supabase } from "@/integrations/supabase/client";

const isBrowser = () => typeof window !== "undefined";

/** Storage keys shared by storage.ts and user-auth.tsx. */
export const K = {
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
  coupons: "yaawun:coupons:v1",
  users: "yaawun:users:v1",
  session: "yaawun:user-session:v1",
  addresses: "yaawun:addresses:v1",
  wishlist: "yaawun:wishlist:v1",
} as const;

// ---------------------------------------------------------------- cache

const cache = new Map<string, unknown>();

export function readLocal<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  if (cache.has(key)) return cache.get(key) as T;
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    const parsed = JSON.parse(raw) as T;
    cache.set(key, parsed);
    return parsed;
  } catch {
    return fallback;
  }
}

export function writeLocal<T>(key: string, value: T, opts: { sync?: boolean } = {}) {
  if (!isBrowser()) return;
  cache.set(key, value);
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn("local cache write failed", key, e);
  }
  window.dispatchEvent(new StorageEvent("storage", { key }));
  if (opts.sync !== false) queueSync(key);
}

export function removeLocal(key: string) {
  if (!isBrowser()) return;
  cache.delete(key);
  try {
    localStorage.removeItem(key);
  } catch { /* ignore */ }
  window.dispatchEvent(new StorageEvent("storage", { key }));
}

// ------------------------------------------------------------- table map

type Row = Record<string, unknown>;

type Spec =
  | {
      kind: "collection";
      table: string;
      pk: string;
      toRow: (item: any) => Row;
      fromRow: (row: any) => unknown;
    }
  | { kind: "single"; settingsKey: string }
  | { kind: "wishlist" };

const SPECS: Record<string, Spec> = {
  [K.products]: {
    kind: "collection",
    table: "products",
    pk: "id",
    toRow: (p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      category: p.category ?? null,
      price: p.price ?? 0,
      listed: p.listed ?? true,
      stock: p.stock ?? 0,
      created_at: p.createdAt ?? 0,
      data: p,
    }),
    fromRow: (r) => r.data,
  },
  [K.reviews]: {
    kind: "collection",
    table: "reviews",
    pk: "id",
    toRow: (r) => ({
      id: r.id,
      product_id: r.productId,
      status: r.status ?? "pending",
      rating: r.rating ?? 5,
      data: r,
    }),
    fromRow: (r) => r.data,
  },
  [K.categories]: {
    kind: "collection",
    table: "categories",
    pk: "id",
    toRow: (c) => ({ id: c.id, slug: c.slug, name: c.name, sort_order: c.order ?? 0, data: c }),
    fromRow: (r) => r.data,
  },
  [K.sections]: {
    kind: "collection",
    table: "sections",
    pk: "id",
    toRow: (s) => ({
      id: s.id,
      title: s.title ?? "",
      sort_order: s.order ?? 0,
      visible: s.visible ?? true,
      data: s,
    }),
    fromRow: (r) => r.data,
  },
  [K.pages]: {
    kind: "collection",
    table: "pages",
    pk: "slug",
    toRow: (p) => ({ slug: p.slug, title: p.title ?? "", sort_order: p.order ?? 0, data: p }),
    fromRow: (r) => r.data,
  },
  [K.coupons]: {
    kind: "collection",
    table: "coupons",
    pk: "id",
    toRow: (c) => ({ id: c.id, code: c.code, active: c.active ?? true, data: c }),
    fromRow: (r) => r.data,
  },
  [K.inquiries]: {
    kind: "collection",
    table: "orders",
    pk: "id",
    toRow: (o) => ({
      id: o.id,
      created_at: o.createdAt ?? 0,
      status: o.status ?? "new",
      phone: o.customer?.phone ?? null,
      total: o.total ?? 0,
      data: o,
    }),
    fromRow: (r) => r.data,
  },
  [K.users]: {
    kind: "collection",
    table: "customers",
    pk: "id",
    toRow: (u) => ({
      id: u.id,
      mobile: u.mobile,
      name: u.name ?? "",
      email: u.email ?? null,
      newsletter_opt_in: u.newsletterOptIn ?? true,
      created_at: u.createdAt ?? 0,
      data: u,
    }),
    fromRow: (r) => r.data,
  },
  [K.addresses]: {
    kind: "collection",
    table: "addresses",
    pk: "id",
    toRow: (a) => ({ id: a.id, user_id: a.userId, data: a }),
    fromRow: (r) => r.data,
  },
  [K.hero]: { kind: "single", settingsKey: "hero" },
  [K.config]: { kind: "single", settingsKey: "config" },
  [K.wishlist]: { kind: "wishlist" },
};

// ---------------------------------------------------------------- push

const quote = (v: unknown) => (typeof v === "number" ? String(v) : `"${String(v).replace(/"/g, '\\"')}"`);

async function pushKey(key: string) {
  const spec = SPECS[key];
  if (!spec) return;
  try {
    if (spec.kind === "single") {
      const value = readLocal<unknown>(key, null);
      if (value == null) return;
      await supabase.from("settings").upsert({ key: spec.settingsKey, data: value as never });
      return;
    }

    if (spec.kind === "wishlist") {
      const map = readLocal<Record<string, number[]>>(key, {});
      const rows = Object.entries(map).flatMap(([userId, ids]) =>
        ids.map((productId) => ({ user_id: userId, product_id: productId })),
      );
      for (const userId of Object.keys(map)) {
        const ids = map[userId] ?? [];
        let del = supabase.from("wishlist").delete().eq("user_id", userId);
        if (ids.length) del = del.not("product_id", "in", `(${ids.join(",")})`);
        await del;
      }
      if (rows.length) await supabase.from("wishlist").upsert(rows);
      return;
    }

    const list = readLocal<any[]>(key, []);
    const rows = list.map(spec.toRow);
    if (rows.length) {
      const { error } = await supabase.from(spec.table as never).upsert(rows as never);
      if (error) throw error;
    }
    const ids = rows.map((r) => r[spec.pk]);
    let del = supabase.from(spec.table as never).delete();
    if (ids.length) del = del.not(spec.pk, "in", `(${ids.map(quote).join(",")})`);
    else del = del.not(spec.pk, "is", null);
    await del;
  } catch (e) {
    console.warn("cloud sync failed for", key, e);
  }
}

const pending = new Set<string>();
let timer: ReturnType<typeof setTimeout> | null = null;

function queueSync(key: string) {
  if (!SPECS[key]) return;
  pending.add(key);
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    const keys = [...pending];
    pending.clear();
    void Promise.all(keys.map(pushKey));
  }, 300);
}

/** Push every synced collection from this browser to the cloud. */
export async function pushAll() {
  for (const key of Object.keys(SPECS)) await pushKey(key);
}

// ---------------------------------------------------------------- pull

async function pullKey(key: string): Promise<number> {
  const spec = SPECS[key];
  if (!spec) return 0;

  if (spec.kind === "single") {
    const { data, error } = await supabase
      .from("settings")
      .select("data")
      .eq("key", spec.settingsKey)
      .maybeSingle();
    if (error || !data) return 0;
    writeLocal(key, data.data, { sync: false });
    return 1;
  }

  if (spec.kind === "wishlist") {
    const { data, error } = await supabase.from("wishlist").select("user_id, product_id");
    if (error || !data) return 0;
    const map: Record<string, number[]> = {};
    for (const row of data) (map[row.user_id] ??= []).push(row.product_id);
    writeLocal(key, map, { sync: false });
    return data.length;
  }

  const { data, error } = await supabase.from(spec.table as never).select("*");
  if (error || !data) return 0;
  writeLocal(key, (data as any[]).map(spec.fromRow).filter(Boolean), { sync: false });
  return data.length;
}

let pulled = false;

/**
 * Load everything from the cloud into the local cache. On the very first run
 * (empty database) the data currently held in this browser is pushed up, so
 * nothing that already exists locally is lost.
 */
export async function pullAll() {
  if (!isBrowser() || pulled) return;
  pulled = true;
  try {
    const counts = await Promise.all(Object.keys(SPECS).map(pullKey));
    const total = counts.reduce((a, b) => a + b, 0);
    if (total === 0) {
      await pushAll();
    }
  } catch (e) {
    console.warn("cloud pull failed", e);
  }
}
