import Stripe from "stripe";
import { getStore } from "@netlify/blobs";

// Required Netlify Function environment variables:
// STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, RESEND_API_KEY, FULFILLMENT_FROM,
// SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PRODUCT_PRICE_MAP_JSON.
// PRODUCT_PRICE_MAP_JSON: {"price_...":["SATS_Protocol_Premium.pdf"], ...}
// PDFs must be uploaded to PRIVATE site-wide Netlify Blobs store "soa-paid-guides".
// SQL migration: see fulfillment-schema.sql. Do not expose private store publicly.

const env = (key) => Netlify.env.get(key);
const json = (value, status=200) => Response.json(value,{status});
const stripe = () => new Stripe(env("STRIPE_SECRET_KEY"));
const db = async (path, options={}) => {
  const response = await fetch(env("SUPABASE_URL") + "/rest/v1/" + path, {
    ...options,
    headers: {
      apikey: env("SUPABASE_SERVICE_ROLE_KEY"),
      Authorization: "Bearer " + env("SUPABASE_SERVICE_ROLE_KEY"),
      "Content-Type": "application/json",
      ...options.headers
    }
  });
  if (!response.ok) throw new Error("Database operation failed: " + response.status);
  const raw=await response.text(); return raw ? JSON.parse(raw) : null;
};
const escapeHtml = s => String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

export default async function handler(req) {
  if(req.method!=="POST") return new Response("Method not allowed",{status:405});
  const required=["STRIPE_SECRET_KEY","STRIPE_WEBHOOK_SECRET","RESEND_API_KEY","FULFILLMENT_FROM","SUPABASE_URL","SUPABASE_SERVICE_ROLE_KEY","PRODUCT_PRICE_MAP_JSON"];
  if(required.some(key=>!env(key))) return json({error:"Fulfillment not configured"},503);
  let event;
  try {event=stripe().webhooks.constructEvent(await req.text(),req.headers.get("stripe-signature"),env("STRIPE_WEBHOOK_SECRET"));}
  catch{return json({error:"Invalid webhook signature"},400);}
  if(!["checkout.session.completed","checkout.session.async_payment_succeeded"].includes(event.type)) return json({received:true});
  const id=event.data.object.id;
  try {
    const session=await stripe().checkout.sessions.retrieve(id,{expand:["line_items"]});
    if(session.payment_status!=="paid" || session.mode!=="payment") return json({received:true,fulfilled:false});
    const email=session.customer_details?.email || session.customer_email;
    if(!email) throw new Error("Paid order has no email");
    const priceMap=JSON.parse(env("PRODUCT_PRICE_MAP_JSON"));
    const fileNames=[...new Set(session.line_items.data.flatMap(item=>priceMap[item.price?.id]||[]))];
    if(!fileNames.length || session.line_items.has_more) throw new Error("Unknown or incomplete product mapping");
    const store=getStore("soa-paid-guides");
    for(const name of fileNames) if(!(await store.getMetadata(name))) throw new Error("Paid guide missing from private store: "+name);

    // Atomic unique session claim: only one invocation sends an order.
    const claim=await db("soa_fulfillments?on_conflict=session_id",{
      method:"POST",headers:{Prefer:"resolution=ignore-duplicates,return=representation"},
      body:JSON.stringify([{session_id:id,email,status:"processing",file_names:fileNames}])
    });
    if(!claim?.length) return json({received:true,duplicate:true});

    // Download URLs are signed separately and short-lived. Never send raw Blob URLs.
    const token=crypto.randomUUID()+crypto.randomUUID();
    const encoder=new TextEncoder();
    const digest=await crypto.subtle.digest("SHA-256",encoder.encode(token));
    const tokenHash=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,"0")).join("");
    await db("soa_fulfillments?session_id=eq."+encodeURIComponent(id),{
      method:"PATCH",body:JSON.stringify({token_hash:tokenHash,expires_at:new Date(Date.now()+7*86400000).toISOString()})
    });
    const url="https://nevillegoddardsoa.com/.netlify/functions/download?token="+encodeURIComponent(token);
    const response=await fetch("https://api.resend.com/emails",{
      method:"POST",headers:{"Authorization":"Bearer "+env("RESEND_API_KEY"),"Content-Type":"application/json","Idempotency-Key":"soa-"+id},
      body:JSON.stringify({from:env("FULFILLMENT_FROM"),to:[email],subject:"Your Neville Goddard SOA guides are ready",
        html:'<h2>Your practice starts here.</h2><p>Thank you for your purchase. Your private download link is valid for seven days.</p><p><a href="'+escapeHtml(url)+'">Download your guides securely</a></p><p>If you need help, reply to this email.</p>'})
    });
    if(!response.ok) throw new Error("Email delivery API failed: "+response.status);
    await db("soa_fulfillments?session_id=eq."+encodeURIComponent(id),{method:"PATCH",body:JSON.stringify({status:"sent",sent_at:new Date().toISOString()})});
    return json({received:true,fulfilled:true});
  } catch(e) {
    console.error("Fulfillment failure",id,e.message);
    // Stripe retries non-2xx. Manual reconciliation required for processing rows.
    return json({error:"Fulfillment pending retry"},500);
  }
}
