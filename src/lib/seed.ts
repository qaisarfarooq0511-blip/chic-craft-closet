import type { Product, Review, HeroContent, CategoryRow, SectionRow, StaticPage } from "./types";
import { CATEGORIES, slugify, categorySlug } from "./types";

import imgPashmina from "@/assets/products/pashmina-ivory.jpg";
import imgChikankari from "@/assets/products/chikankari-ivory.jpg";
import imgEarrings from "@/assets/products/kundan-earrings.jpg";
import imgFrock from "@/assets/products/kids-frock.jpg";
import imgHairpins from "@/assets/products/hairpins.jpg";
import imgSozni from "@/assets/products/sozni-burgundy.jpg";
import imgBanarasi from "@/assets/products/banarasi-maroon.jpg";
import imgBangles from "@/assets/products/bangles-red.jpg";
import heroMain from "@/assets/hero-main.jpg";

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
    isUnstitched: false, pieces: 1,
    fabric: "Pure Pashmina", embroidery: "Sozni hand-done", care: "Dry clean only",
    items: [{ name: "Shawl", length: "200 cm", width: "75 cm", weight: "180 gsm" }],
    includes: ["1 × Pashmina shawl", "Yaawun branded gift box", "Care & wash instruction card", "Certificate of authenticity"],
    flags: ["featured", "trending"], tags: ["pashmina", "ivory"],
  },
  {
    id: 2, name: "Chikankari Unstitched Suit", subtitle: "Ivory — 3-piece set",
    category: "Dress Material", type: "Chikankari",
    price: 1199, was: 1599,
    badge: "New in", rating: 4.8, reviewsCount: 56,
    bg: "#E2D8EE",
    desc: "Delicate hand-done chikankari on premium cotton. Comes as an unstitched 3-piece set — top, bottom, and dupatta — ready to be tailored to your measurements.",
    isUnstitched: true, pieces: 3,
    fabric: "Pure cotton", embroidery: "Hand chikankari", care: "Hand wash cold",
    items: [
      { name: "Top (Kameez fabric)", length: "3.0 m", width: "1.0 m", weight: "80 gsm" },
      { name: "Bottom (Salwar fabric)", length: "2.0 m", width: "1.0 m", weight: "80 gsm" },
      { name: "Dupatta", length: "3.0 m", width: "1.0 m", weight: "60 gsm" },
    ],
    includes: ["Top fabric — 3 m × 1 m", "Bottom fabric — 2 m × 1 m", "Dupatta — 3 m × 1 m", "Yaawun branded packaging", "Care & wash instruction card"],
    note: "This is an unstitched set. Dimensions below show fabric cut lengths — take these to your tailor for stitching.",
    flags: ["featured", "new"], tags: ["chikankari", "cotton"],
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
    flags: ["featured"], tags: ["earrings", "kundan"],
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
    flags: ["featured"], tags: ["frock", "kids"],
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
    tags: ["hairpins"],
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
    flags: ["trending"], tags: ["sozni", "burgundy"],
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
    note: "Unstitched set. Take fabric pieces to your tailor for stitching.",
    flags: ["new"], tags: ["banarasi", "silk"],
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
    tags: ["bangles"],
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
    mainImageIndex: 0,
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
  { id: "r18", productId: 1, name: "Anonymous Visitor", location: "—", date: "Today", rating: 5, text: "Just received my shawl and it's gorgeous! Will write a longer review soon.", status: "pending" },
];

const eyebrowFor: Record<string, string> = {
  "Kashmiri Shawls": "New in",
  "Dress Material": "Trending",
  Kidswear: "Popular",
  Accessories: "Handpicked",
};

export const seedCategories: CategoryRow[] = CATEGORIES.map((c, i) => ({
  id: `cat-${i + 1}`,
  slug: categorySlug(c),
  name: c,
  label: eyebrowFor[c] ?? null,
  order: i,
  image: null,
}));

export const seedHero: HeroContent = {
  eyebrow: "New collection · Summer 2025",
  headline: "Where every\nthread carries\na story",
  sub: "Unstitched dress materials, Kashmiri shawls, kidswear & handpicked accessories — curated with care for the modern Indian woman.",
  ctaPrimary: { label: "Shop now", href: "/shop" },
  ctaSecondary: { label: "Explore shawls", href: `/shop/${categorySlug("Kashmiri Shawls")}` },
  images: {
    main: heroMain,
    smallLeft: imgSozni,
    smallRight: imgBanarasi,
  },
};

export const seedSections: SectionRow[] = [
  {
    id: "sec-featured",
    title: "Featured pieces",
    mode: "rule",
    rule: { type: "flag", value: "featured" },
    limit: 6,
    order: 0,
    visible: true,
  },
];

const now = Date.now();

const termsBody = `<p>Welcome to Yaawun. These Terms of Service ("Terms") govern your use of the website www.yaawun.com ("Site") and any purchases made through it. By accessing or using the Site, you agree to be bound by these Terms. If you do not agree, please do not use the Site.</p>

<h2>1. About Us</h2>
<p>Yaawun is a Kashmiri ethnic wear brand operated by Yaawun Textiles. Our registered office and contact details are as follows:</p>
<ul>
<li>Website: www.yaawun.com</li>
<li>Email: <a href="mailto:help@yaawun.com">help@yaawun.com</a></li>
</ul>

<h2>2. Eligibility</h2>
<p>You must be at least 18 years of age to use this Site or make a purchase. If you are under 18, you may only use the Site with the involvement and consent of a parent or legal guardian. By placing an order, you confirm that the information you provide is accurate and complete.</p>

<h2>3. Account Responsibility</h2>
<p>If you create an account on the Site, you are responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account. You agree to notify us immediately of any unauthorised use. Yaawun reserves the right to suspend or terminate accounts that violate these Terms or are used fraudulently.</p>

<h2>4. Products &amp; Descriptions</h2>
<p>We make every effort to display product colours, fabrics, and details as accurately as possible. However, slight variations may occur due to photography, lighting, screen settings, and the handcrafted nature of certain products. Such variations do not constitute a defect and are not grounds for return or exchange. Product availability is subject to change without notice. We reserve the right to limit the quantity of any product and to discontinue any product at any time.</p>

<h2>5. Pricing &amp; Payment</h2>
<p>All prices on the Site are listed in Indian Rupees (INR) and are inclusive of applicable GST unless stated otherwise.</p>
<p>We accept the following payment methods: Credit/Debit Cards (Visa, Mastercard, RuPay), UPI, Net Banking, Mobile Wallets, and Cash on Delivery (COD) where available.</p>
<p>While we take care to ensure pricing accuracy, errors may occur. In the event of a pricing error, we reserve the right to cancel the order and issue a full refund. Yaawun reserves the right to modify prices at any time without prior notice. Prices applicable at the time of order placement will be honoured for that order.</p>

<h2>6. Orders &amp; Confirmation</h2>
<p>Placing an order on the Site constitutes an offer to purchase. Order confirmation via email or SMS is an acknowledgement of your order, not acceptance. Acceptance occurs when the product is dispatched.</p>
<p>We reserve the right to refuse or cancel any order for reasons including but not limited to: product unavailability, pricing errors, suspected fraud, violation of these Terms, or limitations on quantities.</p>

<h2>7. Shipping &amp; Delivery</h2>
<p>We offer shipping across India. Estimated delivery timelines are indicative and may vary depending on your location, courier availability, and unforeseen circumstances.</p>
<p>Risk of loss and title for products pass to you upon delivery. Yaawun is not responsible for delays caused by courier partners, customs, natural disasters, strikes, or other events beyond our reasonable control.</p>
<p>Delivery is subject to pin code serviceability. If your location is unserviceable, we will notify you and process a refund if payment has been made.</p>

<h2>8. Exchange &amp; Return Policy</h2>
<p>We offer a 7-day exchange policy from the date of delivery. Exchanges are processed via store credit, which can be used to purchase any product on the Site.</p>
<p>To be eligible for exchange, items must be unused, unwashed, and in their original condition with all tags attached. Certain products such as innerwear, lingerie, and customised or altered items are not eligible for exchange. Cash refunds are not offered as standard policy. In exceptional circumstances, refunds may be processed at Yaawun's sole discretion. To initiate an exchange, you may use any of the following channels:</p>
<ul>
<li>WhatsApp: +91 99107 84574</li>
<li>Email: <a href="mailto:help@yaawun.com">help@yaawun.com</a></li>
</ul>
<p>For the complete Exchange and Return Policy, please refer to our dedicated policy page.</p>

<h2>9. Promotional Offers &amp; Discount Codes</h2>
<p>Discount codes and promotional offers are subject to specific terms and conditions mentioned at the time of the offer. Unless stated otherwise, offers cannot be combined, are non-transferable, have no cash value, and may be modified or withdrawn at any time. Misuse of promotional codes, including but not limited to multiple account creation, automated use, or sharing codes intended for specific customers, may result in order cancellation and account suspension.</p>

<h2>10. Intellectual Property</h2>
<p>All content on the Site — including but not limited to text, images, photographs, graphics, logos, icons, product designs, and software — is the property of Yaawun Textiles and is protected under applicable intellectual property laws. You may not reproduce, distribute, modify, display, or create derivative works from any content on the Site without our prior written consent. Unauthorised use may result in legal action.</p>

<h2>11. User Conduct</h2>
<p>When using the Site, you agree not to:</p>
<ul>
<li>Provide false or misleading information</li>
<li>Place fraudulent orders or use stolen payment methods</li>
<li>Abuse, threaten, or harass our staff or customer support team</li>
<li>Attempt to gain unauthorised access to any part of the Site</li>
<li>Use automated tools, bots, or scripts to scrape, crawl, or extract data</li>
<li>Interfere with the Site's functionality, security, or performance</li>
<li>Use the Site for any unlawful purpose</li>
</ul>
<p>Violation of these terms may result in immediate account termination and legal action where appropriate.</p>

<h2>12. Privacy</h2>
<p>Your use of the Site is also governed by our Privacy Policy, which describes how we collect, use, store, and protect your personal information. By using the Site, you consent to the practices described in the Privacy Policy.</p>

<h2>13. Third-Party Links &amp; Services</h2>
<p>The Site may contain links to third-party websites, services, or applications. These are provided for convenience only. Yaawun does not endorse, control, or assume responsibility for the content, privacy practices, or policies of any third-party sites. You access them at your own risk.</p>

<h2>14. Limitation of Liability</h2>
<p>To the maximum extent permitted by applicable law, Yaawun and its directors, officers, employees, and agents shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Site or purchase of products, including but not limited to loss of profits, data, or goodwill.</p>
<p>Our total liability for any claim arising from these Terms or your use of the Site shall not exceed the amount you paid for the specific product giving rise to the claim.</p>

<h2>15. Indemnification</h2>
<p>You agree to indemnify, defend, and hold harmless Yaawun, its directors, officers, employees, and agents from and against any claims, liabilities, damages, losses, costs, and expenses (including legal fees) arising from your use of the Site, violation of these Terms, or infringement of any rights of a third party.</p>

<h2>16. Force Majeure</h2>
<p>Yaawun shall not be liable for any failure or delay in performing its obligations where such failure or delay results from circumstances beyond its reasonable control, including but not limited to natural disasters, pandemics, government actions, war, civil unrest, strikes, power failures, or internet disruptions.</p>

<h2>17. Modifications to These Terms</h2>
<p>We reserve the right to update or modify these Terms at any time without prior notice. Changes will be effective immediately upon posting on the Site. Your continued use of the Site after any changes constitutes your acceptance of the revised Terms. We encourage you to review these Terms periodically.</p>

<h2>18. Severability</h2>
<p>If any provision of these Terms is found to be invalid, illegal, or unenforceable by a court of competent jurisdiction, the remaining provisions shall continue in full force and effect.</p>

<h2>19. Governing Law &amp; Jurisdiction</h2>
<p>These Terms are governed by and construed in accordance with the laws of India. Any disputes arising from these Terms or your use of the Site shall be subject to the exclusive jurisdiction of the courts in Srinagar, J &amp; K, India.</p>

<h2>20. Grievance Officer</h2>
<p>In accordance with the Information Technology Act, 2000 and the Consumer Protection (E-Commerce) Rules, 2020, the details of the Grievance Officer are as follows:</p>
<ul>
<li>Email: <a href="mailto:help@yaawun.com">help@yaawun.com</a></li>
<li>Response time: Within 5 business days</li>
</ul>

<h2>21. Contact Us</h2>
<p>If you have any questions or concerns about these Terms, please contact us:</p>
<p>Email: <a href="mailto:help@yaawun.com">help@yaawun.com</a></p>`;

const privacyBody = `<p><strong>Yaawun Fashions</strong> ("Yaawun", "we", "us", or "our") operates the website www.yaawun.com ("Site"). This Privacy Policy explains how we collect, use, store, share, and protect your personal information when you visit our Site, use our services, or make a purchase.</p>
<p>By using the Site, you consent to the practices described in this Privacy Policy. If you do not agree, please do not use the Site.</p>

<h2>1. Who We Are</h2>
<ul>
<li>Company Name: Yaawun Fashions</li>
<li>Website: www.yaawun.com</li>
<li>Email: <a href="mailto:help@yaawun.com">help@yaawun.com</a></li>
<li>WhatsApp: +91 99107 84574</li>
</ul>

<h2>2. Information We Collect</h2>

<h3>2.1 Information You Provide</h3>
<p>When you register, place an order, or interact with us, we may collect:</p>
<ul>
<li>Full name</li>
<li>Phone number</li>
<li>Shipping and billing address</li>
<li>Payment information (processed securely via third-party payment gateways — we do not store your card details)</li>
<li>Order history and preferences</li>
<li>Communications you send to us (emails, chat messages, reviews, feedback)</li>
</ul>

<h3>2.2 Information Collected Automatically</h3>
<p>When you browse the Site, we may automatically collect:</p>
<ul>
<li>IP address</li>
<li>Device type, browser type, and operating system</li>
<li>Pages visited, time spent, and navigation path</li>
<li>Referring website or link that brought you to our Site</li>
<li>Location data (approximate, based on IP address)</li>
</ul>

<h3>2.3 Cookies and Tracking Technologies</h3>
<p>We use cookies and similar technologies to:</p>
<ul>
<li>Keep your shopping cart active across sessions</li>
<li>Remember your preferences and login details</li>
<li>Analyse site traffic and user behaviour</li>
<li>Deliver relevant advertisements and offers</li>
</ul>
<p>You can manage cookie preferences through your browser settings. Disabling cookies may affect some features of the Site.</p>

<h2>3. How We Use Your Information</h2>
<p>We use your personal information for the following purposes:</p>
<ul>
<li>To process and fulfil your orders, including shipping and delivery</li>
<li>To communicate with you about your orders, account, and enquiries</li>
<li>To send promotional emails, SMS, and WhatsApp messages about offers, new arrivals, and updates (you can opt out at any time)</li>
<li>To personalise your shopping experience and recommend products</li>
<li>To improve our Site, services, and product offerings</li>
<li>To detect and prevent fraud, abuse, and security threats</li>
<li>To comply with legal obligations and resolve disputes</li>
<li>To conduct internal analytics and business research</li>
</ul>

<h2>4. How We Share Your Information</h2>
<p>We do <strong>not</strong> sell or rent your personal information to third parties for their marketing purposes.</p>
<p>We may share your information with:</p>
<ul>
<li><strong>Service Providers:</strong> Courier and logistics partners, payment gateways, SMS/email service providers, cloud hosting providers, and analytics tools — strictly on a need-to-know basis and only to fulfil our services to you.</li>
<li><strong>Legal Authorities:</strong> When required by law, court order, or government request, or when we believe disclosure is necessary to protect our rights, your safety, or the safety of others.</li>
<li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of the business. We will notify you of any such change.</li>
</ul>

<h2>5. Data Security</h2>
<p>We implement industry-standard security measures to protect your personal information, including:</p>
<ul>
<li>SSL encryption for all data transmission</li>
<li>Secure payment processing through PCI-DSS compliant payment gateways</li>
<li>Access controls limiting employee access to personal data on a need-to-know basis</li>
<li>Regular security audits and monitoring</li>
</ul>
<p>While we take every reasonable precaution, no method of internet transmission or electronic storage is completely secure. We cannot guarantee absolute security of your data.</p>

<h2>6. Data Retention</h2>
<p>We retain your personal information for as long as necessary to:</p>
<ul>
<li>Fulfil the purposes described in this Privacy Policy</li>
<li>Comply with legal and regulatory requirements</li>
<li>Resolve disputes and enforce our agreements</li>
</ul>
<p>If you request deletion of your account, we will remove your personal data within a reasonable timeframe, except where retention is required by law (e.g., tax and accounting records).</p>

<h2>7. Your Rights</h2>
<p>Under applicable Indian law, including the Digital Personal Data Protection Act, 2023 (DPDPA), you have the right to:</p>
<ul>
<li><strong>Access:</strong> Request a summary of the personal data we hold about you.</li>
<li><strong>Correction:</strong> Request correction of inaccurate or incomplete personal data.</li>
<li><strong>Erasure:</strong> Request deletion of your personal data, subject to legal obligations.</li>
<li><strong>Withdraw Consent:</strong> Withdraw your consent for data processing at any time. This will not affect the lawfulness of processing carried out before withdrawal.</li>
<li><strong>Grievance Redressal:</strong> Lodge a complaint with us or the relevant Data Protection Board if you believe your rights have been violated.</li>
<li><strong>Opt Out of Marketing:</strong> Unsubscribe from promotional communications at any time by clicking the unsubscribe link in our emails or contacting us.</li>
</ul>
<p>To exercise any of these rights, please contact us at <a href="mailto:help@yaawun.com">help@yaawun.com</a>.</p>

<h2>8. Children's Privacy</h2>
<p>The Site is not intended for use by individuals under the age of 18 without parental or guardian consent. We do not knowingly collect personal information from children under 18. If you are a parent or guardian and believe your child has provided us with personal data, please contact us and we will take steps to delete such information.</p>

<h2>9. Third-Party Links</h2>
<p>Our Site may contain links to third-party websites, social media platforms, and services. This Privacy Policy applies only to our Site. We are not responsible for the privacy practices of third-party sites. We encourage you to read the privacy policies of any third-party site you visit.</p>

<h2>10. Cookies Policy</h2>
<table>
<tr><th>Cookie Type</th><th>Purpose</th><th>Duration</th></tr>
<tr><td>Essential</td><td>Site functionality, shopping cart, login sessions</td><td>Session / 30 days</td></tr>
<tr><td>Analytics</td><td>Understanding site usage and improving performance</td><td>Up to 2 years</td></tr>
<tr><td>Marketing</td><td>Delivering relevant ads and measuring campaign effectiveness</td><td>Up to 1 year</td></tr>
<tr><td>Preference</td><td>Remembering your settings and preferences</td><td>Up to 1 year</td></tr>
</table>
<p>You can control cookies through your browser settings. Note that blocking essential cookies may prevent you from using certain features of the Site.</p>

<h2>11. Changes to This Privacy Policy</h2>
<p>We may update this Privacy Policy from time to time to reflect changes in our practices, technology, or legal requirements. Any changes will be posted on this page with an updated "Last updated" date. Your continued use of the Site after changes are posted constitutes your acceptance of the revised Privacy Policy.</p>
<p>We encourage you to review this Privacy Policy periodically.</p>

<h2>12. Grievance Officer</h2>
<p>In accordance with the Information Technology Act, 2000, the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, and the Digital Personal Data Protection Act, 2023, the details of our Grievance Officer are:</p>
<ul>
<li>Email: <a href="mailto:help@yaawun.com">help@yaawun.com</a></li>
<li>Response Time: Within 5 business days</li>
<li>Resolution Time: Within 30 days of receiving the complaint</li>
</ul>

<h2>13. Contact Us</h2>
<p>If you have any questions, concerns, or requests regarding this Privacy Policy or your personal data, please contact us:</p>
<ul>
<li>Email: <a href="mailto:help@yaawun.com">help@yaawun.com</a></li>
<li>WhatsApp: +91 99107 84574</li>
<li>Website: <a href="https://www.yaawun.com">www.yaawun.com</a></li>
</ul>`;

const returnsBody = `<p>We believe in satisfying and delighting our customers with the best possible products at the best value. To maintain an efficient and transparent process for our community, <strong>Yaawun operates on an Exchange-Only policy.</strong> We do not offer returns or standard refunds.</p>
<p>Under specific circumstances outlined below, we are happy to facilitate an exchange to ensure you get the perfect item.</p>

<h2>1. Damaged, Defective, or Wrong Items Delivered</h2>
<p>At Yaawun, every product undergoes a strict quality check before shipping. However, if a manual error occurs and you receive a product that is damaged, defective, or incorrect:</p>
<p><strong>What to do:</strong> Please email us at <a href="mailto:help@yaawun.com">help@yaawun.com</a> within <strong>7 days of delivery</strong> with your order number and a few clear pictures of the issue.</p>
<p><strong>Our Resolution:</strong> We will promptly arrange for a replacement of the exact same item.</p>
<p><strong>Discretionary Refunds:</strong> In rare cases where the relevant replacement item is out of stock or completely unavailable, Yaawun may, at its sole discretion, issue a refund or store credit.</p>

<h2>2. Sizing Issues</h2>
<p>If your item does not fit perfectly, we are happy to help you exchange it for a different size of the same style.</p>
<p><strong>What to do:</strong> Email us at <a href="mailto:help@yaawun.com">help@yaawun.com</a> within <strong>7 days of delivery</strong> with your order number and the size you need.</p>
<p><strong>The Process:</strong> We will provide a return packing slip and arrange a pickup within 48–72 hours.</p>
<p><strong>Note:</strong> If reverse pickup is unavailable at your pincode, we kindly ask you to ship the package back to us, and we will reimburse up to INR 100/- for courier charges.</p>
<p><strong>Resolution:</strong> Once the original item is received and inspected at our warehouse, your replacement size will be shipped out to you.</p>

<h2>3. Clearance &amp; Sale Items</h2>
<p>Items sold under a "Clearance Sale" or marked at a reduced promotional price are considered <strong>Final Sale</strong>. These items are <strong>not eligible for exchanges, replacements, or resizing</strong> under any circumstances.</p>

<h2>4. Beads and Sequins Policy</h2>
<p>We hope our customers understand that garments featuring intricate beadwork and sequins have a natural tendency to shift or come off. This can happen during shipping despite our best efforts. Most minor shifts can be easily adjusted during stitching or by a local tailor. Because a replacement item will carry the same delicate characteristics, <strong>we do not offer exchanges for minor bead or sequin displacement</strong>. We kindly ask that you consult your tailor before requesting an exchange.</p>`;

export const seedPages: StaticPage[] = [
  {
    slug: "about-us",
    title: "About Us",
    order: 0,
    updatedAt: now,
    body: `<p>Yaawun began as a small neighbourhood store curating fabrics, shawls, kidswear and accessories for the women of our community.</p>

<p>Every piece is chosen by hand, photographed by hand and packed by hand. We launched online so the same care could reach women across India.</p>
<h2>Our promise</h2>
<p>Quality fabrics, fair prices and personal service — the way our regulars have known us for years.</p>`,
  },
  {
    slug: "terms-of-use",
    title: "Terms of Use",
    order: 1,
    updatedAt: now,
    body: termsBody,
  },
  {
    slug: "privacy-policy",
    title: "Privacy Policy",
    order: 2,
    updatedAt: now,
    body: privacyBody,
  },
  {
    slug: "terms-and-conditions",
    title: "Terms & Conditions",
    order: 3,
    updatedAt: now,
    body: termsBody,
  },
  {
    slug: "returns-refunds-cancellation",
    title: "Returns, Refunds & Cancellation",
    order: 4,
    updatedAt: now,
    body: returnsBody,
  },
  {
    slug: "faqs",
    title: "FAQ's",
    order: 5,
    updatedAt: now,
    body: `<h2>How do I place an order?</h2>
<p>Add items to your bag and complete checkout. You'll receive a WhatsApp confirmation from our team.</p>
<h2>Do you offer Cash on Delivery?</h2>
<p>Yes, COD is available across most of India.</p>
<h2>How long does delivery take?</h2>
<p>Typically 4–7 working days depending on your location.</p>
<h2>Can I exchange a size?</h2>
<p>Yes — please contact us within 7 days of delivery and we'll help arrange an exchange where possible.</p>`,
  },
];
