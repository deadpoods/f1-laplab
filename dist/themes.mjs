/** Presentation adapter: no imports, reads or writes of the simulation model. */
export const DIRECTIONS=Object.freeze([
 {id:'apple',number:'01',name:'Apple-inspired',title:'Clarity, considered.',description:'A quiet product canvas. Space to see the important things.',detail:'A cool, spacious canvas puts the circuit and a clear result first. A horizontal input shelf and broad, fine-line plots keep the detail orderly.',composition:['circuit','results','config','telemetry'],color:'#f3f5f7'},
 {id:'netflix',number:'02',name:'Netflix-inspired',title:'The lap, in widescreen.',description:'A cinematic replay stage. The analysis unfolds below.',detail:'An archive photograph meets a dark replay stage. Bold condensed type, a result ribbon and an analysis deck create a cinematic rhythm without turning the lab into a streaming catalogue.',composition:['photo','circuit','results','config','telemetry'],color:'#09090b'},
 {id:'engineering',number:'03',name:'Motorsport Engineering Lab',title:'Every signal in view.',description:'A compact workbench. Every signal in view.',detail:'A result strip, settings rack, circuit and telemetry sit together as a docked engineering workbench. Dense rows, waveform bands and restrained motion prioritize repeated analysis.',composition:['results','config','circuit','telemetry'],color:'#111619'},
 {id:'editorial',number:'04',name:'Editorial Motorsport',title:'The anatomy of a lap.',description:'An analytical magazine spread. Photographs, figures, evidence.',detail:'An asymmetric photographic spread pairs the lap figure with an archive image. Serif headlines, numbered technical figures and long ink rules give the analysis a deliberate reading order.',composition:['photo','results','circuit','config','telemetry'],color:'#f1eee8'},
 {id:'future',number:'05',name:'Futuristic Race Control',title:'A spatial command system.',description:'A spatial command console. The circuit is the working object.',detail:'Edge inspectors surround a large circuit workspace, with a vertical navigation rail and an aligned telemetry deck. Precise frames and subtle depth organize the simulated state without fictional live data.',composition:['config','circuit','results','telemetry'],color:'#091217'},
 {id:'experimental',number:'06',name:'Experimental / Art Direction',title:'Lap Score.',description:'Lap Score. The telemetry becomes the graphic composition.',detail:'A signal-yellow instrument sheet puts real distance-based traces first. An oversized lap figure, companion circuit specimen, lower navigation and bottom input rack give each scenario its own graphic score.',composition:['results','telemetry','circuit','config'],color:'#e8ed52'}
]);
const $=selector=>document.querySelector(selector);
const root=document.documentElement;
const grid=$('.lab-grid');
const panels={config:$('.configuration'),circuit:$('.centre-column'),results:$('.results'),telemetry:$('#telemetry-panel'),photo:$('#theme-photograph')};
let current='',transition,revision=0;
const options=$('#direction-options'),select=$('#direction-select'),dialog=$('#direction-dialog');
const miniature=id=>`<span class="direction-mini mini-${id}" aria-hidden="true"><i></i><i></i><i></i><i></i></span>`;
options.innerHTML=DIRECTIONS.map(d=>`<button class="direction-option" data-direction="${d.id}" aria-pressed="false"><span class="direction-number">${d.number}</span><span>${d.name}</span><span class="direction-selected" aria-hidden="true">↗</span></button>`).join('');
$('#direction-gallery').innerHTML=DIRECTIONS.map(d=>`<button class="direction-card" data-direction="${d.id}">${miniature(d.id)}<span class="direction-card-kicker">${d.number} / ${d.name}</span><b>${d.title}</b><span>${d.detail}</span><small>Apply this direction ↗</small></button>`).join('');
function paint(id,announce){
 const direction=DIRECTIONS.find(d=>d.id===id);if(!direction)return;
 root.dataset.theme=id;current=id;
 // Move the original nodes. Values, event listeners, plot paths and replay state survive.
 for(const key of direction.composition)grid.append(panels[key]);
 if(!direction.composition.includes('photo'))grid.append(panels.photo);
 document.querySelectorAll('[data-direction]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.direction===id)));
 select.value=id;$('#direction-description').textContent=direction.description;
 document.querySelector('meta[name="theme-color"]').content=direction.color;
 if(id==='netflix'||id==='editorial'){
  const netflix=id==='netflix',photo=$('#theme-photo-image'),src=netflix?'./assets/norris-silverstone.jpg':'./assets/russell-silverstone.jpg';
  if(photo.getAttribute('src')!==src)photo.src=src;
  photo.alt=netflix?'Archive photograph of Lando Norris in the McLaren MCL38 at Silverstone in 2024.':'Archive photograph of George Russell in the Mercedes W15 at Silverstone in 2024.';
  $('#theme-photo-caption').textContent=`${netflix?'Norris / MCL38':'Russell / W15'} · Silverstone, 2024 · Jen Ross / CC BY 2.0 · Archive`;
 }
 if(announce)$('#direction-status').textContent=`${direction.name} applied. Simulation inputs, result and replay are preserved.`;
}
function changeDirection(id){
 if(!DIRECTIONS.some(d=>d.id===id)||id===current)return;
 const request=++revision;transition?.skipTransition();
 try{localStorage.setItem('laplab-visual-direction-v1',id);}catch{}
 const update=()=>{if(request===revision)paint(id,true);};
 if(document.startViewTransition&&!matchMedia('(prefers-reduced-motion: reduce)').matches){try{transition=document.startViewTransition(update);transition.ready.catch(()=>{});transition.finished.catch(()=>{});}catch{update();}}
 else update();
}
document.addEventListener('click',event=>{const button=event.target.closest('[data-direction]');if(!button)return;changeDirection(button.dataset.direction);if(dialog.open)dialog.close();});
select.addEventListener('change',()=>changeDirection(select.value));
$('#direction-notes-button').addEventListener('click',()=>dialog.showModal());
$('#close-direction-notes').addEventListener('click',()=>dialog.close());
paint(DIRECTIONS.some(d=>d.id===root.dataset.theme)?root.dataset.theme:'engineering',false);
