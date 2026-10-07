"""Reproducible public-telemetry preparation. No held-out laps enter fitting."""
import json, pathlib, datetime, math
import numpy as np

ROOT=pathlib.Path(__file__).resolve().parents[1]/'research/raw'
OUT=ROOT.parents[1]/'dist/data'
N=600
TEAMS={1:'redbull',11:'redbull',4:'mclaren',81:'mclaren',16:'ferrari',55:'ferrari',44:'mercedes',63:'mercedes'}
MATES={1:11,11:1,4:81,81:4,16:55,55:16,44:63,63:44}
INFO={
 'silverstone':dict(name='Silverstone',country='Great Britain',code='GB',length=5891,session=9554,key=2,turns=18,allocation=[1,2,3],demand=1.12,wing=0.12,rotation=42,description='Fast, linked corners. Aero load and tyre energy dominate.',surface='High lateral tyre loads; C1–C3 allocation. Qualifying followed changing conditions.',map='2024 Silverstone Event - Circuit Map Silverstone 2024.pdf',corners=['Abbey','Farm','Village','The Loop','Aintree','Brooklands','Luffield','Woodcote','Copse','Maggotts','Maggotts','Becketts','Becketts','Chapel','Stowe','Vale','Vale','Club']),
 'monza':dict(name='Monza',country='Italy',code='IT',length=5793,session=9586,key=39,turns=11,allocation=[3,4,5],demand=0.7,wing=-0.2,rotation=90,description='Long full-throttle runs punctuated by heavy braking.',surface='Resurfaced for 2024. Low wing and braking stability compete; C3–C5 allocation.',map='2024 Monza Event - Circuit Map Monza 2024.pdf',corners=['Rettifilo','Rettifilo','Curva Grande','Roggia','Roggia','Lesmo 1','Lesmo 2','Ascari','Ascari','Ascari','Alboreto']),
 'monaco':dict(name='Monaco',country='Monaco',code='MC',length=3337,session=9519,key=22,turns=19,allocation=[3,4,5],demand=0.48,wing=0.25,rotation=30,description='Low-speed direction changes. Mechanical grip and traction matter.',surface='Smooth road asphalt and low tyre energy. High aero configuration; C3–C5 allocation.',map='2024 Monaco Event - Circuit Map Monaco 2024.pdf',corners=['Sainte Dévote','Beau Rivage','Massenet','Casino','Mirabeau','Grand Hotel Hairpin','Mirabeau Bas','Portier','Tunnel','Nouvelle Chicane','Nouvelle Chicane','Tabac','Swimming Pool','Swimming Pool','Swimming Pool','Swimming Pool','La Rascasse','Antony Noghès','Antony Noghès']),
 'bahrain':dict(name='Bahrain',country='Bahrain',code='BH',length=5412,session=9468,key=63,turns=15,allocation=[1,2,3],demand=1.2,wing=0,rotation=90,description='Stop–start traction zones and a demanding abrasive surface.',surface='Abrasive asphalt, rear-tyre demand and heavy braking. C1–C3 allocation.',map='2024 Sakhir Event - Circuit Map - Bahrain 2024.pdf',corners=['Turn 1','Turn 2','Turn 3','Turn 4','Turn 5','Turn 6','Turn 7','Turn 8','Turn 9','Turn 10','Turn 11','Turn 12','Turn 13','Turn 14','Turn 15']),
}
def read(name):return json.loads((ROOT/name).read_text())
def ts(value):return datetime.datetime.fromisoformat(value).timestamp()
def rounded(v,dec=4):return np.round(v,dec).tolist()
def smooth(values,span=3):
 return np.mean([np.roll(values,i) for i in range(-span,span+1)],axis=0)
def stint_for(stints,num,lap):
 a=[s for s in stints if s['driver_number']==num and s['lap_start']<=lap<=s['lap_end']]
 return a[-1] if a else None
def weather_for(weather,lap):
 t=ts(lap['date_start']); return min(weather,key=lambda w:abs(ts(w['date'])-t))
def trace_for(name,num,lap,length):
 raw=read(f'{name}-{num}-lap{lap["lap_number"]}-car.json')
 start=ts(lap['date_start']);duration=lap['lap_duration']
 t=np.array([ts(r['date'])-start for r in raw]); speeds=np.array([r['speed']/3.6 for r in raw])
 tt=np.concatenate(([0],t,[duration])); vv=np.concatenate(([speeds[0]],speeds,[speeds[-1]]))
 distance=np.concatenate(([0],np.cumsum(np.diff(tt)*(vv[:-1]+vv[1:])/2)))
 scale=length/distance[-1]; distance*=scale
 grid=np.arange(N)*length/N
 sraw=distance[1:-1]
 result={'speed':np.interp(grid,distance,vv),'time':np.interp(grid,distance,tt)}
 for channel,key in [('throttle','throttle'),('brake','brake'),('gear','n_gear'),('rpm','rpm'),('drs','drs')]:
  v=np.array([r[key] for r in raw])
  if channel=='drs':v=np.isin(v,[10,12,14]).astype(float)
  nearest=np.clip(np.searchsorted(sraw,grid),0,len(sraw)-1)
  result[channel]=v[nearest] if channel in ['brake','gear','drs'] else np.interp(grid,sraw,v)
 result['rawTime']=tt;result['rawDistance']=distance;result['distanceScale']=scale
 return result
circuits=[];driver_records={n:[] for n in TEAMS};car_records={t:[] for t in set(TEAMS.values())};gear_records={g:[] for g in range(1,9)}
training=[];holdout=[];metadata=[]
for name,info in INFO.items():
 selected=read(name+'-selected.json');weather=read(name+'-weather.json');stints=read(name+'-stints.json')
 traces=[];bydriver={}
 for select in selected:
  num=select['driver'];bydriver[num]=[]
  for lap in select['train']:
   st=stint_for(stints,num,lap['lap_number'])
   if not st or st['compound']!='SOFT':continue
   tr=trace_for(name,num,lap,info['length']);tr.update(driver=num,team=TEAMS[num],lap=lap)
   traces.append(tr);bydriver[num].append(tr)
   w=weather_for(weather,lap)
   record={'circuit':name,'driver':num,'car':TEAMS[num],'lap':lap['lap_number'],'actual':lap['lap_duration'],'sectors':[lap['duration_sector_'+str(i)] for i in range(1,4)],'date':lap['date_start'],'tyreAge':st['tyre_age_at_start']+lap['lap_number']-st['lap_start'],'air':w['air_temperature'],'track':w['track_temperature'],'humidity':w['humidity'],'pressure':w['pressure'],'source':f'https://api.openf1.org/v1/laps?session_key={info["session"]}&driver_number={num}&lap_number={lap["lap_number"]}','distanceScale':round(tr['distanceScale'],5)}
   training.append(record)
   for g in range(1,9):
    mask=(tr['gear']==g)&(tr['speed']>15)&(tr['throttle']>80)
    gear_records[g].extend((tr['rpm'][mask]/(tr['speed'][mask]*3.6)).tolist())
  for lap in select['holdout']:
   st=stint_for(stints,num,lap['lap_number'])
   if not st or st['compound']!='SOFT':continue
   w=weather_for(weather,lap)
   holdout.append({'circuit':name,'driver':num,'car':TEAMS[num],'lap':lap['lap_number'],'actual':lap['lap_duration'],'sectors':[lap['duration_sector_'+str(i)] for i in range(1,4)],'date':lap['date_start'],'tyreAge':st['tyre_age_at_start']+lap['lap_number']-st['lap_start'],'air':w['air_temperature'],'track':w['track_temperature'],'humidity':w['humidity'],'pressure':w['pressure'],'source':f'https://api.openf1.org/v1/laps?session_key={info["session"]}&driver_number={num}&lap_number={lap["lap_number"]}'})
 assert len(traces)>=12
 ref=np.median(np.array([smooth(t['speed'],1) for t in traces]),axis=0)
 ref_throttle=np.median(np.array([t['throttle'] for t in traces]),axis=0)
 ref_drs=np.mean(np.array([t['drs'] for t in traces]),axis=0)>.5
 # An actual sampled racing line supplies x,y. z is intentionally excluded.
 chosen=next(t for t in traces if t['driver']==4)
 raw=read(f'{name}-4-lap{chosen["lap"]["lap_number"]}-location.json')
 pt=np.array([ts(p['date'])-ts(chosen['lap']['date_start']) for p in raw])
 ps=np.interp(pt,chosen['rawTime'],chosen['rawDistance'])
 grid=np.arange(N)*info['length']/N
 x=smooth(np.interp(grid,ps,[p['x'] for p in raw]),1)
 y=smooth(np.interp(grid,ps,[p['y'] for p in raw]),1)
 corners=[]
 for c in read(name+'-corners.json')['corners']:
  idx=int(np.argmin((x-c['trackPosition']['x'])**2+(y-c['trackPosition']['y'])**2))
  number=c['number'];corners.append({'number':number,'name':info['corners'][number-1],'index':idx,'distance':round(grid[idx]),'referenceSpeed':round(ref[idx]*3.6)})
 corners.sort(key=lambda c:c['number'])
 # Restrict the inverse corner envelope to bending sections / apex windows.
 # It is performance-equivalent curvature, NOT a surveyed corner radius.
 tangent=np.arctan2(np.roll(y,-4)-np.roll(y,4),np.roll(x,-4)-np.roll(x,4))
 diff=np.angle(np.exp(1j*(np.roll(tangent,-3)-np.roll(tangent,3))))
 geometry_bend=np.abs(diff)>.07
 apex_window=np.zeros(N,dtype=bool)
 for c in corners:
  if c['referenceSpeed']<260:
   span=65 if c['referenceSpeed']<180 else 100
   dist=np.minimum(np.abs(grid-c['distance']),info['length']-np.abs(grid-c['distance']))
   apex_window|=dist<span
 bend=smooth((geometry_bend|apex_window).astype(float),2)>.35
 bend&=(ref<95)
 # Finite corner boundaries make backward braking / forward traction essential.
 rho=1.225;m=808;cl=6.8*(1+info['wing']);mu=1.55
 load=m*9.80665+.5*rho*cl*ref**2
 capacity=mu*load*(load/(m*9.80665))**(-.08)
 k=np.where(bend,capacity/(m*ref**2),0)
 # Measured reference sector durations locate timing boundaries on distance axis.
 fractions=[]
 for tr in traces:
  la=tr['lap']; times=tr['rawTime']; distances=tr['rawDistance']
  fractions.append([np.interp(la['duration_sector_1'],times,distances),np.interp(la['duration_sector_1']+la['duration_sector_2'],times,distances)])
 sectors=np.median(fractions,axis=0).tolist()
 wrows=[weather_for(weather,tr['lap']) for tr in traces]
 baseline={field:float(np.median([w[field] for w in wrows])) for field in ['air_temperature','track_temperature','humidity','pressure']}
 # Physical power estimate assumes a shared drag area. These are effective,
 # unidentifiable coefficients and are NOT proprietary technical specifications.
 all_power=[]
 phase_masks={'low':(ref<48)&bend,'high':(ref>60)&bend,'straight':(~bend)&(ref>72)}
 metrics={}
 for num,trs in bydriver.items():
  if not trs:continue
  a=np.mean(np.array([t['speed'] for t in trs]),axis=0)
  th=np.mean(np.array([t['throttle'] for t in trs]),axis=0)
  accel=np.gradient(smooth(a,2)**2/2,info['length']/N)
  masks=phase_masks
  power_mask=(th>98)&(a>45)&(a<85)&(accel>1)&(~bend)
  power=(808*accel+.5*1.225*(1.08*(1+info['wing']*.6))*a*a+808*9.80665*.012)*a
  effective=float(np.median(power[power_mask])) if np.sum(power_mask)>6 else 580000
  all_power.append(effective)
  metrics[num]={key:float(np.mean(a[mask]/ref[mask])) if np.sum(mask)>3 else 1.0 for key,mask in masks.items()}
  metrics[num]['power']=effective
  metrics[num]['braking']=float(np.quantile(-accel[accel<0],.85)) if np.any(accel<0) else 20
  metrics[num]['pickup']=float(np.mean(th[(accel>1)&(a<60)])) if np.any((accel>1)&(a<60)) else 90
 med_power=float(np.median(all_power));med_brake=float(np.median([m['braking'] for m in metrics.values()]));med_pick=float(np.median([m['pickup'] for m in metrics.values()]))
 for num,metric in metrics.items():
  mate=metrics.get(MATES[num])
  if not mate:continue
  team={f:(metric[f]+mate[f])/2 for f in metric}
  driver_records[num].append({f:metric[f]/team[f] for f in metric})
  car_records[TEAMS[num]].append({'low':team['low'],'high':team['high'],'straight':team['straight'],'power':team['power']/med_power,'braking':team['braking']/med_brake,'pickup':team['pickup']/med_pick})
 c=dict(info);c.pop('corners');c.update(id=name,corners=corners,sectors=rounded(np.array(sectors),2),baseline=baseline,trainingCount=len(traces),targetTime=round(float(np.mean([t['lap']['lap_duration'] for t in traces])),4),effectivePower=round(float(np.clip(med_power,450000,720000))),calibration=1.0,profile={'speed':rounded(ref,3),'throttle':rounded(ref_throttle,1),'drs':ref_drs.astype(int).tolist(),'curvature':rounded(k,7),'x':rounded(x,1),'y':rounded(y,1),'heading':rounded(tangent,5)},observed={'driver':4,'lap':chosen['lap']['lap_number'],'duration':chosen['lap']['lap_duration'],'speed':rounded(chosen['speed']*3.6,1),'throttle':rounded(chosen['throttle'],1),'brake':chosen['brake'].astype(int).tolist(),'gear':chosen['gear'].astype(int).tolist(),'rpm':rounded(chosen['rpm'],0),'drs':chosen['drs'].astype(int).tolist(),'time':rounded(chosen['time'],3)},mapSource='https://www.fia.com/sites/default/files/decision-document/'+__import__('urllib.parse',fromlist=['quote']).quote(info['map']),annotationSource=f'https://api.multiviewer.app/api/v1/circuits/{info["key"]}/2024')
 circuits.append(c)
driver_names={1:('Max Verstappen','VER','NL'),11:('Sergio Pérez','PER','MX'),4:('Lando Norris','NOR','GB'),81:('Oscar Piastri','PIA','AU'),16:('Charles Leclerc','LEC','MC'),55:('Carlos Sainz','SAI','ES'),44:('Lewis Hamilton','HAM','GB'),63:('George Russell','RUS','GB')}
drivers=[]
for num,records in driver_records.items():
 name,code,country=driver_names[num]
 def residual(f,shrink=.4):return round(float(np.clip(1+(np.mean([r[f] for r in records])-1)*shrink,.97,1.03)),5) if records else 1
 drivers.append(dict(id=num,name=name,code=code,country=country,team=TEAMS[num],circuits=len(records),samples=sum(1 for r in training if r['driver']==num),low=residual('low'),high=residual('high'),braking=residual('braking',.25),traction=residual('pickup',.25),label='Teammate-centred, shrunk telemetry residuals; car/setup/conditions remain confounded.'))
cars=[]
for id,title,model,color in [('mclaren','McLaren','MCL38','#f3a15a'),('redbull','Red Bull Racing','RB20','#75a4ef'),('ferrari','Ferrari','SF-24','#e87375'),('mercedes','Mercedes','W15','#71d0be')]:
 records=car_records[id]
 def ratio(f,shrink=.55):return round(float(np.clip(1+(np.mean([r[f] for r in records])-1)*shrink,.94,1.06)),5)
 cars.append(dict(id=id,name=title,model=model,color=color,low=ratio('low'),high=ratio('high'),power=ratio('power',.35),braking=ratio('braking',.25),traction=ratio('pickup',.25),drag=round(float(np.clip(1+(1/ratio('straight')**3-1)*.6,.95,1.05)),5),label='Effective fleet-relative fit; not proprietary aero or power measurements.'))
db=dict(version='2024.1',retrieved='2026-10-07',n=N,circuits=circuits,drivers=drivers,cars=cars,training=training,holdout=holdout,gearRpm={g:round(float(np.median(v)),3) if v else None for g,v in gear_records.items()},provenance={'timing':'OpenF1 public historical timing','geometry':'OpenF1 approximate locations; MultiViewer turn annotations checked against FIA maps','split':'First two eligible soft flying laps per driver/circuit used for calibration; later eligible soft laps held out. Full timing sectors, no pit-out laps, within 3.5% of that driver’s fastest timed lap. Selection threshold uses session outcomes; fits do not use held-out values.','limits':'No race-control deletion/flag filtering, unknown fuel/SoC and changing track grip. Silverstone Pérez had no soft samples and is excluded from fit/validation. Distance normalized to FIA lap length; timestamp/position feeds approximate.','license':'OpenF1 CC BY-NC-SA 4.0; non-commercial research use. IBM Plex SIL Open Font License.'})
OUT.mkdir(parents=True,exist_ok=True);(OUT/'dataset.json').write_text(json.dumps(db,separators=(',',':')))
print('Prepared',len(circuits),'circuits,',len(training),'training laps,',len(holdout),'held-out laps.')
print('Driver residuals:',[(d['code'],d['low'],d['high'],d['braking'],d['traction']) for d in drivers])
print('Team effective fits:',cars)
