import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import Stripe from "npm:stripe@16.12.0";
import { allowedReturnUrl, isTestKey, PILOT_AMOUNT, PILOT_CAMPAIGN, validPaidSession, type Order } from "./pilot-policy.ts";

export const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };
export const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" } });
export function database() { return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } }); }
export const liveApproved = () => Deno.env.get("WRITEGROW_PILOT_LIVE_ENABLED") === "true";
export const pilotMode = () => Deno.env.get("WRITEGROW_PILOT_MODE") === "live" ? "live" : "test";
export const campaignId = () => pilotMode() === "live" ? "homeschool-pilot-live" : PILOT_CAMPAIGN;
export function stripeClient() {
  const live = pilotMode() === "live";
  const key = Deno.env.get(live ? "WRITEGROW_STRIPE_LIVE_SECRET_KEY" : "WRITEGROW_STRIPE_TEST_SECRET_KEY") ?? "";
  if (live ? !liveApproved() || !key.startsWith("sk_live_") : !isTestKey(key)) throw new Error("Checkout is not configured for the approved payment mode.");
  if (!Deno.env.get(live ? "WRITEGROW_STRIPE_LIVE_WEBHOOK_SECRET" : "WRITEGROW_STRIPE_TEST_WEBHOOK_SECRET")?.startsWith("whsec_")) throw new Error("The payment webhook is not configured.");
  return new Stripe(key, { httpClient: Stripe.createFetchHttpClient(), maxNetworkRetries: 2 });
}
export async function userFor(req: Request) {
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) throw new Error("Please sign in again.");
  const { data, error } = await database().auth.getUser(token);
  if (error || !data.user) throw new Error("Please sign in again.");
  return data.user;
}
export async function confirm(stripe: Stripe, db: ReturnType<typeof database>, session: Stripe.Checkout.Session, eventId: string) {
  const { data: order, error } = await db.from("pilot_orders").select("*").eq("id", session.metadata?.order_id ?? "").maybeSingle();
  if (error || !order || order.campaign_id !== campaignId() || !validPaidSession(session, order, liveApproved())) throw new Error("Payment could not be verified for this student.");
  const { data, error: failure } = await db.rpc("pilot_confirm", { p_order: order.id, p_session: session.id, p_event: eventId });
  if (failure) throw failure;
  return data as Order;
}
export async function reconcile(stripe: Stripe, db: ReturnType<typeof database>) {
  const { data: stale, error } = await db.from("pilot_orders").select("*").eq("campaign_id", campaignId()).eq("state", "reserved").lt("reserved_until", new Date().toISOString());
  if (error) throw error;
  for (const order of (stale ?? []) as Order[]) {
    let session: Stripe.Checkout.Session | null = order.checkout_session_id ? await stripe.checkout.sessions.retrieve(order.checkout_session_id) : null;
    // Recover sessions created before a network failure prevented saving their ID.
    if (!session) {
      const sessions = stripe.checkout.sessions.list({ created: { gte: Math.floor(new Date(order.created_at).getTime() / 1000) - 2, lte: Math.ceil(new Date(order.reserved_until).getTime() / 1000) }, limit: 100 });
      for await (const candidate of sessions) if (candidate.metadata?.order_id === order.id) { session = candidate; break; }
    }
    if (session?.payment_status === "paid") await confirm(stripe, db, session, `reconcile:${session.id}`);
    else if (!session || (session.status === "expired" && session.payment_status === "unpaid")) {
      const { error: failed } = await db.rpc("pilot_release", { p_order: order.id });
      if (failed) throw failed;
    }
  }
}
export async function availability(db: ReturnType<typeof database>) {
  const { count, error } = await db.from("pilot_orders").select("id", { count: "exact", head: true }).eq("campaign_id", campaignId()).in("state", ["paid", "reserved"]);
  if (error) throw error;
  return Math.max(0, 5 - (count ?? 5));
}
export async function startCheckout(req: Request) {
  const user = await userFor(req);
  const stripe = stripeClient();
  const db = database();
  const { studentId, returnUrl, action } = await req.json();
  if (typeof studentId !== "string") return json({ error: "Choose a student first." }, 400);
  if (action === "cancel") {
    const { data: order } = await db.from("pilot_orders").select("*").eq("student_id", studentId).eq("parent_id", user.id).eq("campaign_id", campaignId()).in("state", ["reserved", "paid"]).maybeSingle();
    if (order?.state === "paid") return json({ active: true });
    if (!order?.checkout_session_id) return json({ released: false });
    let session = await stripe.checkout.sessions.retrieve(order.checkout_session_id);
    if (session.status === "open") {
      try { session = await stripe.checkout.sessions.expire(session.id); }
      catch { session = await stripe.checkout.sessions.retrieve(session.id); }
    }
    if (session.payment_status === "paid") { await confirm(stripe, db, session, `cancel-race:${session.id}`); return json({ active: true }); }
    if (session.status !== "expired" || session.payment_status !== "unpaid") return json({ error: "Checkout is still processing. Please refresh shortly." }, 409);
    const { error } = await db.rpc("pilot_release", { p_order: order.id });
    if (error) throw error;
    return json({ released: true });
  }
  await reconcile(stripe, db);
  const { data: reserved, error } = await db.rpc("pilot_reserve", { p_parent: user.id, p_student: studentId, p_return: allowedReturnUrl(returnUrl, pilotMode() === "live"), p_campaign: campaignId() });
  if (error) return json({ error: error.message }, 409);
  const order = reserved as Order;
  if (order.checkout_session_id) {
    const current = await stripe.checkout.sessions.retrieve(order.checkout_session_id);
    if (current.payment_status === "paid") { await confirm(stripe, db, current, `return:${current.id}`); return json({ active: true }); }
    if (current.status === "open" && current.url) return json({ url: current.url });
    return json({ error: "This checkout has ended. Refresh availability to try again." }, 409);
  }
  const session = await stripe.checkout.sessions.create({
    mode: "payment", payment_method_types: ["card"], client_reference_id: order.id,
    line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: PILOT_AMOUNT, product_data: { name: "WriteGrow homeschool pilot", description: "One student · 28 days · one payment · no automatic renewal" } } }],
    metadata: { campaign: campaignId(), order_id: order.id, parent_id: user.id, student_id: studentId },
    expires_at: Math.floor(new Date(order.reserved_until).getTime() / 1000),
    success_url: `${order.return_url}/parent/dashboard/?checkout_session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${order.return_url}/parent/dashboard/?checkout=cancelled&studentId=${encodeURIComponent(studentId)}`,
  }, { idempotencyKey: `writegrow-pilot:${order.id}` });
  const { error: attachment } = await db.from("pilot_orders").update({ checkout_session_id: session.id, checkout_url: session.url }).eq("id", order.id).eq("state", "reserved");
  if (attachment) throw attachment;
  return json({ url: session.url });
}
