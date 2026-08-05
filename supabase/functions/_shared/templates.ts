/**
 * Email/SMS body templates for the notification worker (process-notifications).
 * Deno-side — isolated from src/, so this duplicates the tiny paise formatter
 * from src/types/database.ts rather than importing across the frontend/edge
 * function boundary.
 */

export interface OrderContext {
  order_number: string;
  customer_name: string | null;
  total: number | null; // paise
  items: { product_name: string; quantity: number; total_price: number }[];
  address: {
    full_name: string;
    line1: string;
    line2: string | null;
    city: string;
    state: string;
    pincode: string;
  } | null;
  tracking_number: string | null;
  tracking_url: string | null;
}

function formatPrice(paise: number | null): string {
  if (paise === null) return "—";
  return `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function addressLines(a: OrderContext["address"]): string {
  if (!a) return "—";
  return [a.full_name, a.line1, a.line2, `${a.city}, ${a.state} — ${a.pincode}`]
    .filter(Boolean)
    .join("<br>");
}

function itemsHtml(items: OrderContext["items"]): string {
  if (items.length === 0) return "<p>No items on file.</p>";
  return `<table style="width:100%;border-collapse:collapse;font-size:14px">
    <tbody>
      ${items
        .map(
          (i) => `<tr>
        <td style="padding:6px 0">${i.product_name} × ${i.quantity}</td>
        <td style="padding:6px 0;text-align:right">${formatPrice(i.total_price)}</td>
      </tr>`,
        )
        .join("")}
    </tbody>
  </table>`;
}

function wrap(bodyHtml: string): string {
  return `<div style="font-family:'DM Sans',Arial,sans-serif;color:#1C1410;max-width:520px;margin:0 auto">
    <div style="font-family:Georgia,serif;font-size:22px;letter-spacing:1px;padding:24px 0 8px;color:#B8860B">YAAWUN</div>
    ${bodyHtml}
    <p style="margin-top:32px;font-size:12px;color:#7A6355">Yaawun · Sopore, Jammu &amp; Kashmir</p>
  </div>`;
}

export interface EmailTemplate {
  subject: string;
  html: string;
}

/** null = no email template for this event — worker skips with a logged reason. */
export function getEmailTemplate(
  eventType: string,
  payload: Record<string, unknown>,
): EmailTemplate | null {
  const p = payload as Partial<OrderContext> & { code?: string };
  const name = p.customer_name || "there";

  switch (eventType) {
    case "order_confirmed":
      return {
        subject: `Your Yaawun order is confirmed — ${p.order_number ?? ""}`,
        html: wrap(`
          <p>Hi ${name},</p>
          <p>Your order <strong>${p.order_number ?? ""}</strong> is confirmed.</p>
          ${itemsHtml(p.items ?? [])}
          <p style="margin-top:12px"><strong>Total: ${formatPrice(p.total ?? null)}</strong></p>
          <p style="margin-top:12px">Delivery address:<br>${addressLines(p.address ?? null)}</p>
          <p style="margin-top:16px">We'll notify you when it ships.</p>
        `),
      };
    case "order_dispatched":
      return {
        subject: `Your order ${p.order_number ?? ""} is on its way!`,
        html: wrap(`
          <p>Hi ${name},</p>
          <p>Your order <strong>${p.order_number ?? ""}</strong> has been dispatched.</p>
          ${
            p.tracking_number
              ? `<p>Tracking number: <strong>${p.tracking_number}</strong></p>
                 ${p.tracking_url ? `<p><a href="${p.tracking_url}" style="color:#B8860B">Track your shipment</a></p>` : ""}`
              : ""
          }
          <p style="margin-top:16px">Estimated delivery: 4–7 business days.</p>
        `),
      };
    case "order_delivered":
      return {
        subject: "Your Yaawun order has been delivered",
        html: wrap(`
          <p>Hi ${name},</p>
          <p>Your order <strong>${p.order_number ?? ""}</strong> has been delivered. Thank you for shopping with Yaawun!</p>
          <p style="margin-top:16px">We'd love to hear what you think — consider leaving a review.</p>
        `),
      };
    case "order_cancelled":
      return {
        subject: `Your order ${p.order_number ?? ""} has been cancelled`,
        html: wrap(`
          <p>Hi ${name},</p>
          <p>Your order <strong>${p.order_number ?? ""}</strong> has been cancelled.</p>
          <p style="margin-top:16px">Questions? Reach us via the Contact page on yaawun.com.</p>
        `),
      };
    case "refund_processed":
      return {
        subject: `Refund processed for order ${p.order_number ?? ""}`,
        html: wrap(`
          <p>Hi ${name},</p>
          <p>Your refund for order <strong>${p.order_number ?? ""}</strong> has been processed.</p>
          <p style="margin-top:16px">Please allow 5–7 business days for it to reflect in your account.</p>
        `),
      };
    case "otp_request":
      return {
        subject: "Your Yaawun sign-in code",
        html: wrap(`
          <p>Your sign-in code is:</p>
          <p style="font-size:28px;letter-spacing:6px;font-weight:600;margin:12px 0">${p.code ?? "------"}</p>
          <p>This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.</p>
        `),
      };
    default:
      return null; // review_approved, welcome — no template yet
  }
}

/** null = no SMS template for this event — worker skips with a logged reason. */
export function getSmsTemplate(eventType: string, payload: Record<string, unknown>): string | null {
  const p = payload as Partial<OrderContext> & { code?: string };
  const name = p.customer_name || "there";

  switch (eventType) {
    case "order_confirmed":
      return `Hi ${name}, your Yaawun order ${p.order_number ?? ""} is confirmed! Total: ${formatPrice(p.total ?? null)}. We'll SMS you when it ships.`;
    case "order_dispatched":
      return `Your Yaawun order ${p.order_number ?? ""} is shipped! Track: ${p.tracking_url ?? "yaawun.com/account/orders"}`;
    case "order_delivered":
      return `Your Yaawun order ${p.order_number ?? ""} has been delivered. Thank you for shopping with us!`;
    case "otp_request":
      return `Your Yaawun sign-in code: ${p.code ?? "------"}. Valid for 10 minutes. Do not share.`;
    default:
      return null; // order_cancelled, refund_processed, review_approved, welcome — no SMS template
  }
}
