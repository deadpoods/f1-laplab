import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {webcrypto} from 'node:crypto';
import {createMatch,roundBrief,setupForRound,transitionMatch,publicMatch,matchScore} from '../dist/game.mjs';
import {roomAction} from '../backend/rooms.mjs';
globalThis.crypto??=webcrypto;
const db=JSON.parse(fs.readFileSync(new URL('../dist/data/dataset.json',import.meta.url)));
const start=1800000000000;
function match(difficulty='engineer'){const r=createMatch(db,{id:crypto.randomUUID(),invite:'invite',name:'Alice',tokenHash:'alice',difficulty},start);r.players.push({name:'Bob',tokenHash:'bob'});return r;}
const baselineSettings=()=>({wing:0,brakeBias:56,ers:'balanced'});
test('Game requirements cannot be bypassed by editing car, fuel, setup budget, or ES limit',()=>{
 assert.throws(()=>setupForRound(db,'engineer',0,{...baselineSettings(),fuel:0}),/Only the listed/);
 assert.throws(()=>setupForRound(db,'expert',0,{wing:2,brakeBias:56}),/budget exceeded/);
 assert.throws(()=>setupForRound(db,'engineer',3,baselineSettings()),/at most 1 MJ/);
 assert.ok(setupForRound(db,'engineer',3,{...baselineSettings(),ers:'harvest'}).usedEnergy<1);
 assert.throws(()=>setupForRound(db,'guided',0,baselineSettings()),/Only the listed/);
 assert.ok(setupForRound(db,'guided',3,{wing:0,brakeBias:56}).lapTime>20);
});
test('Test limits count on server; retries and locks are idempotent; opponents stay private',()=>{
 let r=match('expert');for(let i=0;i<3;i++)r=transitionMatch(db,r,0,'test',{round:0,settings:baselineSettings(),actionId:`test${i}`},start);
 const retry=transitionMatch(db,r,0,'test',{round:0,settings:baselineSettings(),actionId:'test2'},start);assert.equal(retry.rounds[0].tests[0].length,3);
 assert.throws(()=>transitionMatch(db,r,0,'test',{round:0,settings:baselineSettings(),actionId:'extra'},start),/No private tests/);
 r=transitionMatch(db,r,0,'lock',{round:0,settings:baselineSettings()},start);
 assert.deepEqual(transitionMatch(db,r,0,'lock',{round:0,settings:{wing:1,brakeBias:56}},start),r);
 const visible=publicMatch(db,r,1,start);assert.equal(visible.tests.length,0);assert.equal(visible.race,undefined);assert.ok(!JSON.stringify(visible).includes('tokenHash'));assert.equal(visible.result,undefined);
 assert.throws(()=>transitionMatch(db,r,1,'next',{round:0},start),/Both cars must finish/);
});
test('Five rounds share a start; winner is hidden until first finish; advancement needs both players',()=>{
 let r=match(),now=start;
 for(let round=0;round<5;round++){
  const brief=roundBrief(db,'engineer',round),settings={...baselineSettings(),ers:brief.baseline.ers};
  r=transitionMatch(db,r,0,'lock',{round,settings},now);r=transitionMatch(db,r,1,'lock',{round,settings:{...settings,brakeBias:50}},now);
  const lap=r.rounds[round],first=Math.min(...lap.locks.map(x=>x.lap.lapTime)),last=Math.max(...lap.locks.map(x=>x.lap.lapTime));
  assert.equal(lap.startAt,now+5000);assert.equal(publicMatch(db,r,0,lap.startAt+first*1000-1).finish,undefined);
  assert.ok(publicMatch(db,r,0,lap.startAt+first*1000+1).finish);now=lap.startAt+last*1000+1;
  assert.ok(publicMatch(db,r,1,now).result);
  if(round<4){r=transitionMatch(db,r,0,'next',{round},now);assert.equal(r.round,round);r=transitionMatch(db,r,1,'next',{round},now);assert.equal(r.round,round+1);}
 }
 const score=matchScore(r,now);assert.ok(score.complete);assert.equal(score.scores[0]+score.scores[1],5);assert.equal(publicMatch(db,r,0,now).history.length,5);
 assert.throws(()=>transitionMatch(db,r,0,'next',{round:4},now),/complete/);
});
test('Identical five-round setups award shared points and a shared match',()=>{
 let r=match('guided'),now=start;for(let round=0;round<5;round++){
  for(const player of [0,1])r=transitionMatch(db,r,player,'lock',{round,settings:{wing:0,brakeBias:56}},now);
  now=r.rounds[round].startAt+r.rounds[round].locks[0].lap.lapTime*1000+1;
  if(round<4)for(const player of [0,1])r=transitionMatch(db,r,player,'next',{round},now);
 }
 assert.deepEqual(matchScore(r,now).scores,[2.5,2.5]);assert.ok(matchScore(r,now).tie);
});
// A test double exercises the production store interface and real race transitions.
// Production uses Postgres, never this in-memory store.
function memoryStore(){const rows=new Map();return {rows,async rate(){return true;},async cleanup(){},async read(id){await new Promise(r=>setTimeout(r,1));return rows.has(id)?structuredClone(rows.get(id)):null;},async insert(room){if(!rows.has(room.id))rows.set(room.id,structuredClone(room));},async cas(id,version,body){await new Promise(r=>setTimeout(r,2));if(rows.get(id).version!==version)return false;rows.set(id,{...structuredClone(body),version:version+1});return true;}};}
test('Room capabilities, third-player rejection, concurrent locks, expiry and stale rounds are enforced',async()=>{
 const store=memoryStore(),roomId=crypto.randomUUID(),alice='a'.repeat(64),bob='b'.repeat(64),mallory='c'.repeat(64),options={now:start};
 const create=await roomAction(db,store,{action:'create',roomId,token:alice,name:'Alice',difficulty:'engineer'},options);
 const again=await roomAction(db,store,{action:'create',roomId,token:alice,name:'Alice',difficulty:'engineer'},options);assert.equal(create.id,again.id);
 await assert.rejects(roomAction(db,store,{action:'status',roomId,token:mallory},options),/participants/);
 await assert.rejects(roomAction(db,store,{action:'join',roomId,token:bob,invite:'wrong',name:'Bob'},options),/invalid/);
 await roomAction(db,store,{action:'join',roomId,token:bob,invite:create.invite,name:'Bob'},options);
 await assert.rejects(roomAction(db,store,{action:'join',roomId,token:mallory,invite:create.invite,name:'Mallory'},options),/full/);
 await Promise.all([alice,bob].map(token=>roomAction(db,store,{action:'lock',roomId,token,round:0,settings:baselineSettings()},options)));
 const room=store.rows.get(roomId);assert.ok(room.rounds[0].locks.every(Boolean));assert.equal(room.rounds[0].startAt,start+5000);
 await assert.rejects(roomAction(db,store,{action:'test',roomId,token:alice,round:1,settings:baselineSettings()},options),/round changed/);
 await assert.rejects(roomAction(db,store,{action:'status',roomId,token:alice},{now:start+24*3600000+1}),/expired/);
 const publicView=await roomAction(db,store,{action:'status',roomId,token:alice},options);assert.equal(publicView.finish,undefined);assert.equal(publicView.result,undefined);
});
