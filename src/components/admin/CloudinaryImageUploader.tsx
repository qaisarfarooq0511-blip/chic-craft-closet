import { useState, type ChangeEvent } from "react";
import { IconUpload, IconX, IconStar, IconStarFilled, IconLoader2 } from "@tabler/icons-react";
import { uploadToCloudinary, cloudinaryUrl } from "@/lib/cloudinary";
import { useToast } from "@/lib/toast";

export interface ProductImageDraft {
  id?: string;
  cloudinary_id: string;
  storage_path: string;
  is_primary: boolean;
  sort_order: number;
}

interface Props {
  value: ProductImageDraft[];
  onChange: (next: ProductImageDraft[]) => void;
  max?: number;
}

export function CloudinaryImageUploader({ value, onChange, max = 5 }: Props) {
  const toast = useToast();
  const [uploading, setUploading] = useState(false);

  const onFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    const remaining = max - value.length;
    const take = files.slice(0, Math.max(0, remaining));
    if (files.length > take.length)
      toast(`Only ${remaining} more image${remaining === 1 ? "" : "s"} allowed`);
    if (!take.length) return;

    setUploading(true);
    try {
      const uploaded: ProductImageDraft[] = [];
      for (const f of take) {
        const res = await uploadToCloudinary(f);
        uploaded.push({
          cloudinary_id: res.public_id,
          storage_path: res.secure_url,
          is_primary: value.length === 0 && uploaded.length === 0,
          sort_order: value.length + uploaded.length,
        });
      }
      onChange([...value, ...uploaded]);
      toast(`${uploaded.length} image${uploaded.length === 1 ? "" : "s"} uploaded`);
    } catch (err) {
      console.error(err);
      toast(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const remove = (i: number) => {
    const wasPrimary = value[i].is_primary;
    const next = value
      .filter((_, idx) => idx !== i)
      .map((img, idx) => ({ ...img, sort_order: idx }));
    if (wasPrimary && next.length) next[0] = { ...next[0], is_primary: true };
    onChange(next);
  };

  const setPrimary = (i: number) => {
    onChange(value.map((img, idx) => ({ ...img, is_primary: idx === i })));
  };

  return (
    <div>
      <div className="cart-sum-title" style={{ marginBottom: 6 }}>
        Photos
      </div>
      <p style={{ fontSize: 11, color: "var(--ink3)", marginBottom: 10 }}>
        Upload up to {max} photos to Cloudinary. Auto-enhanced (improve + auto brightness) on
        display. The starred photo is the main image.
      </p>

      {value.length < max && (
        <label className="image-uploader">
          {uploading ? <IconLoader2 className="spin" /> : <IconUpload />}
          <div style={{ fontSize: 13, color: "var(--ink2)", marginBottom: 4 }}>
            {uploading ? "Uploading…" : "Click to upload photos"}
          </div>
          <div className="image-uploader-hint">
            JPG / PNG · {max - value.length} slot{max - value.length === 1 ? "" : "s"} left
          </div>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={onFiles}
            style={{ display: "none" }}
            disabled={uploading}
          />
        </label>
      )}

      {value.length > 0 && (
        <div className="image-thumbs" style={{ marginTop: 14 }}>
          {value.map((img, i) => (
            <div
              key={img.id ?? img.cloudinary_id}
              className="image-thumb"
              style={{
                position: "relative",
                outline: img.is_primary ? "2px solid var(--gold)" : undefined,
                outlineOffset: 2,
              }}
            >
              <img
                src={cloudinaryUrl(img.cloudinary_id, { width: 200, height: 200 })}
                alt={`Photo ${i + 1}`}
              />
              <button
                type="button"
                className="image-thumb-x"
                onClick={() => remove(i)}
                aria-label="Remove"
              >
                <IconX />
              </button>
              <button
                type="button"
                onClick={() => setPrimary(i)}
                title={img.is_primary ? "Main image" : "Set as main"}
                style={{
                  position: "absolute",
                  left: 6,
                  top: 6,
                  background: "rgba(255,255,255,.92)",
                  border: "none",
                  borderRadius: 999,
                  width: 26,
                  height: 26,
                  display: "grid",
                  placeItems: "center",
                  cursor: "pointer",
                  color: img.is_primary ? "var(--gold)" : "var(--ink2)",
                }}
              >
                {img.is_primary ? <IconStarFilled size={14} /> : <IconStar size={14} />}
              </button>
              {img.is_primary && (
                <div
                  style={{
                    position: "absolute",
                    bottom: 6,
                    left: 6,
                    background: "var(--gold)",
                    color: "white",
                    fontSize: 9,
                    fontWeight: 600,
                    padding: "2px 6px",
                    borderRadius: 4,
                    letterSpacing: 0.5,
                    textTransform: "uppercase",
                  }}
                >
                  Main
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
