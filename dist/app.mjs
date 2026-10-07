import {defaultScenario,validateScenario,formatLap,signed,sampleAtTime,sampleAtDistance,MODEL_VERSION,clamp} from './engine.mjs';
import {researchHTML,renderValidation} from './research.mjs';
import {initExperiments} from './lab-ui.mjs';
import {initCompetition} from './compete-ui.mjs';
const $=s=>document.querySelector(s),$$=s=>Array.from(document.querySelectorAll(s));
const escape=s=>String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
let db,a,b,report,worker,workerReady=false,requestId=0,debounce,playing=false,cursorTime=0,lastFrame=0,rafHandle=0,mapPoints=[],mapMode='sectors',view='simulation',toastTimer,storageAvailable=true,busy=false,autoPlay=false;
let channels=['speed','pedals','gear','delta'],observed=false;
const allChannels={speed:['SPEED','km/h'],pedals:['THROTTLE / BRAKE','% effort'],gear:['GEAR','derived'],ers:['ERS DEPLOYMENT','kW · ES only'],delta:['Δ REFERENCE','seconds'],longitudinal:['LONGITUDINAL','g'],lateral:['LATERAL','g'],tyre:['TYRE GRIP INDEX','relative'],rpm:['ENGINE SPEED','rpm · derived'],drs:['DRS / AERO','state']};
let saved=[];
let experiments;
function toast(message){$('#toast').textContent=message;$('#toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').hidden=true,4200);}
function error(message,retry=false){$('#error-banner').style.background='';$('#error-banner').style.borderColor='';$('#error-banner').textContent=message;$('#error-banner').hidden=false;if(retry){const button=document.createElement('button');button.textContent='Retry loading';button.onclick=()=>location.reload();$('#error-banner').append(button);}}
function busyState(on){busy=on;$('.model-state').classList.toggle('busy',on);$('#model-status').textContent=on?'Solving the lap…':'Research snapshot · model ready';$('#run-button').disabled=on;$('#save-current').disabled=on;}
const evidence=(kind,description)=>`<span class="evidence ${kind==='O'?'observed':kind==='E'?'estimate':'assumption'}" title="${escape(description||({O:'Observed or regulated',E:'Estimated from public data',A:'Assumed response; inspect methodology'}[kind]))}">${kind}</span>`;
const selectControl=(side,key,label,options,kind='A',hint='')=>`<div class="control"><label for="${side}-${key}"><span>${label}</span>${evidence(kind)}</label><select id="${side}-${key}" data-side="${side}" data-field="${key}">${options.map(([v,t])=>`<option value="${v}">${escape(t)}</option>`).join('')}</select>${hint?`<p class="control-hint">${hint}</p>`:''}</div>`;
const rangeControl=(side,key,label,min,max,step,unit,kind='A',hint='')=>`<div class="control"><label for="${side}-${key}"><span>${label}</span><output data-output="${side}-${key}"></output></label><input type="range" id="${side}-${key}" data-side="${side}" data-field="${key}" data-unit="${unit}" min="${min}" max="${max}" step="${step}" aria-describedby="${side}-${key}-hint"><div class="range-extents"><span>${min}${unit}</span><span>${max}${unit} ${kind==='A'?'· assumed map':kind==='E'?'· estimate':''}</span></div><p class="control-hint" id="${side}-${key}-hint">${hint||({O:'Input with physical effect in the solver.',E:'Estimated response; see research.',A:'Assumed response; outside independent validation.'}[kind])}</p></div>`;
function controls(side,compact=false){
 const circuit=side==='a'?selectControl(side,'circuit','Circuit',db.circuits.map(c=>[c.id,`${c.name} · ${c.country}`]),'O'):'';
 return `<section class="form-section"><h3>01 / Reference selection ${evidence('O')}</h3>${circuit}${selectControl(side,'driver','Driver',db.drivers.map(d=>[d.id,`${d.code} · ${d.name}`]),'E')}${selectControl(side,'car','2024 car',db.cars.map(c=>[c.id,`${c.name} · ${c.model}`]),'E','Team fit from public telemetry; exact specs unavailable.')}${selectControl(side,'session','Session',[['qualifying','Qualifying · flying lap'],['race','Race · single flying lap'],['practice','Practice · conservative run']],'A')}</section>
 <section class="form-section"><h3>02 / Tyres & fuel ${evidence('A')}</h3><div class="control"><label><span>Tyre compound</span><span class="tyre-allocation" data-allocation="${side}"></span></label><div class="tyre-options" role="group" aria-label="${side.toUpperCase()} tyre compound">${['soft','medium','hard'].map(t=>`<button class="tyre-option" data-side="${side}" data-compound="${t}" aria-pressed="false"><i></i>${t[0].toUpperCase()+t.slice(1)}</button>`).join('')}</div><select class="wet-select" aria-label="${side.toUpperCase()} wet tyre alternatives" data-side="${side}" data-field="compound"><option value="">Intermediate / wet alternatives</option><option value="intermediate">Intermediate · exploratory</option><option value="wet">Wet · exploratory</option></select></div>${rangeControl(side,'tyreAge','Tyre age',0,40,1,' laps','A','Wear curve is assumed; thermal history is unavailable.')}${rangeControl(side,'fuel','Fuel mass',0,110,1,' kg','O','Added to the 798 kg reference dry mass. Constant over this single lap.')}</section>
 <section class="form-section"><h3>03 / Track & conditions ${evidence('A')}</h3>${rangeControl(side,'trackTemp','Track temperature',5,65,1,' °C','A','Thermal correction is centred on the recorded session; not a universal optimum.')}${rangeControl(side,'airTemp','Air temperature',0,50,1,' °C','O','Changes moist-air density and aerodynamic forces.')}${rangeControl(side,'grip','Track grip',.9,1.06,.005,'×','A','Effective grip relative to the recorded reference. Evolution, not an exact surface measurement.')}${selectControl(side,'condition','Track condition',[['dry','Dry'],['damp','Damp · exploratory'],['wet','Wet · exploratory'],['dusty','Dusty / low grip']],'A')}${selectControl(side,'rain','Rainfall / water proxy',[[0,'No rain'],[25,'Light rain · 25% proxy'],[70,'Rain · 70% proxy'],[100,'Heavy rain · 100% proxy']],'A','Water proxy, not a measured rainfall rate. Wet scenarios need suitable tyres.')}</section>
 <details class="form-section"><summary>Atmosphere & wind ${evidence('A')}</summary>${rangeControl(side,'wind','Wind speed',0,60,1,' km/h','A','Local relative-airflow vector. Gusts and yaw response are omitted.')}${selectControl(side,'windDirection','Wind comes from',[[0,'0° · headwind on finish straight'],[90,'90° · right of finish straight'],[180,'180° · tailwind on finish straight'],[270,'270° · left of finish straight']],'A','Direction is relative to the start/finish heading, not geographic north.')}${rangeControl(side,'humidity','Humidity',0,100,1,' %','O')}${rangeControl(side,'pressure','Air pressure',900,1050,1,' hPa','O')}</details>
 <details class="form-section"><summary>Car setup & energy ${evidence('A')}</summary>${rangeControl(side,'wing','Aero trim',-2,2,1,' level','A','Each step: assumed +2% downforce area, +1.5% drag area. No real wing angle is implied.')}${rangeControl(side,'brakeBias','Front brake bias',50,65,.5,' %','A','Axle-limited approximation: assumed CoG, wheelbase and load distribution.')}${selectControl(side,'ers','ERS strategy',[['balanced','Balanced · spread deployment'],['attack','Attack · prioritize acceleration'],['harvest','Conserve · low deployment']],'A','ES-only: 120 kW, 4 MJ ES→K, 2 MJ K→ES limits. MGU-H omitted.')}${selectControl(side,'drs','DRS behaviour',[['auto','Session-eligible zones'],['off','DRS closed']],'O','Race mode needs a following gap ≤1 s. Model disables DRS in wet states.')}<p class="control-hint">Ride height, differential and tyre pressure require unavailable dynamics/maps. <button class="text-button" data-view="research">Why they are deferred ↗</button></p></details>
 <details class="form-section"><summary>Driver & traffic ${evidence('E')}</summary>${rangeControl(side,'risk','Grip utilization / risk',.95,1.01,.005,'×','A','A scenario margin, not a personality score or a probability of crashing.')}${rangeControl(side,'braking','Braking commitment',.90,1,.01,'×','A','Fraction of modeled braking capacity. Pressure and trail braking are not observed.')}${rangeControl(side,'throttle','Exit traction utilization',.90,1,.01,'×','A')}${selectControl(side,'traffic','Air / traffic',[['clean','Clean air'],['following','Following another car']],'A')}${rangeControl(side,'gap','Following gap',.3,5,.1,' s','A','Assumed exponential wake/tow response. Relevant when following.')}</details>`;
}
function unitValue(key,val,unit=''){
 if(['grip','risk','braking','throttle'].includes(key))return `${val.toFixed(3)}×`;
 if(key==='wing')return `${val>0?'+':''}${val} level`;
 return `${Number.isInteger(val)?val:val.toFixed(1)}${unit}`;
}
function syncControls(side){
 const state=side==='a'?a:b;
 $$(`[data-side="${side}"][data-field]`).forEach(el=>{const key=el.dataset.field;el.value=key==='compound'&&!['intermediate','wet'].includes(state[key])?'':state[key];if(el.type==='range'){el.style.setProperty('--range',`${(state[key]-Number(el.min))/(Number(el.max)-Number(el.min))*100}%`);const out=$(`[data-output="${side}-${key}"]`);if(out)out.textContent=unitValue(key,state[key],el.dataset.unit);}});
 $$(`[data-side="${side}"][data-compound]`).forEach(button=>{const active=button.dataset.compound===state.compound;button.classList.toggle('active',active);button.setAttribute('aria-pressed',active);});
 const c=db.circuits.find(c=>c.id===state.circuit);$(`[data-allocation="${side}"]`).textContent=`C${c.allocation[0]}–C${c.allocation[2]}`;
}
function fieldChange(side,key,value){
 if(value==='')return;
 const state=side==='a'?a:b;
 if(key==='circuit'){
  a={...defaultScenario(db,value),driver:a.driver,car:a.car,fuel:a.fuel,tyreAge:a.tyreAge,compound:a.compound,session:a.session};b=defaultScenario(db,value);pause();cursorTime=0;
 }else state[key]=['driver','rain','windDirection'].includes(key)||Object.hasOwn(state,key)&&typeof state[key]==='number'?Number(value):value;
 syncControls('a');syncControls('b');clearTimeout(debounce);debounce=setTimeout(runModel,110);
}
function runModel(){
 if(!db)return;
 clearTimeout(debounce);pause();const id=++requestId;
 try{a=validateScenario(db,a);b=validateScenario(db,b);}catch(e){busyState(false);error(`${e.message} The previous valid result is still visible.`);$('#model-status').textContent='Configuration needs attention';autoPlay=false;$('#save-current').disabled=true;return;}
 $('#error-banner').hidden=true;busyState(true);
 if(workerReady)worker.postMessage({type:'run',id,a,b});else fallbackRun(id);
}
async function fallbackRun(id){
 try{await new Promise(r=>setTimeout(r,20));const {run}=await import('./worker.mjs');const r=run(db,a,b);receive({type:'result',id,...r});}catch(e){receive({type:'error',id,message:e.message});}
}
function receive(data){
 if(data.type==='ready'){workerReady=true;runModel();return;}
 if(data.id!==requestId)return;
 busyState(false);
 if(data.type==='error'){error(`Simulation error: ${data.message} Your inputs are preserved. Use Reset to recover.`);autoPlay=false;return;}
 report=data;cursorTime=clamp(cursorTime||report.result.lapTime*.38,0,report.result.lapTime);renderResult();
 if(autoPlay){autoPlay=false;cursorTime=0;play();}
}
function setView(next){
 if(!['simulation','compare','sensitivity','experiments','compete','research'].includes(next))next='simulation';view=next;
 document.body.dataset.activeView=next;
 $$('.view').forEach(el=>el.hidden=el.id!==`${next}-view`);$$('.nav-item').forEach(btn=>btn.classList.toggle('active',btn.dataset.view===next));
 const titles={simulation:['Every millisecond has a reason','Change the conditions. Trace the difference. Understand the lap.'],compare:['Same circuit. Different possibilities','Compare the local physics, not just the final number.'],sensitivity:['Make one change. Follow its effect','A laboratory for circuit-specific sensitivity.'],experiments:['Explore the performance landscape','Parameter sweeps and transparent multi-lap projections.'],compete:['The fastest idea wins','A private, five-round setup duel. Let the lap decide.'],research:['The evidence behind the estimate','Physics, public observations and explicit assumptions.']};
 $('#page-title').innerHTML=`${titles[next][0]}<span>.</span>`;$('#page-description').textContent=titles[next][1];
 if(next!=='simulation')pause();
 history.replaceState(null,'',`#${next}`);if(report)updateCursor();
}
function flag(code){
 if(code==='GB')return `<svg viewBox="0 0 60 40"><rect width="60" height="40" fill="#283e61"/><path d="m0 0 60 40M60 0 0 40" stroke="#e0e6e8" stroke-width="10"/><path d="m0 0 60 40M60 0 0 40" stroke="#b65b60" stroke-width="3"/><path d="M30 0v40M0 20h60" stroke="#e4e6e2" stroke-width="14"/><path d="M30 0v40M0 20h60" stroke="#b65b60" stroke-width="8"/></svg>`;
 if(code==='IT')return '<svg viewBox="0 0 60 40"><path fill="#5c9d80" d="M0 0h20v40H0z"/><path fill="#e7e8df" d="M20 0h20v40H20z"/><path fill="#c77777" d="M40 0h20v40H40z"/></svg>';
 if(code==='MC')return '<svg viewBox="0 0 60 40"><path fill="#c67977" d="M0 0h60v20H0z"/><path fill="#e9e6df" d="M0 20h60v20H0z"/></svg>';
 return '<svg viewBox="0 0 60 40"><path fill="#c47b7b" d="M0 0h60v40H0z"/><path fill="#ece9e1" d="M0 0h20l7 4-7 4 7 4-7 4 7 4-7 4 7 4-7 4 7 4-7 4H0z"/></svg>';
}
function renderResult(){
 const {result:r,reference:ref,contribution:cont}=report,c=db.circuits.find(c=>c.id===a.circuit);
 $('#country-flag').innerHTML=flag(c.code);$('#circuit-country').textContent=c.country.toUpperCase();$('#circuit-title').textContent=c.name;
 const drsCount={silverstone:2,monza:2,monaco:1,bahrain:3}[c.id];
 $('#circuit-facts').innerHTML=`<span><b>${(c.length/1000).toFixed(3)}</b> km</span><span><b>${c.turns}</b> corners</span><span><b>${drsCount}</b> DRS zones</span><span>2024 layout</span>`;
 $('#predicted-lap').textContent=formatLap(r.lapTime);$('#uncertainty').textContent=`±${r.uncertainty.toFixed(1)} s indicative error envelope`;
 const delta=r.lapTime-ref.lapTime;$('#lap-delta').textContent=`${signed(delta)} s`;$('#lap-delta').className=delta<0?'gain':'loss';
 $('#sector-results').innerHTML=r.sectors.map((v,i)=>`<div class="sector-row" data-sector="${i+1}"><span><i class="s${i+1}"></i>S${i+1}</span><b>${v.toFixed(2)} s</b><span class="${v<ref.sectors[i]?'gain':'loss'}">${signed(v-ref.sectors[i])}</span></div>`).join('');
 $('#base-potential').textContent=formatLap(cont.base);
 const displayRows=cont.rows.slice(0,7);displayRows.push({name:'Utilization & traffic',delta:cont.rows.slice(7).reduce((sum,x)=>sum+x.delta,0)});
 $('#contributions').innerHTML=displayRows.map((x,i)=>`<div class="contribution-row"><span>${evidence(i<2?'E':'A')}${x.name}</span><i class="factor-bar" style="width:${Math.min(40,Math.abs(x.delta)*23)}px;background:${x.delta<0?'#769e8c':'#a07960'}"></i><b class="${x.delta<0?'gain':Math.abs(x.delta)>.005?'loss':''}">${signed(x.delta)} s</b></div>`).join('');
 $('#lap-scrub').max=c.length;$('#lap-duration').textContent=`/ ${formatLap(r.lapTime)}`;$('#telemetry-resolution').textContent=`600 spatial samples · ${(c.length/600).toFixed(1)} m spacing`;
 $('#telemetry-subtitle').textContent=`Modelled channels · ${c.name} · synchronized to circuit position`;
 $('#mobile-config-summary').textContent=`${db.drivers.find(d=>d.id===a.driver).code} / ${db.cars.find(c=>c.id===a.car).model} · ${a.compound} · ${a.fuel} kg`;$('#mobile-lap-value').textContent=formatLap(r.lapTime);$('#mobile-lap-envelope').textContent=`±${r.uncertainty.toFixed(1)} s estimate`;
 $('#corner-count').textContent=`${c.turns} CORNERS`;
 $('#corner-rows').innerHTML=r.corners.map((x,i)=>`<tr data-seek="${x.distance}"><td><span class="turn-tag">T${x.number.toString().padStart(2,'0')}</span>${escape(x.name)}</td><td>${x.mode}</td><td>${x.minSpeed.toFixed(0)} km/h</td><td>${x.time.toFixed(2)} s</td><td class="${x.time<ref.corners[i].time?'gain':'loss'}">${signed(x.time-ref.corners[i].time)} s</td></tr>`).join('');
 renderFingerprint();drawTrack();renderCharts();renderComparison();renderSensitivity();renderResearchParameters();updateCursor();
 experiments?.update(a);
 if(r.warnings.length){$('#error-banner').innerHTML=`<strong>Exploratory configuration.</strong> ${r.warnings.map(escape).join(' ')}`;$('#error-banner').hidden=false;$('#error-banner').style.background='#342d23';$('#error-banner').style.borderColor='#776044';}else{$('#error-banner').style.background='';$('#error-banner').style.borderColor='';}
}
function renderFingerprint(){
 const d=db.drivers.find(d=>d.id===a.driver),car=db.cars.find(c=>c.id===a.car);
 const rows=[['Low-speed retention',d.low],['High-speed retention',d.high],['Braking utilization',d.braking],['Throttle pickup proxy',d.traction]];
 $('#driver-fingerprint').innerHTML=`<div class="driver-profile"><h3>${escape(d.name)}</h3><p>${d.samples} early soft laps · ${d.circuits} circuits · 2024</p>${rows.map(([name,val])=>`<div class="fingerprint-row"><span>${name}</span><b>${signed((val-1)*100)}%</b></div>`).join('')}<p class="small-note">Estimated differences from the original teammate mean, shrunk toward zero. Car, setup, preparation and conditions remain confounded.</p><p class="small-note">Selected car: ${escape(car.model)}. No measured steering, brake pressure, trail-braking intensity or universal wet/risk score.</p></div>`;
}
function drawTrack(){
 if(!report)return;const c=db.circuits.find(c=>c.id===a.circuit),p=c.profile,theta=({silverstone:99,monza:96,monaco:145,bahrain:93}[c.id])*Math.PI/180;
 const xy=p.x.map((x,i)=>[x*Math.cos(theta)-p.y[i]*Math.sin(theta),-(x*Math.sin(theta)+p.y[i]*Math.cos(theta))]);
 const minx=Math.min(...xy.map(p=>p[0])),maxx=Math.max(...xy.map(p=>p[0])),miny=Math.min(...xy.map(p=>p[1])),maxy=Math.max(...xy.map(p=>p[1]));
 const scale=Math.min(730/(maxx-minx),362/(maxy-miny)),cx=(minx+maxx)/2,cy=(miny+maxy)/2;
 mapPoints=xy.map(([x,y])=>[(x-cx)*scale+450,(y-cy)*scale+254]);
 const poly=points=>points.map(p=>p.map(v=>v.toFixed(2)).join(',')).join(' '), closed=[...mapPoints,mapPoints[0]];
 let html=`<polyline class="track-underlay" points="${poly(closed)}" fill="none" stroke="#090e11" stroke-width="17" stroke-linejoin="round"/><polyline class="track-road" points="${poly(closed)}" fill="none" stroke="#3d474e" stroke-width="10" stroke-linejoin="round"/>`;
 if(mapMode==='sectors'){
  const stops=[0,Math.round(c.sectors[0]/c.length*600),Math.round(c.sectors[1]/c.length*600),600],colors=['#eaa066','#74bcc6','#91a6b5'];
  for(let s=0;s<3;s++)html+=`<polyline class="track-sector-${s+1}" points="${poly(closed.slice(stops[s],stops[s+1]+1))}" fill="none" stroke="${colors[s]}" stroke-width="4.4" stroke-linejoin="round"/>`;
 }else{
  const speeds=report.result.speed,min=Math.min(...speeds),max=Math.max(...speeds);
  for(let i=0;i<600;i++){const hue=195-(speeds[i]-min)/(max-min)*166;html+=`<path d="M${poly([mapPoints[i]])}L${poly([mapPoints[(i+1)%600]])}" stroke="hsl(${hue},60%,64%)" stroke-width="5"/>`;}
 }
 for(let i=0;i<600;i++)if(c.profile.drs[i]){const q=mapPoints[(i+1)%600],p=mapPoints[i];html+=`<path class="track-drs" d="M${p[0].toFixed(1)},${p[1].toFixed(1)}L${q[0].toFixed(1)},${q[1].toFixed(1)}" stroke="#9db7a6" stroke-width="1" stroke-dasharray="3 3" transform="translate(2 2)"/>`;}
 for(const corner of c.corners){const [x,y]=mapPoints[corner.index],vx=x-450,vy=y-254,dist=Math.hypot(vx,vy)||1;html+=`<text class="turn-number" x="${x+vx/dist*20}" y="${y+vy/dist*20+4}" text-anchor="middle">${corner.number}</text>`;}
 const keyNames={silverstone:[5,8,11,14],monza:[2,5,10],monaco:[5,8,11,16],bahrain:[0,7,9,13]};
 for(const idx of keyNames[c.id]){const corner=c.corners[idx],[x,y]=mapPoints[corner.index],vx=x-450,vy=y-254,dist=Math.hypot(vx,vy)||1;const name=c.id==='silverstone'&&idx===11?'Maggotts / Becketts':corner.name;html+=`<text class="track-label" x="${x+vx/dist*52}" y="${y+vy/dist*44}" text-anchor="middle">${escape(name.toUpperCase())}</text>`;}
 const [sx,sy]=mapPoints[0],q=mapPoints[2],angle=Math.atan2(q[1]-sy,q[0]-sx)*180/Math.PI;
 html+=`<g transform="translate(${sx},${sy}) rotate(${angle})"><path d="M0-10V10" stroke="#c9d1cc" stroke-width="3"/><path d="M-1-8v4m0 4v4" stroke="#111a1e" stroke-width="3"/></g><text class="track-label" x="${sx-14}" y="${sy+27}" text-anchor="end">START / FINISH</text>`;
 $('#track-content').innerHTML=html;updateCursor();
}
function buildPath(values,min,max,h,step=false){
 const top=8,bottom=h-8,range=max-min||1;
 let path='';
 for(let i=0;i<values.length;i++){const x=i/(values.length-1)*1000,y=bottom-(clamp(values[i],min,max)-min)/range*(bottom-top);path+=(i===0?`M${x.toFixed(1)},${y.toFixed(1)}`:step?`H${x.toFixed(1)}V${y.toFixed(1)}`:`L${x.toFixed(1)},${y.toFixed(1)}`);}
 return path;
}
function chartData(channel,r,ref){
 if(channel==='pedals')return {values:r.throttle,other:ref.throttle,secondary:r.brake,min:0,max:100,height:54};
 if(channel==='delta')return {values:r.time.slice(0,-1).map((t,i)=>t-ref.time[i]),other:null,min:Math.min(-.15,...r.time.map((t,i)=>t-ref.time[i]))*.1-0.1,max:Math.max(.15,...r.time.map((t,i)=>t-ref.time[i]))+.1,height:55};
 if(channel==='tyre')return {values:Array(600).fill(r.tyre.multiplier),other:Array(600).fill(ref.tyre.multiplier),min:Math.min(.6,r.tyre.multiplier-.03),max:1.08,height:50};
 const values=r[channel],other=ref[channel],bounds={speed:[40,Math.max(350,...values,...other),135],gear:[0,9,48],ers:[0,125,65],longitudinal:[-6,3,70],lateral:[0,6,70],rpm:[5000,15000,70],drs:[-.1,1.2,44]};const [min,max,height]=bounds[channel];return {values,other,min,max,height,step:['gear','drs'].includes(channel)};
}
function chartMarkup(channel,r,ref,comparison=false){
 const d=chartData(channel,r,ref),[label,unit]=allChannels[channel];
 if(channel==='delta'){d.min=Math.min(-.15,...d.values)-.1;d.max=Math.max(.15,...d.values)+.1;}
 const colorB=comparison?'style="stroke:#80cbd2;stroke-dasharray:none"':'';
 let grid='';for(let i=0;i<=10;i++)grid+=`<line x1="${i*100}" x2="${i*100}" y1="0" y2="${d.height}" class="chart-grid"/>`;for(let i=1;i<4;i++)grid+=`<line x1="0" x2="1000" y1="${d.height*i/4}" y2="${d.height*i/4}" class="chart-grid"/>`;
 let historical='';
 if(observed&&!comparison){const source=db.circuits.find(c=>c.id===a.circuit).observed;let vals=source[channel];if(channel==='pedals')vals=source.throttle;if(channel==='delta')vals=source.time.map((t,i)=>t-ref.time[i]);if(vals)historical=`<path class="trace-observed" d="${buildPath(vals,d.min,d.max,d.height,d.step)}"/>`;}
 return `<div class="chart-row" data-channel="${channel}" data-comparison="${comparison}"><div class="chart-label"><span>${label}${comparison&&channel==='delta'?' A−B':''}</span><b data-chart-value="${channel}" data-comparison="${comparison}">—</b><small>${unit}</small></div><svg class="chart-area" style="height:${d.height}px" viewBox="0 0 1000 ${d.height}" preserveAspectRatio="none" aria-label="${label} over lap distance">${grid}${d.other?`<path class="trace-b" ${colorB} d="${buildPath(d.other,d.min,d.max,d.height,d.step)}"/>`:''}${historical}<path class="trace-a" d="${buildPath(d.values,d.min,d.max,d.height,d.step)}"/>${d.secondary?`<path class="trace-secondary" d="${buildPath(d.secondary,d.min,d.max,d.height)}"/>`:''}<line class="cursor-line" x1="0" x2="0" y1="0" y2="${d.height}"/></svg></div>`;
}
function ruler(){const c=db.circuits.find(c=>c.id===a.circuit);return `<div class="distance-ruler"><span>0 m</span>${[1,2,3,4,5].map(i=>`<span>${Math.round(c.length*i/6).toLocaleString()}</span>`).join('')}<span>${c.length.toLocaleString()} m</span></div>`;}
function renderCharts(){
 const c=db.circuits.find(c=>c.id===a.circuit);
 const stripe=`<div class="corner-stripe"><svg viewBox="0 0 1000 27" preserveAspectRatio="none">${c.corners.map(corner=>`<line x1="${corner.distance/c.length*1000}" x2="${corner.distance/c.length*1000}" y1="18" y2="27" stroke="#4d5c66"/><text x="${corner.distance/c.length*1000}" y="12" text-anchor="middle" fill="#929da5" style="font:8px 'IBM Plex Mono',monospace">${corner.number}</text>`).join('')}</svg></div>`;
 $('#telemetry-charts').innerHTML=stripe+channels.map(ch=>chartMarkup(ch,report.result,report.reference)).join('')+ruler();
 $('#observed-key').hidden=!observed;
}
function renderComparison(){
 const d=db.drivers.find(d=>d.id===a.driver),car=db.cars.find(c=>c.id===a.car),c=db.circuits.find(c=>c.id===a.circuit),{result:r,other:o,comparison:cmp}=report;
 $('#compare-a-summary').innerHTML=`<div class="compare-summary"><div class="lap-number">${formatLap(r.lapTime)}</div><h3>${escape(d.name)} / ${escape(car.model)}</h3><p>${c.name} · ${a.compound} · ${a.tyreAge} tyre laps · ${a.fuel} kg fuel<br>${a.trackTemp.toFixed(1)} °C track · ${a.airTemp.toFixed(1)} °C air · ${a.condition}<br>${a.ers} deployment · aero trim ${a.wing>0?'+':''}${a.wing}</p><button class="button quiet" data-view="simulation">Edit Scenario A ↗</button><p class="small-note">±${r.uncertainty.toFixed(1)} s indicative envelope. These deltas describe the model, not guaranteed real-world gains.</p></div>`;
 $('#comparison-delta').textContent=`${signed(cmp.delta)} s`;$('#comparison-delta').className=cmp.delta<0?'gain':'loss';
 $('#comparison-mechanism').innerHTML=`${escape(cmp.explanation)}<br><br>${escape(cmp.mechanism)}`;
 $('#comparison-sectors').innerHTML=`<div class="comparison-sector header"><span>SECTOR</span><span>A</span><span>B</span><span>Δ A−B</span></div>`+r.sectors.map((t,i)=>`<div class="comparison-sector"><span>S${i+1}</span><span>${t.toFixed(2)}</span><span>${o.sectors[i].toFixed(2)}</span><span class="${cmp.sectorDeltas[i]<0?'gain':'loss'}">${signed(cmp.sectorDeltas[i])}</span></div>`).join('');
 $('#compare-charts').innerHTML=['speed','delta'].map(ch=>chartMarkup(ch,r,o,true)).join('')+ruler();
 $('#compare-corners').innerHTML=r.corners.map((corner,i)=>{const delta=cmp.cornerDeltas[i],phase=cmp.cornerPhases[i].dominant;return `<tr data-seek="${corner.distance}"><td><span class="turn-tag">T${corner.number}</span>${escape(corner.name)}</td><td>${corner.time.toFixed(2)} s</td><td>${o.corners[i].time.toFixed(2)} s</td><td class="${delta<0?'gain':'loss'}">${signed(delta)} s</td><td>${phase}</td></tr>`;}).join('');
}
function renderSensitivity(){
 const c=db.circuits.find(c=>c.id===a.circuit),rows=[...report.sensitivity].sort((x,y)=>Math.abs(y.delta||0)-Math.abs(x.delta||0)),max=Math.max(...rows.map(x=>Math.abs(x.delta||0)));
 $('#sensitivity-circuit').textContent=`${c.name} / sensitivity`;
 $('#sensitivity-baseline').innerHTML=`<b>${formatLap(report.result.lapTime)}</b> Current Scenario A · ${a.fuel} kg fuel · ${a.compound} · ${a.tyreAge} tyre laps · ${a.trackTemp.toFixed(1)} °C track`;
 $('#sensitivity-rows').innerHTML=rows.map((x,i)=>`<div class="sensitivity-row"><h3>${x.name} ${evidence(x.key==='fuel'?'E':'A')}</h3><span>${x.label}</span><div class="sensitivity-bar"><i style="width:${Math.abs(x.delta||0)/max*100}%;background:${x.delta<0?'#93cbb2':'#ffa65f'}"></i></div><b class="${x.delta<0?'gain':'loss'}">${x.delta===null?'N/A':signed(x.delta)+' s'}</b><small>${x.delta===null?x.reason:`Sector effects: ${x.sectorDeltas.map((d,j)=>`S${j+1} ${signed(d)} s`).join(' · ')} · modelled estimate`}</small></div>`).join('');
}
function renderResearchParameters(){
 if(!report)return;const r=report.result,c=db.circuits.find(c=>c.id===a.circuit);
 const el=$('#current-parameters');if(el)el.innerHTML=[['Reference dry mass','798 kg · regulated'],['Current mass',`${r.mass.toFixed(0)} kg`],['Moist air density',`${r.density.toFixed(3)} kg/m³`],['Effective CL·A',`${r.aero.clArea.toFixed(2)} m² · assumed`],['Effective CD·A',`${r.aero.cdArea.toFixed(2)} m² · fitted`],['Effective ICE wheel power',`${r.wheelPower.toFixed(0)} kW · inferred`],['Curvature fit multiplier',`${c.calibration.toFixed(3)} · calibrated`],['ES→K deployed',`${r.usedEnergy.toFixed(2)} / 4 MJ`],['K→ES recovered',`${r.harvestedEnergy.toFixed(2)} / 2 MJ`],['Tyre grip index',`${r.tyre.multiplier.toFixed(3)} · assumed map`]].map(([name,value])=>`<div class="parameter-row"><span>${name}</span><b>${value}</b></div>`).join('');
}
function updateCursor(){
 if(!report)return;const r=report.result,c=db.circuits.find(c=>c.id===r.circuit),sample=sampleAtTime(r,cursorTime),i=sample.index,f=sample.fraction,j=(i+1)%600;
 const interpolate=arr=>arr[i]*(1-f)+arr[j]*f;
 $('#live-speed').textContent=interpolate(r.speed).toFixed(0);$('#live-gear').textContent=r.gear[i];$('#live-throttle').textContent=`${interpolate(r.throttle).toFixed(0)}%`;$('#live-brake').textContent=`${interpolate(r.brake).toFixed(0)}%`;
 $('#throttle-meter').style.width=`${interpolate(r.throttle)}%`;$('#brake-meter').style.width=`${interpolate(r.brake)}%`;$('#live-drs').textContent=r.drs[i]?'DRS OPEN':'DRS CLOSED';$('#live-drs').style.color=r.drs[i]?'var(--green)':'var(--muted)';$('#live-ers').textContent=`${r.ers[i].toFixed(0)} kW · ${r.energy[i].toFixed(1)} MJ`;
 $('#elapsed').textContent=formatLap(sample.time).padStart(8,'0');$('#lap-scrub').value=sample.distance;$('#lap-scrub').style.setProperty('--range',`${sample.distance/c.length*100}%`);$('#lap-scrub').setAttribute('aria-valuetext',`${sample.distance.toFixed(0)} metres, sector ${r.sector[i]}, ${r.speed[i].toFixed(0)} kilometres per hour`);
 const closest=c.corners.reduce((best,corner)=>Math.abs(corner.distance-sample.distance)<Math.abs(best.distance-sample.distance)?corner:best,c.corners[0]);$('#cursor-corner').textContent=`T${closest.number} · ${closest.name}`;$('#cursor-distance').textContent=`${sample.distance.toFixed(0)} / ${c.length} m`;$('#cursor-sector').textContent=`SECTOR ${r.sector[i]}`;
 const refSample=sampleAtDistance(report.reference,sample.distance),delta=sample.time-refSample.time;$('#cursor-delta').textContent=`${signed(delta)} s`;$('#cursor-delta').className=delta<0?'gain':'loss';
 $$('.sector-row').forEach(el=>el.classList.toggle('current',Number(el.dataset.sector)===r.sector[i]));
 const x=sample.distance/c.length*1000;$$('.cursor-line').forEach(line=>{line.setAttribute('x1',x);line.setAttribute('x2',x);});
 $$('[data-chart-value]').forEach(el=>{const ch=el.dataset.chartValue,other=el.dataset.comparison==='true'?report.other:report.reference;let val;if(ch==='pedals')val=`${r.throttle[i].toFixed(0)} / ${r.brake[i].toFixed(0)}`;else if(ch==='delta')val=signed(r.time[i]-other.time[i]);else if(ch==='tyre')val=r.tyre.multiplier.toFixed(3);else if(ch==='drs')val=r.drs[i]?'OPEN':'CLOSED';else val=r[ch][i].toFixed(['lateral','longitudinal'].includes(ch)?2:0);el.textContent=val;});
 if(mapPoints.length){const p=mapPoints[i],q=mapPoints[j],cx=p[0]*(1-f)+q[0]*f,cy=p[1]*(1-f)+q[1]*f,angle=Math.atan2(q[1]-p[1],q[0]-p[0])*180/Math.PI;$('#car-marker').setAttribute('transform',`translate(${cx},${cy}) rotate(${angle})`);$('#track-cursor').setAttribute('transform',`translate(${cx},${cy})`);const ghost=sampleAtTime(report.reference,Math.min(sample.time,report.reference.lapTime)),gp=mapPoints[ghost.index],gq=mapPoints[(ghost.index+1)%600];$('#ghost-car').setAttribute('transform',`translate(${gp[0]*(1-ghost.fraction)+gq[0]*ghost.fraction},${gp[1]*(1-ghost.fraction)+gq[1]*ghost.fraction})`);}
}
function pause(){playing=false;cancelAnimationFrame(rafHandle);$('#play-button').setAttribute('aria-label','Play simulated lap');$('#play-button').innerHTML='<svg viewBox="0 0 20 20"><path d="m6 3 11 7-11 7z"/></svg>';$('#replay-state').textContent='MODEL REPLAY';}
function play(){if(!report||busy)return;if(cursorTime>=report.result.lapTime-.1)cursorTime=0;playing=true;lastFrame=0;$('#play-button').setAttribute('aria-label','Pause simulated lap');$('#play-button').innerHTML='<svg viewBox="0 0 20 20"><path d="M4 3h4v14H4zM12 3h4v14h-4z"/></svg>';$('#replay-state').textContent='REPLAY RUNNING';rafHandle=requestAnimationFrame(frame);}
function frame(now){if(!playing)return;if(lastFrame)cursorTime+=Math.min(.15,(now-lastFrame)/1000)*Number($('#playback-rate').value);lastFrame=now;if(cursorTime>=report.result.lapTime){cursorTime=report.result.lapTime;pause();}updateCursor();if(playing)rafHandle=requestAnimationFrame(frame);}
function seek(distance){if(!report)return;pause();cursorTime=sampleAtDistance(report.result,distance).time;updateCursor();}
function info(title,html){$('#info-title').textContent=title;$('#info-content').innerHTML=html;$('#info-dialog').showModal();}
function download(name,contents,type='application/json'){const url=URL.createObjectURL(new Blob([contents],{type})),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function loadSaved(){
 try{const raw=localStorage.getItem('laplab-scenarios-v1');if(raw){const parsed=JSON.parse(raw);if(!Array.isArray(parsed)||parsed.length>50)throw Error('Invalid scenario store');saved=parsed.map(record=>({...record,scenario:validateScenario(db,record.scenario)})).filter(x=>typeof x.name==='string'&&typeof x.id==='string'&&x.model===MODEL_VERSION);}}
 catch(e){saved=[];toast('Saved scenarios could not be read. The simulation is available; import a backup if needed.');}
 renderSaved();
}
function persistSaved(){try{localStorage.setItem('laplab-scenarios-v1',JSON.stringify(saved));return true;}catch(e){storageAvailable=false;toast('Browser storage is unavailable. These scenarios are held in memory; export JSON to keep them.');return false;}}
function renderSaved(){
 $('#saved-count').textContent=saved.length;
 $('#scenario-list').innerHTML=saved.length?saved.map(s=>{const c=db.circuits.find(c=>c.id===s.scenario.circuit),d=db.drivers.find(d=>d.id===s.scenario.driver);return `<article class="scenario-card"><h3>${escape(s.name)}</h3><p>${c.name} · ${d.code} · ${s.scenario.compound} · ${s.scenario.fuel} kg · ${s.scenario.trackTemp.toFixed(1)} °C track${s.lapTime?` · ${formatLap(s.lapTime)}`:''}</p><div class="scenario-actions"><button class="button quiet" data-load-scenario="${escape(s.id)}" data-target="a">Load as A</button><button class="button quiet" data-load-scenario="${escape(s.id)}" data-target="b">Compare as B</button><button class="text-button" data-delete-scenario="${escape(s.id)}">Delete</button></div></article>`;}).join(''):'<div class="empty-state"><svg viewBox="0 0 40 40"><path d="M11 6h18v28l-9-6-9 6z"/></svg>No saved scenarios yet.<br>Give this configuration a name and build your experiment notebook.</div>';
}
function openSaved(){if(!db)return;const c=db.circuits.find(c=>c.id===a.circuit),d=db.drivers.find(d=>d.id===a.driver);$('#scenario-name').value=`${c.name} — ${d.code} — ${a.compound} — ${a.fuel} kg`;renderSaved();$('#scenario-dialog').showModal();}
function bind(){
 document.addEventListener('click',e=>{
  const nav=e.target.closest('[data-view]');if(nav){setView(nav.dataset.view);if(nav.dataset.close)$(`#${nav.dataset.close}`).close();return;}
  const close=e.target.closest('[data-close]');if(close){$(`#${close.dataset.close}`).close();return;}
  const tyre=e.target.closest('[data-compound]');if(tyre){fieldChange(tyre.dataset.side,'compound',tyre.dataset.compound);return;}
  const mode=e.target.closest('[data-map]');if(mode){mapMode=mode.dataset.map;$$('[data-map]').forEach(btn=>btn.classList.toggle('active',btn===mode));drawTrack();return;}
  const point=e.target.closest('[data-seek]');if(point){seek(Number(point.dataset.seek));if(view==='compare'){const c=db.circuits.find(c=>c.id===a.circuit),idx=c.corners.findIndex(x=>x.distance===Number(point.dataset.seek)),x=report.comparison.cornerPhases[idx];$('#comparison-focus').textContent=`T${c.corners[idx].number} · ${c.corners[idx].name}: A minus B ${signed(report.comparison.cornerDeltas[idx])} s. Largest accumulated phase effect: ${x.dominant}, ${signed(x.effect)} s.`;$('#compare-charts').scrollIntoView({behavior:'smooth',block:'center'});}return;}
  const load=e.target.closest('[data-load-scenario]');if(load){const record=saved.find(s=>s.id===load.dataset.loadScenario);if(!record)return;if(load.dataset.target==='b'&&record.scenario.circuit!==a.circuit){toast('Open this circuit as A first. Different circuits have no shared comparison distance axis.');return;}if(load.dataset.target==='a'){a={...record.scenario};b=defaultScenario(db,a.circuit);setView('simulation');}else{b={...record.scenario};setView('compare');}syncControls('a');syncControls('b');$('#scenario-dialog').close();runModel();return;}
  const del=e.target.closest('[data-delete-scenario]');if(del){saved=saved.filter(s=>s.id!==del.dataset.deleteScenario);persistSaved();renderSaved();toast('Scenario removed.');}
 });
 document.addEventListener('input',e=>{const el=e.target;if(el.matches('[data-field][type=range]'))fieldChange(el.dataset.side,el.dataset.field,Number(el.value));});
 document.addEventListener('change',e=>{const el=e.target;if(el.matches('select[data-field]'))fieldChange(el.dataset.side,el.dataset.field,el.value);});
 $('#mobile-config-toggle').onclick=()=>{const panel=$('.configuration'),expanded=panel.classList.toggle('mobile-open');$('#mobile-config-toggle').setAttribute('aria-expanded',String(expanded));$('#mobile-config-toggle').textContent=expanded?'Hide inputs −':'Edit inputs +';};
 $('#run-button').onclick=()=>{autoPlay=true;setView('simulation');cursorTime=0;runModel();};$('#reset-button').onclick=()=>{a=defaultScenario(db,a.circuit);syncControls('a');runModel();};
 $('#play-button').onclick=()=>playing?pause():play();$('#rewind-button').onclick=()=>seek(0);$('#lap-scrub').oninput=e=>seek(Number(e.target.value));
 $('#track-svg').addEventListener('pointerdown',e=>{if(!report)return;const svg=$('#track-svg'),point=new DOMPoint(e.clientX,e.clientY).matrixTransform(svg.getScreenCTM().inverse());let nearest=0,min=Infinity;for(let i=0;i<mapPoints.length;i++){const d=(mapPoints[i][0]-point.x)**2+(mapPoints[i][1]-point.y)**2;if(d<min){min=d;nearest=i;}}seek(nearest*report.result.ds);});
 document.addEventListener('pointermove',e=>{const chart=e.target.closest('.chart-area');if(chart&&report&&e.pointerType!=='touch'){const rect=chart.getBoundingClientRect();seek(clamp((e.clientX-rect.left)/rect.width,0,1)*db.circuits.find(c=>c.id===a.circuit).length);}});
 document.addEventListener('pointerdown',e=>{const chart=e.target.closest('.chart-area');if(chart&&report){const rect=chart.getBoundingClientRect();seek(clamp((e.clientX-rect.left)/rect.width,0,1)*db.circuits.find(c=>c.id===a.circuit).length);}});
 $('#observed-toggle').onchange=e=>{observed=e.target.checked;renderCharts();updateCursor();};$('#channels-button').onclick=()=>$('#channel-picker').hidden=!$('#channel-picker').hidden;
 $('#channel-picker').innerHTML=Object.entries(allChannels).map(([key,[label]])=>`<label><input type="checkbox" value="${key}" ${channels.includes(key)?'checked':''}>${label.toLowerCase()}</label>`).join('');
 $('#channel-picker').onchange=e=>{if(!e.target.matches('input'))return;const selected=$$('#channel-picker input:checked').map(el=>el.value);if(!selected.length){e.target.checked=true;toast('Keep at least one telemetry channel visible.');return;}channels=selected;renderCharts();updateCursor();};
 $('#uncertainty-info').onclick=()=>info('How to read the error envelope',`<p>The starting envelope is the 90th percentile absolute error of later qualifying laps on this circuit: <b>${db.circuits.find(c=>c.id===a.circuit).validation.p90Abs.toFixed(2)} s</b>. These laps were excluded from parameter fitting.</p><p>Heuristic extensions cover fuel, temperature, wing, wind, wet/compound, traffic and transplanted driver/car experiments. They are explicit assumptions. This is <b>not a statistical confidence interval</b>, and it does not validate every sensitivity curve.</p><p>Hundredths are useful for comparing solver runs; the real-world estimate has much lower precision. The held-out errors have a slower-prediction bias as qualifying evolved.</p>`);
 $('#contribution-info').onclick=()=>info('Where the time goes',`<p>${escape(report.contribution.method)}</p><p>Each contribution is the difference between two complete physics runs. The base is a neutral fleet envelope at the recorded conditions, soft tyres and 10 kg fuel. No invented seconds are added after solving.</p><p>The main delta uses the selected driver and car in the reference configuration. This differs from the neutral fleet base used by the waterfall.</p>`);
 $('#saved-button').onclick=openSaved;$('#save-current').onclick=openSaved;
 $('#scenario-form').onsubmit=e=>{e.preventDefault();if(busy||!report||JSON.stringify(report.result.scenario)!==JSON.stringify(a)){toast('Finish a valid simulation of the current inputs before saving.');return;}try{const scenario=validateScenario(db,a),name=$('#scenario-name').value.trim();if(!name)throw Error('Enter a scenario name.');if(saved.length>=50)throw Error('Notebook limit: 50 scenarios. Export or delete one first.');saved.unshift({id:crypto.randomUUID(),name:name.slice(0,80),scenario,lapTime:report.result.lapTime,model:MODEL_VERSION,data:db.version,created:new Date().toISOString()});persistSaved();renderSaved();toast(storageAvailable?'Scenario saved in this browser.':'Scenario saved in memory. Export it to keep a copy.');}catch(e){toast(e.message);}};
 $('#export-scenarios').onclick=()=>{if(!saved.length){toast('Save a scenario before exporting the notebook.');return;}download('laplab-scenarios.json',JSON.stringify({model:MODEL_VERSION,data:db.version,scenarios:saved},null,2));};
 $('#import-scenarios').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>200000)throw Error('This notebook is too large. Maximum: 200 kB.');const parsed=JSON.parse(await file.text());if(parsed.model!==MODEL_VERSION||parsed.data!==db.version||!Array.isArray(parsed.scenarios)||parsed.scenarios.length>50)throw Error('Notebook format or model/data version is incompatible.');const incoming=parsed.scenarios.map(s=>{if(typeof s.name!=='string'||!s.name.trim())throw Error('Every scenario needs a name.');return {id:crypto.randomUUID(),name:s.name.slice(0,80),scenario:validateScenario(db,s.scenario),model:MODEL_VERSION,data:db.version,created:new Date().toISOString()};});if(saved.length+incoming.length>50)throw Error('This import would exceed 50 saved scenarios.');saved=[...incoming,...saved];persistSaved();renderSaved();toast(`${incoming.length} scenarios imported.`);}catch(e){toast(`Import failed: ${e.message}`);}finally{e.target.value='';}};
 $('#export-telemetry').onclick=()=>{if(!report)return;const r=report.result,header='distance_m,time_s,speed_kmh,throttle_pct,brake_effort_pct,gear_derived,rpm_derived,drs_model,ers_deploy_kw,es_charge_mj,longitudinal_g,lateral_g';const rows=r.distance.map((d,i)=>[d,r.time[i],r.speed[i],r.throttle[i],r.brake[i],r.gear[i],r.rpm[i],r.drs[i],r.ers[i],r.energy[i],r.longitudinal[i],r.lateral[i]].map(v=>Number(v).toFixed(4)).join(','));download(`laplab-${a.circuit}-model-telemetry.csv`,header+'\n'+rows.join('\n'),'text/csv');toast('Modelled telemetry exported. Generated channels are identified in the column names.');};
 $('#clone-to-b').onclick=()=>{b={...a};syncControls('b');runModel();};$('#load-a-reference').onclick=()=>{a={...defaultScenario(db,a.circuit),driver:a.driver,car:a.car};syncControls('a');runModel();};$('#rerun-sensitivity').onclick=runModel;
 document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
}
async function verifyFeed(){
 const button=$('#verify-feed'),status=$('#feed-status');button.disabled=true;status.textContent='Checking the historical feed…';
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
 try{const c=db.circuits.find(c=>c.id===a.circuit),response=await fetch(`https://api.openf1.org/v1/laps?session_key=${c.session}`,{signal:controller.signal});if(!response.ok)throw Error(`API returned ${response.status}`);const rows=await response.json();if(!Array.isArray(rows)||rows.length<10)throw Error('The API returned an unexpected response.');const hold=db.holdout.filter(r=>r.circuit===c.id);let matches=0;for(const row of hold){const live=rows.find(l=>l.driver_number===row.driver&&l.lap_number===row.lap);if(live&&typeof live.lap_duration==='number'&&Math.abs(live.lap_duration-row.actual)<.002)matches++;}if(matches!==hold.length)throw Error(`${matches}/${hold.length} timing samples match. Snapshot retained; recalibration requires review.`);status.textContent=`Verified ${matches} held-out timings against OpenF1. Checked ${new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}. Snapshot calibration retained.`;}catch(e){status.textContent=`Historical API unavailable or changed (${e.name==='AbortError'?'request timed out':e.message}). The bundled research snapshot remains available.`;}finally{clearTimeout(timer);button.disabled=false;}
}
async function init(){
 try{
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);let response;
  try{response=await fetch('./data/dataset.json',{signal:controller.signal});}finally{clearTimeout(timer);}
  if(!response.ok)throw Error(`Dataset returned ${response.status}`);db=await response.json();if(db.version!=='2024.1'||db.n!==600||db.circuits.length!==4||!db.holdout.length)throw Error('The research snapshot is incomplete.');
  a={...defaultScenario(db),fuel:20,tyreAge:3,trackTemp:db.circuits[0].baseline.track_temperature+4,grip:1.005};b=defaultScenario(db);
  $('#inputs-a').innerHTML=controls('a');$('#inputs-b').innerHTML=controls('b',true);syncControls('a');syncControls('b');$('#research-content').innerHTML=researchHTML(db);renderValidation(db);
  $('#validation-filter').onchange=()=>renderValidation(db,$('#validation-filter').value);$('#verify-feed').onclick=verifyFeed;
  $('#export-validation').onclick=()=>{const header='circuit,driver,lap,predicted_s,actual_s,error_s,source',rows=db.holdout.map(x=>[x.circuit,x.driver,x.lap,x.predicted,x.actual,x.error,x.source].join(','));download('laplab-held-out-validation.csv',header+'\n'+rows.join('\n'),'text/csv');};
  bind();loadSaved();
  experiments=initExperiments({db,getScenario:()=>({...a}),applyScenario:scenario=>{const oldCircuit=a.circuit;a=validateScenario(db,scenario);if(oldCircuit!==a.circuit)b=defaultScenario(db,a.circuit);syncControls('a');syncControls('b');setView('simulation');runModel();},toast});
  experiments.update(a);initCompetition({db,toast});
  $('#loading').hidden=true;$('#application').hidden=false;setView(location.hash.slice(1));
  try{worker=new Worker('./worker.mjs',{type:'module'});worker.onmessage=e=>receive(e.data);worker.onerror=()=>{workerReady=false;worker.terminate();worker=null;toast('Background solver unavailable. Using the local fallback.');fallbackRun(requestId);};worker.postMessage({type:'init',db});}catch(e){runModel();}
  if('serviceWorker' in navigator&&!['localhost','127.0.0.1'].includes(location.hostname))navigator.serviceWorker.register('./sw.js').catch(()=>{});
 }catch(e){$('#loading').hidden=true;error(`LapLab could not load the research snapshot: ${e.name==='AbortError'?'request timed out':e.message}. No simulation has been shown.`,true);$('#model-status').textContent='Research data unavailable';}
}
init();
