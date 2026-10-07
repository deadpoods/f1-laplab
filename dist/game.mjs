/** Shared game rules. The server recomputes every test and locked lap. */
import {defaultScenario,simulate,compare} from './engine.mjs';
export const GAME_VERSION='1.0';
export const DIFFICULTIES=Object.freeze({
 guided:{name:'Guided',tests:100,budget:5,description:'Wing + brake bias. Up to 100 tests per round; clear setup hints.'},
 engineer:{name:'Engineer',tests:8,budget:2.5,description:'Wing, brake bias + ERS. Eight tests; a shared setup budget.'},
 expert:{name:'Expert',tests:3,budget:1.5,description:'Three tests, finer bias steps, tighter setup budget. Make each run count.'}
});
const challenges=[
 {circuit:'silverstone',title:'The high-speed compromise',brief:'Carry speed through the linked corners without giving it away on the straights.',wind:0,windDirection:0,fuel:20},
 {circuit:'monza',title:'Drag versus deceleration',brief:'Long straights reward efficiency. Braking still has to work into the chicanes.',wind:12,windDirection:180,fuel:15},
 {circuit:'monaco',title:'Mechanical precision',brief:'Low-speed sections make axle-limited braking and traction matter.',wind:8,windDirection:90,fuel:18},
 {circuit:'bahrain',title:'The conservation brief',brief:'Maximum ES deployment: 1 MJ. Tune the chassis around a conserve strategy.',wind:14,windDirection:270,fuel:25,energyLimit:1},
 {circuit:'silverstone',title:'The crosswind final',brief:'A crosswind changes relative airflow around the whole circuit. Find the compromise.',wind:24,windDirection:90,fuel:20}
];
export function roundBrief(db,difficulty,index){
 if(!DIFFICULTIES[difficulty]||!Number.isInteger(index)||index<0||index>4)throw Error('Unknown match challenge.');
 const challenge=challenges[index],baseline={...defaultScenario(db,challenge.circuit),driver:4,car:'mclaren',fuel:challenge.fuel,wind:challenge.wind,windDirection:challenge.windDirection,ers:challenge.energyLimit?'harvest':'balanced'};
 return {...challenge,index,baseline,budget:DIFFICULTIES[difficulty].budget,biasStep:difficulty==='expert'?.25:.5,allowed:['wing','brakeBias',...(difficulty==='guided'?[]:['ers'])],tests:DIFFICULTIES[difficulty].tests};
}
export function setupForRound(db,difficulty,index,settings){
 const brief=roundBrief(db,difficulty,index);
 if(!settings||typeof settings!=='object'||Array.isArray(settings)||Object.keys(settings).some(k=>!brief.allowed.includes(k)))throw Error('Only the listed setup variables can change. Car, driver, fuel and conditions are fixed.');
 const s={...brief.baseline,...settings};
 if(!Number.isInteger(s.wing)||s.wing<-2||s.wing>2)throw Error('Aero trim must be a whole level from −2 to +2.');
 if(!Number.isFinite(s.brakeBias)||s.brakeBias<50||s.brakeBias>65||Math.abs(s.brakeBias/brief.biasStep-Math.round(s.brakeBias/brief.biasStep))>1e-8)throw Error(`Use ${brief.biasStep}% brake-bias steps between 50 and 65%.`);
 if(Math.abs(s.wing)+Math.abs(s.brakeBias-56)/3>brief.budget+1e-8)throw Error(`Setup budget exceeded. |trim| + |bias − 56| / 3 must be ≤ ${brief.budget}.`);
 const result=simulate(db,s);
 if(brief.energyLimit&&result.usedEnergy>brief.energyLimit+1e-8)throw Error(`This round permits at most ${brief.energyLimit} MJ ES deployment. Select Conserve.`);
 return result;
}
function compactLap(r){return {n:r.n,ds:r.ds,time:r.time,speed:r.speed,gear:r.gear,throttle:r.throttle,brake:r.brake,ers:r.ers,lapTime:r.lapTime,sectors:r.sectors,scenario:r.scenario};}
export function createMatch(db,{id,invite,name,tokenHash,difficulty},now=Date.now()){
 if(!DIFFICULTIES[difficulty])throw Error('Choose a supported difficulty.');
 return {id,invite,version:0,gameVersion:GAME_VERSION,createdAt:now,expiresAt:now+24*3600000,difficulty,round:0,players:[{name,tokenHash}],rounds:[newRound()]};
}
const newRound=()=>({locks:[null,null],tests:[[],[]],next:[false,false],startAt:null});
export function finishState(round,now){
 if(!round.startAt||!round.locks.every(Boolean))return {started:false,firstFinished:false,complete:false,winner:null};
 const times=round.locks.map(x=>x.lap.lapTime),elapsed=(now-round.startAt)/1000;
 const tie=Math.abs(times[0]-times[1])<.005;
 return {started:elapsed>=0,firstFinished:elapsed>=Math.min(...times),complete:elapsed>=Math.max(...times),winner:tie?null:times[0]<times[1]?0:1,tie};
}
export function matchScore(room,now){
 const scores=[0,0],totals=[0,0];
 for(const round of room.rounds){if(!finishState(round,now).complete)continue;const f=finishState(round,now);scores[0]+=f.tie?.5:f.winner===0?1:0;scores[1]+=f.tie?.5:f.winner===1?1:0;round.locks.forEach((x,i)=>totals[i]+=x.lap.lapTime);}
 const complete=room.round===4&&finishState(room.rounds[4],now).complete;
 let winner=null;
 if(complete){if(scores[0]!==scores[1])winner=scores[0]>scores[1]?0:1;else if(Math.abs(totals[0]-totals[1])>=.005)winner=totals[0]<totals[1]?0:1;}
 return {scores,totals,complete,winner,tie:complete&&winner===null};
}
export function transitionMatch(db,original,player,action,input={},now=Date.now()){
 if(original.expiresAt<=now)throw Error('This room has expired. Create a new match.');
 if(!original.players[player])throw Error('Player access is invalid.');
 const room=structuredClone(original),r=room.rounds[room.round];
 if(input.round!==room.round)throw Error('The round changed. Refresh the room before submitting.');
 if(['test','lock'].includes(action)){
  if(room.players.length!==2)throw Error('Your friend must join before testing or locking a setup.');
  if(r.locks[player]){if(action==='lock')return room;throw Error('Your setup is locked for this round.');}
  if(action==='test'&&typeof input.actionId==='string'&&r.tests[player].some(x=>x.id===input.actionId))return room;
  if(action==='test'&&r.tests[player].length>=DIFFICULTIES[room.difficulty].tests)throw Error('No private tests remain this round. Lock your final setup.');
  const result=setupForRound(db,room.difficulty,room.round,input.settings),summary={lapTime:result.lapTime,sectors:result.sectors,energy:result.usedEnergy,settings:input.settings};
  if(action==='test')r.tests[player].push({...summary,id:input.actionId});
  else{r.locks[player]={settings:input.settings,lap:compactLap(result)};if(r.locks.every(Boolean)){
   r.startAt=now+5000;
   // Recompute full results only once for a post-finish mechanism explanation.
   const a=simulate(db,r.locks[0].lap.scenario),b=simulate(db,r.locks[1].lap.scenario),c=compare(a,b);
   r.analysis={delta:c.delta,sectorDeltas:c.sectorDeltas,explanation:c.explanation,mechanism:c.mechanism,phases:c.phases};
  }}
 }else if(action==='next'){
  if(!finishState(r,now).complete)throw Error('Both cars must finish before the next round.');
  if(room.round>=4)throw Error('This five-round match is complete.');
  r.next[player]=true;
  if(r.next.every(Boolean)){room.round++;room.rounds.push(newRound());}
 }else throw Error('Unsupported room action.');
 return room;
}
export function publicMatch(db,room,player,now=Date.now()){
 const r=room.rounds[room.round],finish=finishState(r,now),score=matchScore(room,now);
 const visible={id:room.id,invite:player===0?room.invite:undefined,difficulty:room.difficulty,version:room.version,round:room.round,expiresAt:room.expiresAt,serverNow:now,me:player,brief:roundBrief(db,room.difficulty,room.round),players:room.players.map((p,i)=>({name:p.name,locked:!!r.locks[i],next:!!r.next[i]})),tests:r.tests[player],startAt:r.startAt,score};
 if(r.startAt){visible.race=r.locks.map(x=>({n:x.lap.n,ds:x.lap.ds,time:x.lap.time,speed:x.lap.speed,gear:x.lap.gear,throttle:x.lap.throttle,brake:x.lap.brake,ers:x.lap.ers}));}
 if(finish.firstFinished)visible.finish={winner:finish.winner,tie:finish.tie,complete:finish.complete};
 if(finish.complete){visible.result={times:r.locks.map(x=>x.lap.lapTime),settings:r.locks.map(x=>x.settings),analysis:r.analysis};}
 visible.history=room.rounds.map((round,i)=>finishState(round,now).complete?{round:i,winner:finishState(round,now).winner,tie:finishState(round,now).tie,times:round.locks.map(x=>x.lap.lapTime)}:null).filter(Boolean);
 return visible;
}
