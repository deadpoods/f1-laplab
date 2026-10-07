import fs from 'node:fs';
import {simulate,defaultScenario} from '../dist/engine.mjs';
const path=new URL('../dist/data/dataset.json',import.meta.url),db=JSON.parse(fs.readFileSync(path));
for(const c of db.circuits){
 for(let iteration=0;iteration<3;iteration++){
  let dlo=.65,dhi=1.8;
  const targetSpeed=Math.max(...c.profile.speed)*3.6;
  for(let j=0;j<15;j++){
   c.dragCalibration=(dlo+dhi)/2;
   const r=simulate(db,{...defaultScenario(db,c.id),driver:0,car:'fleet'},{internal:true,calibrating:true});
   if(Math.max(...r.speed)>targetSpeed)dlo=c.dragCalibration;else dhi=c.dragCalibration;
  }
  c.dragCalibration=(dlo+dhi)/2;
  let lo=.05,hi=3;
  for(let j=0;j<20;j++){
   c.calibration=(lo+hi)/2;
   const r=simulate(db,{...defaultScenario(db,c.id),driver:0,car:'fleet'},{internal:true,calibrating:true});
   if(r.lapTime>c.targetTime)hi=c.calibration;else lo=c.calibration;
  }
  c.calibration=(lo+hi)/2;
 }
 console.log(c.id,'curvature',c.calibration.toFixed(3),'drag',c.dragCalibration.toFixed(3),'target',c.targetTime);
}
for(const row of db.holdout){
 const s={...defaultScenario(db,row.circuit),driver:row.driver,car:row.car,airTemp:row.air,trackTemp:row.track,humidity:row.humidity,pressure:row.pressure,tyreAge:row.tyreAge};
 const r=simulate(db,s);row.predicted=+r.lapTime.toFixed(4);row.predictedSectors=r.sectors.map(t=>+t.toFixed(4));row.error=+(row.predicted-row.actual).toFixed(4);
}
for(const c of db.circuits){
 const rows=db.holdout.filter(x=>x.circuit===c.id),errs=rows.map(r=>Math.abs(r.error)).sort((a,b)=>a-b);
 c.validation={count:rows.length,mae:errs.reduce((a,b)=>a+b,0)/errs.length,bias:rows.reduce((a,r)=>a+r.error,0)/rows.length,p90Abs:errs[Math.min(errs.length-1,Math.ceil(errs.length*.9)-1)],max:errs.at(-1)};
 console.log(c.id,c.validation);
}
fs.writeFileSync(path,JSON.stringify(db));
