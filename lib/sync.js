import {saveReadings, recordSync} from './db.js';
import {normaliseBrightIntervals} from './bright-quality.js';

const MAX_WEATHER_DAYS = 2;
function checkFinite(v) { return v !== null && v !== undefined && Number.isFinite(Number(v)); }

export async function syncWeather() {
  if (!process.env.HOME_LATITUDE || !process.env.HOME_LONGITUDE) {
    return {status:'needs_setup',message:'Weather area not configured'};
  }
  const lat=Number(process.env.HOME_LATITUDE),lon=Number(process.env.HOME_LONGITUDE);
  if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180) throw Error('Invalid weather coordinates');
  const qs=new URLSearchParams({
    latitude:String(lat),longitude:String(lon),
    hourly:'temperature_2m,shortwave_radiation',
    past_days:String(MAX_WEATHER_DAYS),forecast_days:'3',
    timezone:'GMT'
  });
  const res=await fetch('https://api.open-meteo.com/v1/forecast?'+qs,{
    cache:'no-store',signal:AbortSignal.timeout(18000)
  });
  if(!res.ok)throw Error('Open-Meteo returned HTTP '+res.status);
  const j=await res.json(),batch=[];
  if(!Array.isArray(j.hourly?.time)||!Array.isArray(j.hourly?.temperature_2m)) throw Error('Unexpected weather response');
  const now=Date.now();
  for(let i=0;i<j.hourly.time.length;i++){
    const date=j.hourly.time[i];
    if(typeof date!=='string'||!/^20\d\d-\d\d-\d\dT\d\d:\d\d$/.test(date))continue;
    const ts=date+':00Z',quality=Date.parse(ts)>now?'forecast':'estimated';
    for(const [name,metric,unit] of [
      ['temperature_2m','outdoor.temperature_c','°C'],
      ['shortwave_radiation','solar.irradiance_wm2','W/m²']
    ]){
      const value=j.hourly[name]?.[i];
      if(!checkFinite(value))continue;
      batch.push({source:'open-meteo',metric,unit,ts,value:Number(value),quality});
    }
  }
  if(!batch.length)throw Error('Weather returned no valid data');
  const imported=await saveReadings(batch);
  return {status:'ok',imported,message:'Hourly local weather estimates and forecasts'};
}

export async function syncBright(){
  if(!process.env.BRIGHT_USERNAME||!process.env.BRIGHT_PASSWORD) {
    return {status:'needs_setup',message:'Bright account credentials not yet configured'};
  }
  const base='https://api.glowmarkt.com/api/v0-1';
  const appId='b0f1b774-a586-4f72-9edd-27ead8aa7a8d';
  async function get(path,token,body){
    const res=await fetch(base+path,{
      method:body?'POST':'GET',
      headers:{'Content-Type':'application/json',applicationId:appId,...(token?{token}:{})},
      ...(body?{body:JSON.stringify(body)}:{}),
      cache:'no-store',signal:AbortSignal.timeout(18000)
    });
    if(!res.ok)throw Error('Bright API HTTP '+res.status+' on '+(body?'authentication':'resource retrieval'));
    return res.json();
  }
  const auth=await get('/auth',null,{username:process.env.BRIGHT_USERNAME,password:process.env.BRIGHT_PASSWORD});
  if(!auth?.token)throw Error('Bright authentication unsuccessful');
  const entities=await get('/virtualentity',auth.token);
  if(!Array.isArray(entities))throw Error('Unexpected Bright entity response');

  // Ask only for completed past intervals; no future placeholders.
  const now=Date.now();
  const end=new Date(Math.floor(now / 1800000) * 1800000);
  const start=new Date(end.getTime()-8*86400000);
  const stamp=x=>x.toISOString().slice(0,19);
  const batch=[];
  const resourceState={electricity:{resources:0,positives:0,zeros:0},gas:{resources:0,positives:0,zeros:0}};
  let resourceCount=0;
  for(const e of entities){
    if(!e.veId)continue;
    const detail=await get('/virtualentity/'+encodeURIComponent(e.veId)+'/resources',auth.token);
    for(const r of detail.resources||[]){
      const metric=r.classifier==='gas.consumption'?'gas.import_kwh':
                   r.classifier==='electricity.consumption'?'grid.import_kwh':null;
      if(!metric||!r.resourceId||r.baseUnit!=='kWh')continue;
      resourceCount++;
      const fuel=metric==='gas.import_kwh'?'gas':'electricity';
      resourceState[fuel].resources++;
      const qs=new URLSearchParams({from:stamp(start),to:stamp(end),period:'PT30M',offset:'0',function:'sum'});
      const readings=await get('/resource/'+encodeURIComponent(r.resourceId)+'/readings?'+qs,auth.token);
      if(readings.status && readings.status!=='OK')throw Error('Bright readings status not OK');
      const assessment=normaliseBrightIntervals(readings.data,{
        source:'bright:'+e.veId,metric,resourceId:r.resourceId,now
      });
      resourceState[fuel].positives+=assessment.positive;
      resourceState[fuel].zeros+=assessment.zeros;
      batch.push(...assessment.readings);
    }
  }
  const imported=await saveReadings(batch);
  if(!resourceCount)return {status:'waiting',imported:0,message:'Bright connected, but meter resources are not available yet'};
  const label=(fuel,name)=>{
    const s=resourceState[fuel];
    if(!s.resources)return name+': resource not yet available';
    if(!s.positives)return name+': waiting for readings ('+s.zeros+' zero-only intervals)';
    return name+': '+s.positives+' non-zero intervals';
  };
  const complete=['electricity','gas'].every(f=>resourceState[f].positives>0);
  return {status:complete?'ok':'waiting',imported,
    message:label('electricity','Electricity')+'; '+label('gas','Gas'),
    meters:{electricity:resourceState.electricity.positives?'receiving':'waiting',
      gas:resourceState.gas.positives?'receiving':'waiting'}};
}

export async function runSync() {
  const sources=[['weather',syncWeather],['bright',syncBright]];
  // Independent sources: a failure in one must never prevent the other.
  const results=await Promise.all(sources.map(async ([source,handler])=>{
    let result;
    try{ result=await handler(); }
    catch(e){result={status:'error',message:String(e?.message||'Unexpected sync error').slice(0,150)};}
    try{ await recordSync(source,result.status,result.imported||0,result.message||'');}
    catch{ /* Do not misreport source success as failure because of logging. */ }
    return {source,...result};
  }));
  return results;
}
