import type { Product, Review } from "./types";

export const STORE = {
  name: "Yaawun",
  tagline: "Crafted with care",
  description:
    "Yaawun curates unstitched dress materials, Kashmiri shawls, kidswear and handpicked accessories for the modern Indian woman.",
  email: "{{STORE_EMAIL}}",
  phone: "{{STORE_PHONE}}",
  whatsapp: "{{STORE_WHATSAPP}}",
  address: {
    street: "{{STORE_STREET}}",
    locality: "{{STORE_CITY}}",
    region: "{{STORE_STATE}}",
    postalCode: "{{STORE_PIN}}",
    country: "IN",
  },
  hours: "Mo-Su 10:00-20:00",
};

export const organizationLd = () => ({
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: STORE.name,
  description: STORE.description,
  telephone: STORE.phone,
  email: STORE.email,
  address: {
    "@type": "PostalAddress",
    streetAddress: STORE.address.street,
    addressLocality: STORE.address.locality,
    addressRegion: STORE.address.region,
    postalCode: STORE.address.postalCode,
    addressCountry: STORE.address.country,
  },
  openingHours: STORE.hours,
  priceRange: "₹₹",
});

export const websiteLd = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: STORE.name,
  potentialAction: {
    "@type": "SearchAction",
    target: "/shop?q={search_term_string}",
    "query-input": "required name=search_term_string",
  },
});

export const productLd = (p: Product, reviews: Review[]) => ({
  "@context": "https://schema.org",
  "@type": "Product",
  name: `${p.name}${p.subtitle ? " — " + p.subtitle : ""}`,
  description: p.desc,
  sku: `YWN-${p.id}`,
  category: p.category,
  brand: { "@type": "Brand", name: STORE.name },
  image: p.images.length ? p.images : undefined,
  offers: {
    "@type": "Offer",
    price: p.price,
    priceCurrency: "INR",
    availability:
      p.stock > 0 && p.listed
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    url: `/product/${p.slug}`,
  },
  aggregateRating:
    reviews.length > 0
      ? {
          "@type": "AggregateRating",
          ratingValue: p.rating,
          reviewCount: p.reviewsCount,
        }
      : undefined,
  review: reviews.slice(0, 5).map((r) => ({
    "@type": "Review",
    author: { "@type": "Person", name: r.name },
    datePublished: r.date,
    reviewBody: r.text,
    reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 },
  })),
});

export const breadcrumbLd = (items: { name: string; url: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((it, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: it.name,
    item: it.url,
  })),
});

export const itemListLd = (products: Product[]) => ({
  "@context": "https://schema.org",
  "@type": "ItemList",
  itemListElement: products.map((p, i) => ({
    "@type": "ListItem",
    position: i + 1,
    url: `/product/${p.slug}`,
    name: p.name,
  })),
});
