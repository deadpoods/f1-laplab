// Reproducible documentation figure, using real solver output and circuit data.
import fs from 'node:fs';
import {defaultScenario,simulate,formatLap} from '../dist/engine.mjs';
const db=JSON.parse(fs.readFileSync(new URL('../dist/data/dataset.json',import.meta.url)));
const s={...defaultScenario(db),fuel:20,tyreAge:3,trackTemp:db.circuits[0].baseline.track_temperature+4,grip:1.005},r=simulate(db,s),c=db.circuits[0];
const theta=99*Math.PI/180,xy=c.profile.x.map((x,i)=>[x*Math.cos(theta)-c.profile.y[i]*Math.sin(theta),-(x*Math.sin(theta)+c.profile.y[i]*Math.cos(theta))]),xs=xy.map(p=>p[0]),ys=xy.map(p=>p[1]),minx=Math.min(...xs),maxx=Math.max(...xs),miny=Math.min(...ys),maxy=Math.max(...ys),scale=Math.min(410/(maxx-minx),340/(maxy-miny));
const points=xy.map(([x,y])=>[(x-(minx+maxx)/2)*scale+1110,(y-(miny+maxy)/2)*scale+282]);points.push(points[0]);
const poly=points.map(p=>p.map(v=>v.toFixed(2)).join(',')).join(' '),speed=r.speed.map((v,i)=>`${(65+i/(r.n-1)*720).toFixed(2)},${(631-(v-70)/270*144).toFixed(2)}`).join(' ');
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="760" viewBox="0 0 1400 760" role="img" aria-labelledby="title desc">
<title id="title">F1 LapLab — every millisecond has a reason</title><desc id="desc">Silverstone model lap ${formatLap(r.lapTime)}, real modelled speed trace and reference track geometry. 62 training laps, 117 held-out laps. Non-commercial 2024 research.</desc>
<rect width="1400" height="760" fill="#10171b"/><path d="M40 72H1360M40 425H1360M40 685H1360M855 98V658" stroke="#33424a" fill="none"/>
<g font-family="Arial, sans-serif" fill="#eeefe9"><text x="45" y="43" font-size="12" letter-spacing="3">FORMULA 1 LAP TIME SIMULATION &amp; TELEMETRY LAB</text><text x="1360" y="43" text-anchor="end" font-size="11" fill="#a4b3bc">INDEPENDENT RESEARCH / 2024 REFERENCE ERA</text>
<text x="42" y="210" font-size="116" font-weight="600" letter-spacing="-8">F1 LapLab<tspan fill="#ffa65f">.</tspan></text><text x="47" y="263" font-size="32" letter-spacing="-1">Every millisecond has a reason.</text><text x="47" y="314" font-size="17" fill="#a4b3bc">Trace the lap. Explore the trade-offs. Challenge a friend.</text>
<text x="47" y="382" font-size="12" fill="#ffa65f" letter-spacing="2">PHYSICS / TELEMETRY / EXPERIMENTS / FIVE-ROUND DUELS</text>
<text x="1075" y="112" font-size="12" fill="#a4b3bc" letter-spacing="2">SILVERSTONE</text><polyline points="${poly}" fill="none" stroke="#25343c" stroke-width="16" stroke-linejoin="round"/><polyline points="${poly}" fill="none" stroke="#ffa65f" stroke-width="3.5" stroke-linejoin="round"/>
<text x="47" y="457" font-size="11" letter-spacing="2" fill="#a4b3bc">MODELLED SPEED / 600 DISTANCE SAMPLES</text><path d="M65 490H785M65 560H785M65 630H785" stroke="#26343c"/><polyline points="${speed}" stroke="#80cbd2" stroke-width="2.5" fill="none"/>
<text x="65" y="657" font-size="11" fill="#a4b3bc">0 m</text><text x="785" y="657" text-anchor="end" font-size="11" fill="#a4b3bc">5,891 m</text>
<text x="902" y="468" font-size="11" letter-spacing="2" fill="#a4b3bc">EXAMPLE MODEL LAP / NOR · MCL38</text><text x="897" y="541" font-size="70" letter-spacing="-3">${formatLap(r.lapTime)}</text><text x="902" y="572" font-size="12" fill="#a4b3bc">20 kg · 3-lap soft · 23.4°C track · grip 1.005</text><text x="902" y="623" font-size="13" fill="#ffa65f">62 training / 117 holdout / 1.211 s lap MAE</text><text x="902" y="652" font-size="11" fill="#a4b3bc">Limited qualifying validation; extrapolations are labelled.</text>
<text x="47" y="725" font-size="11" letter-spacing="2">OBSERVED / ESTIMATED / ASSUMED</text><text x="1360" y="725" text-anchor="end" font-size="12" fill="#a4b3bc">Six visual directions. One shared simulation.</text></g></svg>`;
fs.writeFileSync(new URL('../docs/images/overview.svg',import.meta.url),svg);
console.log(`Documentation figure uses model lap ${formatLap(r.lapTime)}.`);
