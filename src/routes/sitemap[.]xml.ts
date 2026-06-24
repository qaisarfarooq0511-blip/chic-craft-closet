import { createFileRoute } from "@tanstack/react-router";
import { getProducts } from "@/lib/storage";
import { seedProducts } from "@/lib/seed";
import { CATEGORIES, categorySlug } from "@/lib/types";

interface Entry { path: string; lastmod?: string; changefreq?: string; priority?: string }

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const BASE_URL = "https://yaawun.com";
        // SSR-safe product list: localStorage unavailable, fall back to seed.
        const products = typeof window !== "undefined" ? getProducts() : seedProducts;
        const entries: Entry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/shop", changefreq: "daily", priority: "0.9" },
          { path: "/about", changefreq: "monthly", priority: "0.6" },
          { path: "/contact", changefreq: "monthly", priority: "0.6" },
          ...CATEGORIES.map((c) => ({ path: `/shop/${categorySlug(c)}`, changefreq: "daily", priority: "0.8" })),
          ...products.filter((p) => p.listed).map((p) => ({
            path: `/product/${p.slug}`,
            lastmod: new Date(p.createdAt).toISOString(),
            changefreq: "weekly",
            priority: "0.7",
          })),
        ];

        const urls = entries.map((e) =>
          [
            "  <url>",
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            "  </url>",
          ].filter(Boolean).join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
