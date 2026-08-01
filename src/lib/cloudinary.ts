/**
 * Cloudinary unsigned upload + delivery URL helper.
 * Upload preset is unsigned (no API secret involved) — safe to call from the browser.
 */

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined;
const UPLOAD_PRESET =
  (import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string | undefined) ?? "yaawun_products";

export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
}

export async function uploadToCloudinary(file: File): Promise<CloudinaryUploadResult> {
  if (!CLOUD_NAME) {
    throw new Error("VITE_CLOUDINARY_CLOUD_NAME is not configured.");
  }
  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", UPLOAD_PRESET);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Cloudinary upload failed (${res.status}): ${body.slice(0, 200)}`);
  }
  return (await res.json()) as CloudinaryUploadResult;
}

/**
 * Builds a delivery URL for a stored public_id, applying the auto-enhance
 * transformation (improve + auto brightness) used across the storefront/admin.
 */
export function cloudinaryUrl(
  publicId: string,
  opts: { enhance?: boolean; width?: number; height?: number } = {},
) {
  if (!CLOUD_NAME) return "";
  const { enhance = true, width, height } = opts;
  const parts: string[] = [];
  if (enhance) parts.push("e_improve", "e_auto_brightness");
  if (width) parts.push(`w_${width}`);
  if (height) parts.push(`h_${height}`);
  if (width || height) parts.push("c_fill", "f_auto", "q_auto");
  const transform = parts.length ? `${parts.join(",")}/` : "";
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transform}${publicId}`;
}

/** Resolves the best display URL for a ProductImage row: cloudinary_id if present, else the raw storage_path. */
export function productImageUrl(
  image: { cloudinary_id?: string | null; storage_path: string } | null | undefined,
  opts?: { width?: number; height?: number },
) {
  if (!image) return null;
  if (image.cloudinary_id) return cloudinaryUrl(image.cloudinary_id, opts);
  return image.storage_path;
}
