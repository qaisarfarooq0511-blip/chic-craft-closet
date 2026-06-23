import type { Product, Review } from "./types";
import { slugify } from "./types";

import imgPashmina from "@/assets/products/pashmina-ivory.jpg";
import imgChikankari from "@/assets/products/chikankari-ivory.jpg";
import imgEarrings from "@/assets/products/kundan-earrings.jpg";
import imgFrock from "@/assets/products/kids-frock.jpg";
import imgHairpins from "@/assets/products/hairpins.jpg";
import imgSozni from "@/assets/products/sozni-burgundy.jpg";
import imgBanarasi from "@/assets/products/banarasi-maroon.jpg";
import imgBangles from "@/assets/products/bangles-red.jpg";

const PRODUCT_IMAGES: Record<number, string> = {
  1: imgPashmina,
  2: imgChikankari,
  3: imgEarrings,
  4: imgFrock,
  5: imgHairpins,
  6: imgSozni,
  7: imgBanarasi,
  8: imgBangles,
};


const baseProducts: Omit<Product, "slug" | "stock" | "listed" | "images" | "createdAt">[] = [
  {
    id: 1, name: "Pashmina Weave Shawl", subtitle: "Ivory & Antique Gold",
    category: "Kashmiri Shawls", type: "Pashmina",
    price: 2499, was: 3100,
    badge: "Bestseller", rating: 4.4, reviewsCount: 128,
    bg: "#EEE5D8",
    desc: "Handwoven in Kashmir, this lightweight pashmina shawl features an ivory base with antique gold border embroidery. Suitable for everyday wear and weddings alike.",
    isUnstitched: false,
    pieces: 1,
    fabric: "Pure Pashmina", embroidery: "Sozni hand-done", care: "Dry clean only",
    items: [{ name: "Shawl", length: "200 cm", width: "75 cm", weight: "180 gsm" }],
    includes: ["1 × Pashmina shawl", "Yaawun branded gift box", "Care & wash instruction card", "Certificate of authenticity"],
  },
  {
    id: 2, name: "Chikankari Unstitched Suit", subtitle: "Ivory — 3-piece set",
    category: "Dress Material", type: "Chikankari",
    price: 1199, was: 1599,
    badge: "New in", rating: 4.8, reviewsCount: 56,
    bg: "#E2D8EE",
    desc: "Delicate hand-done chikankari on premium cotton. Comes as an unstitched 3-piece set — top, bottom, and dupatta — ready to be tailored to your measurements.",
    isUnstitched: true,
    pieces: 3,
    fabric: "Pure cotton", embroidery: "Hand chikankari", care: "Hand wash cold",
    items: [
      { name: "Top (Kameez fabric)", length: "3.0 m", width: "1.0 m", weight: "80 gsm" },
      { name: "Bottom (Salwar fabric)", length: "2.0 m", width: "1.0 m", weight: "80 gsm" },
      { name: "Dupatta", length: "3.0 m", width: "1.0 m", weight: "60 gsm" },
    ],
    includes: ["Top fabric — 3 m × 1 m", "Bottom fabric — 2 m × 1 m", "Dupatta — 3 m × 1 m", "Yaawun branded packaging", "Care & wash instruction card"],
  },
  {
    id: 3, name: "Kundan Drop Earrings", subtitle: "Antique Gold Finish",
    category: "Accessories", type: "Earrings",
    price: 349, was: null,
    badge: null, rating: 4.3, reviewsCount: 41,
    bg: "#D8EEE5",
    desc: "Statement kundan earrings with an antique gold finish. Lightweight despite their bold look — perfect for festive occasions and everyday wear.",
    isUnstitched: false, pieces: 1,
    fabric: "Brass base", embroidery: "Kundan setting", care: "Avoid moisture",
    items: [{ name: "Earring pair", length: "6 cm", width: "2.5 cm", weight: "18 g each" }],
    includes: ["1 × Pair of earrings", "Yaawun jewellery pouch", "Anti-tarnish storage bag"],
  },
  {
    id: 4, name: "Embroidered Frock", subtitle: "Floral — 4–8 yrs",
    category: "Kidswear", type: "Frock",
    price: 599, was: 799,
    badge: "Sale", rating: 4.6, reviewsCount: 33,
    bg: "#EED8D8",
    desc: "A delightful floral embroidered frock for girls aged 4–8. Soft cotton fabric with breathable construction — perfect for summer wear and festive occasions.",
    isUnstitched: false, pieces: 1,
    fabric: "Soft cotton", embroidery: "Machine floral", care: "Machine wash 30°C",
    items: [{ name: "Frock", length: "60–75 cm (age dependent)", width: "As per size chart", weight: "220 gsm" }],
    includes: ["1 × Embroidered frock", "Yaawun gift wrap", "Size & care card"],
  },
  {
    id: 5, name: "Silk Thread Hairpin Set", subtitle: "6-piece assorted",
    category: "Accessories", type: "Hairpins",
    price: 199, was: null,
    badge: null, rating: 4.1, reviewsCount: 19,
    bg: "#D8E5EE",
    desc: "A set of 6 silk thread hairpins in assorted colours. Handwrapped with fine silk thread, these add a delicate, ethnic touch to any hairstyle.",
    isUnstitched: false, pieces: 1,
    fabric: "Silk thread on metal", embroidery: "Hand-wrapped", care: "Keep dry",
    items: [{ name: "Hairpin set (6 pcs)", length: "7 cm each", width: "0.8 cm", weight: "12 g set" }],
    includes: ["6 × Silk thread hairpins (assorted)", "Organza gift pouch"],
  },
  {
    id: 6, name: "Sozni Hand-embroidered Wrap", subtitle: "Deep burgundy",
    category: "Kashmiri Shawls", type: "Sozni",
    price: 3799, was: null,
    badge: "Limited", rating: 4.9, reviewsCount: 22,
    bg: "#EEE8D8",
    desc: "An heirloom-quality wrap featuring fine sozni hand-embroidery worked entirely by artisans in the Kashmir Valley. Each piece is unique — slight variations in the embroidery are natural and add to its character.",
    isUnstitched: false, pieces: 1,
    fabric: "Pashmina wool blend", embroidery: "Sozni needle embroidery", care: "Dry clean only",
    items: [{ name: "Embroidered wrap", length: "210 cm", width: "80 cm", weight: "240 gsm" }],
    includes: ["1 × Sozni embroidered wrap", "Yaawun luxury gift box", "Artisan certificate", "Care instruction card"],
  },
  {
    id: 7, name: "Banarasi Silk Suit", subtitle: "Gold & Maroon — unstitched",
    category: "Dress Material", type: "Banarasi",
    price: 2299, was: 2999,
    badge: "New in", rating: 4.5, reviewsCount: 18,
    bg: "#EEE2D0",
    desc: "A rich Banarasi silk unstitched suit in classic gold and maroon. Features zari weaving throughout and comes as a 3-piece set ready for your tailor.",
    isUnstitched: true, pieces: 3,
    fabric: "Banarasi silk", embroidery: "Zari weaving", care: "Dry clean only",
    items: [
      { name: "Top (Kameez fabric)", length: "3.0 m", width: "1.0 m", weight: "120 gsm" },
      { name: "Bottom (Salwar fabric)", length: "2.5 m", width: "1.0 m", weight: "100 gsm" },
      { name: "Dupatta", length: "2.5 m", width: "0.9 m", weight: "90 gsm" },
    ],
    includes: ["Top fabric — 3 m × 1 m", "Bottom fabric — 2.5 m × 1 m", "Dupatta — 2.5 m × 0.9 m", "Yaawun branded packaging", "Care & wash instruction card"],
  },
  {
    id: 8, name: "Glass Bangle Set", subtitle: "Ruby red — 12 piece",
    category: "Accessories", type: "Bangles",
    price: 149, was: null,
    badge: null, rating: 4.0, reviewsCount: 62,
    bg: "#EED8D8",
    desc: "A vibrant set of 12 hand-blown glass bangles in rich ruby red. Available in sizes 2.4, 2.6, 2.8, and 2.10. A staple for every occasion.",
    isUnstitched: false, pieces: 1,
    fabric: "Hand-blown glass", embroidery: "Gold trim", care: "Handle with care",
    items: [{ name: "Bangle set (12 pcs)", length: "Inner dia: 2.6\"", width: "0.5 cm width", weight: "90 g set" }],
    includes: ["12 × Glass bangles", "Protective cotton roll packaging"],
  },
];

export const seedProducts: Product[] = baseProducts.map((p, i) => {
  const img = PRODUCT_IMAGES[p.id];
  return {
    ...p,
    slug: `${slugify(p.name)}-${p.id}`,
    stock: [12, 18, 30, 22, 40, 5, 14, 60][i] ?? 10,
    listed: true,
    images: img ? [img] : [],
    createdAt: Date.now() - (baseProducts.length - i) * 86400_000,
  };
});

export const seedReviews: Review[] = [
  { id: "r1", productId: 1, name: "Aisha K.", location: "Delhi", date: "12 Jun 2025", rating: 5, text: "Absolutely beautiful quality. The embroidery is so delicate and the fabric is incredibly soft. Gifted this to my mother — she was overjoyed.", status: "approved" },
  { id: "r2", productId: 1, name: "Sana M.", location: "Mumbai", date: "3 Jun 2025", rating: 4, text: "Lovely shawl, very well packaged. The gift box was a nice touch. Fabric feels premium.", status: "approved" },
  { id: "r3", productId: 1, name: "Noor F.", location: "Lucknow", date: "28 May 2025", rating: 5, text: "Ordered for Eid and it arrived beautifully wrapped. The ivory and gold combination is very elegant.", status: "approved" },
  { id: "r4", productId: 1, name: "Razia B.", location: "Hyderabad", date: "15 May 2025", rating: 4, text: "Good quality shawl. The dimensions are accurate — 200×75 is a generous size. My only suggestion would be more colour options.", status: "approved" },
  { id: "r5", productId: 2, name: "Fatima S.", location: "Lucknow", date: "8 Jun 2025", rating: 5, text: "Perfect fabric for summer. The chikankari work is intricate and the colour is exactly as shown. Very happy.", status: "approved" },
  { id: "r6", productId: 2, name: "Amina R.", location: "Delhi", date: "1 Jun 2025", rating: 5, text: "Got it stitched at my local tailor — turned out gorgeous. The 3 metres for the top is very generous.", status: "approved" },
  { id: "r7", productId: 2, name: "Shabana K.", location: "Kanpur", date: "20 May 2025", rating: 4, text: "Good quality fabric. Delivery was prompt. Would recommend for anyone who loves chikankari.", status: "approved" },
  { id: "r8", productId: 2, name: "Hina M.", location: "Lucknow", date: "10 May 2025", rating: 5, text: "This is my second order. The quality is consistently excellent and the packaging is always neat.", status: "approved" },
  { id: "r9", productId: 3, name: "Zara N.", location: "Ghaziabad", date: "5 Jun 2025", rating: 4, text: "Very pretty earrings. Lightweight so comfortable to wear all day. The gold finish is rich-looking.", status: "approved" },
  { id: "r10", productId: 3, name: "Mehak J.", location: "Noida", date: "28 May 2025", rating: 5, text: "Perfect for my niece's wedding. They complement ethnic wear beautifully and the packaging was lovely.", status: "approved" },
  { id: "r11", productId: 4, name: "Priya K.", location: "Delhi", date: "10 Jun 2025", rating: 5, text: "My daughter refuses to take it off! Beautiful embroidery and the fabric is really soft. Will order more sizes.", status: "approved" },
  { id: "r12", productId: 4, name: "Naila H.", location: "Lucknow", date: "2 Jun 2025", rating: 5, text: "Perfect for Eid. The frock is exactly as pictured and the quality is great for the price.", status: "approved" },
  { id: "r13", productId: 6, name: "Yasmin A.", location: "Srinagar", date: "14 Jun 2025", rating: 5, text: "This is the most beautiful piece I own. The embroidery is extraordinary — you can see the hours of work in every stitch.", status: "approved" },
  { id: "r14", productId: 6, name: "Bushra R.", location: "Delhi", date: "5 Jun 2025", rating: 5, text: "Worth every rupee. Gifted to my mother for her anniversary and she was in tears. A true heirloom.", status: "approved" },
  { id: "r15", productId: 7, name: "Sobia N.", location: "Varanasi", date: "11 Jun 2025", rating: 5, text: "Got this stitched for my cousin's wedding. The silk quality is superb and the zari work is absolutely gorgeous.", status: "approved" },
  { id: "r16", productId: 8, name: "Maryam S.", location: "Mumbai", date: "9 Jun 2025", rating: 4, text: "Beautiful colour. The glass quality is good and none arrived broken thanks to the cotton packaging.", status: "approved" },
  { id: "r17", productId: 5, name: "Layla M.", location: "Delhi", date: "8 Jun 2025", rating: 4, text: "Very pretty set. The colours are vibrant and the thread work is neat. Great value.", status: "approved" },
  // a pending one to demo moderation
  { id: "r18", productId: 1, name: "Anonymous Visitor", location: "—", date: "Today", rating: 5, text: "Just received my shawl and it's gorgeous! Will write a longer review soon.", status: "pending" },
];
