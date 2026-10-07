import db from '../dist/data/dataset.json' with {type:'json'};
import {roomAction,restStore} from './rooms.mjs';
// Custom authentication uses random 256-bit player capabilities, SHA-256 hashes
// and server-side membership checks. verify_jwt=false permits account-free rooms;
// it does not expose database credentials or table access.
const allowed=new Set(['https://f1-laplab.vercel.app','https://f1-laplab-deadpoods.vercel.app','http://127.0.0.1:4173','http://localhost:4173']);
const store=restStore(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
Deno.serve(async request=>{
 const origin=request.headers.get('origin');
 const cors={'Access-Control-Allow-Origin':origin&&allowed.has(origin)?origin:'https://f1-laplab.vercel.app','Access-Control-Allow-Headers':'content-type, apikey','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin','Cache-Control':'no-store','Content-Type':'application/json'};
 if(origin&&!allowed.has(origin))return new Response(JSON.stringify({error:'This origin is not enabled for rooms.'}),{status:403,headers:cors});
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(request.method!=='POST')return new Response(JSON.stringify({error:'Use a POST room request.'}),{status:405,headers:cors});
 if(Number(request.headers.get('content-length'))>8192)return new Response(JSON.stringify({error:'Room request is too large.'}),{status:413,headers:cors});
 try{
  const text=await request.text();if(text.length>8192)return new Response(JSON.stringify({error:'Room request is too large.'}),{status:413,headers:cors});
  const input=JSON.parse(text);
  const ip=request.headers.get('cf-connecting-ip')||request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';
  const result=await roomAction(db,store,input,{ip});
  // Trajectories are immutable once both setups lock. Avoid retransmitting them
  // on every heartbeat; reconnecting clients receive the complete race again.
  if(input.action==='status'&&input.knownVersion===result.version&&input.hasRace===true)delete result.race;
  result.serverNow=Date.now();
  return new Response(JSON.stringify(result),{headers:cors});
 }catch(error){
  const status=error.status||503;
  const message=error instanceof SyntaxError?'Invalid room JSON.':status>=500?'Room service is temporarily unavailable. Your locked setup is preserved; retry to reconnect.':error.message;
  return new Response(JSON.stringify({error:message}),{status:error instanceof SyntaxError?400:status,headers:cors});
 }
});
