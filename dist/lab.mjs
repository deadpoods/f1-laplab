/** Experiments compose the unchanged flying-lap solver. No post-hoc time bonuses. */
import {simulate,validateScenario,compare} from './engine.mjs';
export const SWEEP_FIELDS=Object.freeze({
 fuel:{label:'Fuel mass',unit:'kg',min:0,max:110,step:1},tyreAge:{label:'Tyre age',unit:'laps',min:0,max:40,step:1},
 trackTemp:{label:'Track temperature',unit:'°C',min:5,max:65,step:1},airTemp:{label:'Air temperature',unit:'°C',min:0,max:50,step:1},
 grip:{label:'Track grip',unit:'×',min:.90,max:1.06,step:.005},wind:{label:'Wind speed',unit:'km/h',min:0,max:60,step:1},
 wing:{label:'Aero trim',unit:'level',min:-2,max:2,step:1},brakeBias:{label:'Front brake bias',unit:'%',min:50,max:65,step:.5}
});
function axisValues(axis,maxPoints){
 const field=SWEEP_FIELDS[axis?.field];if(!field)throw Error('Select a supported sweep parameter.');
 const {min,max,count}=axis;
 if(!Number.isFinite(min)||!Number.isFinite(max)||min<field.min||max>field.max||min>=max)throw Error(`${field.label}: choose increasing bounds within ${field.min}–${field.max}.`);
 if(!Number.isInteger(count)||count<2||count>maxPoints)throw Error(`Use 2–${maxPoints} samples per axis.`);
 const values=Array.from({length:count},(_,i)=>Number((min+(max-min)*i/(count-1)).toFixed(6)));
 // Discrete tyre ages and wing steps must be exact; do not silently round duplicate cells.
 if(['tyreAge','wing'].includes(axis.field)&&values.some(x=>!Number.isInteger(x)))throw Error(`${field.label} requires whole steps. Adjust the range or sample count.`);
 return values;
}
export function parameterSweep(db,scenario,{x,y=null}){
 const base=validateScenario(db,scenario),reference=simulate(db,base),xs=axisValues(x,y?11:31),ys=y?axisValues(y,11):[null];
 if(y&&x.field===y.field)throw Error('The two sweep axes must be different.');
 const points=[];
 for(const yValue of ys)for(const xValue of xs){
  const input={...base,[x.field]:xValue};if(y)input[y.field]=yValue;
  const result=simulate(db,input);
  points.push({x:xValue,y:yValue,lapTime:result.lapTime,delta:result.lapTime-reference.lapTime,sectors:result.sectors,sectorDeltas:result.sectors.map((v,i)=>v-reference.sectors[i]),scenario:result.scenario});
 }
 const best=points.reduce((a,b)=>b.lapTime<a.lapTime?b:a);
 return {baseline:base,reference:reference.lapTime,x,y,xs,ys,points,best};
}
export function calibrationCoverage(db,input){
 const s=validateScenario(db,input),c=db.circuits.find(c=>c.id===s.circuit),training=db.training.filter(r=>r.circuit===s.circuit),matched=training.filter(r=>r.driver===s.driver&&r.car===s.car),holdout=db.holdout.filter(r=>r.circuit===s.circuit&&r.driver===s.driver&&r.car===s.car);
 const rows=[{label:'Circuit envelope',supported:training.length>0,detail:`${training.length} calibration laps on ${c.name}.`},
  {label:'Driver + chassis pairing',supported:matched.length>0,detail:matched.length?`${matched.length} matched calibration laps; ${holdout.length} held-out laps.`:'No matched calibration sample for this driver and chassis on this circuit.'},
  {label:'Tyres / session / surface',supported:s.compound==='soft'&&s.session==='qualifying'&&s.condition==='dry'&&s.rain===0,detail:'Calibration uses dry soft-tyre qualifying flying laps only.'}];
 for(const [field,key,label,unit] of [['trackTemp','track','Track temperature','°C'],['airTemp','air','Air temperature','°C'],['tyreAge','tyreAge','Tyre age','laps']]){
  const samples=(matched.length?matched:training).map(r=>r[key]).filter(Number.isFinite),min=Math.min(...samples),max=Math.max(...samples),supported=samples.length>0&&s[field]>=min&&s[field]<=max;
  rows.push({label,supported,detail:samples.length?`Reference range ${min.toFixed(1)}–${max.toFixed(1)} ${unit}; selected ${s[field]}. ${matched.length?'Matched pair':'Circuit fleet'} samples.`:'Reference range unavailable.'});
 }
 const exploratory=s.rain>0||s.condition==='wet'||s.condition==='damp';
 return {status:exploratory?'Exploratory':rows.every(r=>r.supported)?'Reference domain':'Extrapolating',rows,training:training.length,matched:matched.length,holdout:holdout.length,mae:c.validation.mae,
  note:'Fuel, actual setup and battery state are unobserved. Wind, evolution, tyre maps and traffic responses remain assumptions even inside these ranges. Coverage is evidence availability, not a probability of accuracy.'};
}
export const RACE_LAPS=Object.freeze({silverstone:52,monza:53,monaco:78,bahrain:57});
export function stintDefaults(s){const burn=Number((110/RACE_LAPS[s.circuit]).toFixed(3));return {laps:Math.max(1,Math.min(12,Math.floor((s.fuel-1)/burn))),burn,reserve:1,pitAfter:0,pitLoss:20,nextCompound:'medium',comparisonCompound:'medium'};}
export function simulateStint(db,input,options){
 const base=validateScenario(db,input),o={...stintDefaults(base),...options};
 if(!Number.isInteger(o.laps)||o.laps<1||o.laps>30)throw Error('Choose 1–30 stint laps.');
 if(!Number.isFinite(o.burn)||o.burn<.1||o.burn>5)throw Error('Fuel use must be 0.1–5 kg per lap.');
 if(!Number.isFinite(o.reserve)||o.reserve<0||o.reserve>5)throw Error('Fuel reserve must be 0–5 kg.');
 if(base.fuel-o.burn*o.laps<o.reserve-1e-9)throw Error(`Insufficient fuel: this stint needs ${(o.burn*o.laps+o.reserve).toFixed(1)} kg including your reserve. Increase fuel in Simulation or reduce laps / fuel use.`);
 if(!Number.isInteger(o.pitAfter)||o.pitAfter<0||o.pitAfter>=o.laps)throw Error('The tyre stop must fall between completed laps, before the final lap. Use 0 for no stop.');
 if(o.pitAfter&&(!Number.isFinite(o.pitLoss)||o.pitLoss<0||o.pitLoss>120))throw Error('Pit loss must be 0–120 seconds.');
 if(base.tyreAge+(o.pitAfter||o.laps)-1>40||o.pitAfter&&o.laps-o.pitAfter-1>40)throw Error('The stint extends beyond the tyre map’s 40-lap limit. Shorten it or plan a tyre stop.');
 const project=compound=>{
  let cumulative=0;const rows=[];
  for(let i=0;i<o.laps;i++){
   const stopped=o.pitAfter>0&&i>=o.pitAfter,tyreAge=stopped?i-o.pitAfter:base.tyreAge+i;
   const fuelStart=base.fuel-o.burn*i,fuelEnd=fuelStart-o.burn;
   const scenario={...base,compound:stopped?o.nextCompound:compound,tyreAge,fuel:(fuelStart+fuelEnd)/2};
   const r=simulate(db,scenario),pitLoss=o.pitAfter>0&&i===o.pitAfter-1?o.pitLoss:0;
   cumulative+=r.lapTime+pitLoss;
   rows.push({lap:i+1,fuelStart,fuelEnd,tyreAge,compound:scenario.compound,lapTime:r.lapTime,pitLoss,totalLap:r.lapTime+pitLoss,cumulative,sectors:r.sectors,grip:r.tyre.multiplier,usedEnergy:r.usedEnergy});
  }
  return {rows,total:cumulative};
 };
 const a=project(base.compound),b=project(o.comparisonCompound);
 return {scenario:base,options:o,a,b,delta:a.total-b.total,
  assumptions:['Fuel use is your assumed kg/lap input; each flying lap uses its mean fuel mass. The 110 kg default race budget is illustrative, not a 2024 regulatory cap or an observed fuel load.','Tyre age increments each lap using the existing assumed wear curve; no transient temperature or graining model.','Weather and driver utilization remain constant. Each lap starts with a full 4 MJ ES; continuous battery carryover and MGU-H are omitted.','Optional pit loss is your assumption added at the end of the stop lap; no pit-lane trajectory, refuelling, flags or race start.','Qualifying holdouts do not validate these multi-lap projections.']};
}
