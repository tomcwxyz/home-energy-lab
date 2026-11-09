import { saveReadings } from './db.js';

export async function syncWeather() {
  if(!process.env.HOME_LATITUDE||!process.env.HOME_LONGITUDE)return {status:'skipped',reason:'Location not configured'};
  const lat=Number(process.env.HOME_LATITUDE),lon=Number(process.env.HOME_LONGITUDE);
  if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)throw Error('Invalid weather coordinates');
  const qs=new URLSearchParams({latitude:String(lat),longitude:String(lon),hourly:'temperature_2m,shortwave_radiation',past_days:'7',forecast_days:'2',timezone:'GMT'});
  const res=await fetch('https://api.open-meteo.com/v1/forecast?'+qs,{cache:'no-store',signal:AbortSignal.timeout(20000)});
  if(!res.ok)throw Error('Weather API HTTP '+res.status);
  const j=await res.json(),batch=[];
  for(let i=0;i<(j.hourly?.time?.length||0);i++){
    const ts=j.hourly.time[i]+':00Z',quality=Date.parse(ts)>Date.now()?'forecast':'estimated';
    for(const [name,metric,unit] of [['temperature_2m','outdoor.temperature_c','°C'],['shortwave_radiation','solar.irradiance_wm2','W/m²']]){
      const value=j.hourly[name]?.[i];
      if(value!==null&&value!==undefined)batch.push({source:'open-meteo',metric,unit,ts,value:Number(value),quality});
    }
  }
  await saveReadings(batch);
  return {status:'ok',imported:batch.length};
}
export async function syncBright(){
  if(!process.env.BRIGHT_USERNAME||!process.env.BRIGHT_PASSWORD)return {status:'skipped',reason:'Bright credentials not configured'};
  const base='https://api.glowmarkt.com/api/v0-1';
  const appId='b0f1b774-a586-4f72-9edd-27ead8aa7a8d';
  async function get(path,token,body){
    const res=await fetch(base+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',applicationId:appId,...(token?{token}:{})},...(body?{body:JSON.stringify(body)}:{}),cache:'no-store',signal:AbortSignal.timeout(20000)});
    if(!res.ok)throw Error('Bright API HTTP '+res.status);
    return res.json();
  }
  const auth=await get('/auth',null,{username:process.env.BRIGHT_USERNAME,password:process.env.BRIGHT_PASSWORD});
  if(!auth?.token)throw Error('Bright token missing');
  const entities=await get('/virtualentity',auth.token);
  if(!Array.isArray(entities))throw Error('Unexpected Bright entity response');
  const end=new Date();end.setUTCHours(0,0,0,0);end.setUTCDate(end.getUTCDate()+1);
  const start=new Date(end);start.setUTCDate(start.getUTCDate()-8);
  const stamp=x=>x.toISOString().slice(0,19);
  const batch=[];
  for(const e of entities){
    if(!e.veId)continue;
    const detail=await get('/virtualentity/'+encodeURIComponent(e.veId)+'/resources',auth.token);
    for(const r of detail.resources||[]){
      const metric=r.classifier==='gas.consumption'?'gas.import_kwh':r.classifier==='electricity.consumption'?'grid.import_kwh':null;
      if(!metric||!r.resourceId)continue;
      const qs=new URLSearchParams({from:stamp(start),to:stamp(end),period:'PT30M',offset:'0',function:'sum'});
      const readings=await get('/resource/'+encodeURIComponent(r.resourceId)+'/readings?'+qs,auth.token);
      if(!Array.isArray(readings.data))throw Error('Unexpected Bright readings');
      for(const [epoch,value] of readings.data){
        if(value===null||value===undefined||!Number.isFinite(Number(value))||Number(value)<0)continue;
        const millis=Number(epoch)*1000;
        if(!Number.isFinite(millis))continue;
        batch.push({source:'bright:'+e.veId,metric,unit:'kWh',ts:new Date(millis).toISOString(),value:Number(value),quality:'observed',metadata:{period:'PT30M',resourceId:r.resourceId}});
      }
    }
  }
  await saveReadings(batch);
  return {status:'ok',imported:batch.length};
}
