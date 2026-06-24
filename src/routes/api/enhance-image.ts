import { createFileRoute } from "@tanstack/react-router";
import { createParser } from "eventsource-parser";

/**
 * AI image enhancement endpoint.
 * Accepts a base64 data URL plus an optional instruction; returns a single
 * PNG data URL after AI editing (background cleanup + upscale).
 */
export const Route = createFileRoute("/api/enhance-image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) {
          return Response.json({ error: "LOVABLE_API_KEY not configured" }, { status: 500 });
        }

        let body: { image: string; instruction?: string };
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON body" }, { status: 400 });
        }
        if (!body.image || typeof body.image !== "string") {
          return Response.json({ error: "image (data URL) is required" }, { status: 400 });
        }

        const prompt = (body.instruction?.trim() ||
          "Enhance this product photo: clean and soften the background to a neutral studio backdrop, balance lighting, increase sharpness, remove visual clutter and distractions. Keep the product itself faithful — same colours, same shape, same texture. Preserve fabric detail and embroidery. Frame in portrait orientation suitable for an e-commerce listing.").slice(0, 800);

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3.1-flash-image",
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: prompt },
                  { type: "image_url", image_url: { url: body.image } },
                ],
              },
            ],
            modalities: ["image", "text"],
            stream: true,
          }),
        });

        if (!upstream.ok || !upstream.body) {
          const txt = await upstream.text().catch(() => "");
          return Response.json({ error: `Upstream ${upstream.status}: ${txt.slice(0, 400)}` }, { status: upstream.status });
        }

        // Collect the final image from the SSE stream and return as JSON.
        let finalB64: string | null = null;
        const parser = createParser({
          onEvent(event) {
            if (event.event !== "image_generation.partial_image" && event.event !== "image_generation.completed") return;
            try {
              const payload = JSON.parse(event.data) as { b64_json?: string };
              if (payload.b64_json) finalB64 = payload.b64_json;
            } catch { /* ignore */ }
          },
        });

        const reader = upstream.body.pipeThrough(new TextDecoderStream()).getReader();
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            parser.feed(value);
          }
        } finally {
          reader.cancel().catch(() => {});
        }

        if (!finalB64) {
          return Response.json({ error: "AI did not return an image. Try again or check credits." }, { status: 502 });
        }
        return Response.json({ image: `data:image/png;base64,${finalB64}` });
      },
    },
  },
});
