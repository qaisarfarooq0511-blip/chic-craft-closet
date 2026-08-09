import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { ToastProvider } from "@/lib/toast";
import { Topbar, Navbar, Footer } from "@/components/storefront/Chrome";
import { AddPhonePrompt } from "@/components/AddPhonePrompt";
import { ThemeProvider } from "@/lib/theme-context";
import { UserAuthProvider } from "@/lib/user-auth";
import { organizationLd, websiteLd, STORE, abs } from "@/lib/jsonld";

function NotFoundComponent() {
  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{ background: "var(--cream)" }}
    >
      <div className="max-w-md text-center">
        <h1 className="serif" style={{ fontSize: 72, fontWeight: 300, color: "var(--ink)" }}>
          404
        </h1>
        <p style={{ color: "var(--ink3)", fontSize: 13, marginTop: 8 }}>
          That page doesn't exist or has moved.
        </p>
        <div style={{ marginTop: 24 }}>
          <Link to="/" className="btn-ink">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{ background: "var(--cream)" }}
    >
      <div className="max-w-md text-center">
        <h1 className="serif" style={{ fontSize: 28, fontWeight: 300, color: "var(--ink)" }}>
          Something went wrong
        </h1>
        <p style={{ color: "var(--ink3)", fontSize: 13, marginTop: 8 }}>
          Please try again or head back home.
        </p>
        <div style={{ marginTop: 24, display: "flex", gap: 10, justifyContent: "center" }}>
          <button
            className="btn-ink"
            onClick={() => {
              router.invalidate();
              reset();
            }}
          >
            Try again
          </button>
          <Link to="/" className="btn-outline">
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Yaawun — Kashmiri Shawls, Dress Material & Women's Fashion" },
      { name: "description", content: STORE.description },
      { property: "og:site_name", content: STORE.name },
      { property: "og:type", content: "website" },
      {
        property: "og:title",
        content: "Yaawun — Kashmiri Shawls, Dress Material & Women's Fashion",
      },
      { property: "og:description", content: STORE.description },
      { property: "og:image", content: abs("/icon-512.png") },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "twitter:title",
        content: "Yaawun — Kashmiri Shawls, Dress Material & Women's Fashion",
      },
      { name: "twitter:description", content: STORE.description },
      { name: "twitter:image", content: abs("/icon-512.png") },
      { name: "theme-color", content: "#1C1410" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Yaawun" },
      { name: "mobile-web-app-capable", content: "yes" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32.png" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/icon-192.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap",
      },
    ],
    // Organization/WebSite JSON-LD are rendered directly in RootComponent below,
    // not here — head().scripts entries get duplicated on client hydration in this
    // TanStack Router version (confirmed: no dedup keys off `attrs`, e.g. `id`, are
    // checked anywhere in its HeadContent/Asset/useTags implementation). Rendering
    // directly with suppressHydrationWarning avoids that.
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function Chrome({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAdmin = pathname.startsWith("/admin");
  return (
    <>
      {!isAdmin && <Topbar />}
      <Navbar />
      {!isAdmin && <AddPhonePrompt />}
      <main>{children}</main>
      {!isAdmin && <Footer />}
    </>
  );
}

// The root route's match (unlike any nested route's) renders through this
// component twice during this app's SSR-to-hydration sequence — confirmed
// empirically: identical JSON-LD script tags placed here (and, before that,
// directly in RootShell's <head>) both end up duplicated in the DOM after
// hydration, while the exact same rendering approach in every leaf route
// component (Home, ShopAllRoute, CategoryPage, PDP) produces exactly one
// copy. Root cause not fully isolated (not a head().scripts issue -- see the
// comment on Route.head below -- and not fixed by moving between
// shellComponent/component). This effect runs once on mount and removes any
// extra copies by id, keeping the first, as a definitive fix regardless of
// which render pass produced the duplicate.
function useDedupeJsonLd(ids: string[]) {
  useEffect(() => {
    for (const id of ids) {
      const matches = document.querySelectorAll(`script[id="${id}"]`);
      matches.forEach((el, i) => {
        if (i > 0) el.remove();
      });
    }
  }, [ids]);
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  useDedupeJsonLd(["jsonld-organization", "jsonld-website"]);
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
          <UserAuthProvider>
            <script
              id="jsonld-organization"
              type="application/ld+json"
              suppressHydrationWarning
              dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationLd()) }}
            />
            <script
              id="jsonld-website"
              type="application/ld+json"
              suppressHydrationWarning
              dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteLd()) }}
            />
            <Chrome>
              <Outlet />
            </Chrome>
          </UserAuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
