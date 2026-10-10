import test from 'node:test';
import assert from 'node:assert/strict';
import Stripe from 'stripe';
import {mapFiles,hash} from '../lib/fulfillment.mjs';
import download from '../netlify/functions/download.mjs';
import webhook from '../netlify/functions/stripe-webhook.mjs';
const map={price_a:['A.pdf'],price_b:['A.pdf','B.pdf']};
test('exact price mapping and bundles',()=>assert.deepEqual(mapFiles([{price:{id:'price_a'}},{price:{id:'price_b'}}],map),['A.pdf','B.pdf']));
test('unrelated products ignored',()=>assert.equal(mapFiles([{price:{id:'unrelated'}}],map),null));
test('mixed unknown items rejected',()=>assert.throws(()=>mapFiles([{price:{id:'price_a'}},{price:{id:'unknown'}}],map)));
test('path traversal rejected',()=>assert.throws(()=>mapFiles([{price:{id:'a'}}],{a:['../secret.pdf']})));
test('tokens hashed deterministically',async()=>assert.equal((await hash('test')).length,64));
test('Stripe signature rejects tampering',()=>{const s=new Stripe('sk_test_placeholder'),secret='whsec_test';const payload=JSON.stringify({id:'evt_test',type:'checkout.session.completed'});const header=s.webhooks.generateTestHeaderString({payload,secret});assert.equal(s.webhooks.constructEvent(payload,header,secret).id,'evt_test');assert.throws(()=>s.webhooks.constructEvent(payload+' ',header,secret));});
test('unconfigured webhook fails closed',async()=>{globalThis.Netlify={env:{get:()=>undefined}};assert.equal((await webhook(new Request('https://example.com',{method:'POST',body:'{}'}))).status,503);});
test('invalid unauthorized token rejected',async()=>{globalThis.Netlify={env:{get:()=> 'configured'}};assert.equal((await download(new Request('https://example.com?token=bad'))).status,400);});
for(const [name,row] of [['unknown',null],['expired',{status:'sent',expires_at:'2020-01-01',file_names:['A.pdf']}],['invalid expiry',{status:'sent',expires_at:null,file_names:['A.pdf']}],['unpaid',{status:'processing',expires_at:'2099-01-01',file_names:['A.pdf']}],['refunded',{status:'revoked',expires_at:'2099-01-01',file_names:['A.pdf']}]])test(name+' access denied',async()=>{globalThis.Netlify={env:{get:()=> 'configured'}};globalThis.fetch=async()=>Response.json(row?[row]:[]);assert.equal((await download(new Request('https://example.com?token='+'a'.repeat(72)))).status,403);});
test('cannot manipulate bundle file index',async()=>{globalThis.Netlify={env:{get:()=> 'configured'}};globalThis.fetch=async()=>Response.json([{status:'sent',expires_at:'2099-01-01',file_names:['A.pdf']}]);assert.equal((await download(new Request('https://example.com?token='+'a'.repeat(72)+'&file=2'))).status,404);});
import {fulfill} from '../lib/fulfillment.mjs';
function fulfillmentMock({failure=false,existing=false,busy=false,missing=false}={}){
 const values={STRIPE_SECRET_KEY:'sk_test_placeholder',FULFILLMENT_MODE:'test',PRODUCT_PRICE_MAP_JSON:JSON.stringify(map),SUPABASE_URL:'https://db.example',SUPABASE_SERVICE_ROLE_KEY:'fake',RESEND_API_KEY:'fake',FULFILLMENT_FROM:'test@example.com'};
 globalThis.Netlify={env:{get:k=>values[k]}};
 const writes=[];let sends=0;
 globalThis.fetch=async(url,opts={})=>{
  url=String(url);
  if(url.includes('api.stripe.com/v1/checkout/sessions/cs_test/line_items'))return Response.json({object:'list',data:[{price:{id:'price_a'}}],has_more:false,url:'/v1/checkout/sessions/cs_test/line_items'});
  if(url.includes('api.stripe.com/v1/checkout/sessions/cs_test'))return Response.json({id:'cs_test',mode:'payment',payment_status:'paid',livemode:false,customer_email:'buyer@example.com',payment_intent:'pi_test'});
  if(url.includes('api.stripe.com/v1/payment_intents/'))return Response.json({status:'succeeded',latest_charge:{id:'ch_test',refunded:false,amount_refunded:0,disputed:false}});
  if(url.includes('/rpc/soa_claim'))return Response.json(existing||busy?[]:[{created_at:new Date().toISOString(),attempts:1,email_payload:{from:'test@example.com',to:['buyer@example.com'],subject:'Fixed',text:'Stable payload'}}]);
  if(url.includes('api.resend.com')){sends++;writes.push({email:JSON.parse(opts.body),key:opts.headers['Idempotency-Key']});return failure?new Response('error',{status:503}):Response.json({id:'email_test'});}
  if(url.includes('db.example')){if(opts.method==='PATCH'){writes.push(JSON.parse(opts.body));return new Response(null,{status:204});}return Response.json([{status:busy?'processing':'sent'}]);}
  throw new Error('unexpected_fetch');
 };
 return {writes,get sends(){return sends;}};
}
test('sent duplicate sends no email',async()=>{const m=fulfillmentMock({existing:true});assert.deepEqual(await fulfill('cs_test'),{duplicate:true});assert.equal(m.sends,0);});
test('concurrent lease asks webhook to retry',async()=>{const m=fulfillmentMock({busy:true});await assert.rejects(fulfill('cs_test'),/lease_busy/);assert.equal(m.sends,0);});
const privateStore=()=>({getMetadata:async()=>({})});
test('email API failure records recoverable failure',async()=>{const m=fulfillmentMock({failure:true});await assert.rejects(fulfill('cs_test',{storeFactory:privateStore}),/email_api_failed/);assert.equal(m.sends,1);assert.equal(m.writes.at(-1).status,'failed');assert.ok(m.writes.at(-1).next_attempt_at);});
test('recovery reuses exact persisted email and idempotency key',async()=>{const m=fulfillmentMock();assert.deepEqual(await fulfill('cs_test',{storeFactory:privateStore}),{fulfilled:true});assert.equal(m.writes[0].key,'soa-cs_test');assert.equal(m.writes[0].email.text,'Stable payload');assert.equal(m.writes.at(-1).status,'sent');});
test('missing file records failure without sending',async()=>{const m=fulfillmentMock();await assert.rejects(fulfill('cs_test',{storeFactory:()=>({getMetadata:async()=>null})}),/missing_private_file/);assert.equal(m.sends,0);assert.equal(m.writes.at(-1).status,'failed');});
