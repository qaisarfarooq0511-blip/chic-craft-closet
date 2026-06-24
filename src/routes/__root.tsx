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
import { CartProvider } from "@/lib/cart-context";
import { ToastProvider } from "@/lib/toast";
import { Topbar, Navbar, Footer } from "@/components/storefront/Chrome";
import { ThemeProvider } from "@/lib/theme-context";
import { UserAuthProvider } from "@/lib/user-auth";
import { organizationLd, websiteLd, localBusinessLd, STORE } from "@/lib/jsonld";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ background: "var(--cream)" }}>
      <div className="max-w-md text-center">
        <h1 className="serif" style={{ fontSize: 72, fontWeight: 300, color: "var(--ink)" }}>404</h1>
        <p style={{ color: "var(--ink3)", fontSize: 13, marginTop: 8 }}>
          That page doesn't exist or has moved.
        </p>
        <div style={{ marginTop: 24 }}>
          <Link to="/" className="btn-ink">Back to home</Link>
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
    <div className="flex min-h-screen items-center justify-center px-4" style={{ background: "var(--cream)" }}>
      <div className="max-w-md text-center">
        <h1 className="serif" style={{ fontSize: 28, fontWeight: 300, color: "var(--ink)" }}>Something went wrong</h1>
        <p style={{ color: "var(--ink3)", fontSize: 13, marginTop: 8 }}>Please try again or head back home.</p>
        <div style={{ marginTop: 24, display: "flex", gap: 10, justifyContent: "center" }}>
          <button className="btn-ink" onClick={() => { router.invalidate(); reset(); }}>Try again</button>
          <Link to="/" className="btn-outline">Home</Link>
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
      { title: `${STORE.name} — ${STORE.tagline}` },
      { name: "description", content: STORE.description },
      { property: "og:site_name", content: STORE.name },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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
    scripts: [
      { type: "application/ld+json", children: JSON.stringify(organizationLd()) },
      { type: "application/ld+json", children: JSON.stringify(websiteLd()) },
      { type: "application/ld+json", children: JSON.stringify(localBusinessLd()) },
    ],
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
      <main>{children}</main>
      {!isAdmin && <Footer />}
    </>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
          <UserAuthProvider>
            <CartProvider>
              <Chrome>
                <Outlet />
              </Chrome>
            </CartProvider>
          </UserAuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
