import { createFileRoute } from "@tanstack/react-router";
import { IconBrandWhatsapp, IconMail, IconPhone, IconMapPin } from "@tabler/icons-react";
import { useContactDetails } from "@/hooks/useContactDetails";
import { STORE, breadcrumbLd, abs } from "@/lib/jsonld";

const STORE_ADDRESS = "Sopore, Baramulla, Jammu & Kashmir";

/** "919910784574" -> "+91 99107 84574" (country code + 5+5 grouping). Falls back to the raw digits if the shape is unexpected. */
function formatIndianPhone(digits: string): string {
  const match = /^91(\d{5})(\d{5})$/.exec(digits);
  return match ? `+91 ${match[1]} ${match[2]}` : `+${digits}`;
}

export const Route = createFileRoute("/contact")({
  head: () => {
    const desc = `Get in touch with ${STORE.name}. We're here to help on WhatsApp, phone, email or in store.`;
    return {
      meta: [
        { title: `Contact — ${STORE.name}` },
        { name: "description", content: desc },
        { property: "og:title", content: `Contact — ${STORE.name}` },
        { property: "og:description", content: desc },
        { property: "og:url", content: abs("/contact") },
      ],
      links: [{ rel: "canonical", href: abs("/contact") }],
      // Breadcrumb JSON-LD rendered directly in Contact() below — see
      // __root.tsx's RootComponent comment for why head().scripts isn't used.
    };
  },
  component: Contact,
});

function Contact() {
  const { whatsapp, phone, email } = useContactDetails();

  const tiles = [
    whatsapp && {
      icon: <IconBrandWhatsapp />,
      label: "WhatsApp",
      value: whatsapp,
      href: `https://wa.me/${whatsapp}`,
    },
    phone && {
      icon: <IconPhone />,
      label: "Call",
      value: formatIndianPhone(phone),
      href: `tel:+${phone}`,
    },
    email && {
      icon: <IconMail />,
      label: "Email",
      value: email,
      href: `mailto:${email}`,
    },
    {
      icon: <IconMapPin />,
      label: "Visit",
      value: STORE_ADDRESS,
      href: undefined,
    },
  ].filter(Boolean) as { icon: React.ReactNode; label: string; value: string; href?: string }[];

  return (
    <div className="cart-wrap-page">
      <script
        id="jsonld-breadcrumb-contact"
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbLd([
              { name: "Home", url: "/" },
              { name: "Contact", url: "/contact" },
            ]),
          ),
        }}
      />
      <div className="eyebrow" style={{ marginBottom: 8 }}>
        We're here
      </div>
      <h1 className="cart-title">Get in touch</h1>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))",
          gap: 12,
        }}
      >
        {tiles.map((t) => {
          const Tag = t.href ? "a" : "div";
          return (
            <Tag
              key={t.label}
              {...(t.href
                ? {
                    href: t.href,
                    target: t.href.startsWith("http") ? "_blank" : undefined,
                    rel: "noreferrer",
                  }
                : {})}
              className="admin-card"
              style={{ textDecoration: "none" }}
            >
              <div style={{ color: "var(--gold)", marginBottom: 8 }}>{t.icon}</div>
              <div className="form-label">{t.label}</div>
              <div style={{ fontSize: 14, color: "var(--ink)", marginTop: 4 }}>{t.value}</div>
            </Tag>
          );
        })}
      </div>
    </div>
  );
}
