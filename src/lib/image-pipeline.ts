// Image pipeline used by admin uploaders.
// - resizeToTarget: client-side canvas resize/crop + WebP encode to a fixed
//   dimension. Used after AI enhancement (or directly when AI is skipped).
// - aiEnhance: POST to /api/enhance-image, returns a PNG data URL.

export interface TargetSize {
  width: number;
  height: number;
  quality?: number; // 0-1 webp quality
  fit?: "cover" | "contain"; // cover crops, contain letterboxes
  bg?: string; // background fill for contain
}

export const TARGETS = {
  product: { width: 900, height: 1100, fit: "cover" as const, quality: 0.85 },
  heroMain: { width: 1200, height: 1500, fit: "cover" as const, quality: 0.85 },
  heroSmall: { width: 600, height: 750, fit: "cover" as const, quality: 0.85 },
  categoryTile: { width: 800, height: 800, fit: "cover" as const, quality: 0.85 },
} as const;

export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

export async function resizeToTarget(src: string, target: TargetSize): Promise<string> {
  const { width: W, height: H, quality = 0.85, fit = "cover", bg = "#FAF7F2" } = target;
  const img = await loadImage(src);
  const sw = img.naturalWidth;
  const sh = img.naturalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unsupported");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const sR = sw / sh;
  const tR = W / H;
  let dx = 0, dy = 0, dw = W, dh = H, sx = 0, sy = 0, sCropW = sw, sCropH = sh;
  if (fit === "cover") {
    if (sR > tR) {
      // source wider — crop horizontally
      sCropW = sh * tR;
      sx = (sw - sCropW) / 2;
    } else {
      sCropH = sw / tR;
      sy = (sh - sCropH) / 2;
    }
  } else {
    // contain — letterbox
    if (sR > tR) {
      dh = W / sR;
      dy = (H - dh) / 2;
    } else {
      dw = H * sR;
      dx = (W - dw) / 2;
    }
  }
  ctx.drawImage(img, sx, sy, sCropW, sCropH, dx, dy, dw, dh);
  const webp = canvas.toDataURL("image/webp", quality);
  if (webp.startsWith("data:image/webp")) return webp;
  return canvas.toDataURL("image/jpeg", quality);
}

/** Calls the server route /api/enhance-image and returns the AI-edited image as a data URL. */
export async function aiEnhance(src: string, instruction?: string): Promise<string> {
  const res = await fetch("/api/enhance-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: src, instruction }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Enhance failed (${res.status}): ${txt.slice(0, 200)}`);
  }
  const data = await res.json() as { image?: string; error?: string };
  if (!data.image) throw new Error(data.error || "No image returned");
  return data.image;
}
