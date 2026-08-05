/**
 * Creates (or returns the existing) Razorpay order for one of our internal orders.
 * Called from checkout.tsx after the order row already exists as status='pending'.
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: jsonHeaders,
      });
    }

    const { order_id } = await req.json();
    if (typeof order_id !== "string" || !order_id) {
      return new Response(JSON.stringify({ error: "order_id is required" }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    // Bound to the caller's own JWT — orders_select_own RLS means this query can only
    // ever return the caller's own order, never another customer's.
    const caller = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
    } = await caller.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: jsonHeaders,
      });
    }

    const { data: order, error: orderError } = await caller
      .from("orders")
      .select("id, order_number, total, razorpay_order_id, customer_id")
      .eq("id", order_id)
      .eq("customer_id", user.id)
      .is("deleted_at", null)
      .maybeSingle();
    if (orderError) throw orderError;
    if (!order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: jsonHeaders,
      });
    }

    const keyId = Deno.env.get("RAZORPAY_KEY_ID");
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!keyId || !keySecret) {
      return new Response(JSON.stringify({ error: "Payment provider not configured" }), {
        status: 503,
        headers: jsonHeaders,
      });
    }

    // Idempotent — a Razorpay order already exists for this internal order, return it
    // instead of calling Razorpay's API again.
    if (order.razorpay_order_id) {
      return new Response(
        JSON.stringify({
          razorpay_order_id: order.razorpay_order_id,
          amount: order.total,
          currency: "INR",
          key_id: keyId,
        }),
        { headers: jsonHeaders },
      );
    }

    const rzpResp = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${keyId}:${keySecret}`)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: order.total,
        currency: "INR",
        receipt: order.order_number,
      }),
    });
    if (!rzpResp.ok) {
      console.error(
        "[create-razorpay-order] Razorpay API error",
        rzpResp.status,
        await rzpResp.text(),
      );
      return new Response(JSON.stringify({ error: "Could not create payment order" }), {
        status: 502,
        headers: jsonHeaders,
      });
    }
    const rzpOrder = await rzpResp.json();

    // orders has no customer UPDATE policy at all (by design — see RLS.md) and
    // orders_update_admin is admin-only, so this specific write needs the service-role
    // client. Everything else in this function runs as the caller, scoped by RLS.
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { error: updateError } = await admin
      .from("orders")
      .update({ razorpay_order_id: rzpOrder.id })
      .eq("id", order.id);
    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        razorpay_order_id: rzpOrder.id,
        amount: order.total,
        currency: "INR",
        key_id: keyId,
      }),
      { headers: jsonHeaders },
    );
  } catch (err) {
    console.error("[create-razorpay-order] error", err);
    return new Response(JSON.stringify({ error: "Something went wrong" }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
});
