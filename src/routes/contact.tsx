import { createFileRoute } from "@tanstack/react-router";
import { IconBrandWhatsapp, IconMail, IconPhone, IconMapPin } from "@tabler/icons-react";
import { STORE, contactPageLd, breadcrumbLd, abs } from "@/lib/jsonld";

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
      scripts: [
        { type: "application/ld+json", children: JSON.stringify(contactPageLd()) },
        { type: "application/ld+json", children: JSON.stringify(breadcrumbLd([
          { name: "Home", url: "/" },
          { name: "Contact", url: "/contact" },
        ])) },
      ],
    };
  },
  component: Contact,
});

function Contact() {
  const tiles = [
    { icon: <IconBrandWhatsapp />, label: "WhatsApp", value: STORE.whatsapp, href: `https://wa.me/${STORE.whatsapp.replace(/\D/g, "")}` },
    { icon: <IconPhone />, label: "Call", value: STORE.phone, href: `tel:${STORE.phone}` },
    { icon: <IconMail />, label: "Email", value: STORE.email, href: `mailto:${STORE.email}` },
    { icon: <IconMapPin />, label: "Visit", value: `${STORE.address.locality}, ${STORE.address.region}` },
  ];
  return (
    <div className="cart-wrap-page">
      <div className="eyebrow" style={{ marginBottom: 8 }}>We're here</div>
      <h1 className="cart-title">Get in touch</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 12 }}>
        {tiles.map((t) => (
          <a key={t.label} href={t.href} className="admin-card" style={{ textDecoration: "none" }} target={t.href?.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
            <div style={{ color: "var(--gold)", marginBottom: 8 }}>{t.icon}</div>
            <div className="form-label">{t.label}</div>
            <div style={{ fontSize: 14, color: "var(--ink)", marginTop: 4 }}>{t.value}</div>
          </a>
        ))}
      </div>
    </div>
  );
}
