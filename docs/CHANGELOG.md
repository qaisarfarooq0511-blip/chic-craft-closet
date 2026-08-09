# Yaawun — Changelog

Format: Problem / Root Cause / Fix / Risk / Rollback
Lane: Fast Lane (FL) or Full Lane (FullL)
---

## 2026-08-10 — Customers admin rebuilt as a real commerce view

### [FullL] admin_list_customers/admin_get_customer RPCs, admin.customers.tsx rewrite

**Problem:** `/admin/customers` was a pre-Supabase localStorage mock — `AppUser` records from
`user-auth.tsx` (`getAllUsers`/`createUser`/`updateUserRecord`/`deleteUserRecord`), with a "View
orders" button into `admin.inquiries.tsx`'s legacy `Inquiry` records (also localStorage, already
flagged as dead in the 2026-08-10 config-cleanup entry above). None of it touched the real
`profiles`/`orders` tables — every name, order count, and total spend on the page was fictional.
Meanwhile `/admin/users` already listed every real account (via `admin_list_users()`, added
2026-08-04) but only from an access-control angle — no order history, no spend.

**Root Cause:** Same carry-over category as `admin.sections.tsx`/`admin.config.tsx` before it —
`admin.customers.tsx` predates the real Supabase schema and was never migrated, just left running
on its own disconnected data store.

**Fix:** Investigated first (no code changes) and confirmed with the team: keep the page, but
give it a distinct real purpose from `/admin/users` — a commerce lens (who's a customer, what did
they order, how much have they spent) rather than an access-control lens. Two new `SECURITY
DEFINER` `plpgsql` functions, same pattern as `admin_list_users`:
`admin_list_customers(p_search, p_limit, p_offset)` — `profiles` where `role='customer'` joined to
`auth.users` plus a `LEFT JOIN` aggregate over `orders` (excluding cancelled/refunded) for
order_count/total_spent/last_order_at, paginated via `count(*) OVER()`; and
`admin_get_customer(p_customer_id)` — single-customer detail as one `jsonb` blob (profile + stats

- last 20 orders of any status) for a slide-in panel. New hook `useAdminCustomers.ts`
  (`useAdminCustomers`, `useAdminCustomer`). `admin.customers.tsx` rewritten: paginated table
  (name/email, phone, joined, order count, total spent in ₹, last order date), server-side search,
  click-a-row slide-in panel with order history linking to `/admin/orders/$id`, no edit
  capabilities (role management stays on `/admin/users`). Removed `user-auth.tsx`'s
  `getAllUsers()`/`deleteUserRecord()` (dead — their only consumer was the old page); left
  `AppUser`, `createUser()`, and `updateUserRecord()` in place since they still back the live
  wishlist, `/account` profile editing, and checkout's guest-account creation — none of which this
  task touched.

Three bugs were caught and forward-fixed via separate migrations during post-deploy verification,
before this branch went to review: (1) `admin_list_customers` raised `column reference "created_at"
is ambiguous` — plpgsql's `RETURNS TABLE` implicitly declares OUT parameters with the same names
as the returned columns, one of which collided with an unqualified `orders.created_at` inside an
aggregate subquery; fixed by qualifying every column in that subquery with its table alias.
(2) `admin_get_customer`'s orders array had no `id`, only `order_number` — insufficient to link to
`/admin/orders/$id`, which takes the order's UUID; added. (3) `admin_list_customers` had no
`phone` column despite the list table requiring one; added (required `DROP FUNCTION` before
`CREATE OR REPLACE`, since Postgres won't let a `RETURNS TABLE` function's row type change
in place).

**Risk:** Low. No RLS policy changes — both functions are `SECURITY DEFINER` with an `is_admin()`
gate, reading tables that already have RLS enabled (see RLS.md, "Admin read-only functions"). No
schema/table changes. The `/account` profile-edit-writes-to-localStorage gap surfaced during
investigation (real customers editing name/email there don't touch the real `profiles` table) is
explicitly out of scope and was left untouched.

**Rollback:**

```sql
DROP FUNCTION IF EXISTS admin_get_customer(uuid);
DROP FUNCTION IF EXISTS admin_list_customers(text, int, int);
```

— revert the frontend commit to restore the old mock-data `admin.customers.tsx` and
`user-auth.tsx`'s `getAllUsers()`/`deleteUserRecord()`.

---

## 2026-08-10 — Real homepage sections, replacing hardcoded "Featured pieces" strip

### [FullL] sections + section_products tables, useHomeSections, admin.sections.tsx rebuilt

**Problem:** The homepage had exactly one hardcoded product strip (`products.slice(0, 8)`, titled
"Featured pieces", no admin control) while `admin.sections.tsx` — reachable from the main admin
sidebar — offered a fully-built multi-section manual/rule curation editor with zero connection to
the storefront: it read/wrote `getSections()`/`saveSections()` (the dead `store-sync.ts` bridge to
a `sections` table dropped by the legacy-schema-retirement migration), and grep confirmed no
storefront code anywhere read that data. An admin could reasonably curate sections there believing
it changed the homepage, and nothing would happen.

**Root Cause:** `admin.sections.tsx` predates the real Supabase schema. The original mock seed data
(`{ title: "Featured pieces", mode: "rule", rule: { type: "flag", value: "featured" } }`) suggests
this was the intended design — the homepage's current hardcoded strip is a simplified stand-in that
was never wired up to a real admin-configurable mechanism during the Sprint 1 migration.

**Fix:** Migration `20260810000002` adds `sections` (title, subtitle, mode `manual|category|badge`,
`rule_value`, `max_products`, `is_active`, `sort_order`, standard scale hooks) and `section_products`
(manual-mode junction, hard-delete, same shape as `category_sizes`). Seeded one default section
replacing today's strip: `Featured pieces / badge / Bestseller / max 8`. `badge` mode filters
`products.badge` directly — no new "flags" column, since `badge_options`/`badge` already covers the
same need. `category` mode resolves `rule_value` (a slug) the same way `shop.$category.tsx` already
does (find in the fetched category list, then filter by id). New `src/hooks/useHomeSections.ts`
resolves each active section's products in parallel via `fetchHomeSections()` (exported for the SSR
loader's `ensureQueryData`, matching the existing hero/categories/products pattern), dropping
sections that resolve to zero products. `index.tsx` renders one product grid per active section
(in `sort_order`) with a mode-appropriate "View all →" link, falling back to the original hardcoded
"first 8 active products, titled Featured pieces" behavior only if zero sections resolve to any
products at all. `admin.sections.tsx` was fully rewritten: list view (active toggle, up/down
reorder, edit, soft-delete-with-confirm) + an edit modal (title/subtitle/mode/rule dropdown/max
products/active) + a manual-picks sub-panel reusing the existing `useProductSearch` hook (debounced
name search) with its own add/remove/reorder against `section_products`. Reordering uses up/down
arrows throughout, not drag-and-drop, matching `admin.categories.tsx`'s existing convention rather
than introducing a new interaction pattern for one page.

**Known gap:** the badge-mode "View all →" link points to `/shop?badge={value}`, but `shop.index.tsx`
has no badge filter yet (only `q` text search) — the link is a harmless no-op today, not broken,
and will start filtering once that page adds the param. Out of scope for this change.

**Risk:** Medium — two new tables + RLS (Full Lane), but additive: no existing table's schema
changed. Verified live on the real dev server before commit: homepage renders the seeded "Featured
pieces" section with real Bestseller-badged products, no console errors; `/admin/sections` loads
cleanly through to the auth redirect.

**Rollback:** `DROP TABLE section_products; DROP TABLE sections;` — revert the frontend commit to
restore the hardcoded homepage strip and the mock `admin.sections.tsx` editor (still non-functional
against the storefront either way).

---

## 2026-08-10 — Config remaining sections backed by site_settings; vestigial Sizes section removed

### [FullL] config_tags/shipping_partners/cancellation_reasons/hsn_codes/global_faqs site_settings rows

**Problem:** The last 6 sections of `admin.config.tsx` still ran on the dead localStorage-only
`getConfig()`/`saveConfig()` path (see the 2026-08-09 admin.config.tsx entry for the underlying
`store-sync.ts` finding — this data never actually reached a live table). Investigation found: Tags
has zero consumers anywhere. Sizes has zero consumers and is fully superseded by the real
`category_sizes`/`size_options` system. Shipping Partners/Cancellation Reasons are read by
`admin.inquiries.tsx`, which is reachable (a "View inquiries" button on `admin.customers.tsx`) but
itself operates entirely on legacy mock `Inquiry` records, not the real `orders` table. HSN
Codes has zero consumers anywhere — not even `computeTaxBreakup()`, the one function that would
use a GST rate, is ever called; the real `products` table has no `hsn_code` column. Global FAQs
has zero consumers — its own UI text claims "emitted as FAQPage structured data," which is false.

**Root Cause:** Same as colours/badges/fabrics/embroideries/care before them — `admin.config.tsx`
predates the real Supabase schema and was never migrated off `getConfig()`/`saveConfig()`.

**Fix:** Migration `20260810000001` adds 5 `site_settings` rows (`config_tags`,
`config_shipping_partners`, `config_cancellation_reasons`, `config_hsn_codes`,
`config_global_faqs`), each a JSON array, seeded verbatim from the old `DEFAULT_CONFIG` values
(9/7/7/5/5 items respectively — verified via `jsonb_array_length` after applying). `admin.config.tsx`:
replaced the old `ListEditor`+`LIST_FIELDS` (cfg-driven) with a new `StringListSiteSettingEditor`
for Tags/Shipping Partners/Cancellation Reasons (same chip-with-× UI, now reading/writing
`site_settings` directly, one row per save); `HsnEditor`/`GlobalFaqEditor` kept their existing
table/card UI but became self-contained — add/remove persist immediately, in-place field edits
persist on blur (matching the inline-edit-on-blur convention already used in `admin.categories.tsx`,
rather than firing a network call per keystroke). The Sizes section was removed entirely — the only
one of the six not kept, since a disconnected duplicate sizes list next to the real per-category
"Manage sizes" UI would be actively confusing, not just inert.

`admin.inquiries.tsx` (not in the original file list, required to keep the build compiling) had its
two `getConfig().shippingPartners`/`.cancellationReasons` reads replaced with direct
`site_settings` fetches, since those fields no longer exist on `AppConfig`. `storage.ts`'s
`AppConfig`/`DEFAULT_CONFIG`/`getConfig()`/`saveConfig()` were removed entirely rather than left as
an empty pass-through — after this change they had zero remaining fields and zero remaining
callers anywhere in the app. `computeTaxBreakup()` was also removed (zero consumers, confirmed by
grep, explicitly in scope for removal). `HsnCode`/`FaqEntry` interfaces are kept (still used for
typing in `admin.config.tsx`).

**Risk:** Low — no RLS change, `site_settings` already has RLS from Sprint 2B. The Sizes section
removal is a UI-only change; the underlying `AppConfig.sizes`/`DEFAULT_CONFIG.sizes` data had zero
consumers already, so no functionality is lost. `admin.inquiries.tsx` fix is a like-for-like data
source swap (localStorage → `site_settings`), no behavior change to that page beyond the source.

**Rollback:** `DELETE FROM site_settings WHERE key IN ('config_tags','config_shipping_partners','config_cancellation_reasons','config_hsn_codes','config_global_faqs');`
— revert the frontend commit to restore `AppConfig`/`getConfig`/`saveConfig`, the old
`ListEditor`/`LIST_FIELDS` (including Sizes), and `admin.inquiries.tsx`'s `getConfig()` reads.

---

## 2026-08-09 — admin.config.tsx migrated to real DB (badges/embroideries/care/cart limits)

### [FullL] badge_options/embroidery_options/care_options + products FK columns + site_settings.max_qty_per_item

**Problem:** `admin.config.tsx`'s Corner Badges, Fabrics, Embroideries, Care Instructions, and Cart
limits sections all appeared to be functioning admin UIs but weren't. Investigation found:
(1) `getConfig()`/`saveConfig()` sync through `src/lib/store-sync.ts` to a `settings` table that was
dropped by `20260801100000_retire_legacy_lovable_schema.sql` — every push/pull for the `config` key
has been silently failing (caught, `console.warn`'d) ever since, so this data only ever lived in
each admin's own browser localStorage, never synced. (2) Corner Badges was disconnected even from
that: `ProductForm.tsx`'s badge `<select>` read a hardcoded local `BADGES` array, not `cfg.badges`.
(3) Fabrics was equally dead: `ProductForm.tsx`'s fabric dropdown already used the real
`fabric_options` table, ignoring `cfg.fabrics` entirely. (4) Embroidery/Care were bare free-text
`<input>`s in the product form with no picklist backing at all.

**Root Cause:** `admin.config.tsx` and its supporting `getConfig()`/`saveConfig()` layer predate the
real Supabase schema and were never migrated when `fabric_options`/`colour_options` were introduced
for their respective fields — badges/embroideries/care were left on the old mock/localStorage path,
and the badge dropdown in `ProductForm.tsx` was hardcoded separately at some earlier point, silently
diverging from the config screen that appeared to control it.

**Fix:** Three migrations. `20260809000003`: new `badge_options`/`embroidery_options`/`care_options`
tables (same shape as `fabric_options`/`colour_options`, same RLS pair), seeded with the union of
the previous config defaults and every distinct value already live on non-deleted products (badges
4, embroideries 11, care 8 — see SCHEMA.md for the exact reconciliation). `20260809000004`: added
`products.badge_id`/`embroidery_id`/`care_id` FK columns (`ON DELETE SET NULL`), backfilled from the
existing free-text columns via case-insensitive match; verified zero orphaned products before
proceeding. The free-text `badge`/`embroidery`/`care` columns are kept — `ProductForm.tsx` now
dual-writes the FK and a mirrored text value on every save, matching the existing `fabric_id`/
`fabric` pattern, so the PDP needs no change and the FK columns can be dropped later with zero data
loss. `20260809000005`: added `site_settings.max_qty_per_item` (seeded at 10). `admin.config.tsx`'s
four dead sections were replaced with a generic `TableChipEditor` (same chip-with-× pattern as
`ColoursEditor`) reading/writing the new tables directly; Cart limits now reads/writes
`site_settings` via its own save button, matching `admin.settings.tsx`'s established per-section
pattern. `cart-context.tsx` now reads `max_qty_per_item` from `site_settings` on mount (falls back
to 10 on missing key or fetch failure) instead of `getConfig().maxQtyPerItem`.

**Separately discovered, flagged, not fixed here:** `cart-context.tsx`'s `CartProvider`/`useCart()`
is mounted in `__root.tsx` but its `useCart()` export is never imported anywhere else — the real
cart flow (`cart.tsx`, checkout) uses the unrelated `src/hooks/useCart.ts`, which has no quantity
cap at all. Migrating `cart-context.tsx` (done here) does not change live behavior since that file's
cart state was already dead code. **The live cart currently enforces no per-item quantity limit** —
a real gap, worth a follow-up task against `src/hooks/useCart.ts` if this limit matters in practice.

**Risk:** Medium — two new FK columns on `products` (nullable, `ON DELETE SET NULL`, additive) plus
three new tables with RLS. The dual-write pattern means no existing read path (PDP, admin lists)
changes behavior. `ProductForm.tsx`'s badge/embroidery/care fields go from hardcoded-array/free-text
to table-backed selects — an admin editing a product whose current value isn't in the seeded list
(shouldn't happen given the union-seed approach, verified zero orphans) would see it revert to
"none" on next save.

**Rollback:** `ALTER TABLE products DROP COLUMN badge_id, DROP COLUMN embroidery_id, DROP COLUMN care_id;`
then `DROP TABLE badge_options, embroidery_options, care_options;` then
`DELETE FROM site_settings WHERE key = 'max_qty_per_item';` — free-text `badge`/`embroidery`/`care`
columns are untouched throughout, so no data loss. Revert the frontend commit to restore the old
localStorage-backed config sections and free-text product fields.

---

## 2026-08-09 — Colour text chips + admin colour management

### [FullL] colour_options.hex_code made nullable; hex swatches replaced with text chips

**Problem:** Colours were rendered as hex-swatch circles on the PDP, admin product form, and
cart. Every new colour required picking an arbitrary hex approximation, which added friction
and gave no real product-selection value since customers read the colour name anyway. There
was also no admin UI to manage the colour picklist at all — colours could only be added
in-place from the product form.

**Root Cause:** `colour_options.hex_code` was `NOT NULL` at the schema level, forcing every
colour to carry a swatch value that the product decision no longer needed.

**Fix:** Migration `20260809000001_colour_hex_optional.sql` drops the `NOT NULL` constraint
on `hex_code`. Added `.colour-chip` pill styling (`src/styles.css`) and swapped the hex-circle
swatch for text-label chips on the PDP colour selector and both colour spots in
`ProductForm.tsx`; removed the redundant hex-circle in `cart.tsx` (the adjacent variant text
already names the colour). Added `/admin/colours` — list/add/rename/activate/soft-delete for
`colour_options`, with proper-case normalization and a case-insensitive duplicate-name check.
`ColourOption.hex_code` TypeScript type updated to `string | null` to match the schema; no
code reads `hex_code` for rendering anywhere in the app.

**Risk:** Low — additive UI change plus a constraint relaxation (widening `NOT NULL` to
nullable never breaks existing rows). No RLS policy changes.

**Rollback:** `ALTER TABLE colour_options ALTER COLUMN hex_code SET NOT NULL;` (only safe if
every row still has a non-null `hex_code` — check before running). Revert the UI commit to
restore swatch rendering.

---

## 2026-08-09 — Package includes textarea, visible on all categories

### [FullL] "What's in the package" editor rewritten as a textarea; no longer unstitched-only

**Problem:** The package-includes editor in the admin product form only appeared for unstitched
Dress Material products (`showUnstitched && isUnstitched` gate), so every other category had no
way to list what ships in the package, even though `product_includes`/the PDP display are
category-agnostic. The editor itself was also a fiddly one-row-per-item add/remove UI for what is
just a short list of lines.

**Root Cause:** The includes section reused the same `showPieces` gate as the Pieces/dimensions
section (which genuinely is unstitched-only), conflating two unrelated concerns under one flag.

**Fix:** Removed the gate from the includes editor only (Pieces/dimensions keeps it, unchanged).
Replaced the per-row inputs with a single textarea (one item per line); on load, existing rows are
joined by `sort_order` into the textarea text; on save, the textarea is split by newline,
trimmed, empty lines dropped, all existing `product_includes` rows for the product soft-deleted,
and fresh rows inserted with `sort_order` = line index — replacing the previous index-matched
update/insert/delete-removed logic. On the PDP (`product.$slug.tsx`), moved the includes block
(and the unstitched callout strip, so it doesn't sit stranded between the two) to immediately
after the description, before the colour/size selectors, and added `background: var(--cream2)`
with tighter padding to `.incl-block` in `styles.css` to visually separate it as a preview box.

**Risk:** Low — no schema change, no RLS change. The full-replace write pattern means an admin
save while another admin's edit is in flight could clobber the other's includes list, but the
product form is not currently used by multiple concurrent admins on the same product.

**Rollback:** Revert this commit. `product_includes` rows already soft-deleted by a save made
under the new logic remain soft-deleted (rollback is UI-only, not a data restore).

---

## 2026-08-09 — Flexible category-based size management

### [FullL] New category_sizes junction table replaces the one-scale-per-category model

**Problem:** `categories.default_size_scale_id` locked every category to exactly one size scale.
A category needing a custom mix of sizes (or sizes spanning more than one scale) had no way to
express that — the admin form's size axis was entirely gated by the assigned scale plus a
hardcoded `showSizeVariants` flag in `ProductForm.tsx`'s `CATEGORY_CONFIG`, so even adding a new
category required a code change to make sizing show up correctly.

**Root Cause:** Size scale was designed as a category-level, single-valued property from the
start (Sprint 2C) — there was no way to assign individual sizes to a category independent of a
scale, and the admin form layered its own hardcoded per-slug gate on top of that.

**Fix:** Migration `20260809000002_category_sizes.sql` adds `category_sizes` (category_id,
size_option_id, sort_order, `UNIQUE(category_id, size_option_id)`, `ON DELETE CASCADE` on both
FKs) — a hard-delete junction table (no `deleted_at`; matches `cart_items`'s precedent for
tables with no business history) with `category_sizes_select_public` (public SELECT) and
`category_sizes_write_admin` (admin `FOR ALL`), mirroring `colour_options`/`size_options`'s
policy shape exactly. Backfilled from every category's existing `default_size_scale_id` (that
column is untouched, just no longer read by the app). New `useCategorySizes(categoryId)` hook
replaces `useSizeOptionsByScale(scaleId)` in `ProductForm.tsx`; the size axis now shows purely
based on `sizeOptions.length > 0` — `showSizeVariants` was removed from `CATEGORY_CONFIG`
entirely, so there's no per-slug hardcoding left to maintain. New `CategorySizesModal.tsx`
(opened via a "Manage sizes" button on `/admin/categories`) lists every size across every scale
as a checkbox for the category; checking inserts a `category_sizes` row, unchecking hard-deletes
it, both immediate — no batch save. `admin.categories.tsx` lost its "Default size scale" dropdown
and `SIZE_SCALE_LABELS` constant (moved into the modal, where it's now used) in favor of the
button plus a live size count ("6 sizes" / "No sizes").

Migration filename note: the user-specified name `20260808000001_category_sizes.sql` sorts
_before_ the already-applied `20260809000001_colour_hex_optional.sql`. Renamed to
`20260809000002_category_sizes.sql` to keep migrations applying in chronological order.

**Risk:** Medium — new table + RLS policies (Full Lane), but additive: no existing table's
schema or policies changed, `default_size_scale_id` remains readable if ever needed again. The
one behavior change worth flagging: categories previously excluded from sizing by
`showSizeVariants: false` despite having a scale assigned (Kashmiri Shawls, Dress Material,
Accessories) now show whatever sizes `category_sizes` has for them — Kashmiri Shawls' backfilled
`free_size` option will now appear as a selectable size in the product form where it was
previously hidden. This is the intended effect of removing the hardcoded gate, not a bug.

**Rollback:** `DROP TABLE category_sizes;` — `categories.default_size_scale_id` data is
untouched and could be wired back into the admin form/product form if this is reverted.

---

## 2026-08-07 — Corrective fix: admin SELECT policies missing/too restrictive

### [FullL] categories_select_admin (new) + products/orders_select_admin widened — completes the soft-delete fix

**Problem:** Migration `20260807000001` (same day, previous entry below) added an explicit
`WITH CHECK (is_admin())` to `categories_update_admin`/`products_update_admin`/
`orders_update_admin`. `pg_policies` confirmed it applied correctly. The soft-delete UPDATE
**still failed identically** — `42501: new row violates row-level security policy` — proving
that migration's fix was real but incomplete.

**Root Cause:** Verified empirically (rolled-back transactions, including a throwaway
scratch table with zero relation to `categories`, to rule out anything table-specific): for
an UPDATE, Postgres requires the **new row** to satisfy at least one applicable **SELECT**
policy, entirely independent of the UPDATE policy's own `WITH CHECK` — confirmed by testing
`WITH CHECK (true)` on the UPDATE policy itself, which _still_ failed until a permissive
SELECT policy was added. `categories` had no admin SELECT policy at all — despite RLS.md's
policy matrix claiming "admin SELECT: All", that was aspirational documentation that had
never actually been implemented in any migration. `products_select_admin`/
`orders_select_admin` did exist, but both were `is_admin() AND deleted_at IS NULL` —
excluding the very row a soft-delete produces, hitting the identical wall.

**Fix:** New `categories_select_admin` (`USING (is_admin())`, no `deleted_at` filter).
`products_select_admin`/`orders_select_admin` recreated without their `AND deleted_at IS
NULL` clause. Public/customer SELECT policies on all three tables are untouched — still
correctly filter `deleted_at IS NULL`/`status = 'active'`. See RLS.md Critical rule 10 (now
rewritten to cover both halves of the fix — the earlier version, written before this
migration existed, understated what was actually required).

**Risk:** Low-medium — widens what admins can SELECT (soft-deleted rows now visible to them),
which is the intended behavior for a restore flow; does not touch anon/customer visibility at
all.

**Verification:** Soft-delete UPDATE re-tested in rolled-back transactions on all three
tables (`categories`, `products`, `orders`) — all three now succeed. Public SELECT
re-confirmed unaffected: `SELECT count(*) FROM products WHERE deleted_at IS NOT NULL` as
anon/customer returns 0 visible rows, confirming the public policy's `deleted_at IS NULL`
filter still applies correctly and only the new admin-scoped policy changed.

**Rollback:**

```sql
DROP POLICY IF EXISTS "categories_select_admin" ON categories;
DROP POLICY IF EXISTS "products_select_admin" ON products;
CREATE POLICY "products_select_admin" ON products FOR SELECT
  TO authenticated USING (is_admin() AND deleted_at IS NULL);
DROP POLICY IF EXISTS "orders_select_admin" ON orders;
CREATE POLICY "orders_select_admin" ON orders FOR SELECT
  TO authenticated USING (is_admin() AND deleted_at IS NULL);
```

---

## 2026-08-07 — Categories admin: RLS soft-delete bug + size scale selector

### [FullL] categories/products/orders RLS WITH CHECK fix, adult_clothing size scale, category size scale dropdown

**Problem:** (1) Deleting a category in `/admin/categories` failed with "new row violates
row-level security policy for table 'categories'". (2) No way to set
`categories.default_size_scale_id` from the admin UI, and "Stitched Suits" needed a size
scale that didn't exist yet.

**Root Cause:** (1) `categories_update_admin` had `USING (is_admin())` with no explicit
`WITH CHECK`. This is not "no check" — empirically, the effective check being applied to the
new row was the table's own public SELECT policy (`deleted_at IS NULL`), not the UPDATE
policy's own `USING` clause repeated. Renaming a category, or restoring one (`deleted_at` →
`NULL`), satisfied that check and worked; soft-deleting one (`deleted_at` → a timestamp)
never could, regardless of `is_admin()`. Found by reproducing the exact error in a
rolled-back transaction and testing column-by-column, not by reading `pg_policies` alone
(which shows `with_check: null` and looks harmless). `products_update_admin` and
`orders_update_admin` had the identical shape and were fixed at the same time. (2)
`categories.default_size_scale_id` has existed since the product-variants migration
(Sprint 2C) but the admin categories page never had a field for it, and no size scale
existed that fit an adult ready-to-wear stitched garment (existing scales: age-based,
one-size, or unstitched-fabric-specific).

**Fix:**

- Migration `20260807000001`: explicit `WITH CHECK (is_admin())` added to all three
  `*_update_admin` policies. New `adult_clothing` size scale with `XS/S/M/L/XL/XXL`
  `size_options`.
- `admin.categories.tsx`: new "Size scale" column/dropdown per category row — human-readable
  labels (`age_kids` → "Kids (age sizes)", etc.), "No size options" as the null default,
  saved immediately on change (same inline-edit pattern as every other field on this page).
  "Stitched Suits" assigned `adult_clothing` through this same UI, not a raw SQL patch.
- `src/hooks/useSizeScales.ts` (new): no existing hook fetched the `size_scales` list itself
  (only `useSizeOptionsByScale`, which needs a scale id already).

**Risk:** Low for the size-scale addition (purely additive). Medium for the RLS change in
that it touches three tables' write policies, but the change is strictly _widening_
(explicit `WITH CHECK (is_admin())` matches what every other admin already assumed was true)
and was verified empirically before and after on all three.

**Verification:** Rolled-back-transaction tests as a real admin: soft-delete now succeeds on
`categories`; `pg_policies` confirms `with_check = 'is_admin()'` on all three policies (not
`null`); `adult_clothing` confirmed with exactly 6 `size_options`. `tsc`/`eslint`/build clean.
Manually confirmed in the admin UI that a product created under "Stitched Suits" (after it
was assigned `adult_clothing` via the new dropdown) offers XS–XXL in the variants section.

**Rollback:**

```sql
DROP POLICY IF EXISTS "categories_update_admin" ON categories;
CREATE POLICY "categories_update_admin" ON categories FOR UPDATE
  TO authenticated USING (is_admin());
DROP POLICY IF EXISTS "products_update_admin" ON products;
CREATE POLICY "products_update_admin" ON products FOR UPDATE
  TO authenticated USING (is_admin());
DROP POLICY IF EXISTS "orders_update_admin" ON orders;
CREATE POLICY "orders_update_admin" ON orders FOR UPDATE
  TO authenticated USING (is_admin());
DELETE FROM size_options WHERE scale_id IN
  (SELECT id FROM size_scales WHERE name = 'adult_clothing');
DELETE FROM size_scales WHERE name = 'adult_clothing';
```

Plus revert `admin.categories.tsx`, delete `useSizeScales.ts`.

---

## 2026-08-05 — Razorpay payment integration

### [FullL] create-razorpay-order + razorpay-webhook Edge Functions, checkout payment method selection

**Problem:** Checkout was COD-only. `orders.payment_id`/`payment_method`/`idempotency_key`
existed in the schema since Sprint 1 but nothing populated them; `VITE_RAZORPAY_KEY_ID` sat
in `.env.example` unused.

**Root Cause:** Not a bug — waiting on the Razorpay account (SETUP.md, "Pending on external
accounts"). Built now, shipped dark behind a feature flag, ready for the moment the account
is approved.

**Fix:**

- Migration `20260805000002`: `orders.razorpay_order_id TEXT UNIQUE`, nullable — existing
  (all-COD) orders unaffected. Distinct from `payment_id` (the _payment_ id, set post-capture);
  this is the _order_ id, created up-front and doubling as the idempotency key.
- `create-razorpay-order`: runs as the caller, so `orders_select_own` RLS scopes the ownership
  check automatically (defensively also filters `customer_id = auth.uid()` explicitly, matching
  the literal spec rather than relying on RLS alone); 404 if not found/not owned; returns the
  existing `razorpay_order_id` immediately if one's already set (idempotent — never calls
  Razorpay twice for the same order); 503 with a clear message if
  `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` aren't set. The one write needs a service-role client
  internally — `orders` has no customer UPDATE policy at all (see RLS.md), by design.
- `razorpay-webhook`: verifies `X-Razorpay-Signature` (`HMAC-SHA256` over the raw body) before
  touching anything; always 200 afterward, since Razorpay retries non-200 responses and
  re-processing an already-`confirmed` order must not double-notify — guarded by checking
  `status === 'pending'` before acting, not just by event type. `payment.captured` →
  `status='confirmed'`, `payment_id`, `payment_method='razorpay'`, then enqueues
  `order_confirmed` on `sms`+`whatsapp`+`email` directly (mirrors
  `NotificationService.getDefaultChannels()` exactly — flagging this interpretation, since the
  spec said "insert an order_confirmed row" singular; matching COD's actual 3-channel fan-out
  seemed more correct than under-notifying Razorpay customers). `payment.failed`: logged only,
  no order mutation.
- `checkout.tsx`: radio selection between "Pay online" (hidden unless `VITE_RAZORPAY_KEY_ID` is
  set and isn't the placeholder) and "Cash on delivery" (always available, default when
  Razorpay isn't configured). COD path is byte-for-byte the pre-existing flow. Razorpay path:
  order saved `pending` first (unchanged sequencing), then `create-razorpay-order`, then
  `checkout.js` loaded dynamically and the modal opened; `order_confirmed` is deliberately NOT
  sent client-side for this path — only the webhook does, once payment is real. Modal dismissal
  → toast, stays on checkout, order remains `pending` (no auto-retry/resume this sprint — an
  admin can follow up on stale pending orders). Edge Function error → toast, no navigation.
- `admin.orders.$id.tsx`: gold "Paid online" / grey "Cash on delivery" badge replacing the
  plain uppercase text; `payment_id` and `razorpay_order_id` shown as monospace text when
  present.

**Risk:** Medium — first payment-provider integration. Mitigated by: the entire "Pay online"
option is invisible in production until `VITE_RAZORPAY_KEY_ID` is a real key (currently the
placeholder); webhook signature verification gates all writes; idempotent order creation;
`status === 'pending'` guard against duplicate webhook processing.

**Verification:** No separate staging project (same caveat as every Full Lane item this
sprint) — `tsc`/`eslint`/build clean locally; both Edge Functions deployed and confirmed
`ACTIVE`; secrets set to placeholders pending the real Razorpay account, so the "Pay online"
option stays hidden in production exactly as designed until real credentials replace them.

**Rollback:**

```sql
ALTER TABLE orders DROP COLUMN razorpay_order_id;
```

Plus revert `checkout.tsx` and `admin.orders.$id.tsx`, delete `create-razorpay-order/` and
`razorpay-webhook/`.

---

## 2026-08-05 — Sprint 2D: notification queue processor

### [FullL] process-notifications worker — pg_cron, atomic claim, email/SMS templates, admin monitoring

**Problem:** `notification_queue` rows have been piling up since Sprint 1 with nothing to
process them — `NotificationService.send()` writes rows, but no worker ever reads them.
Twilio/Resend aren't configured yet either, so the worker also has to degrade gracefully
rather than assume they exist.

**Root Cause:** Not a bug — the worker was simply never built (SETUP.md listed Sprint 2D
as "not yet scoped").

**Fix:**

- Migration `20260805000001`: enabled `pg_cron`/`pg_net` (available but not installed);
  `claim_notification_batch(p_limit)` — `SECURITY DEFINER`, `service_role`-only, atomically
  claims queued/due/under-attempt-cap rows via `UPDATE ... FROM (SELECT ... FOR UPDATE SKIP
LOCKED)` in one statement (PostgREST can't express row locking through the query builder
  directly, hence the function). Claimed rows are marked via a 10-minute `process_after`
  lease rather than a new status value — self-healing if the worker crashes mid-batch,
  since `notification_status` has no `'processing'` state and one would need its own cleanup
  job. `notif_queue_admin_retry` RLS policy added for the dashboard retry button — narrow
  `WITH CHECK (is_admin() AND status='queued' AND attempts=0)`, can't be used to forge any
  other column. `cron.schedule` calls `process-notifications` every 5 minutes; the Bearer
  token is read from Supabase Vault by name — the real service_role key is never written into
  this (or any) migration file. See the migration's own comment for the one-time Vault
  population step, run directly in the Dashboard SQL Editor.
- `supabase/functions/process-notifications/index.ts`: batch size 50, dispatches by channel.
  `whatsapp`/`push` always skip (no provider integration this sprint). `sms`/`email` look up
  the destination (`profiles.phone`; email via the GoTrue Admin API since `auth.users` isn't
  otherwise reachable) and call the provider; a missing destination is a skip, not a failure.
  Order-lifecycle events re-fetch the order/items/address fresh by `payload.order_number`
  rather than requiring every call site to embed a full snapshot. On failure: `attempts++`,
  exponential backoff (`process_after = now() + 2^attempts minutes`), terminal `'failed'` at
  5 attempts. Returns `{ sent, skipped, failed }`.
- `supabase/functions/_shared/notification-service.ts`: added `sendEmail()` (Resend);
  extracted `sendSmsRaw()` from the existing `sendSms()` (used by `otp-request`) so both the
  worker and OTP flow share one Twilio integration point. Both throw
  `ProviderNotConfiguredError` when their secret is unset, caught by the worker to mark
  `skipped` rather than `failed`. **Behavior change:** `otp-request`'s OTP SMS now actually
  attempts real Twilio delivery if `TWILIO_*` secrets are ever set — it previously always
  stub-failed regardless of configuration.
- `supabase/functions/_shared/templates.ts`: all 6 email templates, all 4 SMS templates
  (`order_cancelled`/`refund_processed` have no SMS template, per spec — SMS-only for the
  events listed). `review_approved`/`welcome` return `null` for both — worker skips with a
  logged reason rather than erroring on an unhandled event type.
- `src/services/NotificationService.ts`: `email` added to the default channel list for all 5
  order-lifecycle events (wherever a real template exists) — `otp_request` stays SMS-only
  (email OTP would duplicate the magic-link email flow Supabase Auth already handles outside
  this queue).
- Admin dashboard (`admin.index.tsx` + new `useNotificationQueue.ts`): queued count, failed
  count, last-processed timestamp, failed-notifications table (event, channel, attempts,
  last_error, created) with a per-row Retry button.
- `.env.example`: added `RESEND_API_KEY`, `RAZORPAY_WEBHOOK_SECRET` (the latter for the
  upcoming Razorpay item, added now while touching this file).

**Risk:** Medium. New `service_role`-only function and RLS policy; cron calls a
publicly-routable Edge Function URL, gated by a Vault-stored Bearer token (not committed
anywhere). Twilio/Resend are still unconfigured in production, so in practice every
`sms`/`email` row will land as `skipped` until those secrets are set — this is the intended
graceful-degradation behavior, not a bug.

**Verification:** No separate staging project (see the profiles-RLS-recursion and
admin-user-management entries for the same caveat) — verified via `supabase db query
--linked` rolled-back-transaction tests of `claim_notification_batch()` and
`notif_queue_admin_retry`, plus `deno check`/`tsc`/`eslint`/build locally before applying.

**Rollback:**

```sql
SELECT cron.unschedule('process-notifications-every-5-min');
DROP FUNCTION IF EXISTS claim_notification_batch(int);
DROP POLICY IF EXISTS "notif_queue_admin_retry" ON notification_queue;
```

Plus revert `NotificationService.ts`, `_shared/notification-service.ts`, delete
`_shared/templates.ts`, `process-notifications/`, `useNotificationQueue.ts`, revert
`admin.index.tsx` and `.env.example`.

---

## 2026-08-04 — Admin user management page

### [FullL] `/admin/users` — replaces manual SQL for admin promotions

**Problem:** The only way to promote a customer to admin (or demote one) was a hand-run
SQL `UPDATE profiles SET role = 'admin' ...` against the linked project — no audit trail,
no confirmation step, no visibility into who has admin access without a manual query.

**Root Cause:** Not a bug — this capability never existed in the app. Initially proposed
as Fast Lane by the requester; corrected to Full Lane during investigation, since it
requires reading `auth.users` (only possible via a new `SECURITY DEFINER` function — schema
change) and adding the first-ever admin UPDATE policy on `profiles` (Auth/roles, Admin
permissions — both explicit Full Lane triggers).

**Fix:**

- `admin_list_users(p_search, p_limit, p_offset)` — `SECURITY DEFINER`, `LANGUAGE plpgsql`
  (not `sql`, for a hard function-call boundary), raises unless `is_admin()`. Joins
  `profiles` + `auth.users` (the only place in the app that reads `auth.users`, since
  PostgREST never exposes that schema). `REVOKE ... FROM PUBLIC` / `GRANT ... TO authenticated`.
- New `profiles_update_admin` RLS policy: admin can UPDATE any other profile;
  `WITH CHECK (is_admin() AND id != auth.uid())` blocks that policy's own self-demotion path.
- Found and closed a real gap while implementing this: `profiles_update_own` (existing,
  unchanged) was written only to block self-_promotion_, not self-_demotion_ — an admin
  could already run `UPDATE profiles SET role='customer' WHERE id=auth.uid()` and satisfy
  that policy's own check. Since permissive RLS policies on one table OR together, the new
  admin policy alone couldn't close a hole opened by the older one. Added
  `block_self_role_change`, a `BEFORE UPDATE` trigger that blocks ANY caller from changing
  their own `role`, independent of which policy authorized the row. No recursion risk — it
  reads no table, only compares `OLD`/`NEW` values already in hand (see RLS.md rule 8).
- `profiles_role_audit` trigger (`AFTER UPDATE ... WHEN (OLD.role IS DISTINCT FROM
NEW.role)`) reuses the existing `log_admin_action()` — scoped to role changes only, so
  ordinary full_name/phone self-edits aren't logged as admin actions.
- `src/hooks/useAdminUsers.ts`, `src/routes/admin.users.tsx` (new): searchable, paginated
  (50/page) table — email, name, role badge (gold/grey), joined, last sign-in. Make
  admin / Remove admin buttons, each behind a `confirm()` dialog with explicit wording;
  both disabled on the caller's own row. No delete button. "Users" link added to the admin
  sidebar (existing "Customers" link is the pre-existing localStorage mock system — left
  untouched, unrelated, separate cleanup).

**Risk:** Medium — first-ever admin WRITE policy on `profiles`, and a new path into
`auth.users`. Mitigated by: `is_admin()` gate inside the function (not just RLS), the
`WITH CHECK` self-demotion block, the independent trigger backstop, and audit logging on
every role change.

**Verification:** No separate staging Supabase project exists for this repo (single linked
project) — CLAUDE.md's Full Lane "staging deploy" step is satisfied instead by the same
rolled-back-transaction empirical testing used for the profiles RLS recursion fix
(2026-08-03): `admin_list_users()` and `profiles_update_admin`/`block_self_role_change`
tested inside `BEGIN ... SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claims ...
ROLLBACK;` blocks as a real admin, a real customer, and self-role-change attempts, before
being applied live.

**Rollback:**

```sql
DROP TRIGGER IF EXISTS profiles_role_audit ON profiles;
DROP TRIGGER IF EXISTS profiles_block_self_role_change ON profiles;
DROP FUNCTION IF EXISTS block_self_role_change();
DROP POLICY IF EXISTS "profiles_update_admin" ON profiles;
DROP FUNCTION IF EXISTS admin_list_users(text, int, int);
```

Plus revert `admin.tsx` (sidebar link), delete `useAdminUsers.ts` / `admin.users.tsx`.

---

## 2026-08-03 — Editorial reviews + contact page real details

### [FullL] editorial_reviews table, PDP/card display, admin management, and real phone/email on /contact

**Problem:** Two long-flagged gaps. (1) The 18 mock reviews in `seed.ts`
were flagged as unmigrated back during the product data migration --
the real `reviews` table's `customer_id` FK chain
(`profiles`/`auth.users`) and its `UNIQUE(product_id, customer_id)`
constraint made a shared placeholder account impossible for the 5 of 8
products with more than one review. (2) `/contact` has shown hardcoded
"Coming soon" for phone and email since it was built, despite the real
values (`help@yaawun.com`, `+91 99107 84574`) existing in `seed.ts` /
the `static_pages` legal content this whole time.

**Root Cause:** Both are carry-over gaps from the pre-Supabase mock era
-- not bugs, just content that was never given a real home.

**Fix:**

- **Editorial reviews** (Task 1): new `editorial_reviews` table --
  no `customer_id`, no uniqueness constraint, purely admin-curated
  showcase content. RLS: public SELECT requires `is_approved=true`;
  admin gets full `FOR ALL`; no audit trigger (editorial content, not
  operational data, same as `site_settings`/`redirects`). Seeded all 18
  mock reviews matched to real products by name -- 17 `is_approved=true`,
  1 (the mock "Anonymous Visitor", originally "pending") seeded
  `is_approved=false`. `products.rating_avg`/`rating_count` are
  untouched -- still computed only from real `reviews` via the existing
  trigger. The blend happens entirely in application code
  (`useProduct.ts`, `useProducts.ts`, `useProductSearch.ts`): real
  reviews always take full precedence; editorial only fills in the
  rating when `rating_count` is 0. The rating summary is hidden
  entirely (not "0.0 (0 reviews)") whenever the effective count is 0.
  On the PDP, editorial reviews render after real reviews with no
  visual distinction (rendered with `isVerified=false`, so no "Verified
  purchase" badge -- same as any real unverified review). New
  "Editorial reviews" section added to `admin.reviews.tsx`: list,
  add/edit form, approve toggle, soft delete.
- **Contact page** (Task 2): new `site_settings` keys `store_phone`
  (`919910784574`) and `store_email` (`help@yaawun.com`). New
  `useContactDetails.ts` hook fetches all 3 contact keys
  (`store_whatsapp`/`store_phone`/`store_email`) in one query, same
  hide-if-placeholder logic as the existing WhatsApp button. `/contact`
  now omits a tile entirely (not "Coming soon") when its value is
  null; Call tile shows `+91 99107 84574` (`tel:+919910784574`), Email
  shows `help@yaawun.com` (`mailto:help@yaawun.com`).

**Risk:** Low for both -- purely additive (new table / new
`site_settings` rows), no existing table or RLS policy modified.
Necessary fallout, not scope creep: `ProductCard.tsx`'s prop type change
required updating `useProductSearch.ts` too, since `search.tsx` reuses
`ProductCard` with search results.

**Verification:** Both fully public routes, verified live in the
browser. `/product/pashmina-weave-shawl` correctly averages only its 4
approved editorial reviews (4.5, excludes the unapproved one), matching
star distribution, no visual distinction from a real review. `/shop`
grid shows correct fallback ratings on all 8 cards. `/contact` shows
WhatsApp tile correctly absent (still the placeholder value), Call/Email
tiles with correct formatting and hrefs. Zero console errors throughout.
`admin.reviews.tsx`'s new section is auth-gated -- verified via
`tsc`/`eslint`/build + code review only, same constraint as every other
admin page this session.

**Rollback:** Task 1: `DROP TABLE editorial_reviews;` plus revert the
8 touched app files. Task 2: `DELETE FROM site_settings WHERE key IN
('store_phone', 'store_email');` plus revert `contact.tsx` and delete
`useContactDetails.ts`.

---

## 2026-08-03 — Static Pages sprint: real About/Terms/Privacy/Returns/FAQs (Stages A–D)

### [FullL] New static_pages table, admin editor, SSR customer routes, footer rewiring

**Problem:** About, Terms of Use, Privacy Policy, Returns Policy, and FAQs
existed only as mock localStorage data (`src/lib/storage.ts`/`seed.ts`) with
no real database table, no server rendering, and no SEO — flagged as a gap
during the earlier product-catalogue data migration. `/about` was hardcoded
JSX; `/page/$slug` (singular) was 100% client-only, reading `getPage()` from
localStorage; the admin editor at `/admin/pages` wrote to the same mock
store; the footer's "Information" column and its WhatsApp link were
similarly mock-driven or unconfigured.

**Root Cause:** Carry-over from the pre-Supabase Lovable era — same category
of gap as the earlier product data migration, just never addressed for
these five pages specifically. `/contact` was investigated and deliberately
excluded from this table: it's a tiles component with one live data source
(`site_settings.store_whatsapp`), not prose, and folding it into a generic
content model would have meant losing that.

**Fix — four stages, each independently committed and verified:**

- **Stage A** (`7150070`) — new `static_pages` table (`slug`, `title`,
  `content` as raw HTML — no markdown renderer exists in this project, and
  converting five real legal-content bodies by hand risked dropping content
  such as the privacy policy's `<table>` cookie section — `meta_title`,
  `meta_description`, `is_published`, `sort_order`, full scale hooks). RLS:
  public/customer SELECT requires `is_published=true`; admin SELECT sees all
  non-deleted rows; admin UPDATE only; no INSERT/DELETE policy — the 5 rows
  (`about`, `terms`, `privacy-policy`, `returns-policy`, `faqs`) are fixed by
  product decision and seeded directly in this migration from the exact
  `seed.ts` HTML bodies (the `terms-and-conditions` duplicate was dropped,
  not seeded). Audit trigger wired via the existing `log_admin_action()`,
  same pattern as `product_variants`. Migration filename note: the plan
  specified `20260801100014`, already taken by an already-applied migration
  from the variants work — used `20260801100015` instead.
- **Stage B** (`d4a276c`) — rewrote `/admin/pages` and `/admin/pages/$slug`
  from the mock editor to the real table: list with inline publish-toggle,
  full edit form (title, HTML textarea with a live preview panel rendered
  via the same `dangerouslySetInnerHTML` approach the real customer route
  uses, meta fields with a 160-char counter), `beforeunload` warning on
  unsaved edits. No add/delete UI — the 5 pages are fixed.
- **Stage C** (`f7d5d0d`) — real SSR: `/about` now reads
  `static_pages(slug='about')` (falls back to a plain "About Yaawun" heading
  - the Sopore address if missing/unpublished — never blank); new
    `/pages/$slug` route (`terms`, `privacy-policy`, `returns-policy`, `faqs`)
    with loader + `ensureQueryData`, `meta_description`-or-stripped-content
    fallback, canonical, OG, BreadcrumbList JSON-LD, and a graceful "Page not
    found" UI (HTTP 200, not a thrown error) for missing/unpublished slugs.
    Removed the old mock `/page/$slug` (singular) route entirely.
- **Stage D** (`82858ee`) — footer rewired: Shop unchanged (now backed by the
  real `useCategories()` hook, the last remaining mock import in this file);
  new Help group (Returns Policy, FAQs, Contact us, WhatsApp us — same
  `useStoreWhatsapp` hook/hide-logic as the PDP button); new Legal group
  (Terms of Use, Privacy Policy); Instagram and Store admin moved into a new
  Connect group. Removed the generic unconfigured `wa.me/` link and every
  remaining `src/lib/storage.ts`/`seed.ts` import from `Chrome.tsx`.

**Risk:** Low-to-moderate for Stage A (new table + RLS, but purely additive,
no existing table touched); low for B–D (frontend/query changes against the
new table). Known content change: `/about`'s real content is shorter than
the old hardcoded page — the "What we sell" bullet list and "Visit us"
address were never part of the seeded `about-us` body and are now gone from
the live page (easy to re-add via the Stage B admin editor if wanted).

**Rollback:** Stages B–D: revert the touched files to their pre-2026-08-03
versions (no migration involved). Stage A: `DROP TABLE static_pages;` (see
migration file header).

---

## 2026-08-03 — Fix profiles RLS infinite recursion

### [FullL] profiles_select_admin policy used inline self-referential EXISTS subquery causing infinite recursion (42P17) on any cross-user profile read

**Problem:** `profiles_select_admin` policy used inline self-referential EXISTS
subquery causing infinite recursion (42P17) on any cross-user profile read.

**Root Cause:** policy never called `is_admin()` — it duplicated the logic
inline, bypassing the `SECURITY DEFINER` boundary. Because the duplicated
`EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')`
queried `profiles` directly from within a policy on `profiles`, with no
function-call boundary to break the cycle, Postgres's RLS recursion guard
fired for any row other than the caller's own (i.e. any embedded
`customer:profiles(...)` join — order detail, order list, review
moderation — for any authenticated user, admin or not). A plain own-row
lookup never triggered it, since `profiles_select_own` short-circuits the
OR'd policy set first — which is why this was invisible all session until an
admin session actually hit a cross-user profile read.

**Fix:** replaced inline subquery with `is_admin()` call, matching the
pattern used correctly by all other tables. `is_admin()` itself was never
broken — it's `SECURITY DEFINER` and already used successfully, with no
recursion, by ~10 other tables' admin policies (categories, products, orders,
static_pages, etc.). Verified via 5 rolled-back test transactions simulating
the `authenticated` role before writing the real migration, then confirmed
live: `pg_policies.qual` for `profiles_select_admin` now shows `is_admin()`,
and an unfiltered `SELECT * FROM profiles` (the exact shape that previously
recursed) now returns all rows cleanly under the real policy.

**Risk:** Low — `is_admin()` already proven correct on 10+ other table
policies; this only changes how `profiles_select_admin` checks admin status,
not what it grants access to.

**Rollback:** restore the old DROP/CREATE in reverse:

```sql
DROP POLICY "profiles_select_admin" ON profiles;
CREATE POLICY "profiles_select_admin"
  ON profiles FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
```

---

## 2026-08-02 — Sprint 2C: Customer experience improvements

### [FastL] Order history, product search, and WhatsApp enquiry button

**Problem:** Three customer-facing gaps. (1) `/account/orders` still rendered
the pre-Sprint-1 mock `Inquiry`-based order history (localStorage, fake
invoice modal) with no real order data and no detail view. (2) The navbar
search dropdown fetched every active product client-side and filtered with a
JS substring match — no debounce, fired from the first keystroke, never used
the `idx_products_name_trgm` index, and had no dedicated results page. (3)
There was no way for a customer to enquire about a specific product on
WhatsApp — PDP had no such button at all.

**Root Cause:** (1)/(2) are carry-over gaps from the pre-Supabase mock era,
same category as the product-catalogue migration two entries above — nobody
had gone back to check whether these specific pages/components were ever
updated when the storefront moved to live Supabase queries. (3) is net-new
scope, not a bug.

**Fix:**

- **Order history** (`useMyOrders.ts`, `account.orders.tsx`,
  `account.orders.$orderNumber.tsx`): real `orders`/`order_items`/`addresses`
  data, scoped by the existing `orders_select_own` RLS policy with no
  client-side filtering. List shows order number, date, status badge, total,
  item count; detail view adds line items (`variant_label` shown when
  present, same pattern as the admin order detail page), shipping address,
  payment method, and tracking number (clickable link only when
  `tracking_url` is set, plain text otherwise). Status badges use exact
  spec colours — amber/blue/purple/green/red/grey — reusing `--gold` and
  `--rust` where they match and plain inline colours (no new CSS vars) for
  blue/purple/green. `Chrome.tsx`'s `AccountMenu` dropdown had no orders
  link at all (just sign out) — added "My Orders".
- **Product search** (`useProductSearch.ts`, `Chrome.tsx`, `search.tsx`):
  replaced the client-side filter with a server-side
  `.ilike("name", "%term%")` query joined to category (uses the existing
  trigram index automatically, no migration needed) — 300ms debounce, 2-char
  minimum, capped at 8 for the dropdown. New `/search?q=` page reuses the
  same `ProductCard`/grid as `/shop`, URL-driven and shareable, capped at 48
  with no pagination.
- **WhatsApp enquiry button** (`useStoreWhatsapp.ts`, `product.$slug.tsx`):
  ghost-style "Ask on WhatsApp" button below Buy now, pre-filled message,
  `wa.me` link opened in a new tab. All hide-condition validation
  (unset/empty, `{{ }}` placeholders, the known dummy seed number
  `919000000000`, `91XXXXXXXXXX`-style placeholders, fewer than 10 digits)
  lives in the hook, which returns the number pre-stripped to digits only —
  the route only ever checks `if (whatsapp)`.

**Risk:** Low — all three are additive UI/query changes against existing
tables, no schema/RLS/migration touched. Order history and WhatsApp button
were verified live in the browser where possible (search and PDP are public;
order history required real customer auth, so verification there relied on
`tsc`/`eslint`/`vite build` plus code review against the spec, same
constraint as every other admin/account-gated page this session). The
WhatsApp button's full validation logic was verified via an isolated unit
test rather than temporarily overwriting the live `site_settings` row.

**Rollback:** Revert the eight touched/added files (`useMyOrders.ts`,
`account.orders.tsx`, `account.orders.$orderNumber.tsx`,
`useProductSearch.ts`, `search.tsx`, `useStoreWhatsapp.ts`,
`product.$slug.tsx`, `Chrome.tsx`) to their pre-2026-08-02 versions; no
migration to roll back.

---

## 2026-08-02 — Data migration: legacy mock content → live database (data only, no code changes)

### [FastL] Migrated the 8 legacy mock products into the real `products` table; flagged static/legal pages as unmigrated

**Problem:** `src/lib/storage.ts` and `src/lib/seed.ts` (the pre-Supabase
localStorage-backed mock data layer) still held the original 8 catalogue
products, plus other content that was never carried over when the storefront
moved to live Supabase queries in Sprint 1.

**Root Cause:** Not a bug — a straightforward carry-over gap from the
Lovable-era mock data to the real schema; nobody had gone back to check what
of the original content was still only sitting in mock files.

**Fix:** Inserted the 8 mock products (with subtitle, description, price,
compare_price, badge, fabric, embroidery, care, stock_count, meta_description)
into `products`, matched to existing categories by name; per-piece dimension
breakdowns for the two unstitched 3-piece sets into `product_pieces`; package
contents into `product_includes`. No product images were migrated — the mock
images are local Vite build assets, not uploadable URLs; photos will be
uploaded via the admin form. Categories and hero `site_settings` needed no
changes — both already match the mock seed values from earlier sprints.

**Flagged, not migrated — reviews:** `seed.ts` contains 18 mock reviews
across 6 of the 8 products. Not migrated — the real `reviews` table requires
`customer_id` to reference a real `profiles` row, which in turn requires a
real `auth.users` row, and carries a `UNIQUE (product_id, customer_id)`
constraint. Bulk-inserting these under one or more synthetic placeholder
accounts would mean creating fabricated `auth.users` rows in the production
project purely for data attribution — incorrect, and explicitly ruled out.
Correct fix: add a separate `editorial_reviews` table (`id`, `product_id`,
`reviewer_name`, `reviewer_location`, `rating`, `body`, `is_approved`,
`created_at`) with no `auth.users` dependency, for curated showcase reviews.
Scope as a Fast Lane addition after the admin panel fix sprint.

**Flagged, not migrated — static/legal pages:** `seed.ts` contains real
content for About, Terms of Use, Privacy Policy, Terms & Conditions,
Returns/Refunds/Cancellation, and FAQs (with real contact details). Checked
where this currently lives: `/page/$slug` and `/admin/pages` (`page.$slug.tsx`,
`admin.pages.index.tsx`) still read/write **only `localStorage`** via
`src/lib/storage.ts` — there is no `static_pages` table in the real schema.
Right now the Terms of Service, Privacy Policy, and Returns Policy exist only
per-browser (seeded client-side on first visit): not server-rendered, not
indexable by search engines, and not centrally admin-editable across devices.
This needs a new `static_pages` table + RLS + admin editor + SSR routes —
Full Lane work, scoped as a future sprint, not done here.

**Risk:** Legal/SEO risk from the unmigrated static pages is unchanged by this
entry — it existed before, this just makes it visible and tracked. Product
migration itself carries no risk: purely additive INSERTs into existing
tables, no schema/RLS touched, no existing rows modified.

**Rollback:** `UPDATE products SET deleted_at = now(), status = 'archived'
WHERE slug IN ('pashmina-weave-shawl', 'chikankari-unstitched-suit',
'kundan-drop-earrings', 'embroidered-frock', 'silk-thread-hairpin-set',
'sozni-hand-embroidered-wrap', 'banarasi-silk-suit', 'glass-bangle-set');`
(soft delete only, per CLAUDE.md — `product_pieces`/`product_includes`
cascade-delete on hard delete only, so they're left in place and simply
become orphaned-but-harmless under the soft-deleted parent).

---

## 2026-08-02 — Sprint 2B: Admin panel completion (delta pass)

### [FastL] Categories, site settings, order detail, and stock display updated for gaps left by earlier sprints

**Problem:** An earlier Sprint 2B round (2026-08-01) already built real admin
pages for categories, site settings, order detail, and product stock — but
each had gaps relative to what the admin panel now actually needs, mostly
because product variants (2026-08-01, later that same day) and Sprint 2A's
hero `site_settings` rows (2026-08-01) didn't exist yet when those pages
were first built. Dashboard analytics (the would-be Item 3) was checked
against the current spec and found to already fully match it — skipped
entirely, no changes.

**Root Cause:** Not a bug — admin pages built before variants/hero-settings
existed couldn't have accounted for either. Also, `SETUP.md` still showed
Sprint 1 "IN PROGRESS" and Sprint 2 "UPCOMING" despite Sprint 1, product
variants, and Sprint 2A all being done and merged — restored verbatim from
an old snapshot earlier in this project's history and never updated since.

**Fix:**

- `SETUP.md` sprint-status section rewritten to reflect actual state.
- **Categories** (`useAdminCategories.ts`, `admin.categories.tsx`): added a
  per-category non-deleted product count via PostgREST's embedded
  `products(count)` (single query, no per-row fetch); soft-deleted
  categories now show in the list at reduced opacity with a "Deleted" label
  and a Restore button (Delete never shows on an already-deleted row,
  Restore never shows on an active one); slug uniqueness is pre-checked on
  blur (excluding the row's own id) with an inline error, instead of a raw
  Postgres unique-violation toast.
- **Site settings** (`admin.settings.tsx`): restructured into three cards,
  each with its own save button scoped to only its own keys —
  "Announcement & delivery" (unchanged fields), "SEO" (`seo_site_name`,
  `seo_site_description` — new, no admin UI existed before), "Hero banner"
  (`hero_eyebrow` through both CTA label/href pairs — these `site_settings`
  rows have existed since Sprint 2A for the storefront's read side, but had
  no admin UI to edit them until now).
- **Order detail** (`admin.orders.$id.tsx`, `NotificationService.ts`): line
  items now show `variant_label` when present (nothing rendered when null);
  added `delivered → refunded` as a real transition (confirm dialog, updates
  `orders.status` only — no `refunded_at` column exists, none added — and
  fires a new `refund_processed` notification event, channels `['sms']` to
  match `order_cancelled` exactly).
- **Stock display** (`useAdminProducts.ts`, `admin.products.index.tsx`):
  products with any variants now show a "Manage variants" link (same
  destination as Edit — the product edit form's Variants section is where
  per-variant stock actually lives) instead of an editable top-level stock
  input, since that field is no longer meaningful once a product has
  variants. Variant-less products keep the existing inline edit, with
  corrected colour thresholds reusing existing design tokens: 0 → red
  (`--rust`), 1–4 → amber (`--gold`), 5+ → default.

**Risk:** Low — additive UI/query changes only, no schema/RLS changes, no
new migration. The variant-count check is unfiltered by `deleted_at` (a
product whose variants were all soft-deleted would still show "Manage
variants" instead of the stock input) — accepted as a known simplification
for this delta pass, not worth a filtered/inner-join query for the edge case.

**Rollback:** Revert the seven touched files (`useAdminCategories.ts`,
`admin.categories.tsx`, `admin.settings.tsx`, `admin.orders.$id.tsx`,
`NotificationService.ts`, `useAdminProducts.ts`, `admin.products.index.tsx`)
to their pre-2026-08-02 versions; no migration to roll back.

---

## 2026-08-01 — Sprint 2C: Product variants schema (colours, sizes, fabrics)

### [FullL] Stage A — migration for product_variants, colour/size/fabric catalogs

**Problem:** Products need colour and size variants (each with its own stock and
optional price override), an admin-managed fabric picklist instead of free text, and
category-scoped size scales — none of which existed. Also discovered while starting
this stage: migration `20260801100011` (Sprint 2B's notification_queue RLS fix) had
been merged to `main` but never actually applied to the live Supabase project —
`supabase migration list --linked` showed it with no matching remote entry. The order
detail page's notification queueing has therefore been silently broken in production
since Sprint 2B merged, not just in the pre-2B checkout path it was meant to fix.

**Root Cause:** The variants feature is new scope, not a bug. The 100011 deployment
gap was a process gap — merging to `main` was treated as "done," but no explicit
`supabase db push` step followed it.

**Fix:**

- Migration `20260801100012_product_variants_colours_sizes_fabrics.sql`: adds
  `fabric_options`, `colour_options`, `size_scales`, `size_options`, and
  `product_variants` (all with full scale hooks — `created_at`/`updated_at`/
  `deleted_at` — even where not explicitly spelled out, per CLAUDE.md rule 7),
  `products.fabric_id`, `categories.default_size_scale_id` (backfilled: kidswear →
  `age_kids`, kashmiri-shawls → `free_size`, dress-material → `dress_material`,
  accessories → `NULL`), and `variant_id` columns on `cart_items`/`order_items`
  (`order_items` additionally gets `variant_label` as a purchase-time snapshot,
  matching that table's existing `product_name`/`product_slug` snapshot principle).
- `product_variants` uniqueness on `(product_id, colour_id, size_id)` uses a
  `COALESCE`-to-sentinel-UUID partial unique index (`WHERE deleted_at IS NULL`), not a
  bare `UNIQUE(...)` — Postgres treats every `NULL` as distinct in a plain unique
  constraint, which would not have caught duplicate variant rows for a product with no
  colour or size set.
- `products.fabric` (free text) is kept as a dual-write bridge alongside the new
  `fabric_id` FK — the PDP still reads the text column directly and is unchanged in
  this stage; the admin form (Stage B) will write both.
- Audit trigger (`log_admin_action()`) added to `product_variants` only — not to the
  four reference/catalog tables, which are the same shape as the already-audit-free
  `site_settings`/`redirects`.
- Both the missed `20260801100011` and the new `20260801100012` pushed to the live
  project via `supabase db push --linked` in this session; verified via the app's own
  anon client (seed counts: 10 fabrics, 18 colours, 5 scales, 17 size options, category
  backfill on 3 of 4 categories) since the connected Supabase MCP tool returned a
  permission error for this project.
- `src/types/database.ts`, `docs/blueprint/SCHEMA.md`, `docs/blueprint/RLS.md` updated
  to match.

**Risk:** Low — purely additive (new tables, nullable new columns). No existing data
migrated or reinterpreted. `product_variants` starts empty; every existing product
continues to be managed at the product level exactly as before.

**Rollback:** See migration file header for the exact drop statements. Applies in
reverse dependency order (order_items/cart_items columns → product_variants →
categories/products columns → size_options/size_scales/colour_options/fabric_options).

---

## 2026-08-01 — Sprint 2B: Order detail page, tracking, and status transitions

### [FullL] Admin order detail page with status dropdown; fixes silently-broken notification_queue writes

**Problem:** The orders list had inline confirm/dispatch/deliver actions but no
detail view (customer info, full address, line items, payment method all
required opening the database directly), no cancel action, and dispatching
required cramming two text inputs into a table row. Building the detail page's
"queue a notification on every status change" requirement surfaced a real,
pre-existing bug: `notification_queue` RLS granted `INSERT` only to
`service_role`; admin had `SELECT` only. `NotificationService.send()` is
called directly from the browser client (`checkout.tsx`'s `order_confirmed`
call, live since Sprint 1) — every such call has been silently failing RLS
(the error is caught and logged, never thrown) since it shipped. No customer
has ever actually received an order-confirmation queue entry.

**Root Cause:** `notification_queue`'s original RLS (Sprint 0) assumed only
the Edge Function worker would ever write to it, missing that
`NotificationService.send()` — the one sanctioned way to queue a
notification per CLAUDE.md's Notification Service Law — is called directly
from authenticated client code, not from a trusted server context.

**Fix:**

- Migration `20260801100011_notification_queue_write_policies.sql`: adds
  `notif_queue_insert_own` (`user_id = auth.uid()`) and
  `notif_queue_insert_admin` (`is_admin()`) INSERT policies.
  UPDATE/DELETE and the full `service_role` `FOR ALL` policy are unchanged —
  only the Edge Function worker that processes/marks rows sent or failed may
  do those.
- New `admin.orders.$id.tsx` detail page: customer info, shipping address,
  payment method, all line items with totals, tracking info. Status actions
  are restricted to the actual state machine (`pending → confirmed/cancelled`,
  `confirmed → dispatched/cancelled`, `dispatched → delivered`) — not a free
  choice across all six statuses. `refunded` is out of scope for this stage,
  deliberately not added to the dropdown.
- Dispatching requires a tracking number (URL optional) before the transition
  is allowed.
- Every transition writes `orders.status` (+ `tracking_number`/
  `tracking_url`/`dispatched_at`/`delivered_at` as applicable) and calls
  `NotificationService.send()` with the matching event type
  (`order_confirmed`/`order_dispatched`/`order_delivered`/`order_cancelled`)
  — these now actually reach the queue.
- `admin.orders.tsx` (list) simplified to a read-only overview + "View" link
  per row — the inline confirm/dispatch/deliver actions and the cramped
  tracking-input row moved to the detail page, so status-transition logic
  lives in exactly one place instead of two.
- `docs/blueprint/RLS.md` updated: `notification_queue` policy matrix row and
  critical-rules note reflect the new INSERT policies.

**Risk:** Low — additive INSERT policies only, no change to existing
UPDATE/DELETE/service_role access. No real orders exist yet to be affected by
the list-page action removal.

**Rollback:** `DROP POLICY "notif_queue_insert_own" ON notification_queue;
DROP POLICY "notif_queue_insert_admin" ON notification_queue;` (see migration
file header). Reverting the detail page means restoring the prior
`admin.orders.tsx` from git history.

---

## 2026-08-01 — Sprint 1: Magic-link email auth (bridge), phone OTP dormant

### [FullL] Custom OTP session-minting turned out to be fundamentally incompatible with GoTrue — switched to magic-link email as the live auth path

**Problem:** The custom OTP auth shipped just before this (previous entry below) does
not actually work. Testing it end-to-end (not just unit-testing the Edge Functions)
showed `supabase.auth.setSession()` failing immediately with "Auth session missing!"
on every attempt — not after an hour, on the very first call.

**Root Cause:** A manually-signed JWT is not sufficient to establish a Supabase
session. GoTrue's own `/auth/v1/user` endpoint — which `setSession()` calls internally
to populate/validate the session — checks the JWT's `session_id` claim against a real
row in `auth.sessions` and rejects the request with `session_not_found` if none
exists, regardless of how validly the JWT is signed or how far from expiry it is.
Confirmed directly via `curl` against `/auth/v1/user`, not assumed. Writing matching
rows into `auth.sessions`/`auth.refresh_tokens` would fix it (those are real Postgres
tables GoTrue itself uses, just not exposed through PostgREST — reachable only via a
direct Postgres connection), and was prototyped, but deliberately not shipped: writing
directly into GoTrue's own internal session tables from custom Edge Function code is a
meaningfully more sensitive operation than the rest of this bridge, and not something
to ship without more scrutiny than a stopgap warrants.

**Fix:** Email magic-link auth (`supabase.auth.signInWithOtp({email})` +
`emailRedirectTo`), which Supabase handles entirely natively — real sessions, working
refresh tokens, zero extra configuration, no SMS provider needed. `/login` and
`/admin/login` now show a single email input + "Send magic link" + a "check your
email" confirmation screen (`src/components/MagicLinkForm.tsx`). After first sign-in, a
dismissible, non-blocking prompt (`src/components/AddPhonePrompt.tsx`, mounted
site-wide in `__root.tsx`) offers to save a mobile number to `profiles.phone` for order
updates — a plain profile update, not part of auth, so `phone_verified` correctly stays
`false` until a real OTP flow verifies it later. The `otp-request`/`otp-verify` Edge
Functions stay deployed but dormant — not deleted, not called by any active route.
`otp-verify` no longer attempts to mint a session at all (that code is gone, not just
unused); it still does the part that's genuinely reusable — rate-limited, bcrypt
verified OTP matching against a real phone, with find-or-create on `auth.users`.

**Planned fix:** when an SMS provider (Twilio/MSG91) is onboarded, this becomes a Fast
Lane swap: enable Supabase's native Phone Auth with that provider, remove the magic
link flow, activate phone input on the login page, and either retire or repurpose the
dormant Edge Functions. Zero schema changes needed — `profiles.phone`/`phone_verified`
already exist for exactly this. Native Phone Auth manages `auth.sessions`/
`auth.refresh_tokens` correctly itself, so this whole class of problem goes away.

**Risk:** Low — no real users yet. The cost of this whole detour was engineering time,
not customer-facing breakage (the broken OTP flow was caught before being relied on).

**Rollback:** Revert to the custom OTP flow once Supabase Phone Auth is live and the
Fast Lane swap above is done — not before, since the custom flow's session-minting is
confirmed non-functional as shipped.

---

## 2026-08-01 — Sprint 1: Mobile + OTP replaces email auth

### [FullL] Custom OTP auth (Edge Functions) replaces email/password everywhere

**Problem:** Email/password auth (Sprint 1) required customers to remember a password
and required Supabase's default mailer for signup confirmation and password reset —
neither fits an Indian mobile-first customer base, and email confirmation's default
rate limit had already caused real friction during testing. Phone is the identity Yaawun
actually wants.

**Root Cause:** Not a bug — a product decision to switch identity models. Supabase's
native Phone Auth was considered first, but it has no working "no SMS provider" mode
(GoTrue requires a real provider — Twilio/MessageBird/Vonage/TextLocal — configured
before `signInWithOtp` will issue anything at all; its Test-OTP feature only covers
specific pre-registered numbers, not a universal dev bypass), so it couldn't deliver
the "any phone number works with a fixed code in dev, real SMS later" behavior this
project needs before an SMS provider is chosen.

**Fix:**

- Migration `20260801100009_mobile_auth.sql`: `profiles.phone` gets a UNIQUE constraint
  (was already a column since Sprint 0, just unconstrained); adds `phone_verified boolean
not null default false`.
- Migration `20260801100010_otp_codes.sql`: new `otp_codes` table (bcrypt-hashed codes,
  10-minute expiry, attempt counter) — RLS enabled with zero policies for anon/
  authenticated (service_role bypasses RLS and is the only caller), no soft delete
  (expired rows are purged outright by otp-verify; these are short-lived single-use
  codes, not durable business records).
- Two Edge Functions, both deployed via `supabase functions deploy` (not manually):
  - `otp-request`: validates Indian mobile format, rate-limits to 3 requests per phone
    per 10 minutes, generates a code (fixed `123456` when the `DEV_OTP_BYPASS` Edge
    Function secret is `true`, cryptographically random otherwise), bcrypt-hashes it,
    delivers it via a Deno-side notification helper mirroring
    `src/services/NotificationService.ts`'s single-choke-point rule (dev: console log;
    "prod": logs "SMS provider not configured" — Twilio/MSG91 wiring is a single
    function body change away) and writes a `notification_queue` audit row with the
    raw code deliberately excluded from the persisted payload.
  - `otp-verify`: looks up the most recent unverified/unexpired code for the phone,
    increments `attempts` (locks out and purges at 5), bcrypt-compares, and on match
    finds-or-creates the `auth.users` row for that phone via the service-role Admin API
    (`createUser({phone, phone_confirm:true})`, falling back to a `profiles.phone`
    lookup on "already registered"), then mints a session.
- Session is a real JWT signed with a project secret (Edge Function secret
  `APP_JWT_SECRET` — **not** `SUPABASE_JWT_SECRET`; the Supabase CLI reserves that
  prefix for its own auto-injected vars and rejects custom secrets using it), matching
  GoTrue's claim shape (`sub`, `role: authenticated`, `aud`, `exp`, `session_id`, etc.).
  Valid for RLS/PostgREST purposes for its 1-hour lifetime.
- Single unified `/login` (customer) and `/admin/login` (same flow, additional
  `profiles.role = 'admin'` check post-verify) — no separate signup step, phone+OTP
  covers both. `/signup`, `/forgot-password`, `/reset-password` now redirect to
  `/login` (no password concept left to reset).
- `NotificationService.ts`: dropped `email` from every event's default channels
  (`order_confirmed`/`order_dispatched` → sms+whatsapp, `order_delivered`/
  `review_approved` → whatsapp, rest → sms), dropped the `password_reset` event type,
  added `otp_request`.
- `.env.example`: removed the commented `RESEND_API_KEY` placeholder, added
  `VITE_DEV_OTP_BYPASS` (must match the `DEV_OTP_BYPASS` Edge Function secret).

**Known limitation:** refresh tokens are not functional — the `refresh_token` returned
alongside the access token is a random placeholder, not a real GoTrue session. Sessions
expire after ~1 hour with no silent refresh; the customer re-verifies via OTP to get a
new one. An attempt was made to fix this properly by writing matching rows directly
into `auth.sessions`/`auth.refresh_tokens` (the tables GoTrue itself checks — confirmed
empirically that a JWT alone is rejected with `session_not_found` if no matching
`auth.sessions` row exists, since `auth` schema tables aren't reachable via PostgREST
even with service_role, only via a direct Postgres connection). That approach was
deliberately reverted before deploying: writing straight into GoTrue's own internal
session tables from custom Edge Function code is a meaningfully more sensitive
operation than everything else in this migration, and not something to ship without
more scrutiny than a bridging feature warrants.

**Planned fix:** when an SMS provider (Twilio/MSG91) is onboarded, replace these
custom OTP Edge Functions with Supabase's native Phone Auth, which manages
`auth.sessions`/`auth.refresh_tokens` correctly itself — no custom session-minting
code, no JWT-signing workaround, refresh works normally. This custom OTP setup is a
deliberate bridge to that point, not a permanent architecture.

**Risk:** Low — no real users yet, and re-verifying via OTP is low friction on mobile.
`DEV_OTP_BYPASS=true` must never reach production (a fixed, publicly-known OTP for
every phone number defeats the purpose of OTP auth entirely) — there is no code-level
guard against this today beyond the Edge Function secret and `.env` value both needing
to be flipped to `false` deliberately.

**Rollback:** Migrations' rollback statements are in their own file headers. Reverting
the Edge Functions means `supabase functions delete otp-request otp-verify` plus
restoring email auth UI from git history — not attempted here since the owner made a
clean forward decision, not a rollback-pending one.

---

## 2026-08-01 — Sprint 1: Cloudinary dropped, Supabase Storage instead

### [FullL] Product image uploads moved off Cloudinary

**Problem:** Cloudinary was the planned image host (`VITE_CLOUDINARY_CLOUD_NAME`/
`VITE_CLOUDINARY_UPLOAD_PRESET`, unsigned upload preset `yaawun_products`), but no
Cloudinary account/credentials exist yet, and the owner decided to defer the
auto-enhance feature Cloudinary was chosen for rather than block Sprint 1 on setting
one up.

**Fix:** New migration `20260801100008_product_images_storage_bucket.sql` creates a
public Supabase Storage bucket `product-images` with explicit RLS on `storage.objects`
(public read; insert/update/delete gated on `public.is_admin()`) — `storage.objects`
has RLS enabled with zero policies by default, and a bucket's `public` flag alone only
affects the CDN read path, not writes. `src/lib/product-images.ts` replaces
`src/lib/cloudinary.ts`: plain upload + `getPublicUrl()`, no transformation applied.
`product_images.cloudinary_id` is left in the schema, untouched and unused (nullable) —
re-adding Cloudinary later is a Fast Lane change (new upload path + start populating
that column), not a migration.

**Risk:** No image auto-enhancement until Cloudinary is reintroduced. None to existing
data — no product images had been uploaded yet under the Cloudinary path.

**Rollback:** See the storage-bucket migration's own header for the exact drop
statements.

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
