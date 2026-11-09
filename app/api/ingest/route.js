import { NextResponse } from 'next/server';
import { saveReadings } from '../../../lib/db.js';
export const runtime='nodejs';
const units={ 'solar.power_w':'W','solar.generation_kwh':'kWh','diverter.power_w':'W','cylinder.temperature_c':'°C','indoor.temperature_c':'°C','heating.flow_temperature_c':'°C','heating.return_temperature_c':'°C' };
export async function POST(request){
  const secret=process.env.SENSOR_INGEST_TOKEN;
  if(!secret||request.headers.get('authorization')!=='Bearer '+secret)return NextResponse.json({error:'Unauthorised'},{status:401});
  let body;
  try{body=await request.json()}catch{return NextResponse.json({error:'Invalid JSON'},{status:400})}
  const entries=Array.isArray(body.readings)?body.readings:[body];
  if(entries.length<1||entries.length>100)return NextResponse.json({error:'Provide 1–100 readings'},{status:400});
  for(const r of entries){
    if(!r||units[r.metric]!==r.unit||typeof r.source!=='string'||!/^local:[a-zA-Z0-9_.-]{1,50}$/.test(r.source)||
       !Number.isFinite(Number(r.value))||!Number.isFinite(Date.parse(r.ts))|| (r.quality&&r.quality!=='observed')){
      return NextResponse.json({error:'Invalid sensor reading'},{status:400});
    }
  }
  try{
    const readings=entries.map(r=>({source:r.source,metric:r.metric,unit:r.unit,ts:new Date(r.ts).toISOString(),value:Number(r.value),quality:'observed'}));
    await saveReadings(readings);
    return NextResponse.json({imported:readings.length});
  }catch{return NextResponse.json({error:'Could not import readings'},{status:500})}
}
