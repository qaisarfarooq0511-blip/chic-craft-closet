# SETUP.md — Yaawun Project Brief

# Read this first in every Claude Code session before touching any file.

## What this project is

Yaawun (yaawun.com) — women's fashion e-commerce store based in Sopore, Jammu & Kashmir, India.
Products: Kashmiri shawls, unstitched dress material, kidswear, ladies accessories (bangles, earrings, hairpins).
Owner/operator: Qaisar (solo, non-technical — all engineering done via Claude Code and Lovable).

## Stack

- Frontend: React 19 + Vite + TanStack Router/Start + Tailwind v4 + shadcn/ui (Radix)
- Backend: Supabase (Postgres + Auth + Storage + Edge Functions)
- State: TanStack Query
- Payments: Razorpay (Indian payments, UPI, COD)
- Images: Cloudinary (upload + auto-enhance)
- Email/SMS: Abstracted via NotificationService → Resend (email) + Twilio (SMS)
- Hosting: Vercel (frontend) + Supabase (backend)
- CI/CD: GitHub Actions
- Repo: https://github.com/qaisarfarooq0511-blip/chic-craft-closet

## Design system (Yaawun brand — already locked, do not change)

- Display font: Cormorant Garamond (serif, weight 300/400, italic for headings)
- Body font: DM Sans (weight 300/400/500)
- Primary dark: #1C1410 (ink) — used for hero, footer, reviews section
- Accent: #B8860B (antique gold) — buttons, stars, eyebrows
- Background: #FAF7F2 (warm cream)
- Surface: #F2EDE4 (sand), #E8DFD0 (linen)
- Text muted: #7A6355 (walnut)
- Design language: ultra-thin 0.5px borders, 2px border-radius, generous whitespace, no gradients

## Engineering law

ALWAYS read CLAUDE.md before writing any code. It is the absolute authority.
Key rules:

- Every change is Fast Lane or Full Lane — classify before coding
- Schema changes via migrations only (supabase/migrations/) — NEVER via Supabase dashboard
- RLS must be enabled on every table
- Soft delete only (deleted_at) — no hard DELETEs on operational tables
- All notifications via NotificationService.ts — never import vendor SDKs in components
- .env is NEVER committed — .env.example only
- Every migration needs a CHANGELOG entry in docs/CHANGELOG.md

## Current sprint status

See docs/CHANGELOG.md for completed work.

### Sprint 0 — DONE

- CLAUDE.md engineering law
- .gitignore, .env.example
- GitHub Actions CI (fast-lane + full-lane + secret-scan)
- Husky pre-commit hooks
- 7 Supabase migrations (full schema)
- TypeScript database types
- NotificationService abstraction
- docs/blueprint/ (SCHEMA.md, RLS.md)

### Sprint 1 — DONE

Connect React frontend to live Supabase DB:

- [x] Replace hardcoded product arrays with live Supabase queries (TanStack Query hooks)
- [x] Auth — customer signup/login pages, admin login (magic-link email; phone OTP dormant)
- [x] Admin panel v1 — product CRUD with Supabase Storage image upload
- [x] Cart — migrate from localStorage to server-side cart_items table
- [x] Checkout → COD (Razorpay pending, see below)

### Product variants — DONE

Colours, sizes, fabric options — product_variants schema, admin product form
variant management, PDP colour/size selectors, cart/checkout variant wiring.

### Sprint 2A — DONE

SSR loaders, Schema.org JSON-LD, real meta tags/OG, sitemap.xml, robots.txt.

### Sprint 2B — DONE

Admin panel completion (delta pass — most of this sprint's pages already
existed from an earlier round; work was targeted gaps only):

- [x] Categories: product count per category, soft-deleted visibility +
      restore, slug-uniqueness pre-check
- [x] Site settings: seo_site_name/seo_site_description fields, Hero banner
      section, per-row save
- [x] Dashboard analytics — already complete, no changes needed
- [x] Order detail: variant_label on line items, delivered → refunded
      transition
- [x] Stock management: variant-aware display, amber/red thresholds

### Sprint 2C, 2D — UPCOMING

Not yet scoped.

### Pending on external accounts

- Razorpay payment integration — waiting on Razorpay account
- SMS provider (Twilio/MSG91) — waiting on account, blocks activating phone
  OTP (currently dormant; magic-link email is the live auth path)

## Database schema (summary)

15 tables. Full detail in docs/blueprint/SCHEMA.md.
Key tables: profiles, categories, products, product_pieces, product_images,
product_includes, addresses, orders, order_items, cart_items, reviews,
audit_logs, notification_queue, redirects, site_settings

All prices stored in paise (integer). ₹999 = 99900 paise.
Use formatPrice() from src/types/database.ts for display.

## Fast Lane vs Full Lane

Fast Lane — frontend only, no schema/RLS/auth/payment touch:
copy changes, UI components, CSS, SEO meta, static pages
Full Lane — any DB/auth/payment change:
new table/column → migration file → RLS policy → tests → staging → review → production

## Key file locations

- Engineering law: CLAUDE.md
- DB types: src/types/database.ts
- Supabase client: src/lib/supabase.ts
- Notifications: src/services/NotificationService.ts
- Migrations: supabase/migrations/
- Schema docs: docs/blueprint/SCHEMA.md
- RLS docs: docs/blueprint/RLS.md
- Changelog: docs/CHANGELOG.md

## Environment variables needed (get from Qaisar or Supabase/Cloudinary/Razorpay dashboards)

VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_CLOUDINARY_CLOUD_NAME
VITE_CLOUDINARY_UPLOAD_PRESET
VITE_RAZORPAY_KEY_ID
(Server-side secrets go in Supabase Edge Function secrets, never in .env)

## How to start a session

1. Read this file
2. Read CLAUDE.md
3. Check docs/CHANGELOG.md for current state
4. Ask Qaisar what he wants to do
5. Classify it Fast Lane or Full Lane
6. Execute — Qaisar only types credentials when asked
