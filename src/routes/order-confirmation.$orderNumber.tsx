import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { IconCircleCheck, IconBrandWhatsapp } from "@tabler/icons-react";
import { supabase } from "@/lib/supabase";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { formatPrice } from "@/types/database";

export const Route = createFileRoute("/order-confirmation/$orderNumber")({
  head: () => ({
    meta: [{ title: "Order confirmed — Yaawun" }, { name: "robots", content: "noindex" }],
  }),
  component: () => (
    <ProtectedRoute loginPath="/login">
      <OrderConfirmation />
    </ProtectedRoute>
  ),
});

async function fetchOrder(orderNumber: string) {
  const { data, error } = await supabase
    .from("orders")
    .select("*, items:order_items(*)")
    .eq("order_number", orderNumber)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function fetchWhatsappNumber(): Promise<string> {
  const { data } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "store_whatsapp")
    .maybeSingle();
  return typeof data?.value === "string" ? data.value : "919000000000";
}

function OrderConfirmation() {
  const { orderNumber } = Route.useParams();
  const { data: order, isLoading } = useQuery({
    queryKey: ["order", orderNumber],
    queryFn: () => fetchOrder(orderNumber),
  });
  const { data: whatsapp = "919000000000" } = useQuery({
    queryKey: ["site-setting", "store_whatsapp"],
    queryFn: fetchWhatsappNumber,
  });

  const whatsappHref = `https://wa.me/${whatsapp}?text=${encodeURIComponent(`Hi, I'd like help with my order ${orderNumber}`)}`;

  if (isLoading) return <div style={{ padding: "4rem 2rem", textAlign: "center" }}>Loading…</div>;

  if (!order) {
    return (
      <div style={{ padding: "4rem 2rem", textAlign: "center" }}>
        <h1 className="serif" style={{ fontSize: 28, color: "var(--ink)" }}>
          Order not found
        </h1>
        <Link to="/" className="btn-ink" style={{ marginTop: 20, display: "inline-block" }}>
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "60vh",
        display: "grid",
        placeItems: "center",
        padding: "48px 16px",
        background: "var(--cream)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          background: "#fff",
          border: "1px solid var(--b)",
          borderRadius: 12,
          padding: 32,
          textAlign: "center",
        }}
      >
        <IconCircleCheck size={48} style={{ color: "var(--gold)", marginBottom: 12 }} />
        <h1
          className="serif"
          style={{ fontSize: 28, fontWeight: 400, color: "var(--ink)", marginBottom: 6 }}
        >
          Order placed!
        </h1>
        <p style={{ color: "var(--ink3)", fontSize: 13, marginBottom: 18 }}>
          Thank you — we've received your order and will confirm it shortly.
        </p>
        <div
          style={{
            background: "var(--cream2)",
            borderRadius: 8,
            padding: "14px 16px",
            marginBottom: 18,
            textAlign: "left",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 13,
              marginBottom: 6,
            }}
          >
            <span style={{ color: "var(--ink3)" }}>Order number</span>
            <strong style={{ color: "var(--ink)" }}>{order.order_number}</strong>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 13,
              marginBottom: 6,
            }}
          >
            <span style={{ color: "var(--ink3)" }}>Items</span>
            <span>{order.items.length}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
            <span style={{ color: "var(--ink3)" }}>Total (COD)</span>
            <strong style={{ color: "var(--ink)" }}>{formatPrice(order.total)}</strong>
          </div>
        </div>
        <a
          href={whatsappHref}
          target="_blank"
          rel="noreferrer"
          className="btn-gold"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            justifyContent: "center",
            marginBottom: 12,
            width: "100%",
          }}
        >
          <IconBrandWhatsapp size={18} /> Message us on WhatsApp
        </a>
        <Link to="/shop" className="btn-outline" style={{ display: "inline-block", width: "100%" }}>
          Continue shopping
        </Link>
      </div>
    </div>
  );
}
