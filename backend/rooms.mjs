import {createMatch,transitionMatch,publicMatch} from '../dist/game.mjs';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const token=/^[0-9a-f]{64}$/;
const randomHex=n=>Array.from(crypto.getRandomValues(new Uint8Array(n)),x=>x.toString(16).padStart(2,'0')).join('');
export async function hashToken(value){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),x=>x.toString(16).padStart(2,'0')).join('');}
function fail(message,status=400){const error=Error(message);error.status=status;throw error;}
function playerName(value){if(typeof value!=='string'||value.trim().length<2||value.trim().length>24||/[\x00-\x1f\x7f]/.test(value))fail('Use a display name with 2–24 characters.');return value.trim();}
export async function roomAction(db,store,input,{now=Date.now(),ip='unknown'}={}){
 if(!input||typeof input!=='object'||Array.isArray(input))fail('Invalid room request.');
 const action=input.action;
 if(!['create','join','status','test','lock','next'].includes(action))fail('Unsupported room request.');
 if(!token.test(input.token||''))fail('Player access is missing or invalid.',401);
 if(!uuid.test(input.roomId||''))fail('Invalid room identifier.');
 const tokenHash=await hashToken(input.token);
 const bucket=await hashToken(`laplab:${action==='create'?'create':action==='join'?'join':'play'}:${ip}`);
 if(!await store.rate(bucket,action==='create'?12:action==='join'?60:1800,action==='create'||action==='join'?3600:600))fail('Too many requests. Wait before retrying.',429);
 if(action==='create'){
  await store.cleanup();
  let room=await store.read(input.roomId);
  if(room){if(room.players[0].tokenHash!==tokenHash)fail('Room access is invalid.',403);return publicMatch(db,room,0,now);}
  room=createMatch(db,{id:input.roomId,invite:randomHex(16),name:playerName(input.name),tokenHash,difficulty:input.difficulty},now);
  await store.insert(room);room=await store.read(room.id);
  if(!room||room.players[0].tokenHash!==tokenHash)fail('Could not create this room. Retry.',409);
  return publicMatch(db,room,0,now);
 }
 for(let attempt=0;attempt<4;attempt++){
  const room=await store.read(input.roomId);if(!room)fail('Room not found or expired. Ask your friend for a new invitation.',404);
  if(room.expiresAt<=now)fail('This room has expired. Create a new match.',410);
  const player=room.players.findIndex(p=>p.tokenHash===tokenHash);
  if(action==='join'){
   if(player>=0)return publicMatch(db,room,player,now);
   if(typeof input.invite!=='string'||input.invite!==room.invite)fail('The invitation is invalid.',403);
   if(room.players.length>=2)fail('This two-player room is full.',409);
   const next=structuredClone(room);next.players.push({name:playerName(input.name),tokenHash});
   if(await store.cas(room.id,room.version,next))return publicMatch(db,{...next,version:room.version+1},1,now);
   continue;
  }
  if(player<0)fail('Only the two room participants can access this match.',403);
  if(action==='status')return publicMatch(db,room,player,now);
  let next;
  try{next=transitionMatch(db,room,player,action,input,now);}catch(error){fail(error.message,409);}
  if(JSON.stringify(next)===JSON.stringify(room))return publicMatch(db,room,player,now);
  if(await store.cas(room.id,room.version,next))return publicMatch(db,{...next,version:room.version+1},player,now);
 }
 fail('The room changed while saving. Retry; your inputs are preserved.',409);
}
export function restStore(url,serviceKey){
 async function request(path,{method='GET',body,prefer}={}){
  const response=await fetch(`${url}/rest/v1/${path}`,{method,headers:{apikey:serviceKey,Authorization:`Bearer ${serviceKey}`,'Content-Type':'application/json',...(prefer?{Prefer:prefer}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw Error('Shared room storage is temporarily unavailable. Please retry.');
  const text=await response.text();return text?JSON.parse(text):null;
 }
 return {async read(id){const rows=await request(`laplab_rooms?id=eq.${id}&select=body,version`);return rows[0]?{...rows[0].body,version:rows[0].version}:null;},
  insert:room=>request('laplab_rooms?on_conflict=id',{method:'POST',body:{id:room.id,body:room,version:room.version,expires_at:new Date(room.expiresAt).toISOString()},prefer:'resolution=ignore-duplicates,return=minimal'}),
  cas:(id,version,body)=>request('rpc/laplab_room_cas',{method:'POST',body:{p_id:id,p_version:version,p_body:body}}),
  rate:(key,limit,window)=>request('rpc/laplab_rate_check',{method:'POST',body:{p_key:key,p_limit:limit,p_window:window}}),
  cleanup:()=>request('rpc/laplab_cleanup',{method:'POST',body:{}})};
}
