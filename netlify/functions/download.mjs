import {getStore} from "@netlify/blobs";
const env=k=>Netlify.env.get(k);
export default async function handler(req){
 if(req.method!=="GET")return new Response("Method not allowed",{status:405});
 if(!env("SUPABASE_URL")||!env("SUPABASE_SERVICE_ROLE_KEY"))return new Response("Unavailable",{status:503});
 const token=new URL(req.url).searchParams.get("token");
 if(!token||!/^[-a-f0-9]{72}$/i.test(token))return new Response("Invalid link",{status:400});
 const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(token));
 const hash=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,"0")).join("");
 const r=await fetch(env("SUPABASE_URL")+"/rest/v1/soa_fulfillments?token_hash=eq."+hash+"&select=file_names,expires_at,status&limit=1",{
 headers:{apikey:env("SUPABASE_SERVICE_ROLE_KEY"),Authorization:"Bearer "+env("SUPABASE_SERVICE_ROLE_KEY")}});
 if(!r.ok)return new Response("Unavailable",{status:503});
 const rows=await r.json(),order=rows[0];
 if(!order||order.status!=="sent"||!Number.isFinite(Date.parse(order.expires_at))||Date.parse(order.expires_at)<=Date.now())return new Response("Link expired or unavailable",{status:403});
 const files=order.file_names;
 if(!Array.isArray(files)||!files.length)return new Response("No files",{status:404});
 // For multiple files, provide a private one-time listing with token bound to order.
 const selected=new URL(req.url).searchParams.get("file");
 if(!selected){
   return new Response('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Your SOA library</title><body style="background:#111;color:white;font:18px system-ui;padding:36px"><h1>Your SOA guides</h1>'+files.map((f,i)=>'<p><a style="color:#e9d5a2" href="?token='+encodeURIComponent(token)+'&file='+i+'">Download '+f.replace(/[^a-z0-9_. -]/gi,"")+'</a></p>').join("")+'</body>',{headers:{"content-type":"text/html; charset=utf-8","cache-control":"no-store","referrer-policy":"no-referrer","content-security-policy":"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'","x-robots-tag":"noindex, nofollow"}});
 }
 const index=Number(selected);
 if(!Number.isInteger(index)||index<0||index>=files.length)return new Response("Not found",{status:404});
 if(!/^[a-zA-Z0-9_-]+\.pdf$/.test(files[index]))return new Response("Unavailable",{status:503});
 const pdf=await getStore({name:"soa-paid-guides",consistency:"strong"}).get(files[index],{type:"arrayBuffer"});
 if(!pdf)return new Response("File unavailable",{status:503});
 return new Response(pdf,{headers:{"content-type":"application/pdf","content-disposition":'attachment; filename="'+files[index].replace(/[^a-z0-9_.-]/gi,"_")+'"',"cache-control":"private, no-store","referrer-policy":"no-referrer","x-robots-tag":"noindex, nofollow","x-content-type-options":"nosniff"}});
}