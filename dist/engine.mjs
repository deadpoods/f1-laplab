/* F1 LapLab: SI-unit, distance-domain, telemetry-anchored point-mass model.
 * Public observations constrain a reference envelope. Effective curvature,
 * aerodynamic areas, axle balance and off-reference tyre maps are estimates.
 * No held-out lap is used by this solver or circuit calibration. */
export const MODEL_VERSION='0.1.0';
const G=9.80665, DRY_MASS=798, MAX_K=120000, ES_OUT=4000000, K_IN=2000000;
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const formatLap=t=>`${Math.floor(t/60)}:${(t%60).toFixed(2).padStart(5,'0')}`;
export const signed=t=>`${t>=0?'+':'−'}${Math.abs(t).toFixed(2)}`;
const neutral={low:1,high:1,braking:1,traction:1,power:1,drag:1};
export function defaultScenario(db,id='silverstone'){
 const c=db.circuits.find(c=>c.id===id);if(!c)throw new Error('Circuit data unavailable.');
 return {circuit:id,driver:4,car:'mclaren',session:'qualifying',compound:'soft',tyreAge:0,fuel:10,trackTemp:c.baseline.track_temperature,airTemp:c.baseline.air_temperature,humidity:c.baseline.humidity,pressure:c.baseline.pressure,grip:1,wind:0,windDirection:0,rain:0,condition:'dry',wing:0,brakeBias:56,ers:'balanced',drs:'auto',risk:1,braking:1,throttle:1,traffic:'clean',gap:2};
}
const ranges={tyreAge:[0,40],fuel:[0,110],trackTemp:[5,65],airTemp:[0,50],humidity:[0,100],pressure:[900,1050],grip:[.90,1.06],wind:[0,60],windDirection:[0,360],rain:[0,100],wing:[-2,2],brakeBias:[50,65],risk:[.95,1.01],braking:[.9,1],throttle:[.9,1],gap:[.3,5]};
export function validateScenario(db,input,internal=false){
 if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('This scenario is not a valid configuration.');
 const c=db.circuits.find(c=>c.id===input.circuit);if(!c)throw new Error('Select a supported circuit.');
 const s={...defaultScenario(db,c.id)};
 for(const key of Object.keys(s)){if(Object.hasOwn(input,key))s[key]=input[key];}
 for(const [key,[min,max]] of Object.entries(ranges)){if(typeof s[key]!=='number'||!Number.isFinite(s[key])||s[key]<min||s[key]>max)throw new Error(`${key} must be between ${min} and ${max}.`);}
 if(!(internal&&s.driver===0)&&!db.drivers.some(d=>d.id===s.driver))throw new Error('Select a driver with reference data.');
 if(!(internal&&s.car==='fleet')&&!db.cars.some(c=>c.id===s.car))throw new Error('Select a supported 2024 car.');
 for(const [key,options] of Object.entries({session:['qualifying','race','practice'],compound:['soft','medium','hard','intermediate','wet'],condition:['dry','damp','wet','dusty'],ers:['balanced','attack','harvest'],drs:['auto','off'],traffic:['clean','following']})){if(!options.includes(s[key]))throw new Error(`Unsupported ${key}.`);}
 if((s.condition==='wet'||s.rain>55)&&['soft','medium','hard'].includes(s.compound))throw new Error('Use intermediate or wet tyres for a wet-track experiment.');
 return s;
}
export function airDensity(temp,pressure,humidity){
 // Ideal moist air; Tetens saturation approximation, not CIPM certification.
 const kelvin=temp+273.15, vapour=610.78*Math.exp(17.27*temp/(temp+237.3))*humidity/100;
 return (pressure*100-vapour)/(287.05*kelvin)+vapour/(461.495*kelvin);
}
function tyreState(s,c){
 const compound={soft:1,medium:.975,hard:.949,intermediate:.80,wet:.71}[s.compound];
 const ageRate={soft:.0025,medium:.00155,hard:.001,intermediate:.0013,wet:.0012}[s.compound];
 // Response coefficients are explicitly assumed, not Pirelli friction maps.
 const temperature=clamp(1-.00016*(s.trackTemp-c.baseline.track_temperature)**2,.74,1);
 const age=Math.max(.78,1-ageRate*s.tyreAge*c.demand*(1+Math.max(0,s.trackTemp-c.baseline.track_temperature)*.012));
 const water=Math.max(s.rain/100,s.condition==='wet'?.7:s.condition==='damp'?.22:0);
 let wetGrip=1;
 if(s.compound==='intermediate')wetGrip=water>0?1.13-.32*water:.86;
 else if(s.compound==='wet')wetGrip=water>0?1.18-.20*water:.78;
 else wetGrip=1-.60*water;
 return {multiplier:compound*age*temperature*wetGrip*s.grip*(s.condition==='dusty'?.96:1),wear:age,thermal:temperature,water,compound,temperatureIndex:temperature};
}
function buildDeployment(s,c,ds){
 const n=c.profile.speed.length,p=new Float64Array(n),dt=c.profile.speed.map(v=>ds/Math.max(8,v));
 const eligible=[];
 for(let i=0;i<n;i++)if(c.profile.throttle[i]>92&&c.profile.curvature[i]<.004&&c.profile.speed[i]>20)eligible.push(i);
 const budget=s.ers==='harvest'?700000:s.ers==='attack'?ES_OUT:3200000;
 if(s.ers==='attack')eligible.sort((a,b)=>c.profile.speed[a]-c.profile.speed[b]);
 let energy=0;
 for(const i of eligible){const max=s.ers==='balanced'?90000:MAX_K;p[i]=Math.max(0,Math.min(max,(budget-energy)/dt[i]));energy+=p[i]*dt[i];}
 return p;
}
export function simulate(db,input,{internal=false,calibrating=false}={}){
 const s=validateScenario(db,input,internal), c=db.circuits.find(c=>c.id===s.circuit);
 const car=db.cars.find(c=>c.id===s.car)||neutral, driver=db.drivers.find(d=>d.id===s.driver)||neutral;
 const n=c.profile.speed.length,ds=c.length/n,m=DRY_MASS+s.fuel,rho=airDensity(s.airTemp,s.pressure,s.humidity),tyre=tyreState(s,c);
 const wing=1+s.wing*.02,clArea=6.8*(1+c.wing)*wing*car.high**2,cdArea=1.08*(1+c.wing*.6)*(1+s.wing*.015)*car.drag*(c.dragCalibration||1);
 const wake=s.traffic==='following'?Math.exp(-s.gap/1.8):0;
 const heading0=c.profile.heading[0],windAngle=heading0+s.windDirection*Math.PI/180;
 const wx=-s.wind/3.6*Math.cos(windAngle),wy=-s.wind/3.6*Math.sin(windAngle);
 const drsAllowed=s.drs==='auto'&&tyre.water===0&&(s.session!=='race'||(s.traffic==='following'&&s.gap<=1));
 const mu=1.55*tyre.multiplier*car.low**2;
 const curvature=c.profile.curvature.map(k=>k*(c.calibration||1));
 const kPower=buildDeployment(s,c,ds);
 const drsMask=Uint8Array.from(c.profile.drs);
 const force=(i,v)=>{
  const heading=c.profile.heading[i],tx=Math.cos(heading),ty=Math.sin(heading),ax=v*tx-wx,ay=v*ty-wy,air2=ax*ax+ay*ay;
  const drs=drsAllowed&&drsMask[i]===1&&curvature[i]<.006;
  const down=.5*rho*clArea*air2*(drs?.88:1)*(1-.13*wake);
  const drag=.5*rho*cdArea*Math.sqrt(air2)*(ax*tx+ay*ty)*(drs?.80:1)*(1-.065*wake);
  const load=m*G+down, speedBlend=clamp((v-40)/35,0,1);
  const utilization=s.risk*((1-speedBlend)*driver.low**2+speedBlend*driver.high**2);
  const friction=mu*(load/(808*G))**(-.08);
  const cap=friction*load*utilization;
  const lateral=m*v*v*curvature[i];
  const ellipse=Math.sqrt(Math.max(.001,1-Math.min(.998,(lateral/cap)**2)));
  return {down,drag,load,friction,cap,lateral,ellipse,drs};
 };
 const lateralLimit=new Float64Array(n);
 for(let i=0;i<n;i++){
  if(curvature[i]<1e-7){lateralLimit[i]=115;continue;}
  let lo=6,hi=115;
  for(let j=0;j<18;j++){const mid=(lo+hi)/2,f=force(i,mid);if(f.lateral>f.cap*.985)hi=mid;else lo=mid;}
  lateralLimit[i]=lo;
 }
 const v=Float64Array.from(lateralLimit),initial=Float64Array.from(c.profile.speed);
 for(let i=0;i<n;i++)v[i]=Math.min(v[i],initial[i]*1.18);
 const rolling=.012*m*G;
 const wheelPower=Math.max(300000,c.effectivePower-90000)*car.power;
 function driveAcceleration(i,speed){
  const f=force(i,speed),previousAx=3*G;
  const rearLoad=.55*m*G+.5*f.down+m*previousAx*.30/3.6;
  const traction=f.friction*rearLoad*f.ellipse*driver.traction*car.traction*s.throttle;
  const throttle=s.session==='race'?.985:s.session==='practice'?.97:1;
  const drive=Math.min((wheelPower+kPower[i])*throttle/Math.max(speed,8),traction);
  return (drive-f.drag-rolling)/m;
 }
 function brakeAcceleration(i,speed){
  const f=force(i,speed),bias=s.brakeBias/100;
  let a=Math.min(5*G,(f.cap*f.ellipse+f.drag+rolling)/m);
  for(let j=0;j<3;j++){
   const transfer=m*a*.30/3.6;
   const front=Math.max(1,.45*m*G+.5*f.down+transfer),rear=Math.max(1,.55*m*G+.5*f.down-transfer);
   const brake=Math.min(f.friction*front/bias,f.friction*rear/(1-bias))*f.ellipse*driver.braking*car.braking*s.braking;
   a=Math.max(.5,(brake+f.drag+rolling)/m);
  }
  return a;
 }
 // Periodic boundary passes: the finish speed also constrains the start.
 for(let pass=0;pass<8;pass++){
  if(pass>=3)for(let i=0;i<n;i++){
   const demand=m*(v[(i+1)%n]**2-v[i]**2)/(2*ds)+force(i,v[i]).drag+rolling;
   if(demand<-.02*m*G)drsMask[i]=0;
  }
  for(let i=n-1;i>=0;i--){const next=(i+1)%n,b=brakeAcceleration(i,v[next]);v[i]=Math.min(v[i],lateralLimit[i],Math.sqrt(v[next]**2+2*b*ds));}
  for(let i=0;i<n;i++){const next=(i+1)%n,a=driveAcceleration(i,v[i]);v[next]=Math.max(6,Math.min(v[next],lateralLimit[next],Math.sqrt(Math.max(36,v[i]**2+2*a*ds))));}
  if(pass===3||pass===5){let deployed=0;for(let i=0;i<n;i++)deployed+=kPower[i]*2*ds/(v[i]+v[(i+1)%n]);if(deployed>ES_OUT)for(let i=0;i<n;i++)kPower[i]*=ES_OUT/deployed*.999;}
 }
 const time=new Float64Array(n+1),speed=new Float64Array(n),throttle=new Float64Array(n),brake=new Float64Array(n),gear=new Uint8Array(n),rpm=new Float64Array(n),longitudinal=new Float64Array(n),lateral=new Float64Array(n),drs=new Uint8Array(n),ers=new Float64Array(n),energy=new Float64Array(n),harvest=new Float64Array(n),downforce=new Float64Array(n),drag=new Float64Array(n),sector=new Uint8Array(n);
 let used=0,recovered=0,charge=ES_OUT;
 const shiftSpeed=[0,78,108,148,185,225,270,310];
 for(let i=0;i<n;i++){
  const next=(i+1)%n,dt=2*ds/(v[i]+v[next]),f=force(i,v[i]),ax=(v[next]**2-v[i]**2)/(2*ds);
  time[i+1]=time[i]+dt;speed[i]=v[i]*3.6;longitudinal[i]=ax/G;lateral[i]=f.lateral/(m*G);
  const demand=m*ax+f.drag+rolling,available=(wheelPower+kPower[i])/Math.max(v[i],8);
  throttle[i]=demand>0?clamp(demand/available*100,0,100):0;brake[i]=demand<0?clamp(-demand/(brakeAcceleration(i,v[i])*m)*100,0,100):0;
  drs[i]=f.drs&&brake[i]<2?1:0;
  const power=throttle[i]>10?Math.min(kPower[i]*throttle[i]/100,Math.max(0,(ES_OUT-used)/dt)):0;
  used+=power*dt;ers[i]=power/1000;
  const brakingEnergy=Math.max(0,-demand)*v[i]*.45*.8;
  const recovery=Math.min(MAX_K,brakingEnergy,Math.max(0,(K_IN-recovered)/dt),Math.max(0,(ES_OUT-charge+power*dt)/dt));
  recovered+=recovery*dt;harvest[i]=recovery/1000;charge=clamp(charge+(recovery-power)*dt,0,ES_OUT);energy[i]=charge/1000000;
  let g=1;for(let j=1;j<8;j++)if(speed[i]>shiftSpeed[j])g=j+1;gear[i]=g;rpm[i]=Math.min(15000,(db.gearRpm[g]||40)*speed[i]);
  downforce[i]=f.down;drag[i]=f.drag;sector[i]=i*ds<c.sectors[0]?1:i*ds<c.sectors[1]?2:3;
 }
 if(!Number.isFinite(time[n])||time[n]<20||time[n]>400)throw new Error('The model could not converge for this configuration. Reset conditions and try again.');
 const interpolateTime=distance=>{const x=clamp(distance/ds,0,n),i=Math.min(n-1,Math.floor(x));return time[i]+(time[i+1]-time[i])*(x-i);};
 const sectorTimes=[interpolateTime(c.sectors[0]),interpolateTime(c.sectors[1])-interpolateTime(c.sectors[0]),time[n]-interpolateTime(c.sectors[1])];
 const cornerTimes=c.corners.map((corner,j)=>{
  const prev=c.corners[(j-1+c.corners.length)%c.corners.length],next=c.corners[(j+1)%c.corners.length];
  let p=prev.distance;if(p>corner.distance)p-=c.length;let q=next.distance;if(q<corner.distance)q+=c.length;
  const from=(p+corner.distance)/2,to=(corner.distance+q)/2;
  const at=d=>d<0?interpolateTime(d+c.length)-time[n]:d>c.length?time[n]+interpolateTime(d-c.length):interpolateTime(d);
  let min=500;for(let d=Math.ceil(from/ds);d<=Math.floor(to/ds);d++){const idx=(d%n+n)%n;min=Math.min(min,speed[idx]);}
  return {...corner,from,to,time:at(to)-at(from),minSpeed:min,mode:corner.referenceSpeed<160?'Low speed':corner.referenceSpeed<250?'Medium speed':'High speed',effectiveRadius:curvature[corner.index]?1/curvature[corner.index]:null};
 });
 const warnings=[];
 if(tyre.water>0)warnings.push('Wet behaviour is exploratory: no validated water-depth, aquaplaning or wet driver model.');
 if(s.car!==driver.team&&s.driver!==0)warnings.push('Driver/car transplant: teammate residuals may not transfer to this chassis.');
 if(s.compound!=='soft')warnings.push('Compound grip response is an assumed map; calibration uses soft-tyre qualifying laps.');
 if(s.traffic==='following')warnings.push('Wake and tow are assumed responses, not measured race traffic.');
 if(s.session!=='qualifying')warnings.push('Race/practice utilization is a scenario assumption; validation covers qualifying only.');
 if(s.driver===11&&s.circuit==='silverstone')warnings.push('No matched dry Silverstone sample for Pérez; style comes from three other circuits.');
 const empirical=c.validation?.p90Abs??2;
 const extension=(tyre.water>0?6+10*tyre.water:0)+(s.compound!=='soft'?1.5:0)+(s.traffic==='following'?1:0)+(s.car!==driver.team&&s.driver!==0?1:0)+(s.session!=='qualifying'?2:0)+Math.abs(s.fuel-10)*.02+Math.abs(s.trackTemp-c.baseline.track_temperature)*.03+Math.abs(s.wing)*.4+s.wind*.012;
 return {scenario:s,circuit:c.id,lapTime:time[n],sectors:sectorTimes,corners:cornerTimes,n,ds,time:Array.from(time),speed:Array.from(speed),throttle:Array.from(throttle),brake:Array.from(brake),gear:Array.from(gear),rpm:Array.from(rpm),longitudinal:Array.from(longitudinal),lateral:Array.from(lateral),drs:Array.from(drs),ers:Array.from(ers),energy:Array.from(energy),harvest:Array.from(harvest),downforce:Array.from(downforce),drag:Array.from(drag),sector:Array.from(sector),distance:Array.from({length:n},(_,i)=>i*ds),tyre:tyre,usedEnergy:used/1000000,harvestedEnergy:recovered/1000000,density:rho,mass:m,aero:{clArea,cdArea},wheelPower:wheelPower/1000,uncertainty:empirical+extension,warnings};
}
export function sampleAtTime(result,t){
 const time=clamp(t,0,result.lapTime);let lo=0,hi=result.n;
 while(hi-lo>1){const mid=(lo+hi)>>1;if(result.time[mid]<=time)lo=mid;else hi=mid;}
 const f=(time-result.time[lo])/(result.time[lo+1]-result.time[lo]);return {index:lo,fraction:f,distance:(lo+f)*result.ds,time};
}
export function sampleAtDistance(result,d){
 const x=clamp(d/result.ds,0,result.n-.000001),i=Math.floor(x),f=x-i;
 return {index:i,fraction:f,distance:d,time:result.time[i]+(result.time[i+1]-result.time[i])*f};
}
export function compare(a,b){
 if(a.circuit!==b.circuit)throw new Error('Compare scenarios on the same circuit; circuit changes have no common distance axis.');
 const sectorDeltas=a.sectors.map((v,i)=>v-b.sectors[i]);
 const phases={braking:0,traction:0,cornering:0,straight:0};
 for(let i=0;i<a.n;i++){
  const delta=(a.time[i+1]-a.time[i])-(b.time[i+1]-b.time[i]);
  const phase=a.brake[i]>5?'braking':a.lateral[i]>1.3?'cornering':a.longitudinal[i]>.25?'traction':'straight';phases[phase]+=delta;
 }
 const cornerPhases=a.corners.map(corner=>{
  const sums={braking:0,traction:0,cornering:0,straight:0};
  for(let i=0;i<a.n;i++){
   let d=i*a.ds;if(corner.from<0&&d>corner.to)d-=a.n*a.ds;if(corner.to>a.n*a.ds&&d<corner.from)d+=a.n*a.ds;
   if(d<corner.from||d>=corner.to)continue;
   const phase=a.brake[i]>5?'braking':a.lateral[i]>1.3?'cornering':a.longitudinal[i]>.25?'traction':'straight';
   sums[phase]+=(a.time[i+1]-a.time[i])-(b.time[i+1]-b.time[i]);
  }
  const dominant=Object.entries(sums).sort((x,y)=>Math.abs(y[1])-Math.abs(x[1]))[0];return {phases:sums,dominant:dominant[0],effect:dominant[1]};
 });
 const dominant=Object.entries(phases).sort((x,y)=>Math.abs(y[1])-Math.abs(x[1]))[0];
 const delta=a.lapTime-b.lapTime,verb=delta<0?'gains':'loses',sector=sectorDeltas.reduce((best,x,i)=>Math.abs(x)>Math.abs(sectorDeltas[best])?i:best,0)+1;
 const details=[];
 if(a.scenario.fuel!==b.scenario.fuel)details.push(`${a.scenario.fuel>b.scenario.fuel?'Higher':'Lower'} fuel mass changes exit acceleration and aero load per kilogram.`);
 if(a.scenario.wing!==b.scenario.wing)details.push('Wing changes trade straight-line drag against cornering and braking downforce.');
 if(a.scenario.tyreAge!==b.scenario.tyreAge||a.scenario.compound!==b.scenario.compound)details.push('Tyre grip changes the lateral limit and the traction/braking force reserve.');
 if(a.scenario.driver!==b.scenario.driver)details.push('Teammate-derived corner retention, braking and throttle-pickup residuals change local force utilization.');
 if(a.scenario.car!==b.scenario.car)details.push('The effective car fit changes wheel power, drag, corner grip and braking capacity.');
 if(a.scenario.grip!==b.scenario.grip||a.scenario.rain!==b.scenario.rain||a.scenario.condition!==b.scenario.condition)details.push('Surface grip changes the friction ellipse through cornering, traction and braking.');
 if(a.scenario.ers!==b.scenario.ers)details.push('Deployment changes where electrical wheel power is available within the ES energy budget.');
 return {delta,sectorDeltas,cornerDeltas:a.corners.map((c,i)=>c.time-b.corners[i].time),phases,cornerPhases,explanation:`Scenario A ${verb} ${Math.abs(delta).toFixed(2)} s overall. The largest sector difference is S${sector}; the largest accumulated phase effect is ${dominant[0]} (${signed(dominant[1])} s).`,mechanism:details.join(' ')||'Both scenarios use the same physical configuration; there is no modelled difference.'};
}
export function contributions(db,scenario){
 let current={...defaultScenario(db,scenario.circuit),driver:0,car:'fleet'};
 const base=simulate(db,current,{internal:true}),rows=[];let previous=base;
 const groups=[['Car envelope',['car']],['Driver residual',['driver']],['Fuel mass',['fuel']],['Tyre state',['compound','tyreAge']],['Track & atmosphere',['trackTemp','airTemp','humidity','pressure','grip','rain','condition','wind','windDirection']],['Aero & brake balance',['wing','brakeBias','drs']],['Energy & session',['ers','session']],['Driving margin',['risk','braking','throttle']],['Traffic',['traffic','gap']]];
 for(const [name,keys]of groups){for(const key of keys)current[key]=scenario[key];const next=simulate(db,current,{internal:true});rows.push({name,delta:next.lapTime-previous.lapTime});previous=next;}
 return {base:base.lapTime,rows,total:previous.lapTime,method:'Ordered counterfactual waterfall: car → driver → fuel → tyres → atmosphere → setup → energy → utilization → traffic. Interactions follow this order; bars sum to the total.'};
}
export function sensitivity(db,scenario){
 const base=simulate(db,scenario), steps=[['Fuel','+10 kg','fuel',10],['Tyre age','+5 laps','tyreAge',5],['Track temperature','+10 °C','trackTemp',10],['Wind speed','+10 km/h','wind',10],['Track grip','−1%','grip',-.01],['Rear wing','−1 level','wing',-1]];
 return steps.map(([name,label,key,step])=>{
  const value=scenario[key]+step,[min,max]=ranges[key];if(value<min||value>max)return {name,label,key,delta:null,reason:'At the input limit'};
  const next=simulate(db,{...scenario,[key]:value});return {name,label,delta:next.lapTime-base.lapTime,sectorDeltas:next.sectors.map((v,i)=>v-base.sectors[i]),key};
 });
}
