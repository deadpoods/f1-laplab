import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {defaultScenario,simulate} from '../dist/engine.mjs';
import {parameterSweep,calibrationCoverage,simulateStint,stintDefaults} from '../dist/lab.mjs';
const db=JSON.parse(fs.readFileSync(new URL('../dist/data/dataset.json',import.meta.url))),base=defaultScenario(db);
test('Sweep cells rerun physics, preserve input, and expose exact sector deltas',()=>{
 const original=structuredClone(base),s=parameterSweep(db,base,{x:{field:'fuel',min:10,max:30,count:3},y:{field:'wing',min:-2,max:2,count:5}});
 assert.deepEqual(base,original);assert.equal(s.points.length,15);
 for(const p of s.points){const r=simulate(db,p.scenario);assert.equal(r.lapTime,p.lapTime);assert.ok(Math.abs(p.sectorDeltas.reduce((a,b)=>a+b,0)-p.delta)<1e-9);}
 assert.equal(s.best.lapTime,Math.min(...s.points.map(p=>p.lapTime)));
 assert.ok(s.points.find(p=>p.x===30&&p.y===0).lapTime>s.points.find(p=>p.x===10&&p.y===0).lapTime);
});
test('Sweep limits reject duplicate axes, unbounded grids, and fractional discrete ages',()=>{
 assert.throws(()=>parameterSweep(db,base,{x:{field:'fuel',min:-1,max:110,count:3}}),/bounds/);
 assert.throws(()=>parameterSweep(db,base,{x:{field:'fuel',min:0,max:110,count:32}}),/samples/);
 assert.throws(()=>parameterSweep(db,base,{x:{field:'tyreAge',min:0,max:3,count:3}}),/whole/);
 assert.throws(()=>parameterSweep(db,base,{x:{field:'fuel',min:0,max:10,count:3},y:{field:'fuel',min:1,max:9,count:3}}),/different/);
});
test('Coverage uses observed training ranges and pairing, never claims fuel or setup calibration',()=>{
 const row=db.training.find(r=>r.driver===4&&r.circuit==='silverstone'),s={...base,tyreAge:row.tyreAge,trackTemp:row.track,airTemp:row.air};
 const c=calibrationCoverage(db,s);assert.equal(c.status,'Reference domain');assert.ok(c.matched>0);assert.match(c.note,/unobserved/);
 assert.equal(calibrationCoverage(db,{...s,car:'ferrari'}).matched,0);
 assert.equal(calibrationCoverage(db,{...s,compound:'medium'}).status,'Extrapolating');
 assert.equal(calibrationCoverage(db,{...s,condition:'wet',compound:'wet',rain:70}).status,'Exploratory');
 assert.equal(calibrationCoverage(db,{...s,fuel:100}).status,'Reference domain'); // This label is availability, not fuel validity.
});
test('Stints conserve fuel, increment and reset age, account for pit loss and compare compounds',()=>{
 const s={...base,fuel:50,tyreAge:2},o={laps:8,burn:2,reserve:1,pitAfter:4,pitLoss:21,nextCompound:'hard',comparisonCompound:'medium'},r=simulateStint(db,s,o);
 assert.equal(r.a.rows.at(-1).fuelEnd,34);assert.equal(r.a.rows[0].tyreAge,2);assert.equal(r.a.rows[3].tyreAge,5);assert.equal(r.a.rows[4].tyreAge,0);assert.equal(r.a.rows[4].compound,'hard');
 assert.equal(r.a.rows.reduce((n,x)=>n+x.pitLoss,0),21);
 assert.ok(Math.abs(r.a.total-r.a.rows.reduce((n,x)=>n+x.totalLap,0))<1e-8);
 const first=simulate(db,{...s,fuel:49});assert.equal(first.lapTime,r.a.rows[0].lapTime);
 assert.ok(r.a.rows.every(x=>x.usedEnergy<=4.000001));assert.match(r.assumptions.join(' '),/full 4 MJ/);
 const equal=simulateStint(db,s,{...o,comparisonCompound:s.compound});assert.equal(equal.delta,0);
 assert.equal(stintDefaults({...s,circuit:'monaco'}).burn,Number((110/78).toFixed(3)));
});
test('Stints fail before publishing insufficient fuel, map overrun or invalid tyre combinations',()=>{
 assert.throws(()=>simulateStint(db,base,{laps:12,burn:2}),/Insufficient fuel/);
 assert.throws(()=>simulateStint(db,{...base,fuel:80,tyreAge:39},{laps:5,burn:1}),/40-lap/);
 assert.throws(()=>simulateStint(db,{...base,fuel:80},{laps:5,burn:1,pitAfter:5}),/before the final/);
 assert.throws(()=>simulateStint(db,{...base,fuel:80,condition:'wet',compound:'wet',rain:70},{laps:5,burn:1,comparisonCompound:'soft'}),/intermediate or wet/);
});
