/**
 * Product image uploads via Supabase Storage's public `product-images` bucket.
 * Cloudinary was dropped for now (see docs/CHANGELOG.md) — no upload-time
 * auto-enhancement here, just a plain upload + public URL.
 */
import { supabase } from "@/lib/supabase";

const BUCKET = "product-images";

export interface StorageUploadResult {
  storage_path: string; // public URL
}

function extOf(filename: string) {
  const dot = filename.lastIndexOf(".");
  return dot >= 0 ? filename.slice(dot + 1).toLowerCase() : "jpg";
}

export async function uploadProductImage(file: File): Promise<StorageUploadResult> {
  const path = `products/${crypto.randomUUID()}.${extOf(file.name)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { storage_path: data.publicUrl };
}

/** Best-effort delete — called when an image is removed from a product; failures are non-fatal. */
export async function deleteProductImage(storagePath: string) {
  const marker = `/${BUCKET}/`;
  const idx = storagePath.indexOf(marker);
  if (idx === -1) return;
  const path = storagePath.slice(idx + marker.length);
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) console.warn("[product-images] delete failed", error);
}

/** Resolves the display URL for a ProductImage row — storage_path is already a full public URL. */
export function productImageUrl(image: { storage_path: string } | null | undefined) {
  return image?.storage_path ?? null;
}
