import {env,stripe,fulfill,db} from '../../lib/fulfillment.mjs';
export default async function handler(req){
 if(req.method!=='POST')return new Response('Method not allowed',{status:405});
 const required=['STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET','RESEND_API_KEY','FULFILLMENT_FROM','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','PRODUCT_PRICE_MAP_JSON','FULFILLMENT_MODE'];
 if(required.some(k=>!env(k)))return Response.json({error:'Fulfillment unavailable'},{status:503});
 let event;
 try{event=stripe().webhooks.constructEvent(await req.text(),req.headers.get('stripe-signature'),env('STRIPE_WEBHOOK_SECRET'));}catch{return Response.json({error:'Invalid signature'},{status:400});}
 if(event.livemode!==(env('FULFILLMENT_MODE')==='live'))return new Response('Mode mismatch',{status:400});
 try{
  if(['charge.refunded','charge.dispute.created'].includes(event.type)){
   const o=event.data.object;
   const charge=event.type==='charge.refunded'?o:await stripe().charges.retrieve(o.charge);
   const payment=typeof charge.payment_intent==='string'?charge.payment_intent:charge.payment_intent?.id;
   if(payment)await db('soa_fulfillments?payment_intent=eq.'+encodeURIComponent(payment),{method:'PATCH',body:JSON.stringify({status:'revoked'})});
  }else if(['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type)){
   return Response.json({received:true,...await fulfill(event.data.object.id)});
  }
  return Response.json({received:true});
 }catch{console.error('SOA fulfillment requires retry',event.id);return Response.json({error:'Retry required'},{status:500});}
}
