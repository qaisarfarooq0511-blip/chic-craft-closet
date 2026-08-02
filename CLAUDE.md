# CLAUDE.md — Yaawun Engineering Law

# Every change to this repository — by any human or AI agent — must comply with this file.

# Non-compliance blocks merge. No exceptions.

## Identity

- Project: Yaawun (yaawun.com) — women's fashion e-commerce, Sopore, J&K
- Stack: React 19 + Vite + TanStack Router/Start + Supabase (Postgres + Auth + Storage) + Tailwind v4 + shadcn/ui
- Framework: Product & Engineering Excellence Framework (docs/blueprint/FRAMEWORK.md)

---

## DOMAIN ARCHITECTURE

Admin subdomain (ops.yaawun.com or similar) is planned but not yet implemented.
Currently served at yaawun.com/admin. Subdomain split is a future Full Lane sprint.

---

## 🔴 WORKFLOW RULES

These two rules are permanent process law — in force in every session, for every
task, Fast Lane or Full Lane, until the user explicitly says "override CLAUDE.md rule
[name]" for that specific instance. No other phrasing overrides them.

### RULE 1 — BRANCH BEFORE EVERYTHING

Never commit directly to `main`. Every piece of work — Fast Lane or Full Lane — goes
on a branch first.

Branch naming:

- Fast Lane: `fl/short-description` (e.g. `fl/update-announcement-bar`)
- Full Lane: `full/short-description` (e.g. `full/add-reviews-table`)

Before starting any task:

1. `git checkout main && git pull`
2. `git checkout -b fl/...` or `full/...`
3. Do the work
4. Push the branch
5. Tell the user: "Ready to merge — here is what changed: [summary]. Approve merge to
   main?"
6. Wait for the user's explicit "yes, merge" before touching `main`

Never use `git merge` or `git push origin main` without the user's approval.

### RULE 2 — CLASSIFY BEFORE CODING

Before writing a single line of code or running any command for any task, state this
explicitly:

"LANE: Fast Lane" or "LANE: Full Lane"
Then: "REASON: [one sentence why]"
Then: "PLAN: [bullet list of exactly what will change]"

Wait for the user to say "proceed" before starting.

---

## 🔴 LANE CLASSIFICATION — Classify EVERY change before writing code

### Fast Lane

Frontend-only. No DB schema, no RLS, no auth, no payment touch.

- Single PR, CI green (lint + type-check + build), deploy.
- Examples: copy changes, new UI component reading existing data, CSS/design tweaks,
  SEO meta updates, static page additions, new product badge type.

### Full Lane

ANY change touching: DB schema · RLS policies · Auth/roles · Payments ·
Edge functions · Notification channels · Order state machine · Admin permissions.

- Mandatory sequence: migration SQL → RLS policy update → RPC/function update →
  integration tests written & passing → staging deploy → explicit human review → production.
- NO exceptions. A "quick schema fix" is still Full Lane.

---

## 🔴 DATABASE RULES — Zero tolerance

1. **Migrations only.** ALL schema changes via `supabase/migrations/YYYYMMDDHHMMSS_description.sql`.
   Direct dashboard edits (hot-fixing) are FORBIDDEN.

2. **RLS on every table.** Every table must have `ALTER TABLE x ENABLE ROW LEVEL SECURITY`.
   A table without RLS enabled is a critical vulnerability — block the PR.

3. **Soft deletes only.** Hard DELETE statements are FORBIDDEN on operational tables
   (products, orders, order_items, customers, reviews, categories).
   Use `deleted_at TIMESTAMPTZ` — set it, never delete the row.

4. **Soft EXECUTE revoke.** Any migration that creates a SECURITY DEFINER function MUST
   include explicit `REVOKE EXECUTE ON FUNCTION fn_name FROM PUBLIC` in the same file.

5. **Status state machine.** All operational entities carry a `status` column.
   Products: draft | active | archived. Orders: pending | confirmed | dispatched | delivered | cancelled | refunded.

6. **Audit log.** Every admin mutation (INSERT/UPDATE on products, orders, order_items,
   categories, reviews) must fire the `log_admin_action()` trigger.

7. **Scale hooks.** Every new table MUST include: `id UUID DEFAULT gen_random_uuid() PRIMARY KEY`,
   `created_at TIMESTAMPTZ DEFAULT now()`, `updated_at TIMESTAMPTZ DEFAULT now()`,
   `deleted_at TIMESTAMPTZ DEFAULT NULL`.

---

## 🔴 SECURITY RULES

1. `.env` is NEVER committed. `.env.example` with placeholder values is the only env file in git.
2. No secrets, API keys, or tokens hardcoded anywhere in source files.
3. Supabase anon key is public-safe ONLY because RLS is correctly configured. If RLS is wrong, the key is dangerous.
4. Admin routes require `role = 'admin'` check server-side. Never trust client-side role checks alone.
5. All state-changing API calls (POST/PUT/PATCH) must include an idempotency key header.
6. NO DEV BACKDOOR ACCOUNTS: Never create admin-privileged accounts with hardcoded
   credentials in the production database for dev/testing convenience. `VITE_`
   prefixed environment variables are client-side only and provide zero server-side
   security. Any dev bypass that requires a real `auth.users` row in the production
   Supabase project is a live security vulnerability regardless of whether the UI
   button ships to production. If live UI verification is needed during development,
   the developer clicks the real auth flow manually.

---

## 🔴 CI RULES — GitHub Actions must pass before any merge

- `lint` — ESLint must report zero errors
- `typecheck` — `tsc --noEmit` must pass
- `build` — Vite build must succeed
- `migration-check` — every new migration file must have matching RLS and soft-delete compliance
- PRs touching `supabase/` are automatically labelled `full-lane` and require explicit approval

---

## 🟡 NOTIFICATION SERVICE LAW

NEVER import Resend, Twilio, SendGrid, or any vendor SDK directly into a feature component or page.
ALL notification calls go through `src/services/NotificationService.ts`.
The service exposes one method: `NotificationService.send(userId, eventType, payload)`.
Vendors are swapped inside the service — feature code never changes.

---

## 🟡 SEO / AEO LAW

Every customer-facing page (product, category, homepage) MUST include:

- Correct `<title>` and `<meta name="description">`
- Schema.org JSON-LD block appropriate to the page type (Product, BreadcrumbList, WebSite)
- Open Graph tags for social sharing

---

## 🟡 DOCUMENTATION LAW

No migration or new feature merges without:

- Updated `docs/blueprint/SCHEMA.md` if schema changed
- Updated `docs/blueprint/RLS.md` if RLS changed
- Changelog entry in `docs/CHANGELOG.md` with: Problem / Root Cause / Fix / Risk / Rollback

---

## 🟢 THE THREE SCALING QUESTIONS

Ask these before every PR:

1. "What is the simplest version of this feature we can ship this sprint?"
2. "What structural hooks have we included so we don't rewrite this table/component when we expand it?"
3. "If we swap this third-party provider tomorrow, is it isolated by an interface or config layer?"
