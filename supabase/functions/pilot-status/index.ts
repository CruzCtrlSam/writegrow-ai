import { availability, campaignId, confirm, cors, database, json, pilotMode, reconcile, stripeClient, userFor } from "../_shared/pilot.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (!["GET", "POST"].includes(req.method)) return json({ error: "Method not allowed" }, 405);
  try {
    const db = database();
    let stripe;
    try { stripe = stripeClient(); } catch { return json({ ready: false, mode: pilotMode(), available: await availability(db), message: "The pilot is not open for payments yet." }); }
    const { data: campaign } = await db.from("pilot_campaign").select("enabled").eq("id", campaignId()).maybeSingle();
    if (!campaign?.enabled) return json({ ready: false, mode: pilotMode(), available: 0 });
    if (req.method === "POST") {
      const user = await userFor(req);
      const { sessionId } = await req.json();
      const { data: order } = await db.from("pilot_orders").select("*").eq("campaign_id", campaignId()).eq("checkout_session_id", sessionId).eq("parent_id", user.id).maybeSingle();
      if (!order) return json({ error: "Checkout not found for this parent account." }, 404);
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.payment_status === "paid") {
        const active = await confirm(stripe, db, session, `return:${session.id}`);
        return json({ ready: true, mode: pilotMode(), active: true, studentId: active.student_id, expiresAt: active.ends_at });
      }
      return json({ ready: true, mode: pilotMode(), active: false, paymentStatus: session.status });
    }
    await reconcile(stripe, db);
    return json({ ready: true, mode: pilotMode(), available: await availability(db) });
  } catch { return json({ error: "Payment status is temporarily unavailable. Your access will appear after verification." }, 503); }
});
