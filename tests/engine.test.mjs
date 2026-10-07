import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {simulate,defaultScenario,validateScenario,sampleAtTime,sampleAtDistance,compare,contributions,sensitivity} from '../dist/engine.mjs';
const db=JSON.parse(fs.readFileSync(new URL('../dist/data/dataset.json',import.meta.url)));
test('Observed training and held-out membership are disjoint and soft telemetry is available',()=>{
 const keys=new Set(db.training.map(r=>`${r.circuit}:${r.driver}:${r.lap}`));assert.equal(keys.size,62);assert.equal(db.holdout.length,117);
 for(const row of db.holdout)assert(!keys.has(`${row.circuit}:${row.driver}:${row.lap}`));
 for(const c of db.circuits){assert.equal(c.profile.speed.length,600);assert.equal(c.observed.speed.length,600);assert.equal(c.corners.length,c.turns);assert(c.validation.count>10);assert(c.validation.mae>0);assert(c.corners.every(c=>c.index>=0&&c.index<600));}
});
test('Lap timing, distance playback, sectors and corner partitions agree',()=>{
 for(const c of db.circuits){const r=simulate(db,defaultScenario(db,c.id));assert(r.lapTime>60&&r.lapTime<110);assert(Math.abs(r.sectors.reduce((a,b)=>a+b)-r.lapTime)<1e-8);assert(Math.abs(r.corners.reduce((sum,c)=>sum+c.time,0)-r.lapTime)<1e-8);for(let f=0;f<=1;f+=.1){const byTime=sampleAtTime(r,r.lapTime*f),byDistance=sampleAtDistance(r,byTime.distance);assert(Math.abs(byDistance.time-byTime.time)<1e-4);}assert(r.time.every((t,i)=>i===0||t>r.time[i-1]));assert(r.speed.every(v=>Number.isFinite(v)&&v>0));}
});
test('Fuel and degradation physically slow all four circuit laps',()=>{
 for(const c of db.circuits){const s=defaultScenario(db,c.id),base=simulate(db,s),fuel=simulate(db,{...s,fuel:60}),old=simulate(db,{...s,tyreAge:20});assert(fuel.lapTime>base.lapTime+.5);assert(old.lapTime>base.lapTime+.3);assert.equal(fuel.mass-base.mass,50);}
});
test('Drivers, car fits and circuits change the actual speed profile',()=>{
 const s=defaultScenario(db),base=simulate(db,s),driver=simulate(db,{...s,driver:81}),car=simulate(db,{...s,car:'ferrari'});
 assert(Math.abs(driver.lapTime-base.lapTime)>.01);assert(Math.abs(car.lapTime-base.lapTime)>.01);assert(driver.speed.some((v,i)=>Math.abs(v-base.speed[i])>.1));assert(car.speed.some((v,i)=>Math.abs(v-base.speed[i])>.1));
 const monaco=simulate(db,defaultScenario(db,'monaco'));assert(Math.min(...monaco.speed)<Math.min(...base.speed));assert(monaco.lapTime<base.lapTime);assert.notDeepEqual(db.circuits[0].profile.x,db.circuits[2].profile.x);
});
test('Electrical output/energy and DRS conditions follow the declared abstraction',()=>{
 for(const id of ['monza','silverstone','bahrain','monaco'])for(const ers of ['balanced','attack','harvest']){
  const s={...defaultScenario(db,id),ers},r=simulate(db,s);assert(r.usedEnergy<=4.000001);assert(r.harvestedEnergy<=2.000001);assert(r.ers.every(p=>p<=120.00001&&p>=0));assert(r.energy.every(e=>e>=0&&e<=4.000001));assert(r.drs.every((d,i)=>!d||r.brake[i]<2));
 }
 const s=defaultScenario(db,'monza'),off=simulate(db,{...s,drs:'off'}),race=simulate(db,{...s,session:'race'}),on=simulate(db,s);assert(off.drs.every(d=>d===0));assert(race.drs.every(d=>d===0));assert(off.lapTime>on.lapTime+.05);
});
test('Live inputs, atmosphere, trim, brake balance and strategies have real effects',()=>{
 const s=defaultScenario(db),base=simulate(db,s);
 const cases={airTemp:35,trackTemp:40,humidity:10,pressure:1030,grip:.95,wind:25,windDirection:180,wing:2,brakeBias:64,risk:.96,braking:.93,throttle:.93,traffic:'following',ers:'attack',condition:'dusty',compound:'medium',session:'practice'};
 for(const [key,value]of Object.entries(cases)){const scenario={...s,[key]:value};if(key==='windDirection')scenario.wind=20;const r=simulate(db,scenario);assert(Math.abs(r.lapTime-base.lapTime)>1e-5,`${key} is inert`);}
 const following=simulate(db,{...s,traffic:'following',gap:.5}),far=simulate(db,{...s,traffic:'following',gap:4});assert(Math.abs(following.lapTime-far.lapTime)>.01);
});
test('Invalid values and unsupported wet/slick pairs are rejected rather than masked',()=>{
 for(const bad of [{fuel:-1},{fuel:NaN},{fuel:111},{circuit:'spa'},{driver:999},{car:'unknown'},{compound:'C9'},{condition:'wet'},{rain:70}])assert.throws(()=>validateScenario(db,{...defaultScenario(db),...bad}));
 const wet=simulate(db,{...defaultScenario(db),condition:'wet',compound:'wet',rain:70});assert(wet.warnings.length>0);assert(wet.lapTime>simulate(db,defaultScenario(db)).lapTime);assert(wet.drs.every(d=>d===0));
});
test('Counterfactual contributions telescope, comparisons expose local differences',()=>{
 const s={...defaultScenario(db),fuel:30,tyreAge:4,wing:1},r=simulate(db,s),ref=simulate(db,defaultScenario(db)),waterfall=contributions(db,s),comparison=compare(r,ref);
 assert(Math.abs(waterfall.base+waterfall.rows.reduce((sum,row)=>sum+row.delta,0)-r.lapTime)<1e-8);assert(Math.abs(comparison.sectorDeltas.reduce((a,b)=>a+b)-comparison.delta)<1e-8);assert(Math.abs(Object.values(comparison.phases).reduce((a,b)=>a+b)-comparison.delta)<1e-8);assert(Math.abs(comparison.cornerDeltas.reduce((a,b)=>a+b)-comparison.delta)<1e-8);assert(comparison.mechanism.includes('mass'));assert.throws(()=>compare(r,simulate(db,defaultScenario(db,'monza'))));
 const rows=sensitivity(db,s);assert(rows.find(x=>x.key==='fuel').delta>0);assert(rows.every(x=>Number.isFinite(x.delta)));
});
test('Extreme supported dry inputs remain finite, and boundary sensitivity is explicit',()=>{
 const s={...defaultScenario(db),fuel:110,tyreAge:40,airTemp:50,trackTemp:65,humidity:100,wind:60,wing:2,risk:.95,grip:.9,pressure:900},r=simulate(db,s);assert(Number.isFinite(r.lapTime));assert(r.uncertainty>db.circuits[0].validation.p90Abs);assert(sensitivity(db,s).find(row=>row.key==='fuel').delta===null);
});
