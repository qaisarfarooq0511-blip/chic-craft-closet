// Browser-side image enhancement: crop to square, brightness/contrast
// normalize, resize, and return a WebP data URL. Keeps storage small
// enough to live in localStorage during the frontend-only phase.

export interface ProcessOptions {
  maxSize?: number; // px
  quality?: number; // 0-1
  square?: boolean;
}

export async function processImage(file: File, opts: ProcessOptions = {}): Promise<string> {
  const { maxSize = 900, quality = 0.82, square = true } = opts;

  const dataUrl = await fileToDataUrl(file);
  const img = await loadImage(dataUrl);

  const srcW = img.naturalWidth;
  const srcH = img.naturalHeight;

  // Square crop centered
  let cropW = srcW, cropH = srcH, cropX = 0, cropY = 0;
  if (square) {
    const side = Math.min(srcW, srcH);
    cropW = side; cropH = side;
    cropX = Math.floor((srcW - side) / 2);
    cropY = Math.floor((srcH - side) / 2);
  }

  // Target size
  const scale = Math.min(1, maxSize / Math.max(cropW, cropH));
  const outW = Math.round(cropW * scale);
  const outH = Math.round(cropH * scale);

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas unsupported");

  // Soft warm background fill so transparent / odd-shaped photos blend
  ctx.fillStyle = "#FAF7F2";
  ctx.fillRect(0, 0, outW, outH);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, outW, outH);

  // Auto-enhance: stretch histogram + light contrast + tiny saturation lift.
  const imgData = ctx.getImageData(0, 0, outW, outH);
  enhance(imgData);
  ctx.putImageData(imgData, 0, 0);

  // Prefer WebP, fall back to JPEG.
  const webp = canvas.toDataURL("image/webp", quality);
  if (webp.startsWith("data:image/webp")) return webp;
  return canvas.toDataURL("image/jpeg", quality);
}

function fileToDataUrl(file: File): Promise<string> {
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

function enhance(imgData: ImageData) {
  const d = d2(imgData);
  // 1) Find 2nd/98th percentile luminance for histogram stretch
  const hist = new Uint32Array(256);
  for (let i = 0; i < d.length; i += 4) {
    const y = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000;
    hist[Math.round(y)]++;
  }
  const total = d.length / 4;
  let lo = 0, hi = 255, sum = 0;
  for (let i = 0; i < 256; i++) { sum += hist[i]; if (sum >= total * 0.02) { lo = i; break; } }
  sum = 0;
  for (let i = 255; i >= 0; i--) { sum += hist[i]; if (sum >= total * 0.02) { hi = i; break; } }
  if (hi - lo < 40) { lo = 0; hi = 255; } // skip stretch on flat images

  const range = hi - lo;
  const contrast = 1.06; // gentle
  const sat = 1.08;

  for (let i = 0; i < d.length; i += 4) {
    // stretch + contrast
    let r = clamp((d[i] - lo) * (255 / range));
    let g = clamp((d[i + 1] - lo) * (255 / range));
    let b = clamp((d[i + 2] - lo) * (255 / range));
    r = clamp((r - 128) * contrast + 128);
    g = clamp((g - 128) * contrast + 128);
    b = clamp((b - 128) * contrast + 128);
    // saturation around luminance
    const y = r * 0.299 + g * 0.587 + b * 0.114;
    r = clamp(y + (r - y) * sat);
    g = clamp(y + (g - y) * sat);
    b = clamp(y + (b - y) * sat);
    d[i] = r; d[i + 1] = g; d[i + 2] = b;
  }
}

const clamp = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);
const d2 = (i: ImageData) => i.data;
