import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { SITE_URL } from "@/lib/jsonld";

interface Entry {
  loc: string;
  changefreq: string;
  priority: string;
}

// Simple module-level cache — regenerate at most once every 24h. No external
// cache dependency; acceptable that this resets on a cold start/new instance.
let cache: { xml: string; generatedAt: number } | null = null;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

async function buildSitemapXml(): Promise<string> {
  // Anon RLS already restricts these to exactly what belongs in a public
  // sitemap (categories.deleted_at IS NULL; products.status = 'active' AND
  // deleted_at IS NULL) — no need to duplicate that filtering here.
  const [{ data: categories }, { data: products }] = await Promise.all([
    supabase.from("categories").select("id, slug"),
    supabase.from("products").select("slug"),
  ]);

  const entries: Entry[] = [
    { loc: `${SITE_URL}/`, changefreq: "daily", priority: "1.0" },
    ...(categories ?? []).map((c) => ({
      loc: `${SITE_URL}/shop/${c.slug}`,
      changefreq: "daily",
      priority: "0.8",
    })),
    ...(products ?? []).map((p) => ({
      loc: `${SITE_URL}/product/${p.slug}`,
      changefreq: "weekly",
      priority: "0.6",
    })),
  ];

  const urls = entries
    .map((e) =>
      [
        "  <url>",
        `    <loc>${e.loc}</loc>`,
        `    <changefreq>${e.changefreq}</changefreq>`,
        `    <priority>${e.priority}</priority>`,
        "  </url>",
      ].join("\n"),
    )
    .join("\n");

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    urls,
    `</urlset>`,
  ].join("\n");
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const isStale = !cache || Date.now() - cache.generatedAt > CACHE_TTL_MS;
        if (isStale) {
          cache = { xml: await buildSitemapXml(), generatedAt: Date.now() };
        }
        return new Response(cache!.xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=86400",
          },
        });
      },
    },
  },
});
