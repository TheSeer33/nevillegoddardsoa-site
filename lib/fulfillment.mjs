import Stripe from 'stripe';
import { getStore } from '@netlify/blobs';
export const env = k => Netlify.env.get(k);
export const hash = async token => Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))).toString('hex');
export const db = async (path,options={}) => {
 const r=await fetch(env('SUPABASE_URL')+'/rest/v1/'+path,{...options,headers:{apikey:env('SUPABASE_SERVICE_ROLE_KEY'),Authorization:'Bearer '+env('SUPABASE_SERVICE_ROLE_KEY'),'Content-Type':'application/json',...options.headers}});
 if(!r.ok) throw new Error('database_unavailable');
 const text=await r.text(); return text ? JSON.parse(text) : null;
};
export const stripe = () => new Stripe(env('STRIPE_SECRET_KEY'),{httpClient:Stripe.createFetchHttpClient(fetch)});
export function mapFiles(items,map){
 if(!items.length) throw new Error('empty_order');
 const matches=items.map(i=>map[i.price?.id]);
 if(matches.every(m=>!m))return null; // Unrelated account products remain untouched.
 if(matches.some(m=>!Array.isArray(m)||!m.length))throw new Error('unmapped_order_item');
 const files=[...new Set(matches.flat())];
 if(files.some(f=>typeof f!=='string'||! /^[a-zA-Z0-9_-]+\.pdf$/.test(f)))throw new Error('invalid_file_mapping');
 return files;
}
export async function fulfill(sessionId,{storeFactory=getStore}={}){
 const s=await stripe().checkout.sessions.retrieve(sessionId);
 if(s.mode!=='payment'||s.payment_status!=='paid')return {pending:true};
 const expected=env('FULFILLMENT_MODE');
 if(!['live','test'].includes(expected)||s.livemode!==(expected==='live'))throw new Error('mode_mismatch');
 const items=[];
 for await(const i of stripe().checkout.sessions.listLineItems(sessionId,{limit:100}))items.push(i);
 const files=mapFiles(items,JSON.parse(env('PRODUCT_PRICE_MAP_JSON')));
 if(!files)return {ignored:true};
 const email=s.customer_details?.email||s.customer_email;
 if(!email)throw new Error('missing_customer_email');
 const paymentId=typeof s.payment_intent==='string'?s.payment_intent:s.payment_intent?.id;
 if(!paymentId)throw new Error('missing_payment');
 const payment=await stripe().paymentIntents.retrieve(paymentId,{expand:['latest_charge']});
 const charge=payment.latest_charge;
 if(payment.status!=='succeeded'||!charge||typeof charge==='string'||charge.refunded||charge.amount_refunded>0||charge.disputed){
  await db('soa_fulfillments?session_id=eq.'+encodeURIComponent(sessionId),{method:'PATCH',body:JSON.stringify({status:'revoked'})});return {revoked:true};
 }
 const lease=crypto.randomUUID();
 const claim=await db('rpc/soa_claim',{method:'POST',body:JSON.stringify({p_session:sessionId,p_email:email,p_files:files,p_payment:paymentId,p_lease:lease})});
 if(!claim?.length){
  const rows=await db('soa_fulfillments?session_id=eq.'+encodeURIComponent(sessionId)+'&select=status');
  if(rows[0]?.status==='processing')throw new Error('lease_busy');
  return {duplicate:true};
 }
 let row=claim[0];
 try{
  const store=storeFactory({name:'soa-paid-guides',consistency:'strong'});
  for(const file of files)if(!await store.getMetadata(file))throw new Error('missing_private_file');
  // Persist the exact request before the first send. Retries reuse the same body and idempotency key.
  if(!row.email_payload){
   const token=crypto.randomUUID()+crypto.randomUUID();
   const url='https://nevillegoddardsoa.com/.netlify/functions/download?token='+token;
   const payload={from:env('FULFILLMENT_FROM'),reply_to:env('FULFILLMENT_REPLY_TO')||'nevillegoddard22@gmail.com',to:[email],subject:'Your Neville Goddard SOA practice library',text:'Thank you for your purchase. Download your guides: '+url+'\nAccess lasts seven days. For help or refreshed access, reply with your order reference '+sessionId+'.',html:'<div style="background:#11111a;color:#faf8f4;padding:40px;font:16px Arial;line-height:1.6"><p style="color:#e9d5a2;letter-spacing:2px">NEVILLE GODDARD SOA</p><h1>Your practice starts here.</h1><p>Your purchased guides are ready. Choose one exercise and begin at your own pace.</p><p><a style="display:inline-block;background:#e9d5a2;color:#111;padding:16px 24px;text-decoration:none" href="'+url+'">Open your private library</a></p><p>This link lasts seven days. Need help or fresh access? Reply to this email.</p><p>Order reference: '+sessionId+'</p></div>'};
   const expiry=new Date(Date.now()+7*86400000).toISOString();
   await db('soa_fulfillments?session_id=eq.'+encodeURIComponent(sessionId)+'&lease_id=eq.'+lease,{method:'PATCH',body:JSON.stringify({token_hash:await hash(token),expires_at:expiry,email_payload:payload})});
   row={...row,email_payload:payload};
  }
  // Do not resend automatically outside the provider's 24-hour deduplication window.
  if(Date.now()-Date.parse(row.created_at)>23*3600000)throw new Error('manual_reconciliation_required');
  const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env('RESEND_API_KEY'),'Content-Type':'application/json','Idempotency-Key':'soa-'+sessionId},body:JSON.stringify(row.email_payload)});
  if(!response.ok)throw new Error('email_api_failed');
  const receipt=await response.json();
  await db('soa_fulfillments?session_id=eq.'+encodeURIComponent(sessionId)+'&lease_id=eq.'+lease+'&status=eq.processing',{method:'PATCH',body:JSON.stringify({status:'sent',sent_at:new Date().toISOString(),provider_id:receipt.id,lease_until:null,last_error:null})});
  return {fulfilled:true};
 }catch(error){
  await db('soa_fulfillments?session_id=eq.'+encodeURIComponent(sessionId)+'&lease_id=eq.'+lease+'&status=eq.processing',{method:'PATCH',body:JSON.stringify({status:error.message==='manual_reconciliation_required'?'review':'failed',last_error:error.message,lease_until:null,next_attempt_at:new Date(Date.now()+60000*Math.min(60,2**row.attempts)).toISOString()})});
  throw error;
 }
}
