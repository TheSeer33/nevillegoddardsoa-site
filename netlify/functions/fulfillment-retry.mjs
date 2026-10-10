import {db,fulfill,env} from '../../lib/fulfillment.mjs';
export default async function(){
 if(!env('SUPABASE_URL'))return new Response('Unavailable',{status:503});
 const rows=await db('soa_fulfillments?or=(status.eq.failed,status.eq.processing)&next_attempt_at=lte.'+encodeURIComponent(new Date().toISOString())+'&order=created_at.asc&limit=5&select=session_id');
 for(const row of rows){try{await fulfill(row.session_id);}catch{console.error('SOA recovery pending');}}
 return new Response('Recovery checked');
}
export const config={schedule:'*/5 * * * *'};
