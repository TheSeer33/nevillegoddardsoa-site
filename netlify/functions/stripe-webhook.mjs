// Stripe webhook verification and fulfillment eligibility gate.
// Configure STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET in Netlify Functions env.
// This endpoint intentionally DOES NOT deliver files until private storage and
// email provider are connected. Never grant access based on redirect URLs.
import Stripe from "stripe";
const stripe = new Stripe(Netlify.env.get("STRIPE_SECRET_KEY") || "");
export default async function handler(req) {
  if (req.method !== "POST") return new Response("Method not allowed", {status:405});
  const signature = req.headers.get("stripe-signature");
  const secret = Netlify.env.get("STRIPE_WEBHOOK_SECRET");
  if (!signature || !secret) return new Response("Webhook not configured", {status:503});
  let event;
  try {
    event = stripe.webhooks.constructEvent(await req.text(), signature, secret);
  } catch {
    return new Response("Invalid signature", {status:400});
  }
  if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") {
    return Response.json({received:true});
  }
  const session = event.data.object;
  if (session.payment_status !== "paid" || session.mode !== "payment") {
    return Response.json({received:true,fulfilled:false});
  }
  // TODO before enabling fulfillment:
  // 1. Atomically claim event.id in persistent database (idempotency).
  // 2. Fetch checkout line items and map verified Stripe price IDs to files.
  // 3. Generate expiring private downloads; send via authenticated email service.
  // 4. Persist delivery status and retry failures; handle refunds/disputes.
  // Do not log customer PII or return download URLs to this webhook caller.
  console.info("Paid checkout awaiting fulfillment integration", {eventId:event.id,sessionId:session.id});
  return Response.json({received:true,fulfilled:false});
}
