import Stripe from "npm:stripe@16.12.0";
import { campaignId, confirm, database, json, pilotMode, stripeClient } from "../_shared/pilot.ts";
Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const secret = Deno.env.get(pilotMode() === "live" ? "WRITEGROW_STRIPE_LIVE_WEBHOOK_SECRET" : "WRITEGROW_STRIPE_TEST_WEBHOOK_SECRET");
  if (!secret) return json({ error: "Test webhook is not configured." }, 503);
  let event: Stripe.Event;
  let stripe: Stripe;
  try {
    stripe = stripeClient();
    event = await stripe.webhooks.constructEventAsync(await req.text(), req.headers.get("stripe-signature") ?? "", secret, undefined, Stripe.createSubtleCryptoProvider());
  } catch { return json({ error: "Invalid test webhook signature." }, 400); }
  if (event.livemode !== (pilotMode() === "live")) return json({ error: "Payment mode is not enabled." }, 400);
  if (!["checkout.session.completed", "checkout.session.expired"].includes(event.type)) return json({ received: true });
  try {
    const db = database();
    const session = await stripe.checkout.sessions.retrieve((event.data.object as Stripe.Checkout.Session).id);
    if (session.metadata?.campaign !== campaignId()) return json({ received: true, ignored: true });
    if (session.payment_status === "paid") await confirm(stripe, db, session, event.id);
    else if (session.status === "expired" && session.livemode === (pilotMode() === "live") && session.metadata?.campaign === campaignId()) {
      const { data: order } = await db.from("pilot_orders").select("id,checkout_session_id").eq("id", session.metadata.order_id).maybeSingle();
      if (order && (!order.checkout_session_id || order.checkout_session_id === session.id)) {
        const { error } = await db.rpc("pilot_release", { p_order: order.id });
        if (error) throw error;
      }
    }
    return json({ received: true });
  } catch { return json({ error: "Payment processing will retry." }, 500); }
});
