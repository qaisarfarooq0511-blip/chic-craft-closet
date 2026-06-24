import type { Product, Review } from "./types";

export const SITE_URL = "https://yaawun.com";

export const abs = (path: string) => {
  if (!path) return SITE_URL;
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
};

export const STORE = {
  name: "Yaawun",
  tagline: "Crafted with care",
  description:
    "Yaawun curates unstitched dress materials, Kashmiri shawls, kidswear and handpicked accessories for the modern Indian woman.",
  email: "{{STORE_EMAIL}}",
  phone: "{{STORE_PHONE}}",
  whatsapp: "{{STORE_WHATSAPP}}",
  logo: abs("/favicon.ico"),
  sameAs: [
    "https://www.instagram.com/yaawun",
    "https://www.facebook.com/yaawun",
  ],
  address: {
    street: "{{STORE_STREET}}",
    locality: "{{STORE_CITY}}",
    region: "{{STORE_STATE}}",
    postalCode: "{{STORE_PIN}}",
    country: "IN",
  },
  hours: "Mo-Su 10:00-20:00",
};

// Sitewide Organization — used for entity grounding by AI engines.
export const organizationLd = () => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: STORE.name,
  url: SITE_URL,
  logo: STORE.logo,
  description: STORE.description,
  email: STORE.email,
  telephone: STORE.phone,
  sameAs: STORE.sameAs,
  address: {
    "@type": "PostalAddress",
    streetAddress: STORE.address.street,
    addressLocality: STORE.address.locality,
    addressRegion: STORE.address.region,
    postalCode: STORE.address.postalCode,
    addressCountry: STORE.address.country,
  },
  contactPoint: [
    {
      "@type": "ContactPoint",
      contactType: "customer support",
      telephone: STORE.phone,
      email: STORE.email,
      areaServed: "IN",
      availableLanguage: ["English", "Hindi"],
    },
  ],
});

// Local store presence — separate node so it doesn't collide with the
// brand-level Organization above.
export const localBusinessLd = () => ({
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": `${SITE_URL}/#localbusiness`,
  name: STORE.name,
  url: SITE_URL,
  image: STORE.logo,
  description: STORE.description,
  telephone: STORE.phone,
  email: STORE.email,
  priceRange: "₹₹",
  openingHours: STORE.hours,
  address: {
    "@type": "PostalAddress",
    streetAddress: STORE.address.street,
    addressLocality: STORE.address.locality,
    addressRegion: STORE.address.region,
    postalCode: STORE.address.postalCode,
    addressCountry: STORE.address.country,
  },
});

export const websiteLd = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  name: STORE.name,
  url: SITE_URL,
  description: STORE.description,
  publisher: { "@id": `${SITE_URL}/#organization` },
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE_URL}/shop?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
});

export const productLd = (p: Product, reviews: Review[]) => {
  const url = abs(`/product/${p.slug}`);
  const inStock = p.stock > 0 && p.listed;
  // priceValidUntil ~1 year out — required by Google for Offer best-practice.
  const validUntil = new Date(Date.now() + 365 * 24 * 3600 * 1000)
    .toISOString()
    .slice(0, 10);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${p.name}${p.subtitle ? " — " + p.subtitle : ""}`,
    description: p.desc,
    sku: `YWN-${p.id}`,
    mpn: `YWN-${p.id}`,
    category: p.category,
    brand: { "@type": "Brand", name: STORE.name },
    image: p.images.length ? p.images.map(abs) : undefined,
    material: p.fabric || undefined,
    url,
    offers: {
      "@type": "Offer",
      price: p.price,
      priceCurrency: "INR",
      availability: inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      url,
      priceValidUntil: validUntil,
      seller: { "@id": `${SITE_URL}/#organization` },
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "IN",
        returnPolicyCategory:
          "https://schema.org/MerchantReturnFiniteReturnWindow",
        merchantReturnDays: 7,
        returnMethod: "https://schema.org/ReturnByMail",
        returnFees: "https://schema.org/FreeReturn",
      },
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingRate: {
          "@type": "MonetaryAmount",
          value: p.price >= 999 ? 0 : 99,
          currency: "INR",
        },
        shippingDestination: {
          "@type": "DefinedRegion",
          addressCountry: "IN",
        },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          handlingTime: { "@type": "QuantitativeValue", minValue: 1, maxValue: 2, unitCode: "DAY" },
          transitTime: { "@type": "QuantitativeValue", minValue: 3, maxValue: 7, unitCode: "DAY" },
        },
      },
    },
    aggregateRating:
      reviews.length > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: p.rating,
            reviewCount: p.reviewsCount,
            bestRating: 5,
            worstRating: 1,
          }
        : undefined,
    review: reviews.slice(0, 5).map((r) => ({
      "@type": "Review",
      author: { "@type": "Person", name: r.name },
      datePublished: r.date,
      reviewBody: r.text,
      reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 },
    })),
  };
};

export const breadcrumbLd = (items: { name: string; url: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((it, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: it.name,
    item: abs(it.url),
  })),
});

export const itemListLd = (products: Product[]) => ({
  "@context": "https://schema.org",
  "@type": "ItemList",
  numberOfItems: products.length,
  itemListElement: products.map((p, i) => ({
    "@type": "ListItem",
    position: i + 1,
    url: abs(`/product/${p.slug}`),
    name: p.name,
  })),
});

export const collectionPageLd = (opts: {
  name: string;
  description: string;
  url: string;
  products: Product[];
}) => ({
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: opts.name,
  description: opts.description,
  url: abs(opts.url),
  isPartOf: { "@id": `${SITE_URL}/#website` },
  mainEntity: itemListLd(opts.products),
});

export const aboutPageLd = (description: string) => ({
  "@context": "https://schema.org",
  "@type": "AboutPage",
  name: `About ${STORE.name}`,
  description,
  url: abs("/about"),
  about: { "@id": `${SITE_URL}/#organization` },
});

export const contactPageLd = () => ({
  "@context": "https://schema.org",
  "@type": "ContactPage",
  name: `Contact ${STORE.name}`,
  url: abs("/contact"),
  about: { "@id": `${SITE_URL}/#organization` },
});

export const faqPageLd = (qa: { q: string; a: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: qa.map((x) => ({
    "@type": "Question",
    name: x.q,
    acceptedAnswer: { "@type": "Answer", text: x.a },
  })),
});
