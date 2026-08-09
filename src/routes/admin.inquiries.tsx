import { createFileRoute } from "@tanstack/react-router";
import { useStoreWhatsapp } from "@/hooks/useStoreWhatsapp";

export const Route = createFileRoute("/admin/inquiries")({
  component: InquiriesAdmin,
});

function InquiriesAdmin() {
  const { whatsapp } = useStoreWhatsapp();

  return (
    <>
      <h1 className="admin-h1">Inquiries</h1>
      <div className="admin-card" style={{ textAlign: "center", padding: "48px 24px" }}>
        <p style={{ fontSize: 14, color: "var(--ink2)", maxWidth: 480, margin: "0 auto" }}>
          Customer inquiries sent via WhatsApp appear here. WhatsApp integration for logging
          conversations is coming soon.
        </p>
        {whatsapp && (
          <a
            href={`https://wa.me/${whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline"
            style={{ display: "inline-block", marginTop: 20 }}
          >
            Open WhatsApp — +{whatsapp}
          </a>
        )}
      </div>
    </>
  );
}
