import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/coupons")({
  component: CouponsAdmin,
});

function CouponsAdmin() {
  return (
    <>
      <h1 className="admin-h1">Coupons</h1>
      <div className="admin-card" style={{ textAlign: "center", padding: "48px 24px" }}>
        <p style={{ fontSize: 14, color: "var(--ink2)", maxWidth: 480, margin: "0 auto" }}>
          Discount codes and promotions are coming soon. You'll be able to create percentage and
          fixed-amount discount codes, set minimum order values, and track usage.
        </p>
      </div>
    </>
  );
}
