# Yaawun — Changelog

Format: Problem / Root Cause / Fix / Risk / Rollback
Lane: Fast Lane (FL) or Full Lane (FullL)
---

## 2026-08-01 — Sprint 0: Foundation

### [FullL] Initial repository scaffold and database schema

**Problem:** Project previously had no formal schema, CI, or engineering standards. `.env` was committed to the repo with live credentials. The live Supabase project (`fobelduflgnekrlpuznk`) already had a Lovable-generated migration (`20260731052743_...`) creating `products`/`categories`/`orders`/`customers`/`addresses`/`reviews`/`coupons`/`sections`/`pages`/`wishlist`/`settings` — every one with RLS "enabled" but a `USING (true) WITH CHECK (true)` policy granted to `anon` AND `authenticated` for every operation, i.e. a live, world-writable database.

**Root Cause:** Lovable-generated project lacked: migration files with real RLS, CI pipeline, pre-commit hooks, secrets management, soft-delete pattern, audit logging, notification abstraction, or documentation structure. The wide-open RLS policies were Lovable's own scaffold default, not a regression.

**Fix:**

- Confirmed with project owner that the existing live tables held only dummy data (2026-08-01) — authorized dropping them outright rather than migrating in place
- The original project (`fobelduflgnekrlpuznk`) turned out to no longer exist in the owner's Supabase account at all (likely deleted). Provisioned a fresh personal-account project instead — `dqngfawkwvxxbympdqyp` — and pointed `.env`/`supabase/config.toml` at it. The retire-legacy-schema migration below is kept as a harmless no-op safeguard (`DROP TABLE IF EXISTS`) in case it's ever run against a project that does have the old Lovable tables.
- 8 migration files: `20260801100000_retire_legacy_lovable_schema` (drops the old open-RLS tables, if present) + 7 covering extensions, profiles/roles, product catalogue, orders/cart, reviews/audit, notifications/SEO, category seed data — re-timestamped to `2026-08-01` (from a placeholder `2025-08-01`) so they sort after the pre-existing `20260731052743` legacy migration
- The Supabase CLI (`supabase.exe`) is blocked on the owner's machine by Windows 11 Smart App Control (an unsigned-binary policy, not corporate IT) — rather than have the owner disable that OS protection, migrations were applied by pasting the combined SQL directly into the Supabase Dashboard's SQL Editor
- RLS policies on all 15 replacement tables, scoped by ownership/role — no wide-open policies anywhere
- GitHub Actions CI with Fast Lane and Full Lane checks
- CLAUDE.md engineering law file governing all future changes
- `.env.example` added; existing committed `.env` untracked going forward (`git rm --cached`) — it only ever held a public anon/publishable key, not a secret, but is still redundant to track
- `NotificationService` abstraction wrapping all notification delivery
- `docs/blueprint/` with SCHEMA.md, RLS.md
- TypeScript types mirroring DB schema

**Risk:** Dropping the legacy tables is destructive, but confirmed dummy-data-only and explicitly authorized by the project owner before this migration was written. No real customer/order data existed in the pre-existing schema.

**Rollback:** Legacy tables are not recoverable via a rollback migration (dropped outright, no backup taken since disposable by design). The replacement schema can be dropped via each migration's own rollback if ever needed — see individual migration file headers.

---

<!-- Add new entries above this line, newest first -->
