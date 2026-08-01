import type { Product, ProductImage, Category } from "@/types/database";
import { productImageUrl } from "@/lib/product-images";

export const SITE_URL = "https://yaawun.in";

export const abs = (path: string) => {
  if (!path) return SITE_URL;
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
};

// Fields with no real value yet (email, phone, street address) are omitted
// entirely rather than filled with placeholder text — this store previously
// shipped literal "{{STORE_EMAIL}}"-style template markers into live JSON-LD.
export const STORE = {
  name: "Yaawun",
  tagline: "Crafted with care",
  description:
    "Yaawun curates unstitched dress materials, Kashmiri shawls, kidswear and handpicked accessories for the modern Indian woman.",
  logo: abs("/icon-512.png"), // placeholder — no dedicated logo asset yet
  sameAs: ["https://www.instagram.com/yaawun", "https://www.facebook.com/yaawun"],
};

export const organizationLd = () => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: STORE.name,
  url: SITE_URL,
  logo: STORE.logo,
  description: STORE.description,
  sameAs: STORE.sameAs,
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

// No dedicated OG/placeholder asset exists yet — icon-512.png is the closest
// real, existing square brand image to fall back to.
const NO_IMAGE_PLACEHOLDER = abs("/icon-512.png");

export const productLd = (p: Product & { images: ProductImage[]; category?: Category | null }) => {
  const url = abs(`/product/${p.slug}`);
  const primaryImage = p.images.find((i) => i.is_primary) ?? p.images[0];
  const image = primaryImage
    ? (productImageUrl(primaryImage) ?? NO_IMAGE_PLACEHOLDER)
    : NO_IMAGE_PLACEHOLDER;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.meta_description || p.description || undefined,
    image: [image],
    sku: p.id,
    category: p.category?.name,
    url,
    offers: {
      "@type": "Offer",
      price: p.price / 100, // paise -> rupees
      priceCurrency: "INR",
      availability:
        p.stock_count > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url,
    },
    ...(p.rating_count > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: p.rating_avg,
            reviewCount: p.rating_count,
          },
        }
      : {}),
  };
};
