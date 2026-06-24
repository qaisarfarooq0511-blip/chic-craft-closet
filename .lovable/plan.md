
# Admin CMS — Plan

## Scope reconciliation

You picked **localStorage** for backend, but also **role-based admin** and **AI image enhance**. Here's how I'll square that:

- **Storage**: All content (hero, categories, sections, products, reviews) stays in localStorage for now — same `yaawun:*` keys we already use. Schema gets extended. When you're ready, flipping to Lovable Cloud is a one-shot migration (same shapes → Postgres tables).
- **Admin access**: Keep the current single-admin password gate (`admin-context`). Real role-based `user_roles` only makes sense once we have real auth — I'll wire it the moment we enable Cloud. Calling that out so it doesn't get lost.
- **AI image enhance**: This *requires* a server call (LOVABLE_API_KEY can't go in the browser). I'll add a single TanStack server route `src/routes/api/enhance-image.ts` that takes an image, calls the Gateway image-edit model (Nano Banana 2) for background cleanup + upscale, then returns the result. The enhanced image is then resized client-side and stored as a data URL in localStorage (same as today's seed images). No Cloud required.

## What gets built

### 1. Data model extensions (`src/lib/types.ts`, `src/lib/storage.ts`)

```text
HeroContent       { headline, subheadline, ctaLabel, ctaHref, images: [main, shawl, fabric] }
Category          { id, slug, name, label?: "New In" | "Trending" | custom, order, image? }
Section           { id, title, subtitle?, mode: "manual" | "rule",
                    productIds?: string[],          // manual
                    rule?: { type: "category"|"tag"|"flag", value: string },  // rule-based
                    order, visible }
Product (extended) { id, slug, title, description, details, dimensions,
                     mrp, salePrice, stock, sku?,
                     rating, reviewCount, note,
                     images: ProductImage[]  // up to 5, one isMain
                     tags: string[], flags: ("new"|"trending"|"featured")[],
                     categoryId, type }
ProductImage      { id, url, isMain, alt? }
```

New localStorage keys: `yaawun:hero`, `yaawun:categories`, `yaawun:sections`. Seed version bumped to `v5`.

### 2. Admin screens (new routes)

- `admin/hero` — edit headline/sub/CTA + 3 hero image slots with upload+enhance+resize
- `admin/categories` — list, create, edit, delete, drag-reorder, set label badge
- `admin/sections` — list, create, edit. Per section: title, subtitle, mode toggle (manual/rule), product picker OR rule builder, visibility, order
- `admin/products` (rewrite of existing) — full form with all fields, 5-image uploader with main-selector, note field, MRP+sale, stock, ratings, flags (new/trending/featured), category picker
- `admin/products/new` and `admin/products/:id` use a shared `ProductForm`

Existing admin nav extended with these tabs.

### 3. Image pipeline (`src/lib/image-pipeline.ts` + `src/routes/api/enhance-image.ts`)

Client flow on upload:
1. User picks a file → preview
2. "Enhance" button → POST to `/api/enhance-image` with base64; server calls `google/gemini-3.1-flash-image` with edit prompt "clean background, soft studio lighting, upscale, remove distractions"
3. Returned image → client-side canvas resize to fixed dims (product 900×1100, hero variants), webp re-encode at q=0.85
4. Stored as data URL on the product/hero record

Fixed dimensions (configurable in one constant):
- Product: 900×1100
- Hero main: 1200×1500, hero secondary: 600×750

### 4. Storefront wiring

- Home hero pulls from `useHero()` instead of hardcoded copy/images
- Home category grid pulls from `useCategories()` with order + label badges
- Home renders all visible `sections` in order; "Featured Pieces" becomes one of these instead of being hardcoded
- Product page golden-box reads `product.note`
- Category labels (`New In`, `Trending`) render as small badges on the category card

### 5. Existing admin features preserved

Theme switcher, reviews, inquiries — untouched.

## Out of scope (call out so we don't surprise each other)

- Real auth / `user_roles` table — deferred to Cloud enablement
- Image asset hosting (CDN) — stays as data URLs in localStorage; this is fine for prototyping but localStorage caps at ~5MB, so ~10-20 enhanced images max before we'll need Cloud Storage
- Bulk product import — not in this pass
- Order management — not in this pass

## Files touched (rough)

```text
NEW  src/lib/image-pipeline.ts
NEW  src/routes/api/enhance-image.ts
NEW  src/routes/admin.hero.tsx
NEW  src/routes/admin.categories.tsx
NEW  src/routes/admin.sections.tsx
NEW  src/components/admin/ProductForm.tsx        (shared, replaces inline forms)
NEW  src/components/admin/ImageUploader.tsx      (file pick + enhance + resize + main selector)
EDIT src/lib/types.ts                            (extend Product, add Hero/Category/Section)
EDIT src/lib/storage.ts                          (new stores, seed v5)
EDIT src/lib/seed.ts                             (seed categories + sections + hero)
EDIT src/routes/admin.tsx                        (nav: hero, categories, sections)
EDIT src/routes/admin.products.index.tsx         (use new fields)
EDIT src/routes/admin.products.new.tsx           (use ProductForm)
EDIT src/routes/admin.products.$id.tsx           (use ProductForm)
EDIT src/routes/index.tsx                        (read hero, categories, sections from store)
EDIT src/routes/product.$slug.tsx                (golden box reads product.note)
EDIT src/routes/shop.index.tsx & shop.$category.tsx  (read categories from store)
```

Roughly 12–15 file edits/creates. I'll ship it in this turn.
