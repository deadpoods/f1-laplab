import json, time, urllib.request, urllib.parse, pathlib, datetime, subprocess
ROOT = pathlib.Path(__file__).resolve().parents[1] / 'research' / 'raw'
ROOT.mkdir(exist_ok=True)
circuits = {'bahrain':9468, 'monaco':9519, 'silverstone':9554, 'monza':9586}
def get(endpoint, params, filename):
    dest = ROOT / filename
    if dest.exists():
        return json.loads(dest.read_text())
    url = 'https://api.openf1.org/v1/' + endpoint + '?' + urllib.parse.urlencode(params)
    for attempt in range(4):
        try:
            result=subprocess.run(['curl','-fsSL','--max-time','60','--user-agent','LapLab research/1.0',url],capture_output=True,check=True)
            data=json.loads(result.stdout)
            if not isinstance(data,list): raise ValueError('Expected array')
            dest.write_text(json.dumps(data))
            print(filename, len(data), flush=True)
            time.sleep(2.1)
            return data
        except Exception as e:
            print('retry',filename,attempt,type(e).__name__, getattr(e,'stderr',b'').decode()[:200], flush=True)
            time.sleep(5*(attempt+1))
    raise RuntimeError(filename)
def utc(value):
    return datetime.datetime.fromisoformat(value)
def iso(value):
    return value.isoformat()
for name,key in circuits.items():
    laps=get('laps',{'session_key':key},name+'-laps.json')
    drivers=get('drivers',{'session_key':key},name+'-drivers.json')
    weather=get('weather',{'session_key':key},name+'-weather.json')
    stints=get('stints',{'session_key':key},name+'-stints.json')
    selected=[]
    for num in [1,11,4,81,16,55,44,63]:
        def is_soft(l):
            matching=[s for s in stints if s['driver_number']==num and s['lap_start']<=l['lap_number']<=s['lap_end']]
            return bool(matching) and matching[-1]['compound']=='SOFT'
        valid=[l for l in laps if l['driver_number']==num and l.get('lap_duration') and not l.get('is_pit_out_lap') and all(l.get('duration_sector_'+str(i)) for i in [1,2,3]) and is_soft(l)]
        if not valid: continue
        best=min(l['lap_duration'] for l in valid)
        valid=[l for l in valid if l['lap_duration']<best*1.035]
        # Chronological split: earliest two clean flying laps for calibration;
        # latest clean flying laps stay outside parameter estimation.
        valid.sort(key=lambda l:l['lap_number'])
        train=valid[:min(2,len(valid)-1)]
        holdout=valid[len(train):]
        if not train: train=valid[:1]; holdout=[]
        for j,lap in enumerate(train):
            start=utc(lap['date_start'])
            stop=start+datetime.timedelta(seconds=lap['lap_duration'])
            params={'session_key':key,'driver_number':num,'date>':iso(start),'date<':iso(stop)}
            get('car_data',params,f'{name}-{num}-lap{lap["lap_number"]}-car.json')
            if num in [1,4,16,44] and j==0:
                get('location',params,f'{name}-{num}-lap{lap["lap_number"]}-location.json')
        selected.append({'driver':num,'train':train,'holdout':holdout})
    (ROOT / (name+'-selected.json')).write_text(json.dumps(selected))
print('Finished verified historical download.',flush=True)
