-- Migration: 20260801100008_product_images_storage_bucket.sql
-- Purpose: Public Supabase Storage bucket for product photos, replacing the Cloudinary
--          upload path (dropped — Cloudinary will come back later as a Fast Lane
--          enhancement for auto-enhancement, not needed for the storage path itself).
-- Lane: Full Lane
-- Rollback: delete from storage.objects where bucket_id = 'product-images';
--           delete from storage.buckets where id = 'product-images';
--           drop policy if exists "product_images_public_read" on storage.objects;
--           drop policy if exists "product_images_admin_insert" on storage.objects;
--           drop policy if exists "product_images_admin_update" on storage.objects;
--           drop policy if exists "product_images_admin_delete" on storage.objects;

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- storage.objects has RLS enabled with no policies by default — public=true on the
-- bucket only affects the CDN read path (getPublicUrl), not writes, and not reads that
-- go through PostgREST directly. Explicit policies below, scoped to this bucket only.

create policy "product_images_public_read"
on storage.objects for select
to public
using (bucket_id = 'product-images');

create policy "product_images_admin_insert"
on storage.objects for insert
to authenticated
with check (bucket_id = 'product-images' and public.is_admin());

create policy "product_images_admin_update"
on storage.objects for update
to authenticated
using (bucket_id = 'product-images' and public.is_admin());

create policy "product_images_admin_delete"
on storage.objects for delete
to authenticated
using (bucket_id = 'product-images' and public.is_admin());
