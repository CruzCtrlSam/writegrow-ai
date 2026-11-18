export const PILOT_AMOUNT = 1499;
export const PILOT_DAYS = 28;
export const PILOT_SPOTS = 5;
export const PILOT_CAMPAIGN = "homeschool-pilot-test";
export interface Order { id: string; parent_id: string; student_id: string; state: string; campaign_id?: string; checkout_session_id: string | null; return_url: string; reserved_until: string; created_at: string; ends_at?: string }
export function isTestKey(key: string) { return key.startsWith("sk_test_") && key.length > 20; }
export function allowedReturnUrl(value: unknown, live = false) {
  const allowed = ["https://cruzctrlsam.github.io/writegrow-ai", "http://127.0.0.1:3000", "http://localhost:3000", "http://127.0.0.1:3010"];
  if (live) return allowed[0];
  return typeof value === "string" && allowed.includes(value.replace(/\/$/, "")) ? value.replace(/\/$/, "") : allowed[0];
}
export function validPaidSession(session: { id: string; livemode: boolean; mode: string | null; status: string | null; payment_status: string; amount_total: number | null; currency: string | null; metadata: Record<string, string> | null; client_reference_id?: string | null }, order: Order, liveApproved = false) {
  const campaign = order.campaign_id ?? PILOT_CAMPAIGN;
  const live = campaign === "homeschool-pilot-live";
  return (!live || liveApproved) && session.livemode === live && session.mode === "payment" && session.status === "complete" && session.payment_status === "paid" && session.amount_total === PILOT_AMOUNT && session.currency === "usd"
    && session.metadata?.campaign === campaign && session.metadata?.order_id === order.id && session.metadata?.parent_id === order.parent_id && session.metadata?.student_id === order.student_id
    && session.client_reference_id === order.id && (!order.checkout_session_id || order.checkout_session_id === session.id);
}
