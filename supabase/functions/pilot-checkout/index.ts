import { cors, json, startCheckout } from "../_shared/pilot.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try { return await startCheckout(req); }
  catch (error) { return json({ error: error instanceof Error ? error.message : "Checkout is temporarily unavailable." }, 503); }
});
