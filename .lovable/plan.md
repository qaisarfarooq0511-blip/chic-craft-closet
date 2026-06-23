
# Yaawun Storefront — Frontend-Only Build Plan

Frontend-only build, no Cloud/DB. State persisted to `localStorage`. Design ported 1:1 from your attached `yaawun_1.html`. Payments deferred.

## Scope

**Public storefront (mobile-first, responsive)**
- Home — hero, categories, featured products, trust strip, customer reviews, footer
- Category / PLP — product listing for: Unstitched Dress Material, Kashmiri Shawls, Kidswear, Accessories
- Product detail (PDP) — gallery, description, dimensions, price, stock, reviews
- Cart — add/update/remove, totals
- Checkout — address form, order review, "Place order (payment coming soon)" stub (no gateway yet)
- About / Contact / Visit Store

**Admin (`/admin`, mobile-friendly)**
- Login gate — hardcoded `amiga.qaisar@gmail.com` + local password, session in `localStorage` (placeholder until Cloud is wired)
- Products: list / create / edit / unlist / delete; multi-image upload; fields: name, category, price, stock, dimensions, fabric, color, tags, description
- Categories: manage list
- Reviews: approve / reject / reply (seeded list)
- Orders/inquiries: inbox view of cart submissions saved locally
- **Image processor (browser-side)** on upload: auto-crop to square, white-balance/contrast normalize via canvas, resize to web sizes, WebP output, stored as data URLs in `localStorage`

All admin + storefront data lives in `localStorage` under a single namespaced key (`yaawun:*`). Easy to swap to Cloud later — all reads/writes go through a thin `store/` module.

## Design fidelity

Port `yaawun_1.html` exactly:
- Tokens: `--ink`, `--ink2/3`, `--cream`, `--cream2/3`, `--gold`, `--gold2/3`, `--rust`, radii `--r/r2/r3` → mapped into `src/styles.css` under `@theme` + `:root`.
- Fonts: Cormorant Garamond (serif headings) + DM Sans (body), loaded via `<link>` in `__root.tsx` head.
- Icons: Tabler Icons (via `@tabler/icons-react`).
- Components rebuilt as React: Topbar, Navbar (sticky, mobile drawer), Hero, Category grid, Product cards, Trust strip, Reviews, Footer, PLP filters, PDP gallery, Cart drawer/page, Toast.
- Keep exact spacing, letter-spacing, eyebrow labels, color usage, and the cream/ink/gold palette.

## SEO / AEO (already in scope, frontend-only)

- Per-route `<title>`, meta description, canonical, OG/Twitter via TanStack `head()`
- JSON-LD: `Organization` + `LocalBusiness` site-wide (with placeholders), `Product` + `Offer` + `AggregateRating` + `Review` on PDP, `BreadcrumbList`, `ItemList` on PLP, `FAQPage` on About/Contact
- `sitemap.xml` route (generated from product list in `localStorage` at request time during dev; real sitemap will come once data moves to Cloud)
- `robots.txt`, semantic HTML, single H1/page, alt text on all images, lazy loading, responsive `srcset`
- All store-detail fields use clearly marked placeholders (`{{STORE_NAME}}`, `{{ADDRESS}}`, `{{PHONE}}`, `{{HOURS}}`) so you can swap real values in one place later

## Tech

- TanStack Start + React 19 + Tailwind v4 (already scaffolded)
- shadcn primitives for inputs/dialogs/sheets only — restyled to match Yaawun tokens
- `framer-motion` for subtle hero/section reveals (matches the editorial feel)
- All data through `src/lib/store/*` (typed) → `localStorage` adapter now, Cloud adapter later
- Seed data on first load (a few products per category) so the site is browseable immediately

## Build order

1. Wire design tokens, fonts, base styles from `yaawun_1.html` into `src/styles.css`
2. App shell: `__root.tsx` (Topbar, Navbar, Footer, site-wide JSON-LD, fonts)
3. `localStorage` store module + types + seed data
4. Home page (1:1 port)
5. Category (PLP) + Product (PDP) + Cart + Checkout stub
6. Admin login + admin shell + product CRUD + image processor
7. Admin reviews + admin inquiries
8. SEO layer: per-route head(), JSON-LD, `sitemap.xml`, `robots.txt`
9. Mobile pass + polish

## Deferred (Phase 2, on your signal)

- Lovable Cloud (DB, auth, storage, server image processing)
- Real auth for admin
- Payment gateway (Stripe/Razorpay)
- Real order management + shipping

## Notes / assumptions

- "Yaawun" used as the brand name throughout (from the design file). Tell me if the real store name differs.
- Admin password: I'll set a temporary one (e.g. `yaawun-admin`) and show it on the login screen until Cloud auth lands. Local-only, never shipped to a server.
- Images uploaded in admin are stored as data URLs in `localStorage`. `localStorage` is ~5 MB per origin; fine for ~30–80 processed product images. We'll hit this ceiling well before launch, which is one of the reasons to move to Cloud before going live.

Approve and I'll start with tokens + shell + home page port.
